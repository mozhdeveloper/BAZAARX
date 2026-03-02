import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Camera, Package, ThumbsUp, ChevronDown, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";
import { useBuyerStore } from "../stores/buyerStore";
import { orderMutationService } from "../services/orders/orderMutationService";
import { supabase } from "../lib/supabase";
import { validateImageFile } from "../utils/storage";
import { cn } from "@/lib/utils";
import { useToast } from "../hooks/use-toast";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
  orderId: string;
  displayOrderId?: string;
  sellerId?: string;
  sellerName: string;
  items: Array<{
    id: string;
    name: string;
    image?: string;
    variant?: {
      size?: string;
      color?: string;
      name?: string;
    };
    variation?: {
      size?: string;
      color?: string;
      name?: string;
    };
  }>;
}

export function ReviewModal({
  isOpen,
  onClose,
  onSubmitted,
  orderId,
  displayOrderId,
  sellerId,
  sellerName,
  items,
}: ReviewModalProps) {
  // UI State
  const [expandedItemId, setExpandedItemId] = useState<string | null>(items[0]?.id || null);

  // Form State
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [hoveredRatings, setHoveredRatings] = useState<Record<string, number>>({});
  const [reviewTexts, setReviewTexts] = useState<Record<string, string>>({});
  const [imagesMap, setImagesMap] = useState<Record<string, string[]>>({});
  const [imageFilesMap, setImageFilesMap] = useState<Record<string, File[]>>({});

  // Submission State
  const [submittingItems, setSubmittingItems] = useState<Record<string, boolean>>({});
  const [submittedItems, setSubmittedItems] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const { addReview, profile } = useBuyerStore();
  const { toast } = useToast();
  const isAnySubmitting = Object.values(submittingItems).some(Boolean);

  const resetForm = () => {
    Object.values(imagesMap).flat().forEach((url) => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    });
    setRatings({});
    setHoveredRatings({});
    setReviewTexts({});
    setImagesMap({});
    setImageFilesMap({});
    setSubmittingItems({});
    setSubmittedItems({});
    setExpandedItemId(items[0]?.id || null);
    setSubmitted(false);
  };

  const handleClose = () => {
    if (isAnySubmitting) return;
    resetForm();
    onClose();
  };

  const toggleExpand = (id: string) => {
    setExpandedItemId(prev => prev === id ? null : id);
  };

  const handleSubmitItem = async (itemId: string) => {
    const rating = ratings[itemId] || 0;
    if (rating === 0) {
      toast({ title: "Rating Required", description: "Please select a star rating for this item.", variant: "destructive" });
      return;
    }

    setSubmittingItems(prev => ({ ...prev, [itemId]: true }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const buyerId = session?.user?.id || profile?.id;

      if (!buyerId) {
        toast({ title: "Not Logged In", description: "You must be logged in to submit a review.", variant: "destructive" });
        setSubmittingItems(prev => ({ ...prev, [itemId]: false }));
        return;
      }

      const currentImages = imagesMap[itemId] || [];
      const currentFiles = imageFilesMap[itemId] || [];
      const cleanedImages = currentImages.filter(image => /^https?:\/\//i.test(image));

      const success = await orderMutationService.submitOrderReview({
        orderId,
        buyerId,
        reviews: [{
          productId: itemId,
          rating,
          comment: reviewTexts[itemId] || "",
          images: cleanedImages,
          imageFiles: currentFiles
        }]
      });

      if (!success) {
        toast({ title: "Review Failed", description: "Failed to submit review. This item may have already been reviewed.", variant: "destructive" });
        setSubmittingItems(prev => ({ ...prev, [itemId]: false }));
        return;
      }

      // Add to store for legacy compatibility
      addReview({
        productId: itemId,
        sellerId: sellerId || "seller-1",
        buyerId: buyerId,
        buyerName: session?.user?.user_metadata?.full_name || profile?.name || "Anonymous",
        buyerAvatar: profile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${buyerId}`,
        rating,
        comment: reviewTexts[itemId] || "Great product!",
        images: cleanedImages,
        verified: true,
      });

      // Dispatch global event so ProductReviews components can refresh in real-time
      window.dispatchEvent(new CustomEvent('review-submitted', { detail: { productId: itemId } }));

      onSubmitted?.();

      setSubmittedItems(prev => {
        const nextState = { ...prev, [itemId]: true };

        // Auto-expand the next unreviewed item
        const nextUnreviewed = items.find(i => !nextState[i.id]);
        if (nextUnreviewed) {
          setExpandedItemId(nextUnreviewed.id);
        } else {
          setExpandedItemId(null);
        }

        // If ALL items are reviewed, trigger global success
        if (items.every(i => nextState[i.id])) {
          setSubmitted(true);
          setTimeout(() => {
            onClose();
            resetForm();
          }, 2000);
        }
        return nextState;
      });

    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast({ title: "Error", description: error.message || "An error occurred. Please try again.", variant: "destructive" });
    } finally {
      setSubmittingItems(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
    const files = e.target.files;
    if (!files) return;

    const currentFiles = imageFilesMap[itemId] || [];
    const remainingSlots = Math.max(0, 5 - currentFiles.length);

    if (remainingSlots <= 0) {
      e.target.value = "";
      return;
    }

    const selected = Array.from(files).slice(0, remainingSlots);
    const acceptedFiles: File[] = [];
    const validationErrors: string[] = [];

    selected.forEach((file) => {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        validationErrors.push(`${file.name}: ${validation.error || "Invalid image file"}`);
        return;
      }
      acceptedFiles.push(file);
    });

    if (validationErrors.length > 0) toast({ title: "Invalid Images", description: validationErrors.join(" "), variant: "destructive" });

    if (acceptedFiles.length > 0) {
      const previewUrls = acceptedFiles.map((file) => URL.createObjectURL(file));
      setImageFilesMap(prev => ({
        ...prev,
        [itemId]: [...(prev[itemId] || []), ...acceptedFiles].slice(0, 5)
      }));
      setImagesMap(prev => ({
        ...prev,
        [itemId]: [...(prev[itemId] || []), ...previewUrls].slice(0, 5)
      }));
    }
    e.target.value = "";
  };

  const handleRemoveImage = (itemId: string, index: number) => {
    setImagesMap((prev) => {
      const currentImages = prev[itemId] || [];
      const imageUrl = currentImages[index];
      if (imageUrl?.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
      return { ...prev, [itemId]: currentImages.filter((_, i) => i !== index) };
    });
    setImageFilesMap((prev) => {
      const currentFiles = prev[itemId] || [];
      return { ...prev, [itemId]: currentFiles.filter((_, i) => i !== index) };
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-60 p-4"
          onClick={() => { if (!submitted && !isAnySubmitting) handleClose(); }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {!submitted ? (
              <>
                {/* Header */}
                <div className="sticky top-0 z-20 p-6 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] text-white rounded-t-2xl shadow-md">
                  <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                    disabled={isAnySubmitting}
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-3 mb-2">
                    <div>
                      <h2 className="text-2xl font-bold">Review Your Items</h2>
                      <p className="text-orange-100">Order #{displayOrderId || orderId}</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Seller Info */}
                  <div className="flex items-center gap-3 p-4 bg-[var(--brand-wash)] rounded-lg">
                    <div className="w-12 h-12 bg-[var(--brand-primary)] rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {sellerName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{sellerName}</p>
                      <p className="text-sm text-gray-600">Review items individually. You can review the rest later!</p>
                    </div>
                  </div>

                  {/* Accordion Item List */}
                  <div className="space-y-4">
                    {items.map((item) => {
                      const isExpanded = expandedItemId === item.id;
                      const isItemSubmitted = submittedItems[item.id];
                      const isItemSubmitting = submittingItems[item.id];

                      const currentRating = ratings[item.id] || 0;
                      const currentHovered = hoveredRatings[item.id] || 0;
                      const currentText = reviewTexts[item.id] || "";
                      const currentImages = imagesMap[item.id] || [];

                      return (
                        <div key={item.id} className={cn(
                          "border rounded-xl bg-white overflow-hidden transition-all duration-300",
                          isExpanded ? "border-[var(--brand-primary)] shadow-md" : "border-gray-200 shadow-sm",
                          isItemSubmitted && "border-green-200"
                        )}>
                          {/* Accordion Header (Clickable) */}
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className={cn(
                              "w-full flex items-center justify-between p-4 transition-colors text-left",
                              isExpanded ? "bg-[var(--brand-wash)]" : "hover:bg-gray-50",
                              isItemSubmitted && "bg-green-50/50"
                            )}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {item.image ? (
                                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Package className="w-6 h-6 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-sm line-clamp-1">{item.name}</p>
                                {(() => {
                                  const v = item.variant || item.variation;
                                  if (!v) return null;
                                  const isRepeat = v.name?.toLowerCase() === item.name?.toLowerCase();
                                  return (
                                    <div className="flex flex-wrap items-center gap-1 mt-0.5 text-[11px] text-[var(--text-muted)] font-medium">
                                      {v.name && !isRepeat && <span>{v.name}</span>}
                                      {v.size && <span>Size: {v.size}</span>}
                                      {v.size && v.color && <span className="text-gray-300">|</span>}
                                      {v.color && <span>Color: {v.color}</span>}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                              {isItemSubmitted ? (
                                <div className="flex items-center gap-1.5 text-green-600 bg-green-100 px-2.5 py-1 rounded-full text-xs font-semibold">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Reviewed</span>
                                </div>
                              ) : (
                                <ChevronDown
                                  className={cn("w-5 h-5 text-gray-400 transition-transform duration-300", isExpanded && "rotate-180")}
                                />
                              )}
                            </div>
                          </button>

                          {/* Accordion Body (The Form) */}
                          <AnimatePresence initial={false}>
                            {isExpanded && !isItemSubmitted && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden"
                              >
                                <div className="p-5 border-t border-gray-100 space-y-6">

                                  {/* Explicit Label: Rating */}
                                  <div>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Overall Rating <span className="text-red-500">*</span></h3>
                                    <div className="flex gap-1.5">
                                      {[1, 2, 3, 4, 5].map((val) => (
                                        <button
                                          key={val}
                                          onClick={() => setRatings(prev => ({ ...prev, [item.id]: val }))}
                                          onMouseEnter={() => setHoveredRatings(prev => ({ ...prev, [item.id]: val }))}
                                          onMouseLeave={() => setHoveredRatings(prev => ({ ...prev, [item.id]: 0 }))}
                                          className="focus:outline-none transition-transform hover:scale-110 p-1"
                                          disabled={isItemSubmitting}
                                        >
                                          <Star
                                            className={cn(
                                              "w-8 h-8 transition-colors",
                                              val <= (currentHovered || currentRating)
                                                ? "fill-[var(--brand-primary)] text-[var(--brand-primary)]"
                                                : "text-gray-200"
                                            )}
                                          />
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Explicit Label: Description */}
                                  <div>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Share your experience <span className="text-gray-400 font-normal">(Optional)</span></h3>
                                    <textarea
                                      value={currentText}
                                      onChange={(e) => setReviewTexts(prev => ({ ...prev, [item.id]: e.target.value }))}
                                      placeholder="How is the product quality? Did it match the description?"
                                      className="w-full px-4 py-3 border border-[var(--btn-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] resize-none h-24 text-sm"
                                      disabled={isItemSubmitting}
                                    />
                                  </div>

                                  {/* Explicit Label: Images */}
                                  <div>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Add Photos <span className="text-gray-400 font-normal">(Optional)</span></h3>
                                    <div className="flex items-center gap-3 flex-wrap">
                                      {currentImages.map((img, index) => (
                                        <div key={index} className="relative group">
                                          <img
                                            src={img}
                                            alt="Review Thumbnail"
                                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                          />
                                          <button
                                            onClick={() => handleRemoveImage(item.id, index)}
                                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            disabled={isItemSubmitting}
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      ))}
                                      {currentImages.length < 5 && (
                                        <label className="w-16 h-16 border-2 border-dashed border-[var(--btn-border)] rounded-lg flex items-center justify-center cursor-pointer hover:border-[var(--brand-primary)] hover:bg-[var(--brand-wash)] transition-colors">
                                          <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={(e) => handleImageUpload(e, item.id)}
                                            className="hidden"
                                            disabled={isItemSubmitting}
                                          />
                                          <Camera className="w-5 h-5 text-[var(--text-muted)]" />
                                        </label>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">Max 5 photos per item.</p>
                                  </div>

                                  {/* Submit Action */}
                                  <div className="pt-2 flex justify-end">
                                    <Button
                                      onClick={() => handleSubmitItem(item.id)}
                                      disabled={isItemSubmitting || currentRating === 0}
                                      className="w-full sm:w-auto px-6 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white font-semibold transition-colors"
                                    >
                                      {isItemSubmitting ? (
                                        <div className="flex items-center gap-2">
                                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                          Submitting...
                                        </div>
                                      ) : (
                                        "Submit This Review"
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-4 border-t border-gray-200 sticky bottom-0 bg-white flex justify-end">
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      disabled={isAnySubmitting}
                      className="px-6"
                    >
                      {Object.keys(submittedItems).length > 0 ? "Done For Now" : "Cancel"}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              /* Global Success State */
              <div className="p-8 text-center my-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <ThumbsUp className="w-10 h-10 text-green-600" />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  All Reviews Complete!
                </h2>
                <p className="text-gray-600 mb-4">
                  Thank you for reviewing all your items.
                </p>
                <p className="text-sm text-gray-500">
                  Your feedback helps other shoppers make better decisions.
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}