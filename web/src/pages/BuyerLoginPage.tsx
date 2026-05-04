import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useLockoutStore } from "../stores/lockoutStore";

import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  ChevronLeft,
  ShieldAlert,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "../lib/schemas";
import { deriveBuyerName, useBuyerStore } from "../stores/buyerStore";
import { authService } from "../services/authService";
import { supabase } from "../lib/supabase";

export default function BuyerLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setProfile } = useBuyerStore();
  const lockoutStore = useLockoutStore();

  const queryParams = new URLSearchParams(location.search);
  const authError = queryParams.get("error");
  const isLinkError = authError === "link_required" || authError === "google_unlinked";

  const [showLinkNotice, setShowLinkNotice] = useState(isLinkError);

  // Sync state with URL params (handles redirects while component is mounted)
  useEffect(() => {
    if (isLinkError) setShowLinkNotice(true);
  }, [isLinkError]);

  const isVerified = (location.state as any)?.verified;
  const verifiedEmail = (location.state as any)?.email;

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      email: verifiedEmail || "",
      password: "",
    },
  });

  const watchedEmail = watch("email");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  useEffect(() => {
    const remaining = lockoutStore.getRemainingLockoutTime(watchedEmail || "");
    if (remaining > 0) {
      setLockoutTimer(remaining);
    } else {
      setLockoutTimer(0);
    }
  }, [watchedEmail, lockoutStore]);

  useEffect(() => {
    let interval: any;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  useEffect(() => {
    if (verifiedEmail) {
      setValue("email", verifiedEmail);
    }
  }, [verifiedEmail, setValue]);

  const onLoginSubmit = async (data: LoginFormData) => {
    const { email, password } = data;
    const trimmedEmail = email.trim();

    const remaining = lockoutStore.getRemainingLockoutTime(trimmedEmail);
    if (remaining > 0) {
      setLockoutTimer(remaining);
      setError(`Too many attempts. Please wait ${remaining} seconds.`);
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const result = await authService.signIn(trimmedEmail, password);

      if (!result || !result.user) {
        lockoutStore.recordFailure(trimmedEmail);
        const newRemaining = lockoutStore.getRemainingLockoutTime(trimmedEmail);
        if (newRemaining > 0) setLockoutTimer(newRemaining);
        setError("Login failed. Please check your credentials.");
        setIsLoading(false);
        return;
      }

      const { user } = result;

      lockoutStore.recordSuccess(trimmedEmail);

      // Use initializeBuyerProfile from store to correctly hydrate all fields including preferences
      await useBuyerStore.getState().initializeBuyerProfile(user.id, {});
      await useBuyerStore.getState().initializeCart();

      setIsLoading(false);
      const redirectTo = sessionStorage.getItem('redirect_to');
      if (redirectTo) {
        sessionStorage.removeItem('redirect_to');
        navigate(redirectTo);
      } else {
        navigate("/shop");
      }
    } catch (err) {
      console.error("Login exception:", err);
      setError("Incorrect credentials. Please review your input.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsLoading(true);
    try {
      const result = await authService.signInWithProvider("google");
      if (result?.url) {
        sessionStorage.setItem('oauth_intent', 'buyer');
        window.location.assign(result.url);
      }
    } catch (err) {
      setError("Failed to initialize Google Sign-In. Please try again.");
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setValue("email", "buyer1@gmail.com", { shouldValidate: true });
    setValue("password", "Test@123456", { shouldValidate: true });
    setError("");
  };

  return (
    <div className="min-h-screen relative overflow-hidden font-sans bg-[var(--brand-wash)]">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-orange-50/30 to-white animate-gradient [background-size:400%_400%]"></div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div animate={{ x: [0, 50, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-orange-200/20 rounded-full mix-blend-multiply filter blur-3xl opacity-40"></motion.div>
        <motion.div animate={{ x: [0, -40, 0], y: [0, 60, 0], scale: [1, 1.2, 1] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-orange-300/20 rounded-full mix-blend-multiply filter blur-3xl opacity-40"></motion.div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col md:flex-row items-center justify-center p-6 lg:p-12">
        <Link to="/" className="absolute top-6 left-6 md:top-12 md:left-12 z-50 flex items-center gap-1 text-[var(--text-primary)] hover:text-[var(--brand-primary)] transition-colors font-medium text-sm">
          <ChevronLeft size={18} /> Back to Home
        </Link>

        <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} className="w-full md:w-1/2 flex flex-col items-center justify-center mb-12 md:mb-0">
          <h1 className="font-fondamento text-[13vw] leading-[0.85] text-[var(--brand-primary)] tracking-tighter cursor-default select-none">BazaarX</h1>
          <p className="text-[var(--brand-primary)] font-bold text-[10px] lg:text-xs uppercase tracking-[0.2em] mb-2 lg:mb-5">From Global Factories to Your Doorstep</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-[0_20px_50px_rgba(255,106,0,0.1)] border border-white/50 md:ml-32">
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] font-heading">Welcome Back!</h2>
              <p className="text-[var(--text-muted)] text-sm mt-1">Sign in to continue shopping.</p>
            </div>
            <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
              <img loading="lazy" src="/BazaarX.png" alt="BazaarX" className="w-12 h-12 object-contain" />
            </div>
          </div>

          <AnimatePresence>
            {showLinkNotice && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-orange-50 border border-orange-100 rounded-2xl flex flex-col gap-3 text-[var(--text-primary)] text-sm shadow-sm overflow-hidden"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500 rounded-full p-2 text-white">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <p className="font-black text-orange-600 uppercase tracking-wider text-[10px]">Security Notice</p>
                    <p className="font-bold text-sm">Action Required: Explicit Linking</p>
                  </div>
                </div>
                <p className="text-[13px] leading-relaxed opacity-90">
                  This Google account is not yet linked to your BazaarX profile. For your security, please <b>sign in with your password</b> first, then link Google in your account settings.
                </p>
                <button
                  type="button"
                  onClick={() => setShowLinkNotice(false)}
                  className="w-full py-2 bg-white border border-orange-200 rounded-xl text-orange-600 font-bold text-xs hover:bg-orange-100 transition-colors"
                >
                  Got it
                </button>
              </motion.div>
            )}

          </AnimatePresence>

          {lockoutTimer > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700 text-sm overflow-hidden">
              <ShieldAlert size={20} className="shrink-0" />
              <div>
                <p className="font-bold">Account Temporarily Locked</p>
                <p className="opacity-90">Retry in <span className="font-mono font-bold underline">{lockoutTimer}s</span></p>
              </div>
            </motion.div>
          )}

          {isVerified && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-green-50 text-green-700 rounded-2xl flex items-center gap-3 text-sm border border-green-100">
              <CheckCircle size={20} className="shrink-0" />
              <div><p className="font-bold">Email Verified!</p><p className="opacity-90 text-xs">Your account is ready. Please sign in to continue.</p></div>
            </motion.div>
          )}

          <div className="bg-gradient-to-r from-orange-500/10 via-orange-400/5 to-transparent border border-orange-100 rounded-[20px] p-4 mb-8 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.1em] mb-0.5">🧪 Test Buyer Accounts</p>
                <p className="text-xs text-[var(--text-secondary)]">All have addresses & BazCoins</p>
              </div>
              <button type="button" onClick={handleDemoLogin} className="text-[10px] font-bold text-orange-600 border border-orange-200 px-3 py-1.5 rounded-xl bg-white hover:bg-orange-50 transition-all active:scale-95 shadow-sm">Auto-Fill</button>
            </div>
            <div className="space-y-1 text-xs text-orange-700">
              <p className="font-semibold">Password for all: <span className="font-mono bg-orange-100 px-2 py-0.5 rounded">Test@123456</span></p>
            </div>
          </div>

          {error && lockoutTimer === 0 && (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-50 text-[var(--color-error)] rounded-[var(--radius-md)] flex items-center gap-3 text-sm border border-red-100">
                <AlertCircle size={18} /> {error}
              </motion.div>
            </AnimatePresence>
          )}

          <form onSubmit={handleSubmit(onLoginSubmit)} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-[var(--text-primary)] ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                <Controller name="email" control={control} render={({ field }) => (
                  <input {...field} id="email" type="email" placeholder="you@example.com" className={`w-full pl-11 pr-4 py-3 bg-[var(--secondary)]/10 border ${errors.email ? 'border-red-500' : 'border-[var(--border)]'} rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--brand-primary)] transition-all text-sm`} disabled={isLoading || lockoutTimer > 0} />
                )} />
              </div>
              {errors.email && <p className="text-xs text-red-600 ml-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-[var(--text-primary)] ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                <Controller name="password" control={control} render={({ field }) => (
                  <input {...field} id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" className={`w-full pl-11 pr-11 py-3 bg-[var(--secondary)]/10 border ${errors.password ? 'border-red-500' : 'border-[var(--border)]'} rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--brand-primary)] transition-all text-sm`} disabled={isLoading || lockoutTimer > 0} />
                )} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"><Eye size={18} /></button>
              </div>
              {errors.password && <p className="text-xs text-red-600 ml-1">{errors.password.message}</p>}
              <div className="flex justify-end px-1 mt-1">
                <Link
                  to={`/forgot-password${watchedEmail ? `?email=${encodeURIComponent(watchedEmail)}` : ''}`}
                  className="text-xs font-bold text-[var(--brand-primary)] hover:underline transition-all"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>

            <button type="submit" disabled={isLoading || !isValid || lockoutTimer > 0} className="w-full btn-primary h-14 uppercase rounded-[var(--radius-md)] font-bold shadow-lg flex items-center justify-center gap-2 mt-4 transition-all disabled:opacity-50">
              {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (lockoutTimer > 0 ? `Locked (${lockoutTimer}s)` : "Log In")}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border)]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-sm text-[var(--text-muted)] font-medium">or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full h-14 text-sm flex items-center border border-[var(--border)] hover:border-[var(--brand-primary)] hover:bg-[var(--secondary)]/5 rounded-[var(--radius-md)] justify-center gap-3 transition-all duration-200 shadow-sm"
              disabled={isLoading}
            >
              <img loading="lazy"
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                className="w-5 h-5"
                alt="Google"
              />
              <span className="font-semibold text-[var(--text-primary)]">Continue with Google</span>
            </button>
          </form>


          <p className="mt-8 text-center text-[#6B7280] text-sm">
            Don't have an account? <Link to="/signup" className="text-[var(--brand-primary)] font-bold hover:underline ml-1">Sign up here!</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
