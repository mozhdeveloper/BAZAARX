import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, ChevronLeft, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { authService } from "../services/authService";
import { supabase } from "../lib/supabase";
import { validatePassword } from "../utils/validation";

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
  
  const livePasswordValidation =
    password.length > 0 ? validatePassword(password) : null;
  const livePasswordError =
    livePasswordValidation && !livePasswordValidation.valid
      ? livePasswordValidation.errors[0]
      : "";
  const hasPasswordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    const verifyRecoverySession = async () => {
      const hasRecoveryTokenInHash = window.location.hash.includes("access_token") || window.location.search.includes("code=");
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

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.errors[0] || "Password does not meet minimum security requirements.");
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
      }, 2000);
    } catch (err) {
      setError("Failed to update password. Please request a new reset link.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-[var(--brand-accent-light)] rounded-full blur-[100px] opacity-30 animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[350px] h-[350px] bg-[var(--brand-wash-gold)] rounded-full blur-[80px] opacity-20" />

      <div className="w-full max-w-md bg-white rounded-[2.5rem] border border-[var(--border)] shadow-golden p-8 sm:p-10 relative z-10 animate-slide-in-right">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--brand-primary)] mb-8 transition-colors group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Login
        </Link>

        {isSuccess ? (
          <div className="text-center py-6">
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} className="text-green-600 animate-scaleUp" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-headline)] mb-3">Password Updated!</h1>
            <p className="text-[var(--text-primary)] leading-relaxed mb-8">
              Your security is our priority. You can now log in with your new password. Redirecting you to the login page...
            </p>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 animate-[progress_2s_linear]" />
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="w-16 h-16 bg-[var(--brand-primary-soft)] rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck size={32} className="text-[var(--brand-primary)]" />
              </div>
              <h1 className="text-3xl font-extrabold text-[var(--text-headline)] tracking-tight">Set New Password</h1>
              <p className="text-[var(--text-primary)] mt-3 leading-relaxed">
                Create a strong, unique password to secure your BazaarX account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-headline)] px-1">New Password</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-[var(--brand-primary)] text-[var(--text-muted)]">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-12 pr-12 py-4 border-2 border-[var(--border)] rounded-2xl outline-none focus:border-[var(--brand-primary)] bg-white transition-all text-[var(--text-headline)] font-medium placeholder:text-[var(--text-muted)]/50"
                    disabled={isLoading || !isReady}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {livePasswordError ? <p className="text-xs text-red-500 font-medium px-1">{livePasswordError}</p> : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-headline)] px-1">Confirm New Password</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-[var(--brand-primary)] text-[var(--text-muted)]">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="w-full pl-12 pr-12 py-4 border-2 border-[var(--border)] rounded-2xl outline-none focus:border-[var(--brand-primary)] bg-white transition-all text-[var(--text-headline)] font-medium placeholder:text-[var(--text-muted)]/50"
                    disabled={isLoading || !isReady}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {hasPasswordMismatch ? <p className="text-xs text-red-500 font-medium px-1">Passwords do not match.</p> : null}
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Requirements:</p>
                <ul className="grid grid-cols-1 gap-1.5">
                  <li className={`text-xs flex items-center gap-1.5 ${password.length >= 8 ? 'text-green-600 font-medium' : 'text-[var(--text-muted)]'}`}>
                    <CheckCircle2 size={12} /> At least 8 characters
                  </li>
                  <li className={`text-xs flex items-center gap-1.5 ${/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-green-600 font-medium' : 'text-[var(--text-muted)]'}`}>
                    <CheckCircle2 size={12} /> Mixed case (Aa)
                  </li>
                  <li className={`text-xs flex items-center gap-1.5 ${/\d/.test(password) && /[!@#$%^&*()]/.test(password) ? 'text-green-600 font-medium' : 'text-[var(--text-muted)]'}`}>
                    <CheckCircle2 size={12} /> Number & Special Character
                  </li>
                </ul>
              </div>

              {error ? (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isLoading || !isReady || hasPasswordMismatch || !!livePasswordError}
                className="w-full py-4 rounded-2xl bg-[var(--brand-primary)] text-white font-bold hover:bg-[var(--brand-primary-dark)] transition-all shadow-lg hover:shadow-[var(--brand-primary)]/20 active:scale-[0.98] disabled:opacity-60 disabled:shadow-none flex items-center justify-center gap-2.5"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Update Password"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
