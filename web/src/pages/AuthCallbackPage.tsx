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

      // 2. Read the pending signup data (Buyer or Seller)
      const pending: PendingSignup | null = (() => {
        try {
          // If we see a seller signup in progress, prioritize it
          const sellerData = sessionStorage.getItem("pendingSellerSignup");
          if (sellerData) return JSON.parse(sellerData);

          const buyerData = sessionStorage.getItem("pendingBuyerSignup");
          if (buyerData) return JSON.parse(buyerData);

          return null;
        } catch {
          return null;
        }
      })();

      // 3. Handle OAuth or returning users (no pending data)
      if (!pending) {
        console.log("[AuthCallback] No pending data found, checking metadata or database");

        // Check metadata first
        const metadataType = user.user_metadata?.user_type;
        
        // Ensure records exist
        await authService.ensureUserRolesFromRecords(user.id);

        if (metadataType === "seller") {
          await useAuthStore.getState().hydrateSellerFromSession();
          navigate("/email-confirmed", { replace: true, state: { email: user.email, role: "seller" } });
          return;
        }


        // Check if profile exists, if not bootstrap from metadata
        const { data: profileCheck } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!profileCheck) {
          const firstName = user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || "";
          const lastName = user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || "";

          await supabase.from("profiles").upsert({
            id: user.id,
            email: user.email,
            first_name: firstName,
            last_name: lastName,
            last_login_at: new Date().toISOString(),
          } as any, { onConflict: "email" });

          await authService.addUserRole(user.id, "buyer");
          await authService.createBuyerAccount(user.id);
        }

        // Initialize store
        await useBuyerStore.getState().initializeBuyerProfile(user.id, {});

        // Check onboarding completion
        const isComplete = await authService.isOnboardingComplete(user.id);

        if (isComplete) {
          navigate("/email-confirmed", { replace: true, state: { email: user.email, role: "buyer" } });
        } else {
          navigate("/email-confirmed", { replace: true, state: { email: user.email, role: "buyer" } });
        }



        return;
      }

      // 4. Handle standard Email Verification finalization
      // Ensure profile row exists (upsert so it's idempotent)
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
          { onConflict: "email", ignoreDuplicates: false },
        );

      if (profileError) {
        console.error("Profile upsert failed:", profileError);
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
