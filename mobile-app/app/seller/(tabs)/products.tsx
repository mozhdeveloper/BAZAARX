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
import { Search, Plus, Edit, Trash2, X, Camera, Package as PackageIcon, Info, Link, ChevronDown } from 'lucide-react-native';
import { useSellerStore, SellerProduct } from '../../../src/stores/sellerStore';
import { useProductQAStore } from '../../../src/stores/productQAStore';
import SellerDrawer from '../../../src/components/SellerDrawer';
import * as ImagePicker from 'expo-image-picker';

export default function SellerProductsScreen() {
  const { products, toggleProductStatus, deleteProduct, seller } = useSellerStore();
  const { addProductToQA } = useProductQAStore();
  const insets = useSafeAreaInsets();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [imageUploadMode, setImageUploadMode] = useState<'upload' | 'url'>('upload');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const { updateProduct } = useSellerStore();

  type FilterStatus = 'all' | 'active' | 'inactive';
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Form state for adding products
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    stock: '',
    category: '',
    images: [''],
    sizes: [] as string[],
    colors: [] as string[],
  });

  const [variationInput, setVariationInput] = useState('');
  const [colorInput, setColorInput] = useState('');

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
      sizes: [],
      colors: [],
    });
    setVariationInput('');
    setColorInput('');
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setIsEditMode(false);
    setEditingProductId(null);
    resetForm();
    setImageUploadMode('upload');
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsEditMode(false);
    setEditingProductId(null);
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

  // Variations & Colors handlers
  const addVariation = () => {
    const trimmed = variationInput.trim();
    if (trimmed && !formData.sizes.includes(trimmed)) {
      setFormData({ ...formData, sizes: [...formData.sizes, trimmed] });
      setVariationInput('');
    }
  };

  const removeVariation = (index: number) => {
    setFormData({ ...formData, sizes: formData.sizes.filter((_, i) => i !== index) });
  };

  const addColor = () => {
    const trimmed = colorInput.trim();
    if (trimmed && !formData.colors.includes(trimmed)) {
      setFormData({ ...formData, colors: [...formData.colors, trimmed] });
      setColorInput('');
    }
  };

  const removeColor = (index: number) => {
    setFormData({ ...formData, colors: formData.colors.filter((_, i) => i !== index) });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Product name is required');
      return false;
    }

    // In edit mode only validate name, price, and stock
    if (isEditMode) {
      if (!formData.price || parseFloat(formData.price) <= 0) {
        Alert.alert('Validation Error', 'Please enter a valid price');
        return false;
      }
      if (!formData.stock || parseInt(formData.stock) < 0) {
        Alert.alert('Validation Error', 'Please enter a valid stock quantity');
        return false;
      }
      return true;
    }

    // Add mode: require all fields
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
        sizes: formData.sizes,
        colors: formData.colors,
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
        [{ text: 'OK', onPress: handleCloseModal }]
      );
      
      resetForm();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add product');
    }
  };

  const handleEditPress = (product: SellerProduct) => {
    setIsEditMode(true);
    setEditingProductId(product.id);
    
    // Fill the form with existing data
    setFormData({
      name: product.name,
      description: product.description, // Will be read-only in UI
      price: product.price.toString(),
      originalPrice: product.originalPrice?.toString() || '',
      stock: product.stock.toString(),
      category: product.category,       // Will be read-only in UI
      images: product.images || [''],           // Will be read-only in UI
      sizes: product.sizes || [],
      colors: product.colors || [],
    });
    
    setIsAddModalOpen(true);
  };

  const handleUpdateProduct = () => {
    // Use the same validation (Name, Price, Stock are required)
    if (!validateForm()) return;

    try {
      const updatedData = {
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        sizes: formData.sizes,
        colors: formData.colors,
      };

      if (editingProductId) {
        updateProduct(editingProductId, updatedData);
        
        Alert.alert('Success', 'Product updated successfully!');
        handleCloseModal();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update product');
    }
  };
  
  const filteredProducts = products.filter(product => {
  const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
  const matchesStatus = 
    statusFilter === 'all' ? true : 
    statusFilter === 'active' ? product.isActive : 
    !product.isActive;
  
  return matchesSearch && matchesStatus;
});

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
              onPress={() => handleEditPress(item)}
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
      {/* Seller Drawer */}
      <SellerDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />

      {/* Bright Orange Edge-to-Edge Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconContainer} onPress={() => setDrawerVisible(true)}>
            <PackageIcon size={24} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Inventory</Text>
            <Text style={styles.headerSubtitle}>Manage your products</Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleOpenAddModal}
            activeOpacity={0.8}
          >
            <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
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

          {/* Status Filter Dropdown */}
          <View style={styles.filterWrapper}>
            <TouchableOpacity
              style={styles.filterDropdownButton}
              onPress={() => setIsFilterOpen(prev => !prev)}
              activeOpacity={0.8}
            >
              <Text style={styles.filterDropdownButtonText}>
                {statusFilter === 'all' ? 'All' : statusFilter === 'active' ? 'Active' : 'Inactive'}
              </Text>
              <ChevronDown size={16} color="#6B7280" style={{ transform: [{ rotate: isFilterOpen ? '180deg' : '0deg' }] }} />
            </TouchableOpacity>

            {isFilterOpen && (
              <>
                <TouchableOpacity style={styles.dropdownOverlay} onPress={() => setIsFilterOpen(false)} activeOpacity={1} />
                <View style={styles.filterDropdownMenu}>
                  <TouchableOpacity
                    style={styles.filterDropdownItem}
                    onPress={() => { setStatusFilter('all'); setIsFilterOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterDropdownItemText, statusFilter === 'all' && styles.filterDropdownItemTextSelected]}>All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.filterDropdownItem}
                    onPress={() => { setStatusFilter('active'); setIsFilterOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterDropdownItemText, statusFilter === 'active' && styles.filterDropdownItemTextSelected]}>Active</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.filterDropdownItem}
                    onPress={() => { setStatusFilter('inactive'); setIsFilterOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterDropdownItemText, statusFilter === 'inactive' && styles.filterDropdownItemTextSelected]}>Inactive</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View> 

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
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1}
            onPress={handleCloseModal}
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
                <Text style={styles.modalTitle}>{isEditMode ? 'Edit Product' : 'New Product'}</Text>
                <TouchableOpacity onPress={handleCloseModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={24} color="#6B7280" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              {/* Modal Body */}
              <ScrollView 
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                {/* Add mode: full form. Edit mode: minimal form (Name, Price, Stock) */}

                {!isEditMode && (
                  <>
                    {/* Image Upload/URL Section */}
                    <View style={styles.inputGroup}>
                      <View style={styles.imageHeaderRow}>
                        <Text style={styles.inputLabel}>Product Images *</Text>
                        <View style={styles.uploadModeToggle}>
                          <TouchableOpacity
                            style={[styles.modeButton, imageUploadMode === 'upload' && styles.modeButtonActive]}
                            onPress={() => !isEditMode && setImageUploadMode('upload')}
                          >
                            <Camera size={14} color={imageUploadMode === 'upload' ? '#FFFFFF' : '#6B7280'} />
                            <Text style={[styles.modeButtonText, imageUploadMode === 'upload' && styles.modeButtonTextActive]}>Upload</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.modeButton, imageUploadMode === 'url' && styles.modeButtonActive]}
                            onPress={() => !isEditMode && setImageUploadMode('url')}
                          >
                            <Link size={14} color={imageUploadMode === 'url' ? '#FFFFFF' : '#6B7280'} />
                            <Text style={[styles.modeButtonText, imageUploadMode === 'url' && styles.modeButtonTextActive]}>URL</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {formData.images.map((imageUrl, index) => (
                        <View key={index} style={{ marginBottom: 12 }}>
                          {imageUploadMode === 'upload' ? (
                            <TouchableOpacity style={styles.imageUploadArea} activeOpacity={0.7} onPress={() => !isEditMode && handlePickImage(index)} disabled={isEditMode}>
                              {imageUrl ? (
                                <View style={{ position: 'relative', width: '100%', height: 150 }}>
                                  <Image source={{ uri: imageUrl }} style={styles.uploadedImagePreview} />
                                  {formData.images.length > 1 && !isEditMode && (
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
                                  {formData.images.length > 1 && !isEditMode && (
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
                                  onChangeText={(text) => !isEditMode && handleImageChange(index, text)}
                                  placeholderTextColor="#9CA3AF"
                                  autoCapitalize="none"
                                  keyboardType="url"
                                  editable={!isEditMode}
                                />
                                {formData.images.length > 1 && (
                                  !isEditMode && (
                                    <TouchableOpacity
                                      style={styles.removeUrlButton}
                                      onPress={() => removeImageField(index)}
                                    >
                                      <X size={16} color="#EF4444" strokeWidth={2.5} />
                                    </TouchableOpacity>
                                  )
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
                        onPress={() => !isEditMode && addImageField()}
                        activeOpacity={0.7}
                        disabled={isEditMode}
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
                        onChangeText={(text) => !isEditMode && setFormData({ ...formData, description: text })}
                        placeholderTextColor="#9CA3AF"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        editable={!isEditMode}
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
                            onPress={() => !isEditMode && setFormData({ ...formData, category: item })}
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
                          onChangeText={(text) => !isEditMode && setFormData({ ...formData, originalPrice: text })}
                          placeholderTextColor="#9CA3AF"
                          keyboardType="decimal-pad"
                          editable={!isEditMode}
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

                    {/* Variations */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Variations (optional)</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput
                          style={[styles.modernInput, { flex: 1 }]}
                          placeholder="e.g., Small, 32GB, Chocolate"
                          value={variationInput}
                          onChangeText={setVariationInput}
                          onSubmitEditing={addVariation}
                          placeholderTextColor="#9CA3AF"
                        />
                        <TouchableOpacity style={styles.addSmallButton} onPress={addVariation} activeOpacity={0.8}>
                          <Plus size={16} color="#FF5722" />
                        </TouchableOpacity>
                      </View>
                      {formData.sizes.length > 0 && (
                        <View style={styles.chipsRow}>
                          {formData.sizes.map((s, idx) => (
                            <View key={idx} style={styles.chip}>
                              <Text style={styles.chipText}>{s}</Text>
                              <TouchableOpacity onPress={() => removeVariation(idx)} style={styles.removeChipButton} activeOpacity={0.7}>
                                <X size={14} color="#6B7280" />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* Colors */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Colors (optional)</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput
                          style={[styles.modernInput, { flex: 1 }]}
                          placeholder="e.g., Space Gray, Forest Green"
                          value={colorInput}
                          onChangeText={setColorInput}
                          onSubmitEditing={addColor}
                          placeholderTextColor="#9CA3AF"
                        />
                        <TouchableOpacity style={styles.addSmallButton} onPress={addColor} activeOpacity={0.8}>
                          <Plus size={16} color="#FF5722" />
                        </TouchableOpacity>
                      </View>
                      {formData.colors.length > 0 && (
                        <View style={styles.chipsRow}>
                          {formData.colors.map((c, idx) => (
                            <View key={idx} style={styles.chip}>
                              <Text style={styles.chipText}>{c}</Text>
                              <TouchableOpacity onPress={() => removeColor(idx)} style={styles.removeChipButton} activeOpacity={0.7}>
                                <X size={14} color="#6B7280" />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* QA Note */}
                    <View style={styles.qaNote}>
                      <Info size={16} color="#FF5722" strokeWidth={2.5} />
                      <Text style={styles.qaNoteText}>
                        Product will be submitted for Quality Assurance review. Track progress in QA Products tab.
                      </Text>
                    </View>
                  </>
                )}

                {/* Edit mode: only editable fields */}
                {isEditMode && (
                  <>
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

                    {/* Variations (editable) */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Variations (optional)</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput
                          style={[styles.modernInput, { flex: 1 }]}
                          placeholder="e.g., Small, 32GB, Chocolate"
                          value={variationInput}
                          onChangeText={setVariationInput}
                          onSubmitEditing={addVariation}
                          placeholderTextColor="#9CA3AF"
                        />
                        <TouchableOpacity style={styles.addSmallButton} onPress={addVariation} activeOpacity={0.8}>
                          <Plus size={16} color="#FF5722" />
                        </TouchableOpacity>
                      </View>
                      {formData.sizes.length > 0 && (
                        <View style={styles.chipsRow}>
                          {formData.sizes.map((s, idx) => (
                            <View key={idx} style={styles.chip}>
                              <Text style={styles.chipText}>{s}</Text>
                              <TouchableOpacity onPress={() => removeVariation(idx)} style={styles.removeChipButton} activeOpacity={0.7}>
                                <X size={14} color="#6B7280" />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* Colors (editable) */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Colors (optional)</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput
                          style={[styles.modernInput, { flex: 1 }]}
                          placeholder="e.g., Space Gray, Forest Green"
                          value={colorInput}
                          onChangeText={setColorInput}
                          onSubmitEditing={addColor}
                          placeholderTextColor="#9CA3AF"
                        />
                        <TouchableOpacity style={styles.addSmallButton} onPress={addColor} activeOpacity={0.8}>
                          <Plus size={16} color="#FF5722" />
                        </TouchableOpacity>
                      </View>
                      {formData.colors.length > 0 && (
                        <View style={styles.chipsRow}>
                          {formData.colors.map((c, idx) => (
                            <View key={idx} style={styles.chip}>
                              <Text style={styles.chipText}>{c}</Text>
                              <TouchableOpacity onPress={() => removeColor(idx)} style={styles.removeChipButton} activeOpacity={0.7}>
                                <X size={14} color="#6B7280" />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </>
                )}
              </ScrollView>

              {/* Fixed Footer */}
                <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCloseModal}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={isEditMode ? handleUpdateProduct : handleAddProduct}
                  activeOpacity={0.9}
                >
                  <Text style={styles.submitButtonText}>{isEditMode ? 'Save Changes' : 'Submit for Review'}</Text>
                </TouchableOpacity>
              </View>
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
  // Status Filter (Dropdown)
  filterWrapper: {
    position: 'relative',
    marginLeft: 8,
  },
  filterDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  filterDropdownButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterDropdownMenu: {
    position: 'absolute',
    top: 52,
    right: 0,
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 6,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 1000,
  },
  filterDropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  filterDropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  filterDropdownItemTextSelected: {
    color: '#FF5722',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 52,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: 'transparent',
    zIndex: 900,
  },
  // Products List (Fixed Bottom Padding)
  productsList: {
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 100,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16, 
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
    maxHeight: '92%',
    paddingBottom: 20,
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  // Image Upload
  inputGroup: {
    marginBottom: 16,
  },
  imageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    marginBottom: 12,
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  modernInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    marginBottom: 15,
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
    marginTop: 12,
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
    marginBottom: 16,
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
    paddingTop: 20,
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
  // Small add button for chips
  addSmallButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    marginTop: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  removeChipButton: {
    marginLeft: 8,
  },
});
