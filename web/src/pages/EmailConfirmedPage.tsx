import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight } from "lucide-react";

export default function EmailConfirmedPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const state = location.state as { email?: string; role?: "buyer" | "seller"; resent?: boolean } | null;
  const email = state?.email || "your email";
  const role = state?.role || "buyer";

  const isSeller = role === "seller";
  const loginPath = isSeller ? "/seller/login" : "/login";
  const accountType = isSeller ? "Seller Account" : "Account";

  // Auto-redirect to login after 3 seconds if not a resent link
  useEffect(() => {
    if (state?.resent) return;
    
    const timer = setTimeout(() => {
      navigate(loginPath, { replace: true, state: { email, verified: true } });
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [navigate, loginPath, state?.resent, email]);

  return (
    <div className="min-h-screen relative overflow-hidden font-sans bg-white flex items-center justify-center p-6">
      {/* Background blobs for premium feel */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-orange-50/20 to-white pointer-events-none" />
      
      <motion.div
        animate={{
          x: [0, 40, 0],
          y: [0, -30, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-orange-100/30 rounded-full mix-blend-multiply filter blur-3xl opacity-30 pointer-events-none"
      />
      
      <motion.div
        animate={{
          x: [0, -30, 0],
          y: [0, 50, 0],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-orange-200/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 pointer-events-none"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md bg-white border border-orange-100/50 p-10 rounded-[32px] shadow-[0_25px_60px_-15px_rgba(251,140,0,0.1)] text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
          className="mx-auto mb-8 w-24 h-24 rounded-full bg-green-50 flex items-center justify-center shadow-inner"
        >
          <CheckCircle2 size={48} className="text-green-500" />
        </motion.div>

        <h1 className="text-3xl font-bold text-[#7C2D12] font-heading mb-4 tracking-tight">
          {state?.resent ? "Verification Link Sent!" : `${accountType} Verified!`}
        </h1>

        <p className="text-[#78350F] text-base mb-8 leading-relaxed">
          {state?.resent ? (
            <>
              We've resent a confirmation link to <span className="font-bold text-[#EA580C]">{email}</span>. Please check your inbox and follow the instructions to activate your account.
            </>
          ) : (
            <>
              Your email, <span className="font-bold text-[#EA580C]">{email}</span>, has now been verified. Your BazaarX {isSeller ? "store" : "account"} is ready to use.
            </>
          )}
        </p>
        
        <div className="space-y-4">
          <p className="text-[#A8A29E] text-sm font-medium uppercase tracking-widest">
            Please log in again to continue
          </p>
          
          <button
            onClick={() => navigate(isSeller ? "/seller/login" : "/login", { replace: true, state: { email, verified: true } })}
            className="group w-full h-14 bg-[#FB8C00] text-white font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-[#EA580C] transition-all duration-300 shadow-[0_10px_25px_-5px_rgba(251,140,0,0.4)] hover:shadow-[0_15px_30px_-5px_rgba(251,140,0,0.5)] active:scale-[0.98]"
          >
            {isSeller ? "Go to Seller Login" : "Go to Login"}
            <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-orange-50/50">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/BazaarX.png" alt="BazaarX" className="w-6 h-6 object-contain" />
            <span className="font-heading font-bold text-[#7C2D12] text-lg">BazaarX</span>
          </div>
          <p className="text-[#A8A29E] text-xs font-medium">
            {isSeller ? "Growing local businesses together" : "Join thousands of Filipino shoppers"}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

