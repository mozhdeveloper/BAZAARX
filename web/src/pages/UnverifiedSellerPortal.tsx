import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileCheck2,
  FileText,
  HelpCircle,
  Landmark,
  MapPinHouse,
  ShieldAlert,
  Settings,
  User,
} from "lucide-react";
import { useAuthStore } from "@/stores/sellerStore";
import { SellerWorkspaceLayout } from "@/components/seller/SellerWorkspaceLayout";
import { normalizeSellerApprovalStatus } from "@/utils/sellerAccess";

const businessInformationChecklist = [
  {
    title: "Business Name",
    description: "Provide your registered business name.",
    icon: Building2,
    isComplete: (seller: any) => Boolean(seller?.businessName),
  },
  {
    title: "Business Type",
    description: "Select your business type.",
    icon: Landmark,
    isComplete: (seller: any) => Boolean(seller?.businessType),
  },
  {
    title: "Business Registration Number",
    description: "Enter your DTI/SEC registration number.",
    icon: FileText,
    isComplete: (seller: any) => Boolean(seller?.businessRegistrationNumber),
  },
  {
    title: "Tax ID Number (TIN)",
    description: "Provide your business tax identification number.",
    icon: CreditCard,
    isComplete: (seller: any) => Boolean(seller?.taxIdNumber),
  },
  {
    title: "Business Address",
    description: "Complete address, city, province, and postal code.",
    icon: MapPinHouse,
    isComplete: (seller: any) =>
      Boolean(
        seller?.businessAddress &&
          seller?.city &&
          seller?.province &&
          seller?.postalCode,
      ),
  },
] as const;

const documentChecklist = [
  {
    title: "Business Permit",
    description: "Upload a valid business permit.",
    icon: FileText,
    isComplete: (seller: any) => Boolean(seller?.businessPermitUrl),
  },
  {
    title: "Government-Issued ID",
    description: "Upload a clear government-issued ID.",
    icon: User,
    isComplete: (seller: any) => Boolean(seller?.validIdUrl),
  },
  {
    title: "Proof of Address",
    description: "Upload proof of address that matches your profile.",
    icon: FileCheck2,
    isComplete: (seller: any) => Boolean(seller?.proofOfAddressUrl),
  },
  {
    title: "DTI/SEC Registration",
    description: "Upload your DTI certificate or SEC registration.",
    icon: Building2,
    isComplete: (seller: any) => Boolean(seller?.dtiRegistrationUrl),
  },
  {
    title: "BIR Tax ID (TIN)",
    description: "Upload your BIR Certificate of Registration.",
    icon: CreditCard,
    isComplete: (seller: any) => Boolean(seller?.taxIdUrl),
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

  const businessItems = businessInformationChecklist.map((item) => ({
    ...item,
    complete: item.isComplete(seller),
  }));
  const documentItems = documentChecklist.map((item) => ({
    ...item,
    complete: item.isComplete(seller),
  }));
  const allItems = [...businessItems, ...documentItems];
  const completedCount = allItems.filter((item) => item.complete).length;
  const completionRate = Math.round((completedCount / allItems.length) * 100);

  const ChecklistSection = ({
    title,
    description,
    items,
  }: {
    title: string;
    description: string;
    items: Array<{
      title: string;
      description: string;
      icon: ComponentType<{ className?: string }>;
      complete: boolean;
    }>;
  }) => (
    <section className="bg-white rounded-2xl border border-orange-100/80 p-6 md:p-8 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-[var(--text-headline)]">{title}</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => {
          const Icon = item.icon;

          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="flex items-start justify-between gap-4 p-4 rounded-xl border border-orange-100 bg-orange-50/40"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-white text-[var(--brand-primary)] flex items-center justify-center border border-orange-100">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-headline)]">{item.title}</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{item.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    item.complete
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-orange-50 text-orange-700 border-orange-200"
                  }`}
                >
                  {item.complete ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Complete
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Action Needed
                    </>
                  )}
                </span>
                {!item.complete && (
                  <Link
                    to="/seller/store-profile"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)]"
                  >
                    Fix
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );

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

              <div className="mt-6 rounded-xl border border-orange-100 bg-orange-50/60 p-4">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <p className="text-sm font-semibold text-[var(--text-headline)]">
                    Verification Readiness
                  </p>
                  <span className="text-sm font-bold text-[var(--brand-primary)]">
                    {completedCount}/{allItems.length}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-orange-100 overflow-hidden">
                  <div
                    className="h-full bg-[var(--brand-primary)]"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  Complete all checklist items for faster approval.
                </p>
              </div>
            </motion.div>

            <ChecklistSection
              title="Business Information"
              description="Complete each business field in the same order shown in Store Profile."
              items={businessItems}
            />

            <ChecklistSection
              title="Verification Documents"
              description="Upload all required files in Store Profile to avoid review delays."
              items={documentItems}
            />

            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-orange-100/80 p-6 md:p-8 shadow-sm"
            >
              <h2 className="text-lg font-bold text-[var(--text-headline)] mb-3">
                Need help finishing requirements?
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Use Store Profile to update details, then monitor Notifications for feedback from the verification team.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/seller/store-profile"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--brand-primary)] text-white text-sm font-semibold hover:bg-[var(--brand-primary-dark)] transition-colors"
                >
                  Update Store Profile
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/seller/notifications"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-200 text-sm font-semibold text-[var(--text-headline)] hover:bg-orange-50 transition-colors"
                >
                  View Notifications
                </Link>
                <Link
                  to="/seller/help-center"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-200 text-sm font-semibold text-[var(--text-headline)] hover:bg-orange-50 transition-colors"
                >
                  <HelpCircle className="h-4 w-4" />
                  Get Help
                </Link>
                <Link
                  to="/seller/settings"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-200 text-sm font-semibold text-[var(--text-headline)] hover:bg-orange-50 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Account Settings
                </Link>
              </div>
            </motion.section>
          </div>
        </div>
      </div>
    </SellerWorkspaceLayout>
  );
}
