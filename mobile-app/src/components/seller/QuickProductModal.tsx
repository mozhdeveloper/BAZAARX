/**
 * Quick Product Modal - Mobile
 * Creates a new product when barcode scan doesn't find existing product
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  X,
  Package,
  DollarSign,
  Tag,
  Hash,
  Save,
  Plus,
  Trash2,
  Camera,
  FileText,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { createProductWithBarcode } from '../../services/barcodeService';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface QuickProductModalProps {
  visible: boolean;
  onClose: () => void;
  onProductCreated: (product: any) => void;
  initialBarcode?: string;
  sellerId: string;
}

export function QuickProductModal({
  visible,
  onClose,
  onProductCreated,
  initialBarcode = '',
  sellerId,
}: QuickProductModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState(initialBarcode);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [categoryId, setCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Fetch categories
  useEffect(() => {
    if (visible) {
      fetchCategories();
      setBarcode(initialBarcode);
      setError('');
    }
  }, [visible, initialBarcode]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug')
        .order('name');

      if (!error && data) {
        setCategories(data);
        if (data.length > 0 && !categoryId) {
          setCategoryId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError('Product name is required');
      return false;
    }
    if (!description.trim()) {
      setError('Description is required');
      return false;
    }
    if (!price || parseFloat(price) <= 0) {
      setError('Price must be greater than 0');
      return false;
    }
    if (!categoryId) {
      setError('Please select a category');
      return false;
    }
    if (!stock || parseInt(stock) <= 0) {
      setError('Stock must be greater than 0');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await createProductWithBarcode({
        sellerId,
        categoryId,
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        stock: parseInt(stock),
        barcode: barcode.trim(),
        imageUrl: imageUrl.trim() || undefined,
      });

      if (!result) {
        throw new Error('Failed to create product');
      }

      // Return the created product
      onProductCreated({
        id: result.productId,
        name: name.trim(),
        price: parseFloat(price),
        stock: parseInt(stock),
        images: imageUrl ? [imageUrl] : [],
      });

      // Reset form
      resetForm();
      onClose();
    } catch (err: any) {
      console.error('Failed to create product:', err);
      setError(err.message || 'Failed to create product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setStock('1');
    setImageUrl('');
    setBarcode('');
    setCategoryId('');
    setError('');
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Package size={24} color="#FF5722" />
            <Text style={styles.headerTitle}>Add New Product</Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            disabled={isLoading}
          >
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Error Alert */}
          {error ? (
            <View style={styles.errorAlert}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Barcode */}
          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Tag size={16} color="#6B7280" />
              <Text style={styles.label}>Barcode / SKU</Text>
            </View>
            <TextInput
              style={styles.input}
              value={barcode}
              onChangeText={setBarcode}
              placeholder="Barcode or SKU"
              editable={!isLoading}
            />
            <Text style={styles.hint}>This barcode will be linked to the product</Text>
          </View>

          {/* Product Name */}
          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Package size={16} color="#6B7280" />
              <Text style={styles.label}>Product Name *</Text>
            </View>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (error) setError('');
              }}
              placeholder="E.g., Classic Cotton T-Shirt"
              autoFocus
              editable={!isLoading}
            />
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <FileText size={16} color="#6B7280" />
              <Text style={styles.label}>Description *</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                if (error) setError('');
              }}
              placeholder="Material, fit, key features..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!isLoading}
            />
          </View>

          {/* Price & Stock */}
          <View style={styles.rowInputs}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <View style={styles.labelRow}>
                <DollarSign size={16} color="#6B7280" />
                <Text style={styles.label}>Price (₱) *</Text>
              </View>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={(text) => {
                  setPrice(text);
                  if (error) setError('');
                }}
                placeholder="0.00"
                keyboardType="decimal-pad"
                editable={!isLoading}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <View style={styles.labelRow}>
                <Hash size={16} color="#6B7280" />
                <Text style={styles.label}>Stock *</Text>
              </View>
              <TextInput
                style={styles.input}
                value={stock}
                onChangeText={(text) => {
                  setStock(text);
                  if (error) setError('');
                }}
                placeholder="0"
                keyboardType="number-pad"
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Category */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Category *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    categoryId === cat.id && styles.categoryChipActive,
                  ]}
                  onPress={() => {
                    setCategoryId(cat.id);
                    if (error) setError('');
                  }}
                  disabled={isLoading}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      categoryId === cat.id && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Image URL */}
          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Camera size={16} color="#6B7280" />
              <Text style={styles.label}>Image URL (Optional)</Text>
            </View>
            <TextInput
              style={styles.input}
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://example.com/image.jpg"
              autoCapitalize="none"
              keyboardType="url"
              editable={!isLoading}
            />
            {imageUrl ? (
              <View style={styles.imagePreview}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.previewImage}
                  onError={() => {
                    // Image failed to load
                  }}
                />
              </View>
            ) : null}
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Save size={18} color="#FFF" />
                <Text style={styles.saveButtonText}>Create & Add to Cart</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  errorAlert: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
  },
  formGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryScroll: {
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#FF5722',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
  imagePreview: {
    marginTop: 12,
    alignItems: 'center',
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FF5722',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#FCA5A5',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default QuickProductModal;
