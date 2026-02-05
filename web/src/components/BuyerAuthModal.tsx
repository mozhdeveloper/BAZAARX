import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShoppingBag,
  ArrowRight,
  Store,
  Shield,
  Check,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { authService } from "../services/authService";
import { supabase } from "../lib/supabase";

interface BuyerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
  onAuthSuccess?: (buyerId: string, email: string) => void;
}

export function BuyerAuthModal({
  isOpen,
  onClose,
  initialMode = "login",
  onAuthSuccess,
}: BuyerAuthModalProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (mode === "signup") {
        // Signup validation
        if (!fullName.trim()) {
          setError("Full name is required");
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters");
          setIsLoading(false);
          return;
        }

        // Supabase signup for buyer
        const result = await authService.signUp(email, password, {
          full_name: fullName,
          user_type: "buyer",
          email: "",
          password: ""
        });

        if (!result || !result.user) {
          setError("Signup failed");
          setIsLoading(false);
          return;
        }

        const { user } = result;

        // Buyer record is already created by authService.signUp()
        // No need to create it again here

        setIsSuccess(true);
        onAuthSuccess?.(user.id, email);
      } else {
        // Login with Supabase
        const result = await authService.signIn(email, password);

        if (!result || !result.user) {
          setError("Invalid email or password");
          setIsLoading(false);
          return;
        }

        const { user } = result;

        // Verify user is a buyer
        const { data: buyerData, error: buyerError } = await supabase
          .from("buyers")
          .select("*")
          .eq("id", user.id)
          .single();

        if (buyerError || !buyerData) {
          setError("This account is not registered as a buyer");
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }

        setIsSuccess(true);
        onAuthSuccess?.(user.id, email);
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      if (err.message?.includes("User already registered") || err.message?.includes("already exists")) {
        setError("This email is already registered. Please sign in instead.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto pointer-events-auto relative"
            >
              {/* Success Screen */}
              {isSuccess && (
                <motion.div
                  className="absolute inset-0 bg-white rounded-2xl flex flex-col items-center justify-center p-6 z-20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  >
                    <Check className="w-8 h-8 text-green-600" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Welcome!
                  </h3>
                  <p className="text-center text-gray-600 mb-6 text-sm">
                    You're now signed in as{" "}
                    <span className="font-semibold">{email}</span>
                  </p>
                  <button
                    onClick={() => {
                      setIsSuccess(false);
                      onClose();
                      navigate("/shop");
                    }}
                    className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold"
                  >
                    Continue Shopping
                  </button>
                </motion.div>
              )}

              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <ShoppingBag className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {mode === "login" ? "Welcome Back!" : "Join BazaarPH"}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {mode === "login"
                        ? "Sign in to continue shopping"
                        : "Create your account"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-6">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Full Name (Signup Only) */}
                  {mode === "signup" && (
                    <div>
                      <label
                        htmlFor="fullName"
                        className="block text-sm font-semibold text-gray-700 mb-2"
                      >
                        Full Name
                      </label>
                      <input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                  )}

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-semibold text-gray-700 mb-2"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-semibold text-gray-700 mb-2"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password (Signup Only) */}
                  {mode === "signup" && (
                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className="block text-sm font-semibold text-gray-700 mb-2"
                      >
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                          placeholder="Confirm your password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Forgot Password (Login Only) */}
                  {mode === "login" && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="text-sm text-orange-600 font-semibold hover:text-orange-700"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {mode === "login" ? "Sign In" : "Create Account"}
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Toggle Mode */}
                <div className="text-center mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    {mode === "login"
                      ? "Don't have an account? "
                      : "Already have an account? "}
                    <button
                      onClick={() => {
                        setMode(mode === "login" ? "signup" : "login");
                        setError("");
                      }}
                      className="text-orange-600 font-bold hover:text-orange-700"
                    >
                      {mode === "login" ? "Sign Up" : "Sign In"}
                    </button>
                  </p>
                </div>

                {/* Guest Continue */}
                <button
                  onClick={onClose}
                  className="w-full mt-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Continue as Guest
                </button>

                {/* Portal Links */}
                <div className="mt-6 space-y-3">
                  <Link
                    to="/seller/login"
                    onClick={onClose}
                    className="flex items-center justify-center gap-2 w-full bg-orange-50 border-2 border-orange-500 text-orange-600 py-3 px-4 rounded-xl font-bold hover:bg-orange-100 transition-colors"
                  >
                    <Store className="h-5 w-5" />
                    Access Seller Portal
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    to="/admin/login"
                    onClick={onClose}
                    className="flex items-center justify-center gap-2 w-full bg-purple-50 border-2 border-purple-500 text-purple-600 py-3 px-4 rounded-xl font-bold hover:bg-purple-100 transition-colors"
                  >
                    <Shield className="h-5 w-5" />
                    Admin Portal
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
