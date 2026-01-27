import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useBuyerStore } from "../stores/buyerStore";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { signUp } from "../services/authService";
import { supabase } from "../lib/supabase";

export default function BuyerSignupPage() {
  const navigate = useNavigate();
  const { setProfile } = useBuyerStore();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setIsLoading(true);

    try {
      const fullName = `${formData.firstName} ${formData.lastName}`;

      const { user, error: signUpError } = await signUp(
        formData.email,
        formData.password,
        {
          full_name: fullName,
          phone: formData.phone,
          user_type: "buyer",
        },
      );

      if (signUpError) {
        console.error("Signup error:", signUpError);
        setError(signUpError.message || "Signup failed. Please try again.");
        setIsLoading(false);
        return;
      }

      if (!user) {
        setError("Signup failed. Please try again.");
        setIsLoading(false);
        return;
      }

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
      setIsLoading(false);

      // Show success message and redirect
      alert("Welcome to BazaarX! You've received 100 bonus points!");
      navigate("/shop");
    } catch (err) {
      console.error("Signup exception:", err);
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    setError("");
    alert("Google Sign-Up integration coming soon!");
  };

  const handleFacebookSignup = () => {
    setError("");
    alert("Facebook Sign-Up integration coming soon!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50 relative overflow-hidden py-12">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-orange-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Signup Card */}
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
              Create Account
            </h1>
            <p className="text-gray-600">Join thousands of Filipino shoppers</p>
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

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label
                  htmlFor="firstName"
                  className="text-gray-700 font-medium mb-2 block text-sm"
                >
                  First Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="Juan"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="pl-10 h-11 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500 text-sm"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div>
                <Label
                  htmlFor="lastName"
                  className="text-gray-700 font-medium mb-2 block text-sm"
                >
                  Last Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Dela Cruz"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="pl-10 h-11 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500 text-sm"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Email Input */}
            <div>
              <Label
                htmlFor="email"
                className="text-gray-700 font-medium mb-2 block text-sm"
              >
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 h-11 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500 text-sm"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Phone Input */}
            <div>
              <Label
                htmlFor="phone"
                className="text-gray-700 font-medium mb-2 block text-sm"
              >
                Phone Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="09XX XXX XXXX"
                  value={formData.phone}
                  onChange={handleChange}
                  className="pl-10 h-11 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500 text-sm"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <Label
                htmlFor="password"
                className="text-gray-700 font-medium mb-2 block text-sm"
              >
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 pr-10 h-11 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500 text-sm"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <Label
                htmlFor="confirmPassword"
                className="text-gray-700 font-medium mb-2 block text-sm"
              >
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pl-10 pr-10 h-11 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500 text-sm"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start gap-2 pt-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) =>
                  setAgreedToTerms(checked as boolean)
                }
                className="mt-1"
                disabled={isLoading}
              />
              <label
                htmlFor="terms"
                className="text-sm text-gray-600 cursor-pointer"
              >
                I agree to the{" "}
                <Link
                  to="/terms"
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Privacy Policy
                </Link>
              </label>
            </div>

            {/* Sign Up Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 mt-6"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating account...
                </div>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Create Account
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-gray-500">
                  Or sign up with
                </span>
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
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-orange-600 hover:text-orange-700 font-semibold"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-orange-100"
        >
          <p className="text-sm font-semibold text-gray-700 mb-3 text-center">
            What you'll get:
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-orange-500 flex-shrink-0" />
              <span className="text-gray-600">100 Welcome Points</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-orange-500 flex-shrink-0" />
              <span className="text-gray-600">Free Shipping</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-orange-500 flex-shrink-0" />
              <span className="text-gray-600">Exclusive Deals</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-orange-500 flex-shrink-0" />
              <span className="text-gray-600">Buyer Protection</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
