import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Camera, Package, ThumbsUp } from "lucide-react";
import { Button } from "./ui/button";
import { useBuyerStore } from "../stores/buyerStore";
import { orderService } from "../services/orderService";
import { supabase } from "../lib/supabase";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  displayOrderId?: string;
  sellerId?: string;
  sellerName: string;
  items: Array<{
    id: string;
    name: string;
    image?: string;
  }>;
}

export function ReviewModal({
  isOpen,
  onClose,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { addReview } = useBuyerStore();

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

      // Submit review to Supabase using our service
      const success = await orderService.submitOrderReview(
        orderId,
        buyerId,
        rating,
        reviewText || "Great product!",
        images,
      );

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
          images: images,
          verified: true,
        });
      });

      console.log(
        `✅ Review submitted successfully for order ${orderId}: ${rating} stars`,
      );

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

  const resetForm = () => {
    setRating(0);
    setHoveredRating(0);
    setReviewText("");
    setImages([]);
    setSubmitted(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files).map((file) =>
        URL.createObjectURL(file),
      );
      setImages((prev) => [...prev, ...newImages].slice(0, 5)); // Max 5 images
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4"
          onClick={() => {
            if (!submitted) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {!submitted ? (
              <>
                {/* Header */}
                <div className="relative p-6 bg-gradient-to-r from-orange-500 to-red-500 text-white">
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                    disabled={isSubmitting}
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Star className="w-6 h-6" />
                    </div>
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
                  <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
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
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Package className="w-5 h-5 text-orange-500" />
                      Items in this order
                    </h3>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
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
                          <p className="font-medium text-gray-900 text-sm flex-1">
                            {item.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Star Rating */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">
                      Overall Rating
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoveredRating(star)}
                            onMouseLeave={() => setHoveredRating(0)}
                            className="transition-transform hover:scale-110"
                            disabled={isSubmitting}
                          >
                            <Star
                              className={`w-10 h-10 ${star <= (hoveredRating || rating)
                                ? "fill-orange-500 text-orange-500"
                                : "text-gray-300"
                                } transition-colors`}
                            />
                          </button>
                        ))}
                      </div>
                      {rating > 0 && (
                        <span className="text-2xl font-bold text-orange-500">
                          {rating}.0
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 text-sm text-gray-600">
                      <span
                        className={
                          rating === 1 ? "text-orange-500 font-medium" : ""
                        }
                      >
                        Poor
                      </span>
                      <span>•</span>
                      <span
                        className={
                          rating === 2 ? "text-orange-500 font-medium" : ""
                        }
                      >
                        Fair
                      </span>
                      <span>•</span>
                      <span
                        className={
                          rating === 3 ? "text-orange-500 font-medium" : ""
                        }
                      >
                        Good
                      </span>
                      <span>•</span>
                      <span
                        className={
                          rating === 4 ? "text-orange-500 font-medium" : ""
                        }
                      >
                        Very Good
                      </span>
                      <span>•</span>
                      <span
                        className={
                          rating === 5 ? "text-orange-500 font-medium" : ""
                        }
                      >
                        Excellent
                      </span>
                    </div>
                  </div>

                  {/* Review Text */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">
                      Share your experience (optional)
                    </h3>
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Tell us about the product quality, seller service, and delivery experience..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none h-32"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-gray-500">
                      {reviewText.length}/500 characters
                    </p>
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Camera className="w-5 h-5 text-orange-500" />
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
                            onClick={() =>
                              setImages(images.filter((_, i) => i !== index))
                            }
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            disabled={isSubmitting}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {images.length < 5 && (
                        <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                            disabled={isSubmitting}
                          />
                          <Camera className="w-6 h-6 text-gray-400" />
                        </label>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      You can add up to 5 photos
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-gray-200">
                    <Button
                      onClick={handleSubmit}
                      disabled={rating === 0 || isSubmitting}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-6 text-lg font-semibold"
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
