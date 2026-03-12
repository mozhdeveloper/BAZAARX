import { useNavigate } from "react-router-dom";
import { AlertTriangle, Mail, Clock, Ban } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/sellerStore";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function SellerAccountBlocked() {
  const navigate = useNavigate();
  const { logout, seller } = useAuthStore();
  
  const [restriction, setRestriction] = useState<{
    type: "cooldown" | "temp_blacklist" | "permanent" | null;
    coolDownUntil: Date | null;
    tempBlacklistUntil: Date | null;
    isPermanentlyBlacklisted: boolean;
    attempts: number;
    cooldownCount: number;
    tempBlacklistCount: number;
  }>({
    type: null,
    coolDownUntil: null,
    tempBlacklistUntil: null,
    isPermanentlyBlacklisted: false,
    attempts: 0,
    cooldownCount: 0,
    tempBlacklistCount: 0,
  });

  useEffect(() => {
    const fetchRestriction = async () => {
      const sellerId = seller?.id;
      if (!sellerId) return;

      const { data } = await supabase
        .from("sellers")
        .select("cool_down_until, temp_blacklist_until, is_permanently_blacklisted, reapplication_attempts, cooldown_count, temp_blacklist_count")
        .eq("id", sellerId)
        .single();

      if (data) {
        const now = new Date();
        const coolDownUntil = data.cool_down_until ? new Date(data.cool_down_until) : null;
        const tempBlacklistUntil = data.temp_blacklist_until ? new Date(data.temp_blacklist_until) : null;

        let type: "cooldown" | "temp_blacklist" | "permanent" | null = null;
        if (data.is_permanently_blacklisted) {
          type = "permanent";
        } else if (tempBlacklistUntil && tempBlacklistUntil > now) {
          type = "temp_blacklist";
        } else if (coolDownUntil && coolDownUntil > now) {
          type = "cooldown";
        }

        setRestriction({
          type,
          coolDownUntil,
          tempBlacklistUntil,
          isPermanentlyBlacklisted: data.is_permanently_blacklisted || false,
          attempts: data.reapplication_attempts || 0,
          cooldownCount: data.cooldown_count || 0,
          tempBlacklistCount: data.temp_blacklist_count || 0,
        });
      }
    };

    fetchRestriction();
  }, [seller?.id]);

  const formatRemainingTime = (targetDate: Date | null): string => {
    if (!targetDate) return "";
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();
    if (diff <= 0) return "";

    const hours = Math.ceil(diff / (1000 * 60 * 60));
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days > 1) return `${days} days`;
    if (hours > 1) return `${hours} hours`;
    return "Less than an hour";
  };

  const getRestrictionMessage = () => {
    switch (restriction.type) {
      case "permanent":
        return {
          title: "Permanently Blacklisted",
          message: "Your account has been permanently blacklisted due to multiple failed reapplication attempts.",
          subMessage: "Please contact support to review your account status.",
          icon: Ban,
          color: "red",
        };
      case "temp_blacklist":
        return {
          title: "Temporarily Blacklisted",
          message: `You can log back in ${formatRemainingTime(restriction.tempBlacklistUntil)}.`,
          subMessage: `Temporary blacklist ${restriction.tempBlacklistCount}/3. After 3 temporary blacklists, your account will be permanently blacklisted.`,
          icon: AlertTriangle,
          color: "orange",
        };
      case "cooldown":
        return {
          title: "Account in Cooldown",
          message: `You can log back in ${formatRemainingTime(restriction.coolDownUntil)}.`,
          subMessage: `Cooldown ${restriction.cooldownCount}/3. Failed attempts: ${restriction.attempts}/3.`,
          icon: Clock,
          color: "yellow",
        };
      default:
        return {
          title: "Account Blocked",
          message: "Your seller account is currently blocked from portal access.",
          subMessage: "Please contact support to review your account status and unlock access.",
          icon: AlertTriangle,
          color: "gray",
        };
    }
  };

  const message = getRestrictionMessage();
  const IconComponent = message.icon;

  return (
    <div className="min-h-screen bg-[var(--brand-wash)] py-12 px-4 font-sans flex items-center justify-center">
      <div className="max-w-2xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] shadow-[0_20px_40px_rgba(0,0,0,0.08)] overflow-hidden"
        >
          <div className={`bg-gradient-to-r px-8 py-8 relative overflow-hidden ${
            message.color === "red"
              ? "from-red-700 to-red-800"
              : message.color === "orange"
                ? "from-orange-700 to-orange-800"
                : message.color === "yellow"
                  ? "from-amber-700 to-amber-800"
                  : "from-gray-700 to-gray-800"
          }`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            <div className="flex items-center justify-center mb-6 relative z-10">
              <div className="h-20 w-20 bg-white/20 backdrop-blur-md rounded-[24px] flex items-center justify-center shadow-lg shadow-black/20">
                <IconComponent className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-black text-white text-center font-heading tracking-tight relative z-10">
              {message.title}
            </h1>
            <p className="text-gray-200 text-center mt-2 font-medium relative z-10">
              {message.message}
            </p>
          </div>

          <div className="p-8">
            <div className={`rounded-lg p-6 mb-6 ${
              message.color === "red"
                ? "bg-red-50 border border-red-200"
                : message.color === "orange"
                  ? "bg-orange-50 border border-orange-200"
                  : message.color === "yellow"
                    ? "bg-yellow-50 border border-yellow-200"
                    : "bg-gray-50 border border-gray-200"
            }`}>
              <h3 className={`font-semibold mb-2 ${
                message.color === "red"
                  ? "text-red-900"
                  : message.color === "orange"
                    ? "text-orange-900"
                    : message.color === "yellow"
                      ? "text-yellow-900"
                      : "text-gray-900"
              }`}>Next step</h3>
              <p className={`text-sm ${
                message.color === "red"
                  ? "text-red-700"
                  : message.color === "orange"
                    ? "text-orange-700"
                    : message.color === "yellow"
                      ? "text-yellow-700"
                      : "text-gray-700"
              }`}>
                {message.subMessage}
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
