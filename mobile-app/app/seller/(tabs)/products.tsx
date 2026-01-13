import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Image,
  Switch,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Plus, Edit, Trash2, X, Camera, Package as PackageIcon, Info, Link, Upload, FileText } from 'lucide-react-native';
import { useSellerStore, SellerProduct } from '../../../src/stores/sellerStore';
import { useProductQAStore } from '../../../src/stores/productQAStore';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function SellerProductsScreen() {
  const { products, toggleProductStatus, deleteProduct, seller, updateProduct } = useSellerStore();
  const { addProductToQA } = useProductQAStore();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [imageUploadMode, setImageUploadMode] = useState<'upload' | 'url'>('upload');
  const [editingProduct, setEditingProduct] = useState<SellerProduct | null>(null);

  // Form state for adding products
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    stock: '',
    category: '',
    images: [''],
  });

  const categories = [
    'Electronics',
    'Fashion',
    'Beauty',
    'Food',
    'Home & Living',
    'Sports',
    'Books',
    'Toys',
    'Accessories',
    'Others',
  ];

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      originalPrice: '',
      stock: '',
      category: '',
      images: [''],
    });
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handlePickImage = async (index: number) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newImages = [...formData.images];
        newImages[index] = result.assets[0].uri;
        setFormData({ ...formData, images: newImages });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData({ ...formData, images: newImages });
  };

  const addImageField = () => {
    setFormData({
      ...formData,
      images: [...formData.images, ''],
    });
  };

  const removeImageField = (index: number) => {
    if (formData.images.length > 1) {
      setFormData({
        ...formData,
        images: formData.images.filter((_, i) => i !== index),
      });
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Product name is required');
      return false;
    }
    if (!formData.description.trim()) {
      Alert.alert('Validation Error', 'Product description is required');
      return false;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price');
      return false;
    }
    if (!formData.stock || parseInt(formData.stock) < 0) {
      Alert.alert('Validation Error', 'Please enter a valid stock quantity');
      return false;
    }
    if (!formData.category) {
      Alert.alert('Validation Error', 'Please select a category');
      return false;
    }
    const validImages = formData.images.filter(img => img.trim() !== '');
    if (validImages.length === 0) {
      Alert.alert('Validation Error', 'At least one product image is required');
      return false;
    }
    return true;
  };

  const handleAddProduct = () => {
    if (!validateForm()) return;

    try {
      const validImages = formData.images.filter(img => img.trim() !== '');
      const firstImage = validImages[0] || 'https://placehold.co/400x400?text=' + encodeURIComponent(formData.name);

      const newProduct: SellerProduct = {
        id: `PROD-${Date.now()}`,
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
        stock: parseInt(formData.stock),
        category: formData.category,
        image: firstImage,
        images: validImages,
        isActive: true,
        sold: 0,
      };

      // Add to seller store first
      const { addProduct } = useSellerStore.getState();
      addProduct(newProduct);

      // Add to product QA flow
      addProductToQA({
        id: newProduct.id,
        name: newProduct.name,
        description: newProduct.description,
        vendor: seller?.storeName || 'Tech Shop PH',
        price: newProduct.price,
        originalPrice: newProduct.originalPrice,
        category: newProduct.category,
        image: firstImage,
        images: validImages,
      });

      Alert.alert(
        'Product Submitted',
        'Your product has been added and submitted for quality review. Track its status in the QA Products tab.',
        [{ text: 'OK', onPress: () => setIsAddModalOpen(false) }]
      );
      
      resetForm();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add product');
    }
  };

  const handleDeleteProduct = (id: string, name: string) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteProduct(id),
        },
      ]
    );
  };

  const handleEditProduct = (product: SellerProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      originalPrice: product.originalPrice?.toString() || '',
      stock: product.stock.toString(),
      category: product.category,
      images: product.images || [product.image],
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateProduct = () => {
    if (!validateForm() || !editingProduct) return;

    try {
      const validImages = formData.images.filter(img => img.trim() !== '');
      const firstImage = validImages[0] || editingProduct.image;

      const updatedProduct: SellerProduct = {
        ...editingProduct,
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
        stock: parseInt(formData.stock),
        category: formData.category,
        image: firstImage,
        images: validImages,
      };

      if (editingProduct) {
        updateProduct(editingProduct.id, updatedProduct);
      }

      Alert.alert(
        'Product Updated',
        'Your product has been updated successfully.',
        [{ text: 'OK', onPress: () => {
          setIsEditModalOpen(false);
          setEditingProduct(null);
          resetForm();
        }}]
      );
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update product');
    }
  };

  const handleBulkUploadCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      Alert.alert(
        'CSV Processing',
        `CSV file "${result.assets[0].name}" selected. This feature will process your products in bulk.\n\nMake sure your CSV follows the format:\nname,description,price,originalPrice,stock,category,imageUrl\n\nProcessing will be implemented in the next update.`,
        [{ text: 'OK' }]
      );
      
      setIsBulkUploadModalOpen(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to upload CSV file');
    }
  };

  // Download CSV Template
  const downloadCSVTemplate = async () => {
    try {
      // CSV template content with headers and example row
      const csvContent = `name,description,price,originalPrice,stock,category,imageUrl
Sample Product,This is a sample product description,999,1299,100,Electronics,https://example.com/image.jpg
`;

      // Create file in cache directory
      const file = new File(Paths.cache, 'product-upload-template.csv');
      
      // Write CSV content to file
      await file.write(csvContent);

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        // Share/Download the file
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Download Product Upload Template',
          UTI: 'public.comma-separated-values-text',
        });
        
        Alert.alert(
          'Template Ready',
          'CSV template is ready to download. Fill in your product details and upload when ready.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Not Available',
          'File sharing is not available on this device.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error downloading CSV template:', error);
      Alert.alert(
        'Download Failed',
        'Could not download the CSV template. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const showCSVFormat = () => {
    Alert.alert(
      'CSV Format Guide',
      'Your CSV file must have these columns in order:\n\n' +
      '1. name (required)\n' +
      '2. description (required)\n' +
      '3. price (required, number)\n' +
      '4. originalPrice (optional, number)\n' +
      '5. stock (required, number)\n' +
      '6. category (required)\n' +
      '7. imageUrl (required, URL)\n\n' +
      'Example:\n' +
      'iPhone 15 Pro,Latest Apple phone,59999,65999,50,Electronics,https://example.com/iphone.jpg\n' +
      'Samsung Galaxy S24,Flagship Android,54999,,30,Electronics,https://example.com/samsung.jpg\n\n' +
      'Categories: Electronics, Fashion, Beauty, Food, Home & Living, Sports, Books, Toys, Accessories, Others',
      [{ text: 'Got it' }]
    );
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderProductCard = ({ item }: { item: SellerProduct }) => (
    <View style={styles.productCard}>
      <Image source={{ uri: item.image }} style={styles.productImage} />
      
      <View style={styles.productInfo}>
        <View style={styles.productHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.productCategory}>{item.category}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#DCFCE7' : '#F3F4F6' }]}>
            <Text style={[styles.statusText, { color: item.isActive ? '#16A34A' : '#6B7280' }]}>
              {item.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <View style={styles.productMeta}>
          <View style={styles.priceContainer}>
            <Text style={styles.productPrice}>₱{item.price.toLocaleString()}</Text>
            <Text style={styles.productStock}>Stock: {item.stock}</Text>
          </View>
          <Text style={styles.productSold}>{item.sold} sold</Text>
        </View>

        <View style={styles.productActions}>
          <Switch
            value={item.isActive}
            onValueChange={() => toggleProductStatus(item.id)}
            trackColor={{ false: '#E5E7EB', true: '#FF5722' }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#E5E7EB"
          />
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => handleEditProduct(item)}
              activeOpacity={0.7}
            >
              <Edit size={16} color="#FF5722" strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteProduct(item.id, item.name)}
              activeOpacity={0.7}
            >
              <Trash2 size={16} color="#EF4444" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Bright Orange Edge-to-Edge Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <View style={styles.iconContainer}>
            <PackageIcon size={24} color="#FFFFFF" strokeWidth={2} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Inventory</Text>
            <Text style={styles.headerSubtitle}>Manage your products</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.bulkButton}
              onPress={() => setIsBulkUploadModalOpen(true)}
              activeOpacity={0.8}
            >
              <Upload size={16} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleOpenAddModal}
              activeOpacity={0.8}
            >
              <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar Embedded in Header */}
        <View style={styles.searchBar}>
          <Search size={20} color="#9CA3AF" strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Products List with Bottom Padding */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.productsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <PackageIcon size={64} color="#D1D5DB" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No products yet</Text>
            <Text style={styles.emptySubtitle}>Tap 'Add' in the header to create your first product</Text>
          </View>
        }
      />

      {/* Bottom Sheet Modal - Add Product */}
      <Modal
        visible={isAddModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1}
            onPress={() => setIsAddModalOpen(false)}
          >
            <TouchableOpacity 
              style={styles.bottomSheet} 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Handle Bar */}
              <View style={styles.handleBar} />

              {/* Modal Header with Gradient */}
              <View style={styles.addModalHeader}>
                <View style={styles.addModalHeaderContent}>
                  <View style={styles.addModalIconContainer}>
                    <Plus size={20} color="#FF5722" strokeWidth={2.5} />
                  </View>
                  <View style={styles.addModalHeaderText}>
                    <Text style={styles.addModalTitle}>Add New Product</Text>
                    <Text style={styles.addModalSubtitle}>Fill in the details below</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setIsAddModalOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={24} color="#6B7280" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              {/* Modal Body */}
              <ScrollView 
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.scrollContent}
                bounces={true}
              >
                {/* Image Upload/URL Section with Card */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Camera size={18} color="#FF5722" strokeWidth={2.5} />
                    <Text style={styles.sectionTitle}>Product Images</Text>
                    <View style={styles.requiredBadge}>
                      <Text style={styles.requiredBadgeText}>Required</Text>
                    </View>
                  </View>
                  
                  <View style={styles.uploadModeToggle}>
                    <TouchableOpacity
                      style={[styles.modeButton, imageUploadMode === 'upload' && styles.modeButtonActive]}
                      onPress={() => setImageUploadMode('upload')}
                    >
                      <Camera size={14} color={imageUploadMode === 'upload' ? '#FFFFFF' : '#6B7280'} />
                      <Text style={[styles.modeButtonText, imageUploadMode === 'upload' && styles.modeButtonTextActive]}>Upload</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modeButton, imageUploadMode === 'url' && styles.modeButtonActive]}
                      onPress={() => setImageUploadMode('url')}
                    >
                      <Link size={14} color={imageUploadMode === 'url' ? '#FFFFFF' : '#6B7280'} />
                      <Text style={[styles.modeButtonText, imageUploadMode === 'url' && styles.modeButtonTextActive]}>URL</Text>
                    </TouchableOpacity>
                  </View>

                  {formData.images.map((imageUrl, index) => (
                    <View key={index} style={{ marginBottom: 12 }}>
                      {imageUploadMode === 'upload' ? (
                        <TouchableOpacity style={styles.imageUploadArea} activeOpacity={0.7} onPress={() => handlePickImage(index)}>
                          {imageUrl ? (
                            <View style={{ position: 'relative', width: '100%', height: 150 }}>
                              <Image source={{ uri: imageUrl }} style={styles.uploadedImagePreview} />
                              {formData.images.length > 1 && (
                                <TouchableOpacity
                                  style={styles.removeImageButton}
                                  onPress={() => removeImageField(index)}
                                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                  <X size={16} color="#FFFFFF" strokeWidth={2.5} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : (
                            <>
                              <Camera size={32} color="#9CA3AF" strokeWidth={2} />
                              <Text style={styles.imageUploadText}>Tap to upload image {index + 1}</Text>
                              <Text style={styles.imageUploadHint}>JPG, PNG up to 5MB</Text>
                              {formData.images.length > 1 && (
                                <TouchableOpacity
                                  style={styles.removeImageButtonEmpty}
                                  onPress={() => removeImageField(index)}
                                >
                                  <Text style={styles.removeImageButtonText}>Remove</Text>
                                </TouchableOpacity>
                              )}
                            </>
                          )}
                        </TouchableOpacity>
                      ) : (
                        <View>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TextInput
                              style={[styles.modernInput, { flex: 1 }]}
                              placeholder={`https://example.com/image${index + 1}.jpg`}
                              value={imageUrl}
                              onChangeText={(text) => handleImageChange(index, text)}
                              placeholderTextColor="#9CA3AF"
                              autoCapitalize="none"
                              keyboardType="url"
                            />
                            {formData.images.length > 1 && (
                              <TouchableOpacity
                                style={styles.removeUrlButton}
                                onPress={() => removeImageField(index)}
                              >
                                <X size={16} color="#EF4444" strokeWidth={2.5} />
                              </TouchableOpacity>
                            )}
                          </View>
                          {imageUrl && imageUrl.startsWith('http') && (
                            <Image source={{ uri: imageUrl }} style={styles.urlImagePreview} />
                          )}
                        </View>
                      )}
                    </View>
                  ))}

                  {/* Add Another Image Button */}
                  <TouchableOpacity
                    style={styles.addImageButton}
                    onPress={addImageField}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addImageButtonText}>+ Add Another Image</Text>
                  </TouchableOpacity>
                </View>

                {/* Product Details Card */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <PackageIcon size={18} color="#FF5722" strokeWidth={2.5} />
                    <Text style={styles.sectionTitle}>Product Details</Text>
                  </View>

                  {/* Product Name */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Product Name *</Text>
                    <TextInput
                      style={styles.modernInput}
                      placeholder="e.g. iPhone 15 Pro Max"
                      value={formData.name}
                      onChangeText={(text) => setFormData({ ...formData, name: text })}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  {/* Description */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Description *</Text>
                    <TextInput
                      style={[styles.modernInput, styles.textArea]}
                      placeholder="Enter product description..."
                      value={formData.description}
                      onChangeText={(text) => setFormData({ ...formData, description: text })}
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Category Pills */}
                  <View style={{ marginBottom: 0 }}>
                    <Text style={styles.inputLabel}>Category *</Text>
                    <ScrollView 
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.pillContainer}
                    >
                      {categories.map((item) => (
                        <TouchableOpacity
                          key={item}
                          style={[
                            styles.pillChip,
                            formData.category === item && styles.pillChipSelected,
                          ]}
                          onPress={() => setFormData({ ...formData, category: item })}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.pillChipText,
                              formData.category === item && styles.pillChipTextSelected,
                            ]}
                          >
                            {item}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>

                {/* Pricing & Stock Card */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Text style={{ fontSize: 20 }}>💰</Text>
                    <Text style={styles.sectionTitle}>Pricing & Stock</Text>
                  </View>

                  {/* Price & Original Price Row */}
                  <View style={styles.rowInputs}>
                    <View style={styles.halfInput}>
                      <Text style={styles.inputLabel}>Price (₱) *</Text>
                      <TextInput
                        style={styles.modernInput}
                        placeholder="0.00"
                        value={formData.price}
                        onChangeText={(text) => setFormData({ ...formData, price: text })}
                        placeholderTextColor="#9CA3AF"
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.halfInput}>
                      <Text style={styles.inputLabel}>Original Price (₱)</Text>
                      <TextInput
                        style={styles.modernInput}
                        placeholder="0.00"
                        value={formData.originalPrice}
                        onChangeText={(text) => setFormData({ ...formData, originalPrice: text })}
                        placeholderTextColor="#9CA3AF"
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  {/* Stock Quantity */}
                  <View style={{ marginBottom: 0 }}>
                    <Text style={styles.inputLabel}>Stock Quantity *</Text>
                    <TextInput
                      style={styles.modernInput}
                      placeholder="0"
                      value={formData.stock}
                      onChangeText={(text) => setFormData({ ...formData, stock: text })}
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                {/* QA Note */}
                <View style={styles.qaNote}>
                  <Info size={16} color="#FF5722" strokeWidth={2.5} />
                  <Text style={styles.qaNoteText}>
                    Product will be submitted for Quality Assurance review. Track progress in QA Products tab.
                  </Text>
                </View>
              </ScrollView>

              {/* Fixed Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setIsAddModalOpen(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleAddProduct}
                  activeOpacity={0.9}
                >
                  <Text style={styles.submitButtonText}>Submit for Review</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        visible={isEditModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1}
            onPress={() => setIsEditModalOpen(false)}
          >
            <TouchableOpacity 
              style={styles.bottomSheet}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Handle Bar */}
              <View style={styles.handleBar} />

              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Product</Text>
                <TouchableOpacity onPress={() => setIsEditModalOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={24} color="#6B7280" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              {/* Modal Body */}
              <ScrollView 
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.scrollContent}
                bounces={true}
              >
                {/* Image Upload/URL Section */}
                <View style={styles.inputGroup}>
                  <View style={styles.imageHeaderRow}>
                    <Text style={styles.inputLabel}>Product Images *</Text>
                    <View style={styles.uploadModeToggle}>
                      <TouchableOpacity
                        style={[styles.modeButton, imageUploadMode === 'upload' && styles.modeButtonActive]}
                        onPress={() => setImageUploadMode('upload')}
                      >
                        <Camera size={14} color={imageUploadMode === 'upload' ? '#FFFFFF' : '#6B7280'} />
                        <Text style={[styles.modeButtonText, imageUploadMode === 'upload' && styles.modeButtonTextActive]}>Upload</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modeButton, imageUploadMode === 'url' && styles.modeButtonActive]}
                        onPress={() => setImageUploadMode('url')}
                      >
                        <Link size={14} color={imageUploadMode === 'url' ? '#FFFFFF' : '#6B7280'} />
                        <Text style={[styles.modeButtonText, imageUploadMode === 'url' && styles.modeButtonTextActive]}>URL</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {formData.images.map((imageUrl, index) => (
                    <View key={index} style={{ marginBottom: 12 }}>
                      {imageUploadMode === 'upload' ? (
                        <TouchableOpacity style={styles.imageUploadArea} activeOpacity={0.7} onPress={() => handlePickImage(index)}>
                          {imageUrl ? (
                            <View style={{ position: 'relative', width: '100%', height: 150 }}>
                              <Image source={{ uri: imageUrl }} style={styles.uploadedImagePreview} />
                              {formData.images.length > 1 && (
                                <TouchableOpacity
                                  style={styles.removeImageButton}
                                  onPress={() => removeImageField(index)}
                                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                  <X size={16} color="#FFFFFF" strokeWidth={2.5} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : (
                            <>
                              <Camera size={32} color="#9CA3AF" strokeWidth={2} />
                              <Text style={styles.imageUploadText}>Tap to upload image {index + 1}</Text>
                              <Text style={styles.imageUploadHint}>JPG, PNG up to 5MB</Text>
                              {formData.images.length > 1 && (
                                <TouchableOpacity
                                  style={styles.removeImageButtonEmpty}
                                  onPress={() => removeImageField(index)}
                                >
                                  <Text style={styles.removeImageButtonText}>Remove</Text>
                                </TouchableOpacity>
                              )}
                            </>
                          )}
                        </TouchableOpacity>
                      ) : (
                        <View>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TextInput
                              style={[styles.modernInput, { flex: 1 }]}
                              placeholder={`https://example.com/image${index + 1}.jpg`}
                              value={imageUrl}
                              onChangeText={(text) => handleImageChange(index, text)}
                              placeholderTextColor="#9CA3AF"
                              autoCapitalize="none"
                              keyboardType="url"
                            />
                            {formData.images.length > 1 && (
                              <TouchableOpacity
                                style={styles.removeUrlButton}
                                onPress={() => removeImageField(index)}
                              >
                                <X size={16} color="#EF4444" strokeWidth={2.5} />
                              </TouchableOpacity>
                            )}
                          </View>
                          {imageUrl && imageUrl.startsWith('http') && (
                            <Image source={{ uri: imageUrl }} style={styles.urlImagePreview} />
                          )}
                        </View>
                      )}
                    </View>
                  ))}

                  {/* Add Another Image Button */}
                  <TouchableOpacity
                    style={styles.addImageButton}
                    onPress={addImageField}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addImageButtonText}>+ Add Another Image</Text>
                  </TouchableOpacity>
                </View>

                {/* Product Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Product Name *</Text>
                  <TextInput
                    style={styles.modernInput}
                    placeholder="e.g. iPhone 15 Pro Max"
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                {/* Description */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description *</Text>
                  <TextInput
                    style={[styles.modernInput, styles.textArea]}
                    placeholder="Enter product description..."
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                {/* Category Pills */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Category *</Text>
                  <ScrollView 
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.pillContainer}
                  >
                    {categories.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.pillChip,
                          formData.category === item && styles.pillChipSelected,
                        ]}
                        onPress={() => setFormData({ ...formData, category: item })}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.pillChipText,
                            formData.category === item && styles.pillChipTextSelected,
                          ]}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Price & Original Price Row */}
                <View style={styles.rowInputs}>
                  <View style={styles.halfInput}>
                    <Text style={styles.inputLabel}>Price (₱) *</Text>
                    <TextInput
                      style={styles.modernInput}
                      placeholder="0.00"
                      value={formData.price}
                      onChangeText={(text) => setFormData({ ...formData, price: text })}
                      placeholderTextColor="#9CA3AF"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <Text style={styles.inputLabel}>Original Price (₱)</Text>
                    <TextInput
                      style={styles.modernInput}
                      placeholder="0.00"
                      value={formData.originalPrice}
                      onChangeText={(text) => setFormData({ ...formData, originalPrice: text })}
                      placeholderTextColor="#9CA3AF"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                {/* Stock Quantity */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Stock Quantity *</Text>
                  <TextInput
                    style={styles.modernInput}
                    placeholder="0"
                    value={formData.stock}
                    onChangeText={(text) => setFormData({ ...formData, stock: text })}
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                  />
                </View>
              </ScrollView>

              {/* Fixed Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setIsEditModalOpen(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleUpdateProduct}
                  activeOpacity={0.9}
                >
                  <Text style={styles.submitButtonText}>Update Product</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal
        visible={isBulkUploadModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsBulkUploadModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1}
            onPress={() => setIsBulkUploadModalOpen(false)}
          >
            <TouchableOpacity 
              style={[styles.bottomSheet, styles.bulkUploadSheet]}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Handle Bar */}
              <View style={styles.handleBar} />

              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Bulk Upload Products</Text>
                <TouchableOpacity onPress={() => setIsBulkUploadModalOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={24} color="#6B7280" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              {/* Modal Body */}
              <ScrollView 
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.bulkUploadScrollContent}
                bounces={true}
              >
                {/* CSV Format Instructions */}
                <View style={styles.csvInstructionsCard}>
                  <View style={styles.csvHeader}>
                    <FileText size={20} color="#FF5722" strokeWidth={2.5} />
                    <Text style={styles.csvHeaderText}>CSV Format Requirements</Text>
                  </View>
                  
                  <Text style={styles.csvDescription}>
                    Your CSV file must include these 7 columns in order:
                  </Text>

                  <View style={styles.csvColumnsList}>
                    <Text style={styles.csvColumn}>1. name (required)</Text>
                    <Text style={styles.csvColumn}>2. description (required)</Text>
                    <Text style={styles.csvColumn}>3. price (required)</Text>
                    <Text style={styles.csvColumn}>4. originalPrice (optional)</Text>
                    <Text style={styles.csvColumn}>5. stock (required)</Text>
                    <Text style={styles.csvColumn}>6. category (required)</Text>
                    <Text style={styles.csvColumn}>7. imageUrl (required)</Text>
                  </View>

                  <Text style={styles.csvDescription}>
                    💡 Download the template below for correct format and examples.
                  </Text>
                </View>

                {/* Download Template Button */}
                <TouchableOpacity
                  style={styles.csvDownloadButton}
                  onPress={downloadCSVTemplate}
                  activeOpacity={0.9}
                >
                  <FileText size={20} color="#FF5722" strokeWidth={2.5} />
                  <Text style={styles.csvDownloadButtonText}>Download CSV Template</Text>
                </TouchableOpacity>

                {/* Upload Button */}
                <TouchableOpacity
                  style={styles.csvUploadButton}
                  onPress={handleBulkUploadCSV}
                  activeOpacity={0.9}
                >
                  <Upload size={20} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.csvUploadButtonText}>Select CSV File</Text>
                </TouchableOpacity>

                {/* Help Button */}
                <TouchableOpacity
                  style={styles.csvHelpButton}
                  onPress={showCSVFormat}
                  activeOpacity={0.7}
                >
                  <Info size={16} color="#FF5722" strokeWidth={2.5} />
                  <Text style={styles.csvHelpButtonText}>Show CSV Format Help</Text>
                </TouchableOpacity>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  // Bright Orange Edge-to-Edge Header
  header: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    height: 36,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Search Bar (Embedded in Header)
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  // Products List (Fixed Bottom Padding)
  productsList: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 100, // Crucial: prevents last item from hiding behind tab bar
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16, // Consistent spacing between cards
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 18,
  },
  productCategory: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF5722',
  },
  productStock: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  productSold: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  // Bottom Sheet Modal
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    minHeight: '50%',
    width: '100%',
    flexDirection: 'column',
  },
  bulkUploadSheet: {
    maxHeight: '85%',
    minHeight: '40%',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    flex: 1,
  },
  modalScrollView: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexGrow: 1,
  },
  bulkUploadScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 50,
    flexGrow: 1,
  },
  // Image Upload
  imageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  modeButtonActive: {
    backgroundColor: '#FF5722',
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  imageUploadArea: {
    height: 160,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    borderStyle: 'dashed',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageUploadText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  imageUploadHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  uploadedImagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  urlImagePreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginTop: 12,
    resizeMode: 'cover',
    backgroundColor: '#F3F4F6',
  },
  // Modern Inputs
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  modernInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  // Image Management Buttons
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 20,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageButtonEmpty: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  removeImageButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  removeUrlButton: {
    width: 40,
    height: 52,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  addImageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  // Category Pills
  pillContainer: {
    paddingVertical: 4,
  },
  pillChip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  pillChipSelected: {
    backgroundColor: '#FF5722',
    borderColor: '#FF5722',
  },
  pillChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  pillChipTextSelected: {
    color: '#FFFFFF',
  },
  // QA Note
  qaNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    marginBottom: 20,
  },
  qaNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#EA580C',
    lineHeight: 18,
    fontWeight: '500',
  },
  // Modal Footer
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    flex: 1.5,
    backgroundColor: '#FF5722',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Header Actions Container
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulkButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    padding: 10,
    borderRadius: 10,
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // CSV Bulk Upload Modal Styles
  csvInstructionsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  csvHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  csvHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  csvDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  csvColumnsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  csvColumn: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  csvExample: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  csvExampleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  csvExampleText: {
    fontSize: 11,
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 16,
  },
  csvCategories: {
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  csvCategoriesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EA580C',
    marginBottom: 6,
  },
  csvCategoriesText: {
    fontSize: 12,
    color: '#9A3412',
    lineHeight: 18,
  },
  csvDownloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FF5722',
  },
  csvDownloadButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF5722',
  },
  csvUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FF5722',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
  },
  csvUploadButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  csvHelpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 20,
  },
  csvHelpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF5722',
  },
  // Enhanced Add Product Modal Styles
  addModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  addModalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addModalIconContainer: {
    backgroundColor: '#FFF7ED',
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  addModalHeaderText: {
    flexDirection: 'column',
  },
  addModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  addModalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  requiredBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  requiredBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },});