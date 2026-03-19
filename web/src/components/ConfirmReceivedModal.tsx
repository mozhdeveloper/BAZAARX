import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, ImagePlus } from "lucide-react";
import { Button } from "./ui/button";
import { uploadReceiptPhotos, validateImageFile } from "../utils/storage";
import { orderMutationService } from "../services/orders/orderMutationService";
import { useToast } from "../hooks/use-toast";
import { cn } from "../lib/utils";

interface ConfirmReceivedModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    dbId: string;
    id: string;
    orderNumber?: string;
  };
  buyerId: string;
  onSuccess?: () => void;
}

export function ConfirmReceivedModal({
  isOpen,
  onClose,
  order,
  buyerId,
  onSuccess,
}: ConfirmReceivedModalProps) {
  const { toast } = useToast();
  const [isConfirming, setIsConfirming] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const handleClose = () => {
    if (!isConfirming) {
      onClose();
      // Cleanup previews
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
      setPhotoFiles([]);
      setPhotoPreviews([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isCapture = false) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const previews: string[] = [];

    for (const file of files) {
      const validation = validateImageFile(file);
      if (validation.valid) {
        validFiles.push(file);
        previews.push(URL.createObjectURL(file));
      } else {
        toast({
          title: "Invalid File",
          description: validation.error,
          variant: "destructive",
        });
      }
    }

    if (validFiles.length > 0) {
      setPhotoFiles((prev) => [...prev, ...validFiles]);
      setPhotoPreviews((prev) => [...prev, ...previews]);
    }
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    const newFiles = [...photoFiles];
    const newPreviews = [...photoPreviews];
    URL.revokeObjectURL(newPreviews[index]);
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    setPhotoFiles(newFiles);
    setPhotoPreviews(newPreviews);
  };

  const handleConfirm = async () => {
    if (photoFiles.length === 0) {
      toast({
        title: "Photo Required",
        description: "Please take or upload a photo of the received package.",
        variant: "destructive",
      });
      return;
    }

    setIsConfirming(true);
    try {
      const photoUrls = await uploadReceiptPhotos(
        photoFiles,
        order.dbId || order.id,
        buyerId
      );

      const success = await orderMutationService.confirmOrderReceived({
        orderId: order.dbId || order.id,
        buyerId,
        receiptPhotoUrls: photoUrls,
      });

      if (success) {
        toast({
          title: "Order Received",
          description: "Thank you for confirming receipt!",
        });
        if (onSuccess) onSuccess();
        handleClose();
      }
    } catch (error) {
      console.error("Failed to confirm receipt:", error);
      toast({
        title: "Update Failed",
        description: "Could not confirm receipt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[200]"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Confirm Order Received
              </h3>
              <p className="text-gray-600 mb-6 text-sm">
                Have you received your order <span className="font-bold text-gray-900">{order.orderNumber || order.id}</span>?<br />
                This will confirm that the package was delivered to you.
              </p>

              {/* Photo Upload Section */}
              <div className="text-left mb-6">
                <label className="block text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  Photo Proof <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Take a photo or upload an image of the received package as proof of delivery.
                </p>

                {/* Photo Previews */}
                {photoPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 mb-4">
                    {photoPreviews.map((preview, index) => (
                      <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-100 group shadow-sm transition-all hover:shadow-md">
                        <img src={preview} alt={`Receipt ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-0 right-0 w-5 h-5 bg-white/50 text-gray-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:text-gray-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Buttons */}
                <div className="flex gap-3">
                  <label className="group flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-500 hover:bg-gray-100 transition-colors">
                    <Camera className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                    <span className="text-sm text-gray-300 group-hover:text-gray-500">Take Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, true)}
                      disabled={isConfirming}
                    />
                  </label>
                  <label className="group flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-500 hover:bg-gray-100 transition-colors">
                    <ImagePlus className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                    <span className="text-sm text-gray-300 group-hover:text-gray-500">Upload</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileChange(e)}
                      disabled={isConfirming}
                    />
                  </label>
                </div>
                {photoFiles.length === 0 && (
                  <p className="text-[11px] text-red-500 mt-2 italic">At least one photo is required</p>
                )}
              </div>

              <p className="text-xs text-gray-500 mb-6">
                Only confirm if you have actually received the items.
              </p>

              <div className="flex gap-3">
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="flex-1 border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 rounded-lg h-10"
                  disabled={isConfirming}
                >
                  Not Yet
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={isConfirming || photoFiles.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 h-10 rounded-lg transition-all"
                >
                  {isConfirming ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Yes, I Received It"
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
