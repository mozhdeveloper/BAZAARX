import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Camera, Package, ThumbsUp } from "lucide-react";
import { Button } from "./ui/button";
import { useBuyerStore } from "../stores/buyerStore";
import { orderMutationService } from "../services/orders/orderMutationService";
import { supabase } from "../lib/supabase";
import { validateImageFile } from "../utils/storage";
import { cn } from "@/lib/utils";

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
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { addReview } = useBuyerStore();

  const revokeBlobUrls = (urls: string[]) => {
    urls.forEach((url) => {
      if (url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    });
  };

  const resetForm = () => {
    revokeBlobUrls(images);
    setRating(0);
    setHoveredRating(0);
    setReviewText("");
    setImages([]);
    setImageFiles([]);
    setSubmitted(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      alert("Please select a rating");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user session to retrieve buyer_id
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const buyerId = session?.user?.id;

      if (!buyerId) {
        alert("You must be logged in to submit a review");
        setIsSubmitting(false);
        return;
      }

      const persistableImages = images.filter((image) =>
        /^https?:\/\//i.test(image),
      );

      // Submit review to Supabase using our service
      const success = await orderMutationService.submitOrderReview({
        orderId,
        buyerId,
        rating,
        comment: reviewText || "Great product!",
        images: persistableImages,
        imageFiles,
      });

      if (!success) {
        alert("Failed to submit review. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Add review to buyer store for display (legacy support)
      items.forEach((item) => {
        addReview({
          productId: item.id,
          sellerId: sellerId || "seller-1",
          buyerId: buyerId,
          buyerName: session?.user?.user_metadata?.full_name || "Anonymous",
          buyerAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${buyerId}`,
          rating,
          comment: reviewText || "Great product!",
          images: persistableImages,
          verified: true,
        });
      });

      console.log(
        `✅ Review submitted successfully for order ${orderId}: ${rating} stars`,
      );

      onSubmitted?.();

      setSubmitted(true);
      setIsSubmitting(false);

      // Auto close after 2 seconds
      setTimeout(() => {
        onClose();
        resetForm();
      }, 2000);
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("An error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) {
      return;
    }

    const remainingSlots = Math.max(0, 5 - imageFiles.length);

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
        validationErrors.push(
          `${file.name}: ${validation.error || "Invalid image file"}`,
        );
        return;
      }

      acceptedFiles.push(file);
    });

    if (validationErrors.length > 0) {
      alert(validationErrors.join("\n"));
    }

    if (acceptedFiles.length > 0) {
      const previewUrls = acceptedFiles.map((file) => URL.createObjectURL(file));
      setImageFiles((prev) => [...prev, ...acceptedFiles].slice(0, 5));
      setImages((prev) => [...prev, ...previewUrls].slice(0, 5));
    }

    e.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const imageUrl = prev[index];
      if (imageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(imageUrl);
      }

      return prev.filter((_, i) => i !== index);
    });

    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-60 p-4"
          onClick={() => {
            if (!submitted) handleClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {!submitted ? (
              <>
                {/* Header */}
                <div className="sticky top-0 z-20 p-6 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] text-white rounded-t-2xl shadow-md">
                  <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                    disabled={isSubmitting}
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-3 mb-2">
                    <div>
                      <h2 className="text-2xl font-bold">
                        Rate Your Experience
                      </h2>
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
                      <p className="font-semibold text-gray-900">
                        {sellerName}
                      </p>
                      <p className="text-sm text-gray-600">
                        How was your shopping experience?
                      </p>
                    </div>
                  </div>

                  {/* Items Purchased */}
                  <div className="space-y-3">
                    <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-hide">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {item.name}
                            </p>
                            {/* Variation Display */}
                            {(() => {
                              const v = item.variant || item.variation;
                              if (!v) return null;

                              const hasSize = !!v.size;
                              const hasColor = !!v.color;
                              const hasSpecifics = hasSize || hasColor;

                              // Check if variation name is just a repeat of product name
                              const isRepeatOfName = v.name?.toLowerCase() === item.name?.toLowerCase();

                              return (
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                                  {v.name && !isRepeatOfName && !hasSpecifics && (
                                    <span className="text-xs text-[var(--text-muted)]">
                                      {v.name}
                                    </span>
                                  )}
                                  {v.size && (
                                    <span className="text-xs text-[var(--text-muted)]">
                                      Size: {v.size}
                                    </span>
                                  )}
                                  {v.size && v.color && (
                                    <span className="text-[10px] text-gray-300">|</span>
                                  )}
                                  {v.color && (
                                    <span className="text-xs text-[var(--text-muted)]">
                                      Color: {v.color}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Star Rating */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-900">
                      Overall Rating
                    </h3>
                    <div className="flex items-start gap-0">
                      {[
                        { val: 1, label: "Poor" },
                        { val: 2, label: "Fair" },
                        { val: 3, label: "Good" },
                        { val: 4, label: "Very Good" },
                        { val: 5, label: "Excellent" }
                      ].map((item) => (
                        <div key={item.val} className="flex flex-col items-center gap-2 w-16">
                          <button
                            onClick={() => setRating(item.val)}
                            onMouseEnter={() => setHoveredRating(item.val)}
                            onMouseLeave={() => setHoveredRating(0)}
                            className="transition-transform hover:scale-110 focus:outline-none"
                            disabled={isSubmitting}
                          >
                            <Star
                              className={`w-10 h-10 ${item.val <= (hoveredRating || rating)
                                ? "fill-[var(--brand-primary)] text-[var(--brand-primary)]"
                                : "text-[var(--text-muted)]"
                                } transition-colors`}
                              strokeWidth={1.5}
                            />
                          </button>
                          <span
                            className={cn(
                              "text-[10px] sm:text-xs font-medium transition-colors text-center leading-tight",
                              (hoveredRating === item.val || (!hoveredRating && rating === item.val))
                                ? "text-[var(--text-primary)]"
                                : "text-[var(--text-muted)]"
                            )}
                          >
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Review Text */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-900">
                      Share your experience (optional)
                    </h3>
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Tell us about the product quality, seller service, and delivery experience..."
                      className="w-full px-4 py-3 border border-[var(--btn-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] focus:border-transparent resize-none h-32 placeholder:text-[var(--text-muted)]"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-[var(--text-muted)]">
                      {reviewText.length}/500 characters
                    </p>
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                      Add Photos (optional)
                    </h3>
                    <div className="flex items-center gap-3 flex-wrap">
                      {images.map((img, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={img}
                            alt={`Review ${index + 1}`}
                            className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200"
                          />
                          <button
                            onClick={() => handleRemoveImage(index)}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            disabled={isSubmitting}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {images.length < 5 && (
                        <label className="w-20 h-20 border-2 border-dashed border-[var(--btn-border)] rounded-lg flex items-center justify-center cursor-pointer hover:border-[var(--brand-primary)] hover:bg-[var(--brand-wash)] transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                            disabled={isSubmitting}
                          />
                          <Camera className="w-6 h-6 text-[var(--text-muted)]" />
                        </label>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      You can add up to 5 photos. Images are uploaded securely
                      to review storage when you submit.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-gray-200">
                    <Button
                      onClick={handleSubmit}
                      disabled={rating === 0 || isSubmitting}
                      className="w-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] hover:from-[var(--brand-primary-dark)] hover:to-[var(--brand-primary)] text-white py-6 text-lg font-semibold"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Submitting...
                        </div>
                      ) : (
                        "Submit Review"
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              /* Success State */
              <div className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <ThumbsUp className="w-10 h-10 text-green-600" />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Thank You!
                </h2>
                <p className="text-gray-600 mb-4">
                  Your review has been submitted successfully.
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
