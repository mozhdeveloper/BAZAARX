import { useNavigate } from "react-router-dom";
import { AlertTriangle, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/sellerStore";

export function SellerAccountBlocked() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-[var(--brand-wash)] py-12 px-4 font-sans flex items-center justify-center">
      <div className="max-w-2xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] shadow-[0_20px_40px_rgba(0,0,0,0.08)] overflow-hidden"
        >
          <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-8 py-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            <div className="flex items-center justify-center mb-6 relative z-10">
              <div className="h-20 w-20 bg-white/20 backdrop-blur-md rounded-[24px] flex items-center justify-center shadow-lg shadow-black/20">
                <AlertTriangle className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-black text-white text-center font-heading tracking-tight relative z-10">
              Account Suspended
            </h1>
            <p className="text-gray-200 text-center mt-2 font-medium relative z-10">
              Your seller account is temporarily blocked from portal access.
            </p>
          </div>

          <div className="p-8">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Next step</h3>
              <p className="text-sm text-gray-700">
                Please contact support to review your account status and unlock
                access.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="mailto:seller-support@bazaarph.com"
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Mail className="h-5 w-5" />
                Contact Support
              </a>
              <button
                onClick={() => {
                  logout();
                  navigate("/seller/auth");
                }}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
