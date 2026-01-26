import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useBuyerStore } from "../stores/buyerStore";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { signIn } from "../services/authService";
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
      const { user, error: signInError } = await signIn(email, password);

      if (signInError) {
        console.error("Login error:", signInError);
        setError("Invalid email or password.");
        setIsLoading(false);
        return;
      }

      if (!user) {
        setError("Login failed. Please try again.");
        setIsLoading(false);
        return;
      }

      // Verify buyer role
      const { data: buyerData, error: buyerError } = await supabase
        .from("buyers")
        .select("*")
        .eq("id", user.id)
        .single();

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
        .single();

      const fullName = (profileData as any)?.full_name || "User";
      const bazcoins = (buyerData as any)?.bazcoins ?? 0;
      const buyerProfile = {
        id: user.id,
        email: user.email || email,
        firstName: fullName.split(" ")[0] || "User",
        lastName: fullName.split(" ").slice(1).join(" ") || "",
        phone: (profileData as any)?.phone || "",
        avatar:
          (profileData as any)?.avatar_url ||
          `https://ui-avatars.com/api/?name=${fullName}&background=FF6B35&color=fff`,
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
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setError("");
    alert("Google Sign-In integration coming soon!");
  };

  const handleDemoLogin = () => {
    setEmail("buyer@bazaarx.ph");
    setPassword("password");
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-orange-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-orange-100 p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg"
            >
              <img
                src="/Logo.png"
                alt="BazaarX Logo"
                className="w-16 h-16 object-contain"
              />
            </motion.div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome Back!
            </h1>
            <p className="text-gray-600">Sign in to continue shopping</p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
            >
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </motion.div>
          )}

          {/* Demo Credentials Info */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-xl"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🎯</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-900 mb-1">
                  Try Demo Account
                </p>
                <p className="text-xs text-orange-700 mb-2">
                  Click the button below to auto-fill credentials
                </p>
                <div className="flex flex-col gap-1 text-xs font-mono bg-white/50 p-2 rounded">
                  <span className="text-gray-600">📧 buyer@bazaarx.ph</span>
                  <span className="text-gray-600">🔒 password</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Input */}
            <div>
              <Label
                htmlFor="email"
                className="text-gray-700 font-medium mb-2 block"
              >
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <Label
                htmlFor="password"
                className="text-gray-700 font-medium mb-2 block"
              >
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 pr-12 h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex items-center justify-between">
              <Button
                type="button"
                onClick={handleDemoLogin}
                variant="ghost"
                size="sm"
                className="text-sm text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-medium"
              >
                🎯 Try Demo Account
              </Button>
              <Link
                to="/forgot-password"
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing in...
                </div>
              ) : (
                "Sign In"
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Sign In */}
            <Button
              type="button"
              onClick={handleGoogleSignIn}
              variant="outline"
              className="w-full h-12 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl font-medium transition-all"
              disabled={isLoading}
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="w-5 h-5 mr-2"
              />
              Sign in with Google
            </Button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-orange-600 hover:text-orange-700 font-semibold"
              >
                Sign up for free!
              </Link>
            </p>
          </div>
        </div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center"
        >
          <p className="text-gray-600 text-sm mb-3">
            Join{" "}
            <span className="font-semibold text-orange-600">thousands</span> of
            Filipino shoppers
          </p>
          <div className="flex justify-center items-center gap-2">
            {[1, 2, 3, 4].map((i) => (
              <img
                key={i}
                src={`https://randomuser.me/api/portraits/${i % 2 === 0 ? "women" : "men"}/${20 + i * 5}.jpg`}
                alt="user"
                className="w-10 h-10 rounded-full border-2 border-white shadow-md object-cover"
              />
            ))}
            <div className="w-10 h-10 rounded-full bg-orange-500 border-2 border-white shadow-md flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
