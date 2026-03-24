import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, ShieldCheck, ShieldOff, Calendar, Phone, Mail, Link as LinkIcon, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OrderItemWarrantySnapshot } from "@/types/orders";
import { cn } from "@/lib/utils";
import { WARRANTY_TYPE_LABELS, WARRANTY_CLAIM_STATUS_LABELS } from "@/services/warrantyService";

interface WarrantyStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  warranty: OrderItemWarrantySnapshot | null;
  itemName: string;
  onClaimWarranty?: () => void;
}

export function WarrantyStatusModal({
  isOpen,
  onClose,
  warranty,
  itemName,
  onClaimWarranty,
}: WarrantyStatusModalProps) {
  if (!warranty) return null;

  const getStatusColor = () => {
    if (warranty.isExpired) return "text-red-600 bg-red-50 border-red-200";
    if (warranty.warrantyClaimed) {
      switch (warranty.warrantyClaimStatus) {
        case 'approved':
        case 'resolved':
        case 'replacement_sent':
        case 'refund_processed':
          return "text-green-600 bg-green-50 border-green-200";
        case 'rejected':
        case 'cancelled':
          return "text-red-600 bg-red-50 border-red-200";
        case 'repair_in_progress':
        case 'under_review':
          return "text-orange-600 bg-orange-50 border-orange-200";
        default:
          return "text-blue-600 bg-blue-50 border-blue-200";
      }
    }
    if (warranty.canClaim) return "text-green-600 bg-green-50 border-green-200";
    return "text-gray-600 bg-gray-50 border-gray-200";
  };

  const getStatusIcon = () => {
    if (warranty.isExpired) return <ShieldOff className="w-5 h-5" />;
    if (warranty.warrantyClaimed) return <ShieldCheck className="w-5 h-5" />;
    if (warranty.canClaim) return <ShieldCheck className="w-5 h-5" />;
    return <Shield className="w-5 h-5" />;
  };

  const getStatusLabel = () => {
    if (warranty.isExpired) return "Expired";
    if (warranty.warrantyClaimed && warranty.warrantyClaimStatus) {
      return WARRANTY_CLAIM_STATUS_LABELS[warranty.warrantyClaimStatus] || warranty.warrantyClaimStatus;
    }
    if (warranty.canClaim) return "Active";
    return "Not Active";
  };

  const getDaysRemainingText = () => {
    if (warranty.isExpired) return "Expired";
    if (warranty.daysRemaining !== undefined) {
      if (warranty.daysRemaining <= 0) return "Expires today";
      if (warranty.daysRemaining === 1) return "1 day remaining";
      if (warranty.daysRemaining <= 30) return `${warranty.daysRemaining} days remaining`;
      const months = Math.floor(warranty.daysRemaining / 30);
      return `${months} month${months > 1 ? 's' : ''} remaining`;
    }
    return "";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[160]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Warranty Information</h2>
                <p className="text-sm text-gray-500 truncate max-w-md">{itemName}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Banner */}
            <div className={cn("mx-6 mt-4 p-4 rounded-xl border flex items-start gap-3", getStatusColor())}>
              <div className="shrink-0">{getStatusIcon()}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base">{getStatusLabel()}</p>
                {!warranty.isExpired && warranty.canClaim && (
                  <p className="text-sm opacity-90">{getDaysRemainingText()}</p>
                )}
                {warranty.warrantyClaimed && warranty.warrantyClaimStatus && (
                  <p className="text-sm opacity-90">
                    Claim status: {getStatusLabel()}
                  </p>
                )}
              </div>
            </div>

            {/* Warranty Details */}
            <div className="px-6 py-5 space-y-5">
              {/* Warranty Type & Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Warranty Type</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {warranty.warrantyType ? WARRANTY_TYPE_LABELS[warranty.warrantyType] : 'No Warranty'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Duration</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {warranty.warrantyDurationMonths ? `${warranty.warrantyDurationMonths} months` : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Coverage Period */}
              {(warranty.warrantyStartDate || warranty.warrantyExpirationDate) && (
                <div className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-[var(--brand-primary)]" />
                    <p className="text-sm font-semibold text-gray-900">Coverage Period</p>
                  </div>
                  <div className="space-y-2">
                    {warranty.warrantyStartDate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Start Date</span>
                        <span className="font-medium text-gray-900">
                          {new Date(warranty.warrantyStartDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                    {warranty.warrantyExpirationDate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Expiration Date</span>
                        <span className={cn(
                          "font-medium",
                          warranty.isExpired ? "text-red-600" : "text-gray-900"
                        )}>
                          {new Date(warranty.warrantyExpirationDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Provider Information */}
              {warranty.warrantyProviderName && (
                <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[var(--brand-primary)]" />
                    <p className="text-sm font-semibold text-gray-900">Warranty Provider</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-900">{warranty.warrantyProviderName}</p>
                    {warranty.warrantyProviderContact && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span>{warranty.warrantyProviderContact}</span>
                      </div>
                    )}
                    {warranty.warrantyProviderEmail && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <a href={`mailto:${warranty.warrantyProviderEmail}`} className="hover:text-[var(--brand-primary)] transition-colors">
                          {warranty.warrantyProviderEmail}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Terms & Policy */}
              {warranty.warrantyTermsUrl && (
                <div className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <LinkIcon className="w-4 h-4 text-[var(--brand-primary)]" />
                    <p className="text-sm font-semibold text-gray-900">Terms & Conditions</p>
                  </div>
                  <a
                    href={warranty.warrantyTermsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1"
                  >
                    View full terms
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              )}

              {warranty.warrantyPolicy && (
                <div className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-[var(--brand-primary)]" />
                    <p className="text-sm font-semibold text-gray-900">Warranty Policy</p>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {warranty.warrantyPolicy}
                  </p>
                </div>
              )}

              {/* Claim Status Details */}
              {warranty.warrantyClaimed && warranty.warrantyClaimReason && (
                <div className="border border-orange-100 bg-orange-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <p className="text-sm font-semibold text-orange-900">Claim Reason</p>
                  </div>
                  <p className="text-sm text-orange-800 italic">"{warranty.warrantyClaimReason}"</p>
                </div>
              )}

              {/* Info Box */}
              {!warranty.warrantyClaimed && !warranty.isExpired && warranty.canClaim && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green-900 mb-1">
                        Your warranty is active
                      </p>
                      <p className="text-xs text-green-800 leading-relaxed">
                        If you experience any issues with this product, you can file a warranty claim. 
                        Make sure to have your order details and evidence of the issue ready.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-100"
              >
                Close
              </Button>
              {!warranty.warrantyClaimed && !warranty.isExpired && warranty.canClaim && onClaimWarranty && (
                <Button
                  onClick={onClaimWarranty}
                  className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white"
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Claim Warranty
                </Button>
              )}
              {warranty.warrantyClaimed && (
                <Button
                  disabled
                  className="flex-1 bg-gray-100 text-gray-500 cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Claim Submitted
                </Button>
              )}
              {warranty.isExpired && (
                <Button
                  disabled
                  className="flex-1 bg-gray-100 text-gray-500 cursor-not-allowed"
                >
                  <ShieldOff className="w-4 h-4 mr-2" />
                  Warranty Expired
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
