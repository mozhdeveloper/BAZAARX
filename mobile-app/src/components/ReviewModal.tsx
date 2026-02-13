import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Star, X, ChevronRight, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import type { Order } from '../types';
import { reviewService } from '../services/reviewService';
import { COLORS } from '../constants/theme';

interface ReviewModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onSubmit: (productId: string, rating: number, review: string) => Promise<void>;
}

interface ProductReviewStatus {
  [productId: string]: {
    reviewed: boolean;
    rating?: number;
    comment?: string;
  };
}

export default function ReviewModal({ visible, order, onClose, onSubmit }: ReviewModalProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [reviewStatus, setReviewStatus] = useState<ProductReviewStatus>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && order) {
      loadReviewStatuses();
    } else {
      // Reset state when closed
      setSelectedItemId(null);
      setRating(5);
      setReview('');
      setReviewStatus({});
    }
  }, [visible, order]);

  const loadReviewStatuses = async () => {
    if (!order) return;
    setLoading(true);
    const statuses: ProductReviewStatus = {};
    
    try {
      // Use the real order UUID (orderId) not order_number (id)
      const realOrderId = (order as any).orderId || order.id;
      
      for (const item of order.items) {
        // Use productId for review check (item.id is order_item id)
        const productId = (item as any).productId || item.id;
        const hasReview = await reviewService.hasReviewForProduct(realOrderId, productId);
        statuses[item.id] = { reviewed: hasReview };
      }
      setReviewStatus(statuses);
    } catch (error) {
      console.error('Error loading review statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (itemId: string) => {
    setSelectedItemId(itemId);
    // If we had the review content, we could pre-fill it here
    setRating(5);
    setReview('');
  };

  const handleBackToPicker = () => {
    setSelectedItemId(null);
    setRating(5);
    setReview('');
  };

  const handleSubmit = async () => {
    if (!selectedItemId) return;
    
    setSubmitting(true);
    try {
      // Find the item to get its productId
      const item = order.items.find(i => i.id === selectedItemId);
      if (!item) throw new Error('Product not found');
      
      // Pass the actual productId to onSubmit, not the order_item id
      const productId = (item as any).productId || item.id;
      await onSubmit(productId, rating, review);
      
      // Update local status (track by item.id for UI)
      setReviewStatus(prev => ({
        ...prev,
        [selectedItemId]: { reviewed: true, rating, comment: review }
      }));
      
      // Go back to picker
      setSelectedItemId(null);
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!order) return null;

  const renderProductPicker = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Rate Products</Text>
        <Text style={styles.subtitle}>Order #{order.transactionId}</Text>
      </View>

      <View style={styles.productsContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : (
          order.items.map((item) => {
            const isReviewed = reviewStatus[item.id]?.reviewed;
            
            return (
              <View key={item.id} style={styles.pickerItem}>
                <View style={styles.productRow}>
                  <Image
                    source={{ uri: item.image || 'https://via.placeholder.com/60' }}
                    style={styles.productImage}
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.productQty}>Qty: {item.quantity}</Text>
                  </View>
                </View>
                
                <Pressable 
                  style={[
                    styles.actionButton, 
                    isReviewed ? styles.editButton : styles.writeButton
                  ]}
                  onPress={() => handleSelectProduct(item.id)}
                >
                  <Text style={[
                    styles.actionButtonText,
                    isReviewed ? styles.editButtonText : styles.writeButtonText
                  ]}>
                    {isReviewed ? 'View / Edit Review' : 'Write Review'}
                  </Text>
                  {!isReviewed && <ChevronRight size={16} color="#FFFFFF" />}
                </Pressable>
              </View>
            );
          })
        )}
      </View>
      
      <Pressable onPress={onClose} style={styles.doneButton}>
        <Text style={styles.doneButtonText}>Done</Text>
      </Pressable>
    </ScrollView>
  );

  const renderReviewForm = () => {
    const item = order.items.find(i => i.id === selectedItemId);
    if (!item) return null;

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.formHeader}>
          <Pressable onPress={handleBackToPicker} style={styles.backButton}>
            <ArrowLeft size={24} color="#1F2937" />
          </Pressable>
          <Text style={styles.formTitle}>Write Review</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.selectedProduct}>
          <Image
            source={{ uri: item.image || 'https://via.placeholder.com/60' }}
            style={styles.selectedProductImage}
          />
          <Text style={styles.selectedProductName} numberOfLines={1}>
            {item.name}
          </Text>
        </View>

        {/* Star Rating */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>Your Rating</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => setRating(star)} style={styles.starButton}>
                <Star
                  size={44}
                  color={star <= rating ? '#FF6A00' : '#D1D5DB'}
                  fill={star <= rating ? '#FF6A00' : 'transparent'}
                  strokeWidth={2}
                />
              </Pressable>
            ))}
          </View>
          <Text style={styles.ratingText}>
            {rating === 5 && 'Excellent!'}
            {rating === 4 && 'Very Good'}
            {rating === 3 && 'Good'}
            {rating === 2 && 'Fair'}
            {rating === 1 && 'Poor'}
          </Text>
        </View>

        {/* Review Text */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Your Review (Optional)</Text>
          <TextInput
            style={styles.reviewInput}
            placeholder="Share your thoughts about this product..."
            value={review}
            onChangeText={setReview}
            multiline
            numberOfLines={5}
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <Pressable onPress={handleSubmit} style={styles.submitButton} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Review</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <Pressable style={styles.overlay} onPress={onClose} />
        
        <View style={styles.modal}>
          {/* Close Handle / Button */}
          {!selectedItemId && (
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </Pressable>
          )}

          {selectedItemId ? renderReviewForm() : renderProductPicker()}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 24,
    maxHeight: '90%',
    minHeight: '60%',
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
  },
  productsContainer: {
    marginBottom: 24,
    gap: 16,
  },
  pickerItem: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  productQty: {
    fontSize: 13,
    color: '#6B7280',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  writeButton: {
    backgroundColor: COLORS.primary,
  },
  editButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  writeButtonText: {
    color: '#FFFFFF',
  },
  editButtonText: {
    color: '#374151',
  },
  doneButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  // Form Styles
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  selectedProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  selectedProductImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  selectedProductName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6A00',
  },
  reviewSection: {
    marginBottom: 24,
  },
  reviewLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1F2937',
    minHeight: 120,
    backgroundColor: '#FFFFFF',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#FF6A00',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
