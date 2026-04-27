/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, sellerSignupSchema, type LoginFormData, type SellerSignupFormData } from '@/lib/schemas';
import { Eye, EyeOff, Mail, Lock, Store, ArrowRight, AlertCircle, Check, CheckCircle, ShieldAlert, Quote, Phone, Briefcase, User, MapPin, Info, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/stores/sellerStore';
import { useLockoutStore } from '@/stores/lockoutStore';
import { resolveSellerLandingPath } from '@/utils/sellerAccess';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/authService';
import {
  clearRoleSwitchContext,
  readRoleSwitchContext,
  type RoleSwitchContext,
} from '@/services/roleSwitchContext';
import { supabase } from '@/lib/supabase';
import { Checkbox } from '@/components/ui/checkbox';
import { LegalModal } from '@/components/LegalModal';


export function SellerLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEmailUnconfirmed, setIsEmailUnconfirmed] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const { login } = useAuthStore();
  const lockoutStore = useLockoutStore();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      email: (location.state as any)?.email || "",
      password: "",
    },
  });

  const isVerified = (location.state as any)?.verified;


  const watchedEmail = watch("email");
  const watchedPassword = watch("password");

  // Handle lockout countdown
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

  const isFormValid = Boolean(watchedEmail && watchedPassword && !errors.email && !errors.password);


  useEffect(() => {
    const state = location.state as { prefillEmail?: string } | null;
    if (state?.prefillEmail) {
      setValue("email", state.prefillEmail);
    }
  }, [location.state, setValue]);

  const verifiedBrands = [
    { name: 'Nike', logo: '/nike.png', size: 'w-14 h-14', radius: 90, angle: 60 },
    { name: 'Adidas', logo: '/Adidas.png', size: 'w-14 h-14', radius: 90, angle: 250 },
    { name: 'Samsung', logo: '/Samsung.jpg', size: 'w-16 h-16', radius: 140, angle: 165 },
    { name: 'Apple', logo: '/Apple.png', size: 'w-16 h-16', radius: 140, angle: 335 },
    { name: 'Sony', logo: '/Sony.png', size: 'w-14 h-14', radius: 190, angle: 280 },
    { name: 'Uniqlo', logo: '/Uniqlo.png', size: 'w-14 h-14', radius: 185, angle: 90 },
    { name: 'Puma', logo: '/Puma.jpg', size: 'w-14 h-14', radius: 190, angle: 215 },
    { name: 'LG', logo: '/LG.jpg', size: 'w-14 h-14', radius: 188, angle: 375 },
  ];

  const onLoginSubmit = async (data: LoginFormData) => {
    const trimmedEmail = data.email.trim();

    // Check lockout before attempting login
    const remaining = lockoutStore.getRemainingLockoutTime(trimmedEmail);
    if (remaining > 0) {
      setLockoutTimer(remaining);
      setError(`Too many attempts. Please wait ${remaining} seconds.`);
      return;
    }

    setIsLoading(true);
    setError("");
    setIsEmailUnconfirmed(false);
    try {
      const success = await login(trimmedEmail, data.password);
      if (success) {
        lockoutStore.recordSuccess(trimmedEmail);
        const currentSeller = useAuthStore.getState().seller;
        navigate(resolveSellerLandingPath(currentSeller));
      } else {
        // Record failure for lockout
        lockoutStore.recordFailure(trimmedEmail);
        const newRemaining = lockoutStore.getRemainingLockoutTime(trimmedEmail);
        
        if (newRemaining > 0) {
          setLockoutTimer(newRemaining);
          setError(`Too many failed attempts. Locked out for ${newRemaining} seconds.`);
        } else {
          setError("Invalid email or password");
        }
      }
    } catch (err: any) {
      // For security, map generic invalid credentials to a standard message
      if (err?.message === 'Invalid login credentials') {
        setError("Invalid email or password");
      } else if (err?.message === 'Email not confirmed') {
        setError("Your email address has not been confirmed yet.");
        setIsEmailUnconfirmed(true);
      } else {
        setError(err?.message || "An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendLink = async () => {
    const email = watchedEmail.trim();
    if (!email) return;

    setIsLoading(true);
    try {
      await authService.resendVerificationLink(email);
      navigate("/email-confirmed", { state: { email, role: "seller", resent: true } });
    } catch (err: any) {
      setError(err?.message || "Failed to resend verification link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col md:flex-row font-sans overflow-hidden">
      {/* Left Side: Brand Orbit (Gradient) */}
      <div className="hidden md:flex w-full md:w-1/2 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] relative items-center justify-center p-8 md:p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center"
        >
          <h2 className="text-5xl font-black text-white font-heading mb-4 tracking-tight drop-shadow-sm relative z-20">The Global System</h2>
          <p className="text-white max-w-md mx-auto text-lg font-medium leading-relaxed mb-12 relative z-20">
            Join the ecosystem where sellers meet global standards.
          </p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="relative w-[450px] h-[450px] flex items-center justify-center scale-75 lg:scale-100"
          >
            <div className='absolute w-[200px] h-[200px] border-2 border-dashed border-white/30 rounded-full animate-[spin_60s_linear_infinite]'></div>
            <div className="absolute w-[360px] h-[360px] border-2 border-white/20 rounded-full animate-[spin_80s_linear_infinite_reverse]"></div>

            <div className="z-30 w-24 h-24 bg-white rounded-full shadow-[0_0_50px_rgba(255,255,255,0.3)] flex items-center justify-center relative ring-8 ring-white/20">
              <img loading="lazy" src="/BazaarX.png" alt="BazaarPH" className="w-14 h-14 object-contain" />
            </div>

            {/* Planets Logic */}
            <div className='absolute inset-0 w-full h-full animate-[spin_60s_linear_infinite]'>
              {verifiedBrands.filter((_, i) => i % 2 === 0).map((brand) => (
                <div
                  key={brand.name}
                  className="absolute top-1/2 left-1/2 rounded-full bg-white shadow-lg border border-white/20 flex items-center justify-center p-2"
                  style={{
                    width: brand.size.split(' ')[0] === 'w-16' ? '60px' : '50px',
                    height: brand.size.split(' ')[0] === 'w-16' ? '60px' : '50px',
                    transform: `rotate(${brand.angle}deg) translate(${brand.radius}px) rotate(-${brand.angle}deg) translate(-50%, -50%)`,
                  }}
                >
                  <img loading="lazy" src={brand.logo} alt={brand.name} className="w-full h-full object-contain" />
                </div>
              ))}
            </div>

            <div className='absolute inset-0 w-full h-full animate-[spin_80s_linear_infinite_reverse]'>
              {verifiedBrands.filter((_, i) => i % 2 !== 0).map((brand) => (
                <div
                  key={brand.name}
                  className="absolute top-1/2 left-1/2 rounded-full bg-white shadow-lg border border-white/20 flex items-center justify-center p-2"
                  style={{
                    width: brand.size.split(' ')[0] === 'w-16' ? '60px' : '50px',
                    height: brand.size.split(' ')[0] === 'w-16' ? '60px' : '50px',
                    transform: `rotate(${brand.angle}deg) translate(${brand.radius}px) rotate(-${brand.angle}deg) translate(-50%, -50%)`,
                  }}
                >
                  <img loading="lazy" src={brand.logo} alt={brand.name} className="w-full h-full object-contain" />
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Right Side: Login Form (White) */}
      <div className="w-full md:w-1/2 bg-white flex items-center justify-center p-8 md:p-12 relative overflow-y-auto">
        <div className="max-w-[400px] w-full">
          <div className="mb-10 text-center md:text-left">
            <Link to="/" className="inline-block relative group">
              <div className="w-16 h-16 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20 transition-transform group-hover:scale-105 group-active:scale-95 mx-auto md:mx-0">
                <img loading="lazy" src='/BazaarX.png' alt='BazaarX Logo' className='w-10 h-10 object-contain brightness-0 invert' />
              </div>
            </Link>
            <h1 className="text-4xl font-extrabold text-[var(--text-headline)] font-heading tracking-tight mb-3">Welcome Back</h1>
            <p className="text-base text-[var(--text-secondary)] font-medium leading-relaxed">Sign in to manage your <span className="font-bold text-[var(--brand-primary)]">BazaarX Store</span>.</p>
          </div>

          {lockoutTimer > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl flex items-center gap-3 text-sm border border-red-100"
            >
              <ShieldAlert size={20} className="shrink-0" />
              <div>
                <p className="font-bold">Login Restricted</p>
                <p className="opacity-90">Please wait <span className="font-bold underline">{lockoutTimer}s</span> before retrying.</p>
              </div>
            </motion.div>
          )}

          {isVerified && (

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-green-50 text-green-700 rounded-2xl flex items-center gap-3 text-sm border border-green-100"
            >
              <CheckCircle size={20} className="shrink-0" />
              <div>
                <p className="font-bold">Seller Verified!</p>
                <p className="opacity-90 text-xs">Your account is ready. Please sign in to continue.</p>
              </div>
            </motion.div>
          )}


          {/* Quick Access Card */}
          <div className="mb-8 p-5 bg-orange-50/50 border border-orange-100 rounded-2xl transition-all hover:bg-orange-50 hover:border-orange-200">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-[10px] font-black text-[var(--brand-primary)] uppercase tracking-widest mb-1">Testing Mode</p>
                <p className="text-xs font-medium text-gray-500">Quick-fill demo accounts</p>
              </div>
              <button
                type="button"
                onClick={() => { setValue('email', 'seller1@bazaarph.com'); setValue('password', 'Test@123456'); }}
                className="text-[10px] font-bold text-[var(--brand-primary)] border border-orange-200 bg-white px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-all active:scale-95 shadow-sm"
              >
                Auto-Fill
              </button>
            </div>
            <div className="space-y-2 text-xs text-[var(--text-secondary)] opacity-80 mt-3 border-t border-orange-200/50 pt-3">
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] inline-block"></span><span>Password: <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-orange-100">Test@123456</span></span></span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex flex-col gap-3 text-sm border border-red-100 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <AlertCircle size={18} /> {error}
              </div>
              {isEmailUnconfirmed && (
                <button
                  type="button"
                  onClick={handleResendLink}
                  className="mt-1 text-[var(--brand-primary)] font-bold hover:underline flex items-center gap-2 self-start ml-7"
                >
                  <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                  Resend Verification Link
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit(onLoginSubmit)} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-[var(--text-headline)] ml-1">Email Address</label>
              <div className="relative group">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${errors.email ? "text-red-500" : "text-gray-400 group-focus-within:text-[var(--brand-primary)]"}`} />
                <input
                  type="email"
                  {...register("email")}
                  className={`w-full pl-12 pr-4 py-4 bg-white border rounded-xl outline-none transition-all text-sm font-medium placeholder:text-gray-400 hover:border-gray-300 ${errors.email ? "border-red-500" : "border-gray-200 focus:border-[var(--brand-primary)]"}`}
                  placeholder="name@example.com"
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[var(--text-headline)] ml-1">Password</label>
              <div className="relative group">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${errors.password ? "text-red-500" : "text-gray-400 group-focus-within:text-[var(--brand-primary)]"}`} />
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  className={`w-full pl-12 pr-12 py-4 bg-white border rounded-xl outline-none transition-all text-sm font-medium placeholder:text-gray-400 hover:border-gray-300 ${errors.password ? "border-red-500" : "border-gray-200 focus:border-[var(--brand-primary)]"}`}
                  placeholder="Enter your password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="w-5 h-5 border-2 border-gray-300 rounded-md peer-checked:bg-[var(--brand-primary)] peer-checked:border-[var(--brand-primary)] transition-all"></div>
                  <Check size={14} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
                </div>
                <span className="text-sm font-medium text-gray-500 group-hover:text-gray-700 transition-colors">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)] transition-colors hover:underline">Forgot Password?</Link>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !isFormValid || lockoutTimer > 0}
              className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white h-14 rounded-xl text-lg font-bold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{lockoutTimer > 0 ? `Locked (${lockoutTimer}s)` : "Sign In"}</span>
                  <ArrowRight size={20} />
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-gray-500 text-sm font-medium">
            New to BazaarX? <Link to="/seller/register" className="text-[var(--brand-primary)] font-bold hover:text-[var(--brand-primary-dark)] transition-colors hover:underline">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function SellerRegister() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [switchContext, setSwitchContext] = useState<RoleSwitchContext | null>(null);
  const [legalModal, setLegalModal] = useState<{ isOpen: boolean; type: "terms" | "privacy" }>({
    isOpen: false,
    type: "terms",
  });


  const lockoutStore = useLockoutStore();

  // Email verification state
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [emailMessage, setEmailMessage] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const isSwitchMode = switchContext?.targetMode === "seller";

  const { register, hydrateSellerFromSession } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register: formRegister,
    handleSubmit,
    control,
    trigger,
    watch,
    setValue,
    setError: setFormError,
    clearErrors,
    formState: { errors },
  } = useForm<SellerSignupFormData>({
    resolver: zodResolver(sellerSignupSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });


  const watchedFirstName = watch("firstName");
  const watchedLastName = watch("lastName");
  const watchedEmail = watch("email");
  const watchedPassword = watch("password");
  const watchedConfirmPassword = watch("confirmPassword");
  const watchedTerms = watch("terms");


  const isStep1Valid = Boolean(
    watchedFirstName &&
    watchedLastName &&
    watchedEmail &&
    watchedPassword &&
    watchedConfirmPassword &&
    watchedTerms &&
    watchedPassword === watchedConfirmPassword &&
    !errors.email &&
    !errors.password &&
    !errors.confirmPassword &&
    !errors.terms &&
    (isSwitchMode || emailStatus === "available")
  );


  useEffect(() => {
    const state = location.state as { roleSwitchContext?: RoleSwitchContext } | null;
    const stateContext = state?.roleSwitchContext;
    const storedContext = readRoleSwitchContext("seller");

    const context =
      stateContext && stateContext.targetMode === "seller"
        ? stateContext
        : storedContext;

    if (!context || context.targetMode !== "seller") return;

    setSwitchContext(context);
    if (context.firstName) setValue("firstName", context.firstName);
    if (context.lastName) setValue("lastName", context.lastName);
    if (context.email) setValue("email", context.email);
    if (context.phone) setValue("phone", context.phone);
  }, [location.state, setValue]);


  // --- LIVE EMAIL CHECK ---
  useEffect(() => {
    const trimmedEmail = watchedEmail?.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || isSwitchMode) {
      setEmailStatus("idle");
      setEmailMessage("");
      return;
    }

    setEmailStatus("checking");
    const timeoutId = setTimeout(async () => {
      try {
        const status = await authService.getEmailRoleStatus(trimmedEmail);
        if (!status.exists) {
          setEmailStatus("available");
          setEmailMessage("Email is available.");
          clearErrors("email");
        } else {
          const isBuyerOnly = status.roles.length === 1 && status.roles[0] === "buyer";
          if (isBuyerOnly) {
            setEmailStatus("available");
            setEmailMessage("Existing buyer account found. You can upgrade to seller.");
            clearErrors("email");
          } else {
            setEmailStatus("taken");
            const msg = status.roles.includes("seller")
              ? "This email is already registered as a seller."
              : "This email is already registered with restricted roles.";
            setEmailMessage(msg);
            setFormError("email", { type: "manual", message: msg });
          }
        }
      } catch (err) {
        setEmailStatus("idle");
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [watchedEmail, isSwitchMode, clearErrors, setFormError]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleNextStep = async () => {
    const isValidStep1 = await trigger(["firstName", "lastName", "email", "password", "confirmPassword"]);
    if (isValidStep1 && (isSwitchMode || emailStatus === "available")) {
      // For role-switch mode, skip Step 2 (email verification) and go directly to onboarding
      if (isSwitchMode) {
        navigate("/seller/onboarding");
        return;
      }

      // For new signup, initiate signup and go to Step 2 (email verification display)
      setIsLoading(true);
      setError("");
      try {
        // Persist form data so AuthCallbackPage can finalize DB writes after email verification.
        sessionStorage.setItem("pendingSellerSignup", JSON.stringify({
          email: watchedEmail.trim().toLowerCase(),
          password: watchedPassword,
          phone: watch("phone") || "",
          user_type: "seller",
          firstName: watchedFirstName,
          lastName: watchedLastName,
        }));

        await authService.initiateSignUp(
          watchedEmail.trim().toLowerCase(),
          watchedPassword,
          {
            user_type: "seller",
            phone: watch("phone") || "",
            first_name: watchedFirstName,
            last_name: watchedLastName,
          }
        );
        
        setStep(2);
        setResendCooldown(60);
        setResendMessage("");
      } catch (err: any) {
        setError(err.message || "Failed to start registration. Please try again.");
      } finally {
        setIsLoading(false);
      }

    }
  };



  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setResendMessage("");
    try {
      await authService.resendVerificationLink(watchedEmail.trim().toLowerCase());
      setResendCooldown(60);
      setResendMessage("A new confirmation link has been sent!");
    } catch (err: any) {
      setResendMessage(err?.message || "Failed to resend. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };


  const onSubmitForm = async (data: SellerSignupFormData) => {
    // This function is no longer used in the new flow (Step 2 uses handleStep2Next instead)
    // Kept for reference but should not be called
  };

  return (
    <div className="h-screen flex flex-col md:flex-row font-sans overflow-hidden">
      {/* Left Side: Gradient with Quote */}
      <div className="hidden md:flex w-full md:w-1/2 flex-col justify-center p-8 md:p-12 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>

        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 max-w-lg"
        >
          <div className="space-y-10">
            <Quote className="text-white w-16 h-16 opacity-40 mb-[-2rem]" />
            <h2 className="text-4xl lg:text-5xl font-serif italic leading-[1.15] text-white drop-shadow-md">
              "BazaarX bridged the gap between my local craft and the global market. The growth has been phenomenal."
            </h2>
            <div className="flex items-center gap-5 pt-4">
              <div>
                <p className="font-bold text-white text-xl">Juan Dela Cruz</p>
                <p className="text-white/80 font-medium">Premier Online Seller</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white relative overflow-y-auto">
        <div className="max-w-[480px] mx-auto w-full relative z-10">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-orange-500/20 mx-auto">
              <img loading="lazy" src="/BazaarX.png" className="h-9 w-9 object-contain brightness-0 invert"></img>
            </div>
            <h1 className='text-3xl font-black text-[var(--text-headline)] font-heading tracking-tight mb-2'>
              {isSwitchMode ? "Complete Seller Profile" : "Join BazaarX"}
            </h1>
            <p className='text-base text-[var(--text-secondary)] font-medium'>
              {isSwitchMode
                ? "Finish your seller details to switch modes."
                : "Create your seller account to get started."}
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 mb-10">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-md ${step >= 1 ? "bg-[var(--brand-primary)] text-white shadow-orange-500/20" : "bg-white text-gray-400 border border-gray-100"}`}>
              {step > 1 ? <Check size={18} /> : "1"}
            </div>
            <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
              <motion.div initial={{ width: "0%" }} animate={{ width: step >= 2 ? "100%" : "0%" }} className="h-full bg-[var(--brand-primary)]" />
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-md ${step >= 2 ? "bg-[var(--brand-primary)] text-white shadow-orange-500/20" : "bg-white text-gray-400 border border-gray-100"}`}>
              2
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm border border-red-100 animate-in slide-in-from-top-2">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <form className="space-y-6">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[var(--text-headline)] ml-1">First Name</label>
                      <div className="relative group">
                        <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${errors.firstName ? "text-red-500" : "text-gray-400 group-focus-within:text-[var(--brand-primary)]"}`} />
                        <input
                          type="text"
                          {...formRegister("firstName")}
                          placeholder="Juan"
                          className={`w-full pl-12 pr-4 py-4 border rounded-xl outline-none transition-all text-sm font-medium ${errors.firstName ? "border-red-500" : "border-gray-200 focus:border-[var(--brand-primary)]"}`}
                        />
                      </div>
                      {errors.firstName && <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{errors.firstName.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[var(--text-headline)] ml-1">Last Name</label>
                      <div className="relative group">
                        <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${errors.lastName ? "text-red-500" : "text-gray-400 group-focus-within:text-[var(--brand-primary)]"}`} />
                        <input
                          type="text"
                          {...formRegister("lastName")}
                          placeholder="Dela Cruz"
                          className={`w-full pl-12 pr-4 py-4 border rounded-xl outline-none transition-all text-sm font-medium ${errors.lastName ? "border-red-500" : "border-gray-200 focus:border-[var(--brand-primary)]"}`}
                        />
                      </div>
                      {errors.lastName && <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{errors.lastName.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[var(--text-headline)] ml-1">Email Address</label>

                    <div className="relative group">
                      <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${errors.email ? "text-red-500" : "text-gray-400 group-focus-within:text-[var(--brand-primary)]"}`} />
                      <input
                        type="email"
                        {...formRegister("email")}
                        readOnly={isSwitchMode}
                        placeholder="name@example.com"
                        className={`w-full pl-12 pr-4 py-4 border rounded-xl outline-none transition-all text-sm font-medium ${errors.email ? "border-red-500" : "border-gray-200 focus:border-[var(--brand-primary)]"}`}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {emailStatus === 'checking' && <div className="w-4 h-4 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />}
                        {emailStatus === 'available' && <Check className="w-4 h-4 text-green-500" />}
                      </div>
                    </div>
                    {errors.email ? (
                      <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{errors.email.message}</p>
                    ) : emailMessage && emailStatus !== 'idle' ? (
                      <p className={`text-xs mt-1 ml-1 font-medium ${emailStatus === 'available' ? 'text-green-600' : 'text-gray-500'}`}>{emailMessage}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[var(--text-headline)] ml-1">
                      {isSwitchMode ? "Current Password" : "Password"}
                    </label>
                    <div className="relative group">
                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${errors.password ? "text-red-500" : "text-gray-400 group-focus-within:text-[var(--brand-primary)]"}`} />
                      <input
                        type={showPassword ? "text" : "password"}
                        {...formRegister("password")}
                        placeholder={isSwitchMode ? "Enter your current password" : "Create a strong password"}
                        className={`w-full pl-12 pr-12 py-4 border rounded-xl outline-none transition-all text-sm font-medium ${errors.password ? "border-red-500" : "border-gray-200 focus:border-[var(--brand-primary)]"}`}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                    {errors.password && <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{errors.password.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[var(--text-headline)] ml-1">
                      Confirm Password
                    </label>
                    <div className="relative group">
                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${errors.confirmPassword ? "text-red-500" : "text-gray-400 group-focus-within:text-[var(--brand-primary)]"}`} />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        {...formRegister("confirmPassword")}
                        placeholder="Confirm your password"
                        className={`w-full pl-12 pr-12 py-4 border rounded-xl outline-none transition-all text-sm font-medium ${errors.confirmPassword ? "border-red-500" : "border-gray-200 focus:border-[var(--brand-primary)]"}`}
                      />
                    </div>
                    {errors.confirmPassword && <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{errors.confirmPassword.message}</p>}
                  </div>
 
                   <div className="flex flex-col gap-1 pt-1">
                     <div className="flex items-start gap-3">
                       <Controller
                         name="terms"
                         control={control}
                         render={({ field }) => (
                           <Checkbox
                             id="terms"
                             checked={field.value}
                             onCheckedChange={field.onChange}
                             className={`rounded-md border-2 mt-0.5 ${errors.terms ? 'border-red-500' : 'border-gray-200'} text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] cursor-pointer transition-colors`}
                           />
                         )}
                       />
                       <label htmlFor="terms" className="flex-1 text-sm text-gray-500 font-medium leading-relaxed cursor-pointer select-none">
                         I agree to the{" "}
                         <button
                           type="button"
                           onClick={() => setLegalModal({ isOpen: true, type: "terms" })}
                           className="font-bold text-[var(--brand-primary)] hover:underline"
                         >
                           Terms of Service
                         </button>{" "}
                         and{" "}
                         <button
                           type="button"
                           onClick={() => setLegalModal({ isOpen: true, type: "privacy" })}
                           className="font-bold text-[var(--brand-primary)] hover:underline"
                         >
                           Privacy Policy
                         </button>
                       </label>
                     </div>
                     {errors.terms && <p className="text-xs text-red-500 ml-8 font-medium">{errors.terms.message}</p>}
                   </div>


                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={!isStep1Valid || isLoading}
                    className="w-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] hover:from-[var(--brand-primary)]/90 hover:to-[var(--brand-primary-dark)]/90 text-white h-14 rounded-xl text-lg font-bold shadow-xl shadow-orange-500/20 mt-4 flex items-center justify-center gap-2 transition-all hover:translate-x-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0"
                  >
                    {isLoading ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Next: Verify Email</span> <ArrowRight size={20} />
                      </>
                    )}
                  </button>

                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  {/* Email Verification Display */}
                  <div className="text-center mb-8 p-6 bg-orange-50 rounded-2xl border border-orange-100">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                      className="mx-auto mb-4 w-16 h-16 rounded-full bg-white flex items-center justify-center"
                    >
                      <div className="relative">
                        <Mail size={32} className="text-[var(--brand-primary)]" />
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                          <Store size={12} className="text-[var(--brand-primary)]" />
                        </div>
                      </div>
                    </motion.div>

                    <h2 className="text-xl font-bold text-[var(--text-headline)] mb-2">Verify Your Email</h2>
                    <p className="text-sm text-[var(--text-muted)] mb-1">
                      We sent a confirmation link to your email:
                    </p>
                    <p className="font-semibold text-[var(--text-primary)] text-sm mb-4 break-all">
                      {watchedEmail}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      Click the link in your email to activate your <span className="font-semibold">BazaarX Seller Account</span>.
                      You can then proceed to set up your store profile.
                      The link expires in <span className="font-semibold">24 hours</span>.
                    </p>
                  </div>


                  {resendMessage && (
                    <motion.p
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`text-xs text-center ${resendMessage.includes("sent")
                          ? "text-green-600"
                          : "text-red-500"
                        }`}
                    >
                      {resendMessage}
                    </motion.p>
                  )}

                  {/* Info about proceeding without verification */}
                  <div className="flex gap-4 mt-8 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 h-12 rounded-xl font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors text-sm border border-transparent hover:border-gray-200"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendCooldown > 0 || resendLoading}
                      className="flex-[2] bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] hover:from-[var(--brand-primary)]/90 hover:to-[var(--brand-primary-dark)]/90 text-white h-12 rounded-xl font-bold shadow-xl shadow-orange-500/20 text-sm transition-all active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resendLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <RefreshCw size={15} className="mr-2" />
                          {resendCooldown > 0
                            ? `Resend in ${resendCooldown}s`
                            : "Resend Confirmation Email"}
                        </>
                      )}
                    </button>

                  </div>

                  <p className="text-xs text-[var(--text-muted)] text-center mt-4">
                    Using a different email?{" "}
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-[var(--brand-primary)] font-semibold hover:underline"
                    >
                      Start over
                    </button>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          <div className="mt-10 text-center border-t border-gray-100 pt-6">
            <p className="text-gray-500 font-medium text-sm">
              Already have an account? <Link to="/seller/login" className="text-[var(--brand-primary)] font-bold hover:underline transition-all">Sign in here</Link>
            </p>
          </div>
        </div>
      </div>
 
       <LegalModal
         isOpen={legalModal.isOpen}
         onClose={() => setLegalModal((prev) => ({ ...prev, isOpen: false }))}
         type={legalModal.type}
       />
     </div>

  );
}
