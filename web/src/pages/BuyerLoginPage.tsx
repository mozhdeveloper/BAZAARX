import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
} from "lucide-react";
import { deriveBuyerName, useBuyerStore } from "../stores/buyerStore";
import { authService } from "../services/authService";
import { supabase } from "../lib/supabase";

export default function BuyerLoginPage() {
  const navigate = useNavigate();
  const { setProfile } = useBuyerStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.signIn(email, password);

      if (!result || !result.user) {
        setError("Login failed. Please try again.");
        setIsLoading(false);
        return;
      }

      const { user } = result;

      // Verify buyer role
      const { data: buyerData, error: buyerError } = await supabase
        .from("buyers")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (buyerError || !buyerData) {
        console.error("Buyer verification error:", buyerError);
        setError("This account is not registered as a buyer.");
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      // Get profile data
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      const profileAny = profileData as any;
      const { firstName, lastName, displayFullName } = deriveBuyerName({
        first_name: profileAny?.first_name,
        last_name: profileAny?.last_name,
        full_name: profileAny?.full_name,
        email: profileAny?.email || user.email || email,
      });
      const bazcoins = (buyerData as any)?.bazcoins ?? 0;
      const buyerProfile = {
        id: user.id,
        email: user.email || email,
        firstName,
        lastName,
        phone: profileAny?.phone || "",
        avatar:
          (buyerData as any)?.avatar_url ||
          profileAny?.avatar_url ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            displayFullName
          )}&background=FF6B35&color=fff`,
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
        memberSince: (profileData as any)?.created_at
          ? new Date((profileData as any).created_at)
          : new Date(),
        totalOrders: 0,
        totalSpent: 0,
        bazcoins,
      };

      setProfile(buyerProfile);
      // Initialize cart from database
      await useBuyerStore.getState().initializeCart();

      setIsLoading(false);
      navigate("/shop");
    } catch (err) {
      console.error("Login exception:", err);
      setError("Incorrect credentials or account details. Please review your input and try again.");
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
        sessionStorage.removeItem('oauth_redirect_done');
        window.location.assign(result.url); // Manually trigger the redirect
      }
    } catch (err) {
      setError("Failed to initialize Google Sign-In.");
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setEmail("buyer1@gmail.com");
    setPassword("Test@123456");
    setError("");
  };

  const handleFacebookSignIn = async () => {
    setError("");
    setIsLoading(true);
    try {
      const result = await authService.signInWithProvider("facebook");
      if (result?.url) {
        sessionStorage.setItem('oauth_intent', 'buyer');
        sessionStorage.removeItem('oauth_redirect_done');
        window.location.assign(result.url); // Manually trigger the redirect
      }
    } catch (err) {
      setError("Failed to initialize Facebook Sign-In.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden font-sans bg-[var(--brand-wash)]">
      {/* Premium Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-orange-50/30 to-white animate-gradient [background-size:400%_400%]"></div>

      {/* Glassmorphism Background Blobs */}
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
            From Global Factories to Your Doorstep
          </p>
        </motion.div>

        {/* Right - Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-[0_20px_50px_rgba(255,106,0,0.1)] border border-white/50 md:ml-32"
        >
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] font-heading">Welcome Back!</h2>
              <p className="text-[var(--text-muted)] text-sm mt-1">Sign in to continue shopping.</p>
            </div>
            <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
              <img loading="lazy" src="/BazaarX.png" alt="BazaarX" className="w-12 h-12 object-contain" />
            </div>
          </div>

          {/* Demo Account Banner */}
          <div className="bg-gradient-to-r from-orange-500/10 via-orange-400/5 to-transparent border border-orange-100 rounded-[20px] p-4 mb-8 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.1em] mb-0.5">🧪 Test Buyer Accounts</p>
                <p className="text-xs text-[var(--text-secondary)]">All have addresses & BazCoins</p>
              </div>
              <button
                type="button"
                onClick={handleDemoLogin}
                className="text-[10px] font-bold text-orange-600 border border-orange-200 px-3 py-1.5 rounded-xl bg-white hover:bg-orange-50 transition-all active:scale-95 shadow-sm"
              >
                Auto-Fill
              </button>
            </div>
            <div className="space-y-1 text-xs text-orange-700">
              <p className="font-semibold">Password for all: <span className="font-mono bg-orange-100 px-2 py-0.5 rounded">Test@123456</span></p>
              <div className="grid grid-cols-1 gap-y-1 mt-2 text-[11px]">
                <button type="button" onClick={() => { setEmail('buyer1@gmail.com'); setPassword('Test@123456'); }} className="text-left hover:text-orange-900 hover:underline transition-colors font-semibold">• buyer1@gmail.com <span className="text-gray-500">(Angela Cruz) ⭐ 1500 BazCoins</span></button>
                <button type="button" onClick={() => { setEmail('buyer2@gmail.com'); setPassword('Test@123456'); }} className="text-left hover:text-orange-900 hover:underline transition-colors">• buyer2@gmail.com <span className="text-gray-500">(John Mendoza) 💰 2300 BazCoins</span></button>
                <button type="button" onClick={() => { setEmail('buyer3@gmail.com'); setPassword('Test@123456'); }} className="text-left hover:text-orange-900 hover:underline transition-colors">• buyer3@gmail.com <span className="text-gray-500">(Sofia Reyes) 💰 800 BazCoins</span></button>
              </div>
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

          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-[var(--text-primary)] ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[var(--secondary)]/10 border border-[var(--border)] rounded-[var(--radius-md)] focus:ring-0 focus:ring-[var(--primary)]/10 focus:bg-white focus:border-[var(--brand-primary)] outline-none transition-all text-sm"
                  placeholder="you@example.com"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-[var(--text-primary)] ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 bg-[var(--secondary)]/10 border border-[var(--border)] rounded-[var(--radius-md)] focus:ring-0 focus:ring-[var(--primary)]/10 focus:bg-white focus:border-[var(--brand-primary)] outline-none transition-all text-sm"
                  placeholder="••••••••"
                  disabled={isLoading}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-3 h-3 rounded border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] cursor-pointer"
                />
                <span className="text-sm text-[var(--text-primary)] group-hover:text-[var(--text-primary)] transition-colors select-none">
                  Remember me
                </span>
              </label>
              <Link to="/forgot-password" title="Forgot Password?" className="text-sm text-[var(--brand-primary)] hover:underline">Forgot password?</Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full h-14 text-md uppercase rounded-[var(--radius-md)] shadow-[var(--shadow-medium)] flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Log In</>}
            </button>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border)]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-sm text-[var(--text-muted)]">or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full h-12 text-sm flex items-center border border-[var(--border)] hover:border-[var(--brand-primary)] hover:bg-[var(--secondary)]/5 rounded-[var(--radius-md)] justify-center gap-2 transition-all duration-200"
                disabled={isLoading}
              >
                <img loading="lazy" 
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  className="w-4 h-4"
                  alt="Google"
                />
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={handleFacebookSignIn}
                className="w-full h-12 text-sm flex items-center border border-[var(--border)] hover:border-[var(--brand-primary)] hover:bg-[var(--secondary)]/5 rounded-[var(--radius-md)] justify-center gap-2 transition-all duration-200"
                disabled={isLoading}
              >
                <img loading="lazy" 
                  src="https://www.svgrepo.com/show/475647/facebook-color.svg"
                  className="w-4 h-4"
                  alt="Facebook"
                />
                <span>Facebook</span>
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-[#6B7280] text-sm">
            Don't have an account? <Link to="/signup" className="text-[var(--brand-primary)] font-bold hover:underline ml-1">Sign up here!</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
