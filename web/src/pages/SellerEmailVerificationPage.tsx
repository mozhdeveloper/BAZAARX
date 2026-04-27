import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, RefreshCw, ChevronLeft, CheckCircle2, Store } from "lucide-react";
import { supabase } from "../lib/supabase";
import { authService } from "../services/authService";
import { type PendingSignup } from "../services/authService";

export default function SellerEmailVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Resolve the email from router state or sessionStorage
  const locationEmail = (location.state as { email?: string } | null)?.email ?? "";
  const pending: PendingSignup | null = (() => {
    try {
      const seller = sessionStorage.getItem("pendingSellerSignup");
      return JSON.parse(seller || "null");
    } catch {
      return null;
    }
  })();
  const email = locationEmail || pending?.email || "";

  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [verified, setVerified] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect to /seller/register if there is no email to verify
  useEffect(() => {
    if (!email) {
      navigate("/seller/register", { replace: true });
    }
  }, [email, navigate]);

  // Cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // 1. Listen for auth changes (instant detection if verified in another tab)
  useEffect(() => {
    if (!email) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user?.email_confirmed_at) {
        if (session.user.email?.toLowerCase() === email.toLowerCase()) {
          setVerified(true);
          // Small delay for visual feedback before navigating
          setTimeout(() => {
            navigate("/auth/callback", { replace: true });
          }, 800);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [email, navigate]);

  // 2. Poll for verified session as a fallback every 5 seconds
  useEffect(() => {
    if (!email || verified) return;

    const checkSession = async () => {
      try {
        const isVerified = await authService.checkVerificationStatus(email);
        if (isVerified) {
          setVerified(true);
          if (pollRef.current) clearInterval(pollRef.current);
          setTimeout(() => {
            navigate("/auth/callback", { replace: true });
          }, 800);
        }
      } catch {
        // Silently ignore polling errors
      }
    };

    pollRef.current = setInterval(checkSession, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [email, navigate, verified]);

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setResendMessage("");
    try {
      await authService.resendVerificationLink(email);
      setResendCooldown(60);
      setResendMessage("A new confirmation link has been sent!");
    } catch (err: any) {
      setResendMessage(err?.message || "Failed to resend. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  if (!email) return null;

  return (
    <div className="min-h-screen relative overflow-hidden font-sans bg-[var(--brand-wash)] flex items-center justify-center p-6">
      {/* Background blobs with brand-specific colors */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-orange-50/30 to-white" />
      <motion.div
        animate={{ x: [0, 40, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-orange-200/20 rounded-full mix-blend-multiply filter blur-3xl opacity-40 pointer-events-none"
      />
      <motion.div
        animate={{ x: [0, -30, 0], y: [0, 50, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-orange-300/20 rounded-full mix-blend-multiply filter blur-3xl opacity-40 pointer-events-none"
      />

      <Link
        to="/seller/register"
        className="absolute top-6 left-6 z-50 flex items-center gap-1 text-[var(--text-primary)] hover:text-[var(--brand-primary)] transition-colors font-medium text-sm"
      >
        <ChevronLeft size={18} />
        Back to Registration
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-[0_20px_50px_rgba(255,106,0,0.1)] border border-white/50 text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.15 }}
          className="mx-auto mb-6 w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center"
        >
          {verified ? (
            <CheckCircle2 size={40} className="text-green-500" />
          ) : (
            <div className="relative">
              <Mail size={40} className="text-[var(--brand-primary)]" />
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                <Store size={14} className="text-[var(--brand-primary)]" />
              </div>
            </div>
          )}
        </motion.div>

        <h1 className="text-2xl font-bold text-[var(--text-primary)] font-heading mb-2">
          {verified ? "Email Verified!" : "Verify Your Seller Account"}
        </h1>

        {verified ? (
          <p className="text-[var(--text-muted)] text-sm mb-6">
            Preparing your Seller Dashboard&hellip;
          </p>
        ) : (
          <>
            <p className="text-[var(--text-muted)] text-sm mb-1">
              We sent a confirmation link to your business email:
            </p>
            <p className="font-semibold text-[var(--text-primary)] text-sm mb-6 break-all">
              {email}
            </p>
            <p className="text-[var(--text-muted)] text-xs mb-8 leading-relaxed">
              Click the link in your email to activate your **BazaarX Seller Account**. 
              You can then proceed to set up your store profile.
              The link expires in <span className="font-semibold">24 hours</span>.
            </p>

            {/* Resend button */}
            <button
              id="resend-seller-verification-email"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resendLoading}
              className="w-full h-12 bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 mb-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-100"
            >
              {resendLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <RefreshCw size={15} />
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend Confirmation Email"}
                </>
              )}
            </button>

            {resendMessage && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-xs mt-1 ${
                  resendMessage.includes("sent")
                    ? "text-green-600"
                    : "text-red-500"
                }`}
              >
                {resendMessage}
              </motion.p>
            )}

            <p className="text-xs text-[var(--text-muted)] mt-6">
              Using a different email?{" "}
              <Link
                to="/seller/register"
                className="text-[var(--brand-primary)] font-semibold hover:underline"
              >
                Start over
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
