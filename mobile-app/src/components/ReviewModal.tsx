import React, { useState } from 'react';
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
} from 'react-native';
import { Star, X } from 'lucide-react-native';
import type { Order } from '../types';

interface ReviewModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onSubmit: (rating: number, review: string) => void;
}

export default function ReviewModal({ visible, order, onClose, onSubmit }: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');

  const handleSubmit = () => {
    onSubmit(rating, review);
    // Reset for next time
    setRating(5);
    setReview('');
  };

  const handleSkip = () => {
    onClose();
    // Reset for next time
    setRating(5);
    setReview('');
  };

  if (!order) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <Pressable style={styles.overlay} onPress={onClose} />
        
        <View style={styles.modal}>
          {/* Close Button */}
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#6B7280" />
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Rate Your Order</Text>
              <Text style={styles.subtitle}>Order #{order.transactionId}</Text>
            </View>

            {/* Products */}
            <View style={styles.productsContainer}>
              {order.items.map((item) => (
                <View key={item.id} style={styles.productRow}>
                  <Image
                    source={{ uri: item.image }}
                    style={styles.productImage}
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.productQty}>Qty: {item.quantity}</Text>
                  </View>
                </View>
              ))}
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
                placeholder="Share your thoughts about this order..."
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
              <Pressable onPress={handleSkip} style={styles.skipButton}>
                <Text style={styles.skipButtonText}>Skip for Now</Text>
              </Pressable>
              <Pressable onPress={handleSubmit} style={styles.submitButton}>
                <Text style={styles.submitButtonText}>Submit Review</Text>
              </Pressable>
            </View>
          </ScrollView>
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
    gap: 12,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
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
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
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
