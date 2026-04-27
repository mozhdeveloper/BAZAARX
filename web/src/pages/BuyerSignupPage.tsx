import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  AlertCircle,
  ChevronLeft,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupFormData } from "../lib/schemas";
import { useBuyerStore } from "../stores/buyerStore";
import { Checkbox } from "../components/ui/checkbox";
import { authService } from "../services/authService";
import { supabase } from "../lib/supabase";
import {
  clearRoleSwitchContext,
  readRoleSwitchContext,
  type RoleSwitchContext,
} from "@/services/roleSwitchContext";
import { LegalModal } from "../components/LegalModal";



export default function BuyerSignupPage() {
  const navigate = useNavigate();
  const location = useLocation();


  const {
    control,
    handleSubmit,
    setValue,
    setError: setFormError,
    clearErrors,
    watch,
    formState: { errors, isValid },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailCheckState, setEmailCheckState] = useState<"idle" | "checking" | "available" | "taken" | "error">("idle");
  const [emailCheckMessage, setEmailCheckMessage] = useState("");
  const [switchContext, setSwitchContext] = useState<RoleSwitchContext | null>(null);
  const [legalModal, setLegalModal] = useState<{ isOpen: boolean; type: "terms" | "privacy" }>({
    isOpen: false,
    type: "terms",
  });

  
  const isSwitchMode = switchContext?.targetMode === "buyer";
  const watchedEmail = watch("email");
  const watchedPassword = watch("password");
  const watchedConfirmPassword = watch("confirmPassword");

  const isSwitchModeRef = !!switchContext;
  const hasPasswordMismatch = watchedConfirmPassword && watchedPassword !== watchedConfirmPassword;

  useEffect(() => {
    const state = location.state as { roleSwitchContext?: RoleSwitchContext } | null;
    const stateContext = state?.roleSwitchContext;
    const storedContext = readRoleSwitchContext("buyer");

    const context =
      stateContext && stateContext.targetMode === "buyer"
        ? stateContext
        : storedContext;

    if (!context || context.targetMode !== "buyer") return;

    setSwitchContext(context);
    setValue("email", context.email || "", { shouldValidate: true });
    setValue("phone", context.phone || "", { shouldValidate: true });
    setValue("terms", true, { shouldValidate: true });
  }, [location.state, setValue]);

  // Email availability check effect
  useEffect(() => {
    if (isSwitchMode || !watchedEmail) {
      setEmailCheckState("idle");
      setEmailCheckMessage("");
      return;
    }

    // Basic format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(watchedEmail)) {
      setEmailCheckState("error");
      setEmailCheckMessage("Please enter a valid email format.");
      return;
    }

    const timer = setTimeout(async () => {
      setEmailCheckState("checking");
      const exists = await authService.checkEmailExists(watchedEmail);
      
      if (exists) {
        setEmailCheckState("taken");
        setEmailCheckMessage("This email is already registered. Please sign in instead.");
        setFormError("email", { type: "manual", message: "Email is already taken" });
      } else {
        setEmailCheckState("available");
        setEmailCheckMessage("Email is available.");
        if (errors.email?.type === "manual") {
          clearErrors("email");
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [watchedEmail, isSwitchMode, setFormError, clearErrors, errors.email?.type]);

  const onSignupSubmit = async (data: SignupFormData) => {
    const { firstName, lastName, email, phone, password } = data;
    setError("");

    if (emailCheckState === "taken") {
      setError("This email is already registered. Please sign in instead.");
      return;
    }

    setIsLoading(true);

    try {
      const fullName = `${firstName} ${lastName}`;

      if (isSwitchMode) {
        try {
          const { data: authData, error: authError } =
            await supabase.auth.signInWithPassword({
              email: email,
              password: password,
            });
          if (authError || !authData.user?.id) {
            setError("Incorrect password. Please enter your current account password.");
            setIsLoading(false);
            return;
          }

          if (switchContext?.userId && authData.user.id !== switchContext.userId) {
            setError("Account mismatch. Please use the same account to continue.");
            setIsLoading(false);
            return;
          }
        } catch {
          setError("Incorrect password. Please enter your current account password.");
          setIsLoading(false);
          return;
        }

        const result = await authService.upgradeCurrentUserToBuyer({
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          email: email,
        });

        await useBuyerStore
          .getState()
          .initializeBuyerProfile(result.userId, {});

        clearRoleSwitchContext();
        setIsLoading(false);
        navigate("/profile");
        return;
      }

      // --- Phase 1: Initiate signup (creates auth.users, sends verification email) ---
      // DB records (profiles, buyers, user_roles) are created in AuthCallbackPage after verification.
      const signupResult = await authService.initiateSignUp(
        email,
        password,
        {
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          phone: phone,
          user_type: "buyer",
        } as any,
      );

      // Persist form data so AuthCallbackPage can finalize DB writes after email verification.
      sessionStorage.setItem(
        "pendingBuyerSignup",
        JSON.stringify({
          userId: signupResult?.userId,
          firstName: firstName,
          lastName: lastName,
          email: email,
          phone: phone,
          user_type: "buyer",
        }),
      );

      setIsLoading(false);
      navigate("/verify-email", { state: { email: email } });
    } catch (err: any) {
      console.error("Signup exception:", err);
      if (err.message?.includes("User already registered") || err.message?.includes("already exists")) {
        setError("This email is already registered. Please sign in instead.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setIsLoading(false);
    }
  };


  return (

    <div className="min-h-screen relative overflow-hidden font-sans bg-[var(--brand-wash)]">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-orange-50/30 to-white animate-gradient [background-size:400%_400%]"></div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-orange-200/20 rounded-full mix-blend-multiply filter blur-3xl opacity-40"
        ></motion.div>
        <motion.div
          animate={{
            x: [0, -40, 0],
            y: [0, 60, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-orange-300/20 rounded-full mix-blend-multiply filter blur-3xl opacity-40"
        ></motion.div>
        <motion.div
          animate={{
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-100/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
        ></motion.div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col md:flex-row items-center justify-center p-6 lg:p-12">
        <Link
          to="/"
          className="absolute top-6 left-6 md:top-12 md:left-12 z-50 flex items-center gap-1 text-[var(--text-primary)] hover:text-[var(--brand-primary)] transition-colors font-medium text-sm"
        >
          <ChevronLeft size={18} />
          Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full md:w-1/2 flex flex-col items-center justify-center mb-12 md:mb-0"
        >
          <h1 className="font-fondamento text-[13vw] leading-[0.85] text-[var(--brand-primary)] tracking-tighter cursor-default select-none transition-all duration-300">
            BazaarX
          </h1>
          <p className="text-[var(--brand-primary)] font-bold text-[10px] lg:text-xs uppercase tracking-[0.2em] mb-2 lg:mb-5 whitespace-nowrap">
            From Global Factories Directly to Your Doorstep
          </p>
        </motion.div>

        {/* Right - Signup Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-[0_20px_50px_rgba(255,106,0,0.1)] border border-white/50 md:ml-32"
        >
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] font-heading">
                {isSwitchMode ? "Complete Buyer Profile" : "Create Account"}
              </h2>
              <p className="text-[var(--text-muted)] text-sm font-sans mt-1">
                {isSwitchMode
                  ? "Add your name to finish switching to buyer mode."
                  : "Join thousand of Filipino shoppers."}
              </p>
            </div>
            <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
              <img loading="lazy" src="/BazaarX.png" alt="BazaarX" className="w-12 h-12 object-contain" />
            </div>
          </div>

          {error && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-2 -mt-4 p-4 bg-red-50 text-[var(--color-error)] rounded-[var(--radius-md)] flex items-center gap-3 text-sm border border-red-100"
              >
                <AlertCircle size={18} /> {error}
              </motion.div>
            </AnimatePresence>
          )}

          <form onSubmit={handleSubmit(onSignupSubmit)} className="space-y-3">
            {/* First Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label
                  htmlFor="firstName"
                  className="text-sm font-bold text-[var(--text-primary)] ml-1"
                >
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                  <Controller
                    name="firstName"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        id="firstName"
                        type="text"
                        placeholder="Juan"
                        className={`w-full pl-11 pr-4 py-3 bg-[var(--secondary)]/10 border ${errors.firstName ? 'border-red-500' : 'border-[var(--border)]'} rounded-[var(--radius-md)] focus:ring-0 focus:ring-[var(--primary)]/10 focus:bg-white focus:border-[var(--brand-primary)] outline-none transition-all text-sm`}
                        disabled={isLoading}
                      />
                    )}
                  />
                </div>
                {errors.firstName && <p className="text-xs text-red-600 ml-1">{errors.firstName.message}</p>}
              </div>

              {/* Last Name */}
              <div className="space-y-1">
                <label
                  htmlFor="lastName"
                  className="text-sm font-bold text-[var(--text-primary)] ml-1"
                >
                  Last Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                  <Controller
                    name="lastName"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        id="lastName"
                        type="text"
                        placeholder="Dela Cruz"
                        className={`w-full pl-11 pr-4 py-3 bg-[var(--secondary)]/10 border ${errors.lastName ? 'border-red-500' : 'border-[var(--border)]'} rounded-[var(--radius-md)] focus:ring-0 focus:ring-[var(--primary)]/10 focus:bg-white focus:border-[var(--brand-primary)] outline-none transition-all text-sm`}
                        disabled={isLoading}
                      />
                    )}
                  />
                </div>
                {errors.lastName && <p className="text-xs text-red-600 ml-1">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="email"
                className="text-sm font-bold text-[var(--text-primary)] ml-1"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      readOnly={isSwitchMode}
                      className={`w-full pl-11 pr-4 py-3 bg-[var(--secondary)]/10 border ${errors.email ? 'border-red-500' : 'border-[var(--border)]'} rounded-[var(--radius-md)] focus:ring-0 focus:ring-[var(--primary)]/10 focus:bg-white focus:border-[var(--brand-primary)] outline-none transition-all text-sm`}
                      disabled={isLoading}
                    />
                  )}
                />
              </div>
              {!isSwitchMode && (errors.email || emailCheckState !== "idle") && (
                <p
                  className={`text-xs mt-1 ${
                    errors.email || emailCheckState === "taken" || emailCheckState === "error"
                      ? "text-red-600"
                      : emailCheckState === "checking"
                        ? "text-[var(--text-muted)]"
                        : "text-green-600"
                  }`}
                >
                  {errors.email?.message || (emailCheckState === "checking" ? "Checking email availability..." : emailCheckMessage)}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="phone"
                className="text-sm font-bold text-[var(--text-primary)] ml-1"
              >
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      id="phone"
                      type="tel"
                      placeholder="09123456789"
                      readOnly={isSwitchMode}
                      className={`w-full pl-11 pr-4 py-3 bg-[var(--secondary)]/10 border ${errors.phone ? 'border-red-500' : 'border-[var(--border)]'} rounded-[var(--radius-md)] focus:ring-0 focus:ring-[var(--primary)]/10 focus:bg-white focus:border-[var(--brand-primary)] outline-none transition-all text-sm`}
                      disabled={isLoading}
                    />
                  )}
                />
              </div>
              {errors.phone && <p className="text-xs text-red-600 ml-1">{errors.phone.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="text-sm font-bold text-[var(--text-primary)] ml-1"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className={`w-full pl-11 pr-11 py-3 bg-[var(--secondary)]/10 border ${errors.password ? 'border-red-500' : 'border-[var(--border)]'} rounded-[var(--radius-md)] focus:ring-0 focus:ring-[var(--primary)]/10 focus:bg-white focus:border-[var(--brand-primary)] outline-none transition-all text-sm`}
                        disabled={isLoading}
                      />
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    disabled={isLoading}
                  >
                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-600 ml-1">{errors.password.message}</p>}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-bold text-[var(--text-primary)] ml-1"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                  <Controller
                    name="confirmPassword"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className={`w-full pl-11 pr-11 py-3 bg-[var(--secondary)]/10 border ${errors.confirmPassword ? 'border-red-500' : 'border-[var(--border)]'} rounded-[var(--radius-md)] focus:ring-0 focus:ring-[var(--primary)]/10 focus:bg-white focus:border-[var(--brand-primary)] outline-none transition-all text-sm`}
                        disabled={isLoading}
                      />
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-600 ml-1">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-1 pt-1">
              <div className="flex items-start gap-2">
                <Controller
                  name="terms"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="terms"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className={`rounded-md border ${errors.terms ? 'border-red-500' : 'border-[var(--border)]'} text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] cursor-pointer`}
                      disabled={isLoading}
                    />
                  )}
                />
                <label htmlFor="terms" className="flex-1 text-sm text-[var(--text-primary)] cursor-pointer select-none">
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
              {errors.terms && <p className="text-xs text-red-600 ml-7">{errors.terms.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading || !isValid || emailCheckState === "taken"}
              className={`btn-primary w-full h-14 text-md uppercase rounded-[var(--radius-md)] shadow-[var(--shadow-medium)] flex items-center justify-center gap-2 mt-2 ${
                (isLoading || !isValid || emailCheckState === "taken") ? 'opacity-50 cursor-not-allowed grayscale-[0.5]' : ''
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>{isSwitchMode ? "Complete Buyer Setup" : "Sign Up"}</>
              )}
            </button>

          </form>

          {!isSwitchMode && (
            <div className="mt-8 text-center text-[var(--text-secondary)] text-sm">
              Already have an account? <Link to="/login" className="text-[var(--brand-primary)] font-bold hover:underline ml-1">Log in here!</Link>
            </div>
          )}
        </motion.div>
      </div>

      <LegalModal
        isOpen={legalModal.isOpen}
        onClose={() => setLegalModal((prev) => ({ ...prev, isOpen: false }))}
        type={legalModal.type}
      />
    </div>

  );
}
