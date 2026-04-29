import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Mail, ChevronLeft, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { authService } from "../services/authService";

export default function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const prefilledEmail = searchParams.get('email') || "";
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const targetEmail = (email || prefilledEmail).trim();

    if (!targetEmail || !validateEmail(targetEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(targetEmail);
      setIsSent(true);
    } catch (err) {
      setError("Failed to send reset link. Please try again.");
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

        {isSent ? (
          <div className="text-center py-4 text-balance">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} className="text-green-600 animate-scaleUp" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-headline)] mb-3">Check your Email</h1>
            <p className="text-[var(--text-primary)] leading-relaxed mb-8">
              We've sent a password reset link to <span className="font-semibold text-[var(--brand-primary)]">{(email || prefilledEmail).trim()}</span>. Open it on your device to continue.
            </p>
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-muted)]">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <button
                onClick={() => setIsSent(false)}
                className="text-[var(--brand-primary)] font-bold hover:underline"
              >
                Try a different email
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-[var(--text-headline)] tracking-tight">Forgot Password?</h1>
              <p className="text-[var(--text-primary)] mt-3 leading-relaxed">
                No worries! Enter your account email and we'll send you a secure link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-headline)] px-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-[var(--brand-primary)]">
                    <Mail size={18} className="text-[var(--text-muted)]" />
                  </div>
                  <input
                    type="email"
                    value={email || prefilledEmail}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-12 pr-4 py-4 border-2 border-[var(--border)] rounded-2xl outline-none focus:border-[var(--brand-primary)] bg-white transition-all text-[var(--text-headline)] font-medium placeholder:text-[var(--text-muted)]/50"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              {error ? (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-2xl bg-[var(--brand-primary)] text-white font-bold hover:bg-[var(--brand-primary-dark)] transition-all shadow-lg hover:shadow-[var(--brand-primary)]/20 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2.5"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <Send size={18} />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
