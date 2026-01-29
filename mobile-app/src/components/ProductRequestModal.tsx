import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Send, Package, MessageSquare } from 'lucide-react-native';

interface ProductRequestModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProductRequestModal({ visible, onClose }: ProductRequestModalProps) {
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [otherCategory, setOtherCategory] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');

  const categories = [
    'Fruits',
    'Vegetables',
    'Seafood',
    'Meat & Poultry',
    'Handicrafts',
    'Coffee & Tea',
    'Rice & Grains',
    'Snacks',
    'Beverages',
    'Other',
  ];

  const handleSubmit = () => {
    if (productName.trim() && category && description.trim()) {
      console.log('Product Request:', {
        productName,
        category,
        description,
        quantity,
      });
      // Reset form
      setProductName('');
      setCategory('');
      setOtherCategory('');
      setDescription('');
      setQuantity('');
      onClose();
    }
  };

  const isFormValid = productName.trim() && 
    (category === 'Other' ? otherCategory.trim() : category) && 
    description.trim();

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <MessageSquare size={24} color="#FF6A00" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Request a Product</Text>
                <Text style={styles.modalSubtitle}>
                  Can't find what you need? Let us know!
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Product Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Product Name <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Package size={18} color="#9CA3AF" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Organic Rice from Ifugao"
                  placeholderTextColor="#9CA3AF"
                  value={productName}
                  onChangeText={setProductName}
                />
              </View>
            </View>

            {/* Category */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Category <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => (
                  <Pressable
                    key={cat}
                    style={({ pressed }) => [
                      styles.categoryChip,
                      category === cat && styles.categoryChipSelected,
                      pressed && styles.categoryChipPressed,
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        category === cat && styles.categoryTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {category === 'Other' && (
                <View style={[styles.inputContainer, { marginTop: 12 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Specify the category..."
                    placeholderTextColor="#9CA3AF"
                    value={otherCategory}
                    onChangeText={setOtherCategory}
                    autoFocus
                  />
                </View>
              )}
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Description <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textArea}
                placeholder="Tell us more about the product you're looking for..."
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={styles.characterCount}>{description.length}/500</Text>
            </View>

            {/* Estimated Quantity (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Estimated Quantity (Optional)</Text>
              <TextInput
                style={styles.simpleInput}
                placeholder="e.g., 10 kg, 5 pieces"
                placeholderTextColor="#9CA3AF"
                value={quantity}
                onChangeText={setQuantity}
              />
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Your request will be reviewed by our team. We'll notify you once a seller
                offers this product!
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.cancelButtonPressed,
              ]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                !isFormValid && styles.submitButtonDisabled,
                pressed && isFormValid && styles.submitButtonPressed,
              ]}
              onPress={handleSubmit}
              disabled={!isFormValid}
            >
              <Send size={18} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Submit Request</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FEF3E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  simpleInput: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  categoryChipSelected: {
    backgroundColor: '#FEF3E8',
    borderColor: '#FF6A00',
  },
  categoryChipPressed: {
    opacity: 0.7,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryTextSelected: {
    color: '#FF6A00',
  },
  textArea: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    marginBottom: 20,
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonPressed: {
    backgroundColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FF6A00',
  },
  submitButtonPressed: {
    backgroundColor: '#E55F00',
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
