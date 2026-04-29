import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { authService, type PendingSignup } from "../services/authService";
import { sendWelcomeEmail } from "../services/transactionalEmails";
import { useBuyerStore } from "../stores/buyerStore";
import { useAuthStore } from "../stores/sellerStore";
import { resolveSellerLandingPath } from "../utils/sellerAccess";



type Status = "processing" | "success" | "error";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("processing");
  const [errorMessage, setErrorMessage] = useState("");
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    finalizeSignup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finalizeSignup = async () => {
    try {
      // 0. Check if we actually have an auth token in the URL or pending data
      const hasToken = window.location.hash.includes('access_token') || 
                       window.location.search.includes('code=') ||
                       window.location.search.includes('token_hash=');
      
      const hasPending = !!(sessionStorage.getItem("pendingSellerSignup") || 
                           sessionStorage.getItem("pendingBuyerSignup"));

      // 1. Get the verified session (Supabase has already processed the callback URL token)
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        // No session — user may have landed here directly; send to login
        navigate("/login", { replace: true });
        return;
      }

      const { user } = session;

      // ─────────────────────────────────────────────────────────────────────
      // OAUTH EARLY EXIT — Google / any OAuth provider
      // 
      // IMPORTANT: Supabase uses PKCE — when the browser lands on /auth/callback
      // with ?code=..., the code exchange may not be complete yet when getSession()
      // is first called. This means user.app_metadata.provider may still read as
      // 'email' at this point. We therefore use the 'oauth_intent' key written to
      // sessionStorage BEFORE the Google redirect as a reliable fallback signal.
      //
      // If either signal is true → this is an OAuth user. Skip ALL email-verification
      // logic and go directly to the HomePage.
      // ─────────────────────────────────────────────────────────────────────
      const isOAuthByMetadata = user.app_metadata?.provider && user.app_metadata.provider !== "email";
      const isOAuthByIntent = !!sessionStorage.getItem("oauth_intent"); // set in handleGoogleSignIn
      const isOAuth = isOAuthByMetadata || isOAuthByIntent;

      if (isOAuth) {
        console.log("[AuthCallback] OAuth user detected — skipping email flow, redirecting to /", { isOAuthByMetadata, isOAuthByIntent });
        sessionStorage.removeItem("pendingBuyerSignup");
        sessionStorage.removeItem("pendingSellerSignup");
        sessionStorage.removeItem("oauth_intent");
        sessionStorage.removeItem("oauth_redirect_done");
        navigate("/", { replace: true });
        return;
      }

      // If we have a session but NO token and NO pending data, 
      // this is likely a manual visit or a stale redirect.
      // Redirect to home instead of "confirming" anything.
      if (!hasToken && !hasPending) {
        console.log("[AuthCallback] No token or pending data, redirecting to home");
        navigate("/", { replace: true });
        return;
      }

      // 1.5 isOAuth check already done above — if we reach here, user is email-based.

      // 2. Read the pending signup data (Buyer or Seller)
      const pending: PendingSignup | null = (() => {
        try {
          const sellerData = sessionStorage.getItem("pendingSellerSignup");
          if (sellerData) return JSON.parse(sellerData);

          const buyerData = sessionStorage.getItem("pendingBuyerSignup");
          if (buyerData) return JSON.parse(buyerData);

          return null;
        } catch {
          return null;
        }
      })();

      // If no pending data for an email user, they landed here stale — go to login.
      if (!pending) {
        console.log("[AuthCallback] No pending signup data for email user — redirecting to login");
        navigate("/login", { replace: true });
        return;
      }

      // 3. Handle standard Email Verification finalization

      // Ensure profile row exists (upsert so it's idempotent)
      // FIX: Upsert on 'id' instead of 'email' to prevent FKEY violations and identity mismatch
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email ?? pending.email,
            first_name: pending.firstName,
            last_name: pending.lastName,
            phone: pending.phone || null,
            last_login_at: new Date().toISOString(),
          } as any,
          { onConflict: "id", ignoreDuplicates: false },
        );

      if (profileError) {
        console.error("Profile upsert failed:", profileError);
        // If it failed due to email uniqueness, handle it
        if (profileError.message?.includes("profiles_email_key")) {
          throw new Error("This email is already associated with another account.");
        }
        throw new Error(`Profile setup failed: ${profileError.message}`);
      }

      // 4.5 Verify profile exists to avoid FK violation in next step
      const { data: profileCheckAgain } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profileCheckAgain) {
        // Wait another 1 second if profile isn't immediately visible (replication lag)
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // 5. Add roles and specific account records
      if (pending.user_type === "seller") {
        await authService.addUserRole(user.id, "seller");
        await authService.upgradeCurrentUserToSeller({
          store_name: pending.storeName || "My Store",
          store_description: pending.storeDescription,
          phone: pending.phone,
          business_address: pending.storeAddress
        });

        await useAuthStore.getState().hydrateSellerFromSession();
      } else {
        await authService.addUserRole(user.id, "buyer");
        await authService.createBuyerAccount(user.id);
        await useBuyerStore.getState().initializeBuyerProfile(user.id, {});
      }

      // 6. Send welcome email
      const displayName = `${pending.firstName} ${pending.lastName}`.trim() || pending.storeName || "Valued User";
      sendWelcomeEmail({
        buyerEmail: pending.email,
        buyerId: user.id,
        buyerName: displayName,
      }).catch(console.error);

      // 7. Success! Navigate to confirmation page
      sessionStorage.removeItem("pendingBuyerSignup");
      sessionStorage.removeItem("pendingSellerSignup");
      
      navigate("/email-confirmed", { replace: true, state: { email: pending.email, role: pending.user_type } });




    } catch (err: any) {
      console.error("[AuthCallback] Finalization error:", err);
      setStatus("error");
      setErrorMessage(
        err?.message || "We could not complete your account setup. Please try signing in.",
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--brand-wash)] font-sans p-6">
      {/* Background blobs */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-orange-50/30 to-white pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 w-full max-w-sm bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-[0_20px_50px_rgba(255,106,0,0.1)] border border-white/50 text-center"
      >
        {status === "processing" && (
          <>
            <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-orange-200 border-t-[var(--brand-primary)] rounded-full animate-spin" />
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] font-heading mb-2">
              Setting up your account…
            </h1>
            <p className="text-[var(--text-muted)] text-sm">
              Please wait while we finalise your BazaarX profile.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle size={36} className="text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] font-heading mb-2">
              Setup Failed
            </h1>
            <p className="text-[var(--text-muted)] text-sm mb-6">{errorMessage}</p>
            <button
              id="auth-callback-go-login"
              onClick={() => navigate("/login", { replace: true })}
              className="btn-primary w-full h-12 text-sm rounded-[var(--radius-md)]"
            >
              Go to Login
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
