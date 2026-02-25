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
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useBuyerStore } from "../stores/buyerStore";
import { Checkbox } from "../components/ui/checkbox";
import { authService } from "../services/authService";
import { supabase } from "../lib/supabase";
import {
  clearRoleSwitchContext,
  readRoleSwitchContext,
  type RoleSwitchContext,
} from "@/services/roleSwitchContext";

export default function BuyerSignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setProfile } = useBuyerStore();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [switchContext, setSwitchContext] = useState<RoleSwitchContext | null>(null);
  const isSwitchMode = switchContext?.targetMode === "buyer";

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
    setFormData((prev) => ({
      ...prev,
      email: context.email || prev.email,
      phone: context.phone || prev.phone,
      terms: true,
    }));
  }, [location.state]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string) => {
    // Philippine phone number format
    return /^(\+63|0)?9\d{9}$/.test(phone.replace(/\s/g, ""));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.firstName || !formData.lastName) {
      setError("Please enter your full name.");
      return;
    }

    if (!formData.email || !validateEmail(formData.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!formData.phone || !validatePhone(formData.phone)) {
      setError("Please enter a valid Philippine phone number.");
      return;
    }

    if (!formData.password || formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!formData.terms) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setIsLoading(true);

    try {
      const fullName = `${formData.firstName} ${formData.lastName}`;

      if (isSwitchMode) {
        try {
          const { data: authData, error: authError } =
            await supabase.auth.signInWithPassword({
              email: formData.email,
              password: formData.password,
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
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          email: formData.email,
        });

        await useBuyerStore
          .getState()
          .initializeBuyerProfile(result.userId, {});

        clearRoleSwitchContext();
        setIsLoading(false);
        navigate("/profile");
        return;
      }

      const result = await authService.signUp(
        formData.email,
        formData.password,
        {
          full_name: fullName,
          phone: formData.phone,
          user_type: "buyer",
          email: formData.email,
          password: formData.password,
        },
      );

      if (!result || !result.user) {
        setError("Signup failed. Please try again.");
        setIsLoading(false);
        return;
      }

      const { user } = result;

      // Buyer record is already created by authService.signUp()
      const { data: buyerRow } = await supabase
        .from("buyers")
        .select("bazcoins")
        .eq("id", user.id)
        .single();
      const bazcoins = (buyerRow as any)?.bazcoins ?? 0;
      const buyerProfile = {
        id: user.id,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        avatar: `https://ui-avatars.com/api/?name=${fullName}&background=FF6B35&color=fff&size=150`,
        preferences: {
          language: "en",
          currency: "PHP",
          notifications: {
            email: true,
            sms: true,
            push: true,
          },
          privacy: {
            showProfile: true,
            showPurchases: false,
            showFollowing: true,
          },
        },
        memberSince: new Date(),
        totalOrders: 0,
        totalSpent: 0,
        bazcoins,
      };

      setProfile(buyerProfile);
      // Initialize cart from database
      await useBuyerStore.getState().initializeCart();
      clearRoleSwitchContext();
      setIsLoading(false);

      // Redirect to onboarding
      navigate("/buyer-onboarding");
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

  const handleGoogleSignup = async () => {
    setError("");
    setIsLoading(true);
    await authService.signInWithProvider("google");
    setTimeout(() => setIsLoading(false), 3000);
  };

  const handleFacebookSignup = async () => {
    setError("");
    setIsLoading(true);
    await authService.signInWithProvider("facebook");
    setTimeout(() => setIsLoading(false), 3000);
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
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full md:w-1/2 flex flex-col items-center justify-center mb-12 md:mb-0"
        >
          <h1 className="font-fondamento text-[13vw] leading-[0.85] text-[#FF6A00] tracking-tighter cursor-default select-none transition-all duration-300">
            BazaarX
          </h1>
          <p className="text-orange-500 font-bold text-[10px] lg:text-xs uppercase tracking-[0.2em] mb-2 lg:mb-5 whitespace-nowrap">
            From Global Factories Directly to Your Doorstep
          </p>
        </motion.div>

        {/* Right - Signup Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white/80 backdrop-blur-xl p-10 rounded-[50px] shadow-[0_20px_50px_rgba(255,106,0,0.1)] border border-white/50 md:ml-32"
        >
          <div className="mb-8">
            <div className="w-10 h-10 bg-white shadow-sm rounded-[var(--radius-md)] flex items-center justify-center mb-4 overflow-hidden border border-[var(--border)]">
              <img src="/BazaarX.png" alt="BazaarX" className="w-8 h-8 object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] font-heading">
              {isSwitchMode ? "Complete Buyer Profile" : "Create Account"}
            </h2>
            <p className="text-[var(--text-secondary)] text-sm font-sans">
              {isSwitchMode
                ? "Add your name to finish switching to buyer mode."
                : "Join thousand of Filipino shoppers."}
            </p>
          </div>

          {error && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 text-[var(--color-error)] rounded-[var(--radius-md)] flex items-center gap-3 text-sm border border-red-100"
              >
                <AlertCircle size={18} /> {error}
              </motion.div>
            </AnimatePresence>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
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
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="Juan"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-4 bg-[var(--secondary)]/10 border border-[var(--border)] rounded-[var(--radius-md)] focus:ring-4 focus:ring-[var(--primary)]/10 focus:bg-white focus:border-[var(--brand-primary)] outline-none transition-all text-sm"
                    disabled={isLoading}
                  />
                </div>
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
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Dela Cruz"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-4 bg-[var(--secondary)]/10 border border-[var(--border)] rounded-[var(--radius-md)] focus:ring-4 focus:ring-[var(--primary)]/10 focus:bg-white focus:border-[var(--brand-primary)] outline-none transition-all text-sm"
                    disabled={isLoading}
                  />
                </div>
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
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  readOnly={isSwitchMode}
                  className="w-full pl-11 pr-4 py-4 bg-[var(--secondary)]/10 border border-[var(--border)] rounded-[var(--radius-md)] focus:ring-4 focus:ring-[var(--primary)]/10 focus:bg-white focus:border-[var(--brand-primary)] outline-none transition-all text-sm"
                  disabled={isLoading}
                />
              </div>
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
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+63 912 345 6789"
                  value={formData.phone}
                  onChange={handleChange}
                  readOnly={isSwitchMode}
                  className="w-full pl-11 pr-4 py-4 bg-[var(--secondary)]/10 border border-[var(--border)] rounded-[var(--radius-md)] focus:ring-4 focus:ring-[var(--primary)]/10 focus:bg-white focus:border-[var(--brand-primary)] outline-none transition-all text-sm"
                  disabled={isLoading}
                />
              </div>
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
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-11 pr-11 py-4 bg-[var(--secondary)]/10 border border-[var(--border)] rounded-[var(--radius-md)] focus:ring-4 focus:ring-[var(--primary)]/10 focus:bg-white focus:border-[var(--brand-primary)] outline-none transition-all text-sm"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
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
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-11 pr-11 py-4 bg-[var(--secondary)]/10 border border-[var(--border)] rounded-[var(--radius-md)] focus:ring-4 focus:ring-[var(--primary)]/10 focus:bg-white focus:border-[var(--brand-primary)] outline-none transition-all text-sm"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 pt-2">
              <Checkbox
                id="terms"
                checked={formData.terms}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, terms: !!checked }))
                }
                className="rounded-md border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                disabled={isLoading}
              />
              <div className="flex-1 text-xs text-[var(--text-primary)]">
                I agree to the{" "}
                <Link
                  to="/terms"
                  className="font-bold text-[var(--brand-primary)] hover:underline"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  className="font-bold text-[var(--brand-primary)] hover:underline"
                >
                  Privacy Policy
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full h-14 text-lg rounded-[var(--radius-md)] shadow-[var(--shadow-medium)] flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-[var(--brand-primary)]/30 border-t-[var(--brand-primary)] rounded-full animate-spin" />
              ) : (
                <>{isSwitchMode ? "Complete Buyer Setup" : "Sign Up"} <ArrowRight size={18} /></>
              )}
            </button>

            {!isSwitchMode && (
            <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border)]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-[var(--text-muted)] font-medium font-sans uppercase tracking-wider">Or sign up with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleGoogleSignup}
                className="w-full h-14 text-sm font-medium flex items-center border-2 border-[var(--border)] hover:border-[var(--brand-primary)] hover:bg-[var(--secondary)]/5 rounded-[var(--radius-md)] justify-center gap-2 transition-all duration-200"
                disabled={isLoading}
              >
                <img
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  className="w-5 h-5"
                  alt="Google"
                />
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={handleFacebookSignup}
                className="w-full h-14 text-sm font-medium flex items-center border-2 border-[var(--border)] hover:border-[var(--brand-primary)] hover:bg-[var(--secondary)]/5 rounded-[var(--radius-md)] justify-center gap-2 transition-all duration-200"
                disabled={isLoading}
              >
                <img
                  src="https://www.svgrepo.com/show/475647/facebook-color.svg"
                  className="w-5 h-5"
                  alt="Facebook"
                />
                <span>Facebook</span>
              </button>
            </div>
            </>
            )}
          </form>

          {!isSwitchMode && (
          <div className="mt-8 text-center text-[var(--text-secondary)] text-sm">
            Already have an account? <Link to="/login" className="text-[var(--brand-primary)] font-bold hover:underline ml-1">Sign in here!</Link>
          </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
