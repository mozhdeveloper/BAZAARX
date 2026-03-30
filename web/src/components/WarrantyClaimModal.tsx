import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Upload, ImagePlus, AlertCircle, Wrench, RefreshCw, DollarSign, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { warrantyService, WarrantyClaimType } from "@/services/warrantyService";

interface WarrantyClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderItemId: string;
  orderDbId: string;
  orderId: string;
  itemName: string;
  onSuccess?: () => void;
}

const CLAIM_TYPES: { value: WarrantyClaimType; label: string; icon: JSX.Element }[] = [
  { value: 'repair', label: 'Repair', icon: <Wrench className="w-6 h-6 text-orange-500" /> },
  { value: 'replacement', label: 'Replacement', icon: <RefreshCw className="w-6 h-6 text-blue-500" /> },
  { value: 'refund', label: 'Refund', icon: <DollarSign className="w-6 h-6 text-green-600" /> },
  { value: 'technical_support', label: 'Technical Support', icon: <LifeBuoy className="w-6 h-6 text-gray-500" /> },
];

export function WarrantyClaimModal({
  isOpen,
  onClose,
  orderItemId,
  orderDbId,
  orderId,
  itemName,
  onSuccess,
}: WarrantyClaimModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimType, setClaimType] = useState<WarrantyClaimType | ''>('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      const newFiles = Array.from(selectedFiles);
      const validFiles = newFiles.filter(file =>
        file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024
      );

      if (validFiles.length !== newFiles.length) {
        toast({
          title: "Invalid Files",
          description: "Some files were skipped. Only images under 5MB are allowed.",
          variant: "destructive",
        });
      }

      setFiles(prev => [...prev, ...validFiles]);

      // Create previews
      const previews = validFiles.map(file => URL.createObjectURL(file));
      setFilePreviews(prev => [...prev, ...previews]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!claimType) {
      toast({
        title: "Missing Information",
        description: "Please select a claim type",
        variant: "destructive",
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a reason for your claim",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please describe the issue in detail",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload evidence files if any
      let evidenceUrls: string[] = [];
      if (files.length > 0) {
        const uploadPromises = files.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('orderItemId', orderItemId);

          // Direct upload to Supabase storage
          const response = await fetch(`/api/warranty/evidence`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) throw new Error('Upload failed');
          const data = await response.json();
          return data.url;
        });

        evidenceUrls = await Promise.all(uploadPromises);
      }

      const result = await warrantyService.createWarrantyClaim({
        orderItemId,
        claimType: claimType as WarrantyClaimType,
        reason: reason.trim(),
        description: description.trim(),
        evidenceUrls,
      });

      if (result.success && result.claim) {
        toast({
          title: "Warranty Claim Submitted",
          description: `Your claim ${result.claim.claim_number} has been submitted successfully.`,
          duration: 5000,
        });

        onSuccess?.();
        handleClose();
      } else {
        throw new Error(result.error || 'Failed to submit warranty claim');
      }
    } catch (error: any) {
      toast({
        title: "Warranty Claim Failed",
        description: error.message || "Failed to submit warranty claim. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setClaimType('');
    setReason('');
    setDescription('');
    setFiles([]);
    setFilePreviews([]);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[170]"
          onClick={handleClose}
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
                <h2 className="text-xl font-bold text-gray-900">Claim Warranty</h2>
                <p className="text-sm text-gray-500 truncate max-w-md">{itemName}</p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Banner */}
            <div className="mx-6 mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-orange-900 mb-1">
                  Warranty Claim
                </p>
                <p className="text-xs text-orange-800 leading-relaxed">
                  Submit a warranty claim for this product. Our team will review your claim
                  and respond within 3-5 business days.
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-5">
              {/* Claim Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Claim Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {CLAIM_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setClaimType(type.value)}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all text-left",
                        claimType === type.value
                          ? "border-[var(--brand-primary)] bg-orange-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <span className="mb-2 block">{type.icon}</span>
                      <p className={cn(
                        "text-sm font-medium",
                        claimType === type.value ? "text-[var(--brand-primary)]" : "text-gray-700"
                      )}>
                        {type.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Product stopped working, Defective part"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] transition-all"
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">{reason.length}/100</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Detailed Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe the issue in detail, including when it started and any troubleshooting steps you've taken..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] transition-all resize-none"
                  rows={5}
                  maxLength={1000}
                />
                <p className="text-xs text-gray-500 mt-1">{description.length}/1000</p>
              </div>

              {/* Evidence Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Evidence (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[var(--brand-primary)] transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="evidence-upload"
                  />
                  <label htmlFor="evidence-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      Images only (max 5MB each)
                    </p>
                  </label>
                </div>

                {/* File Previews */}
                {filePreviews.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {filePreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                        <img src={preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeFile(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-100"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !claimType || !reason.trim() || !description.trim()}
                className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Submit Claim
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}
