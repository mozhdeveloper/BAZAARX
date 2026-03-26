import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, ChevronLeft } from "lucide-react";
import { authService } from "../services/authService";
import { supabase } from "../lib/supabase";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const verifyRecoverySession = async () => {
      const hasRecoveryTokenInHash = window.location.hash.includes("access_token");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session || hasRecoveryTokenInHash) {
        setIsReady(true);
      } else {
        setError("This reset link is invalid or expired. Please request a new one.");
      }
    };

    void verifyRecoverySession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await authService.updatePassword(password);
      setIsSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (err) {
      setError("Failed to update password. Please request a new reset link.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--brand-wash)] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[var(--border)] shadow-lg p-6 sm:p-8">
        <Link
          to="/login"
          className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)] mb-5"
        >
          <ChevronLeft size={16} />
          Back to Login
        </Link>

        <h1 className="text-2xl font-bold text-[var(--text-headline)]">Reset Password</h1>
        <p className="text-sm text-[var(--text-muted)] mt-2 mb-6">Set your new password to continue.</p>

        {isSuccess ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Password updated successfully. Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)]">New Password</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-[var(--border)] rounded-lg outline-none focus:border-[var(--brand-primary)] bg-white"
                  disabled={isLoading || !isReady}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--text-primary)]">Confirm Password</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-[var(--border)] rounded-lg outline-none focus:border-[var(--brand-primary)] bg-white"
                  disabled={isLoading || !isReady}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={isLoading || !isReady}
              className="w-full h-11 rounded-lg bg-[var(--brand-primary)] text-white font-semibold hover:bg-[var(--brand-primary-dark)] transition-colors disabled:opacity-60"
            >
              {isLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
