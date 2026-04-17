import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Mail, ChevronLeft, Send } from "lucide-react";
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
    <div className="min-h-screen bg-[var(--brand-wash)] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[var(--border)] shadow-lg p-6 sm:p-8">
        <Link
          to="/login"
          className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)] mb-5"
        >
          <ChevronLeft size={16} />
          Back to Login
        </Link>

        <h1 className="text-2xl font-bold text-[var(--text-headline)]">Forgot Password</h1>
        <p className="text-sm text-[var(--text-muted)] mt-2 mb-6">
          Enter your buyer or seller email and we’ll send a reset link. If you signed up with Google, you can also use this to set a password.
        </p>

        {isSent ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Reset link sent. Check your email and open the link to continue.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[var(--text-primary)]">Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="email"
                  value={email || prefilledEmail}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-3 py-3 border border-[var(--border)] rounded-2xl outline-none focus:border-[var(--brand-primary)] bg-white"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-2xl bg-[var(--brand-primary)] text-white font-semibold hover:bg-[var(--brand-primary-dark)] transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
              <Send size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
