import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  Clock3,
  FileCheck,
  HelpCircle,
  Settings,
  ShieldAlert,
  Store,
} from "lucide-react";
import { useAuthStore } from "@/stores/sellerStore";
import { SellerWorkspaceLayout } from "@/components/seller/SellerWorkspaceLayout";
import { normalizeSellerApprovalStatus } from "@/utils/sellerAccess";

const portalLinks = [
  {
    title: "Verification Requirements",
    description: "See the complete checklist needed for seller approval.",
    href: "/seller/verification-requirements",
    icon: FileCheck,
  },
  {
    title: "Store Profile",
    description: "Update store details and resubmit flagged documents.",
    href: "/seller/store-profile",
    icon: Store,
  },
  {
    title: "Notifications",
    description: "Check admin updates and verification notices.",
    href: "/seller/notifications",
    icon: Bell,
  },
  {
    title: "Help Center",
    description: "Contact support if you need help with verification.",
    href: "/seller/help-center",
    icon: HelpCircle,
  },
  {
    title: "Settings",
    description: "Manage account and communication preferences.",
    href: "/seller/settings",
    icon: Settings,
  },
] as const;

const statusContent = {
  pending: {
    title: "Application Under Review",
    description:
      "Your business details are in review. You can use limited tools while waiting for approval.",
    icon: Clock3,
    accent: "text-amber-600",
    badge: "Pending",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  needs_resubmission: {
    title: "Updates Required",
    description:
      "Some documents need updates. Please review feedback in Store Profile and resubmit.",
    icon: AlertTriangle,
    accent: "text-orange-600",
    badge: "Needs Resubmission",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
  },
  rejected: {
    title: "Application Requires Changes",
    description:
      "Your application needs revisions before approval. Review details and submit updated requirements.",
    icon: ShieldAlert,
    accent: "text-red-600",
    badge: "Needs Review",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  },
} as const;

export function UnverifiedSellerPortal() {
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
          <div className="max-w-7xl mx-auto space-y-8 pb-10">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-orange-100/70 shadow-md p-6 md:p-8"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center">
                    <StatusIcon className={`h-6 w-6 ${content.accent}`} />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black text-[var(--text-headline)] font-heading tracking-tight">
                      {content.title}
                    </h1>
                    <p className="text-sm md:text-base text-[var(--text-secondary)] mt-1 max-w-3xl">
                      {content.description}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center self-start px-3 py-1 rounded-full text-xs font-bold border ${content.badgeClass}`}
                >
                  {content.badge}
                </span>
              </div>

              <div className="mt-6 rounded-xl border border-orange-100 bg-orange-50/50 p-4">
                <p className="text-sm text-[var(--text-secondary)]">
                  You currently have access to five areas: Verification Requirements,
                  Store Profile, Notifications, Help Center, and Settings. Other
                  seller tools unlock automatically after approval.
                </p>
              </div>
            </motion.div>

            <section>
              <h2 className="text-lg font-bold text-[var(--text-headline)] mb-4">
                Allowed Seller Workspace
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {portalLinks.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        to={item.href}
                        className="block bg-white rounded-xl border border-orange-100/80 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                      >
                        <div className="h-11 w-11 rounded-lg bg-orange-50 text-[var(--brand-primary)] flex items-center justify-center mb-4">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="font-bold text-[var(--text-headline)]">
                          {item.title}
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                          {item.description}
                        </p>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </SellerWorkspaceLayout>
  );
}
