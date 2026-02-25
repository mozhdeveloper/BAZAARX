import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  FileText,
  Home,
  Landmark,
  ShieldAlert,
  WalletCards,
} from "lucide-react";
import { SellerWorkspaceLayout } from "@/components/seller/SellerWorkspaceLayout";
import { useAuthStore } from "@/stores/sellerStore";
import { normalizeSellerApprovalStatus } from "@/utils/sellerAccess";

const requirements = [
  {
    title: "Business Permit",
    description: "Upload a valid and current business permit.",
    icon: FileText,
  },
  {
    title: "Government-Issued ID",
    description: "Submit a clear and readable valid ID.",
    icon: BadgeCheck,
  },
  {
    title: "Proof of Address",
    description: "Provide a recent address document matching your store information.",
    icon: Home,
  },
  {
    title: "Store and Business Details",
    description: "Ensure your store profile and business details are complete and accurate.",
    icon: Landmark,
  },
  {
    title: "Payout Account Details",
    description: "Add correct account holder name, bank/e-wallet provider, and account number.",
    icon: WalletCards,
  },
] as const;

const statusContent = {
  pending: {
    title: "Verification Checklist",
    description:
      "Your application is in review. Keep your submitted details accurate while waiting for approval.",
    icon: Clock3,
    accent: "text-amber-600",
    cardClass: "border-amber-200 bg-amber-50/70",
  },
  needs_resubmission: {
    title: "Requirements to Resubmit",
    description:
      "Your application needs updates. Review the checklist below, update your files, and resubmit from Store Profile.",
    icon: AlertTriangle,
    accent: "text-orange-600",
    cardClass: "border-orange-200 bg-orange-50/70",
  },
  rejected: {
    title: "Requirements for Re-review",
    description:
      "Your previous submission requires revisions. Complete these requirements before requesting another review.",
    icon: ShieldAlert,
    accent: "text-red-600",
    cardClass: "border-red-200 bg-red-50/70",
  },
} as const;

export function SellerVerificationRequirements() {
  const { seller } = useAuthStore();
  const status = normalizeSellerApprovalStatus(seller);

  const content =
    status === "needs_resubmission"
      ? statusContent.needs_resubmission
      : status === "rejected"
        ? statusContent.rejected
        : statusContent.pending;

  const StatusIcon = content.icon;

  return (
    <SellerWorkspaceLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-orange-100/40 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-yellow-100/40 rounded-full blur-[100px]" />
        </div>

        <div className="p-2 md:p-8 flex-1 w-full h-full overflow-auto relative z-10 scrollbar-hide">
          <div className="max-w-6xl mx-auto space-y-8 pb-10">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border p-6 md:p-8 ${content.cardClass}`}
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-white/80 flex items-center justify-center">
                  <StatusIcon className={`h-6 w-6 ${content.accent}`} />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-[var(--text-headline)] font-heading tracking-tight">
                    {content.title}
                  </h1>
                  <p className="text-sm md:text-base text-[var(--text-secondary)] mt-2 max-w-3xl">
                    {content.description}
                  </p>
                </div>
              </div>
            </motion.div>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {requirements.map((item, index) => {
                const Icon = item.icon;

                return (
                  <motion.article
                    key={item.title}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl border border-orange-100/80 p-5 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-11 w-11 rounded-lg bg-orange-50 text-[var(--brand-primary)] flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="font-bold text-[var(--text-headline)]">{item.title}</h2>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </section>

            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl border border-orange-100/80 p-6 md:p-8 shadow-sm"
            >
              <h2 className="text-lg font-bold text-[var(--text-headline)] mb-3">
                Next Step
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mb-5">
                Update your details in Store Profile and monitor Notifications for review feedback.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/seller/store-profile"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--brand-primary)] text-white text-sm font-semibold hover:bg-[var(--brand-primary-dark)] transition-colors"
                >
                  Go to Store Profile
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/seller/notifications"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-200 text-sm font-semibold text-[var(--text-headline)] hover:bg-orange-50 transition-colors"
                >
                  View Notifications
                </Link>
              </div>

              <div className="mt-5 pt-5 border-t border-orange-100 text-xs text-[var(--text-secondary)] flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Completing all requirements helps your application pass review faster.
              </div>
            </motion.section>
          </div>
        </div>
      </div>
    </SellerWorkspaceLayout>
  );
}
