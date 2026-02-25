import React, { useState, useEffect, useCallback } from 'react';
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
import { Search, Plus, Edit, Trash2, X, Camera, Package as PackageIcon, Info, Link, Upload, FileText, Menu } from 'lucide-react-native';
import { useSellerStore, SellerProduct } from '../../../src/stores/sellerStore';
import { useProductQAStore } from '../../../src/stores/productQAStore';
import { productService } from '../../../src/services/productService';
import { supabase, isSupabaseConfigured } from '../../../src/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy'; //
import * as Sharing from 'expo-sharing';
import SellerDrawer from '../../../src/components/SellerDrawer';
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // Import Navigation
import VariantManager, { Variant } from '../../../src/components/VariantManager';

// Generate a proper UUID for product IDs
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface CategoryOption {
  id: string;
  name: string;
}

interface EditableVariant {
  id: string;
  name?: string;
  option1Value?: string;
  option2Value?: string;
  price: number;
  stock: number;
}

const FALLBACK_CATEGORIES: CategoryOption[] = [
  { id: 'electronics', name: 'Electronics' },
  { id: 'fashion', name: 'Fashion' },
  { id: 'home-garden', name: 'Home & Garden' },
  { id: 'sports', name: 'Sports' },
  { id: 'books', name: 'Books' },
  { id: 'beauty', name: 'Beauty' },
  { id: 'automotive', name: 'Automotive' },
  { id: 'toys', name: 'Toys' },
  { id: 'health', name: 'Health' },
  { id: 'food-beverage', name: 'Food & Beverage' },
];

const asText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'name' in value) {
    const name = (value as { name?: unknown }).name;
    return typeof name === 'string' ? name : '';
  }
  if (value === null || value === undefined) return '';
  return String(value);
};

export default function SellerProductsScreen() {
  const { products = [], loading, error, fetchProducts, toggleProductStatus, deleteProduct, seller, updateProduct, addProduct } = useSellerStore();
  const { addProductToQA } = useProductQAStore();
  const navigation = useNavigation();
  // Fetch products on mount - only fetch for current seller
  useEffect(() => {
    if (seller?.id) {
      fetchProducts({ sellerId: seller.id });
    }
    // Don't fetch all products - only fetch seller-specific products
  }, [seller?.id, fetchProducts]);

  useFocusEffect(
    useCallback(() => {
      if (seller?.id) {
        fetchProducts({ sellerId: seller.id });
      }
    }, [seller?.id, fetchProducts]),
  );
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [imageUploadMode, setImageUploadMode] = useState<'upload' | 'url'>('upload');
  const [editingProduct, setEditingProduct] = useState<SellerProduct | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // New temporary states for typing
  const [currentColorInput, setCurrentColorInput] = useState('');
  const [currentSizeInput, setCurrentSizeInput] = useState('');
  const [bulkPreviewProducts, setBulkPreviewProducts] = useState<SellerProduct[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [editVariants, setEditVariants] = useState<EditableVariant[]>([]);

  // Form state for adding products
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    stock: '',
    category: '',
    images: [''],
    colors: [''],
    sizes: [''],
  });

  // NEW STATE: Store the generated variants
  const [variants, setVariants] = useState<Variant[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        if (isSupabaseConfigured()) {
          const { data, error } = await supabase
            .from('categories')
            .select('id, name')
            .order('sort_order', { ascending: true });

          if (!error && data && data.length > 0) {
            setCategories(data.map((item) => ({ id: item.id, name: item.name })));
            return;
          }
        }

        setCategories(FALLBACK_CATEGORIES);
      } catch (fetchError) {
        console.error('Failed to fetch categories:', fetchError);
        setCategories(FALLBACK_CATEGORIES);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      originalPrice: '',
      stock: '',
      category: '',
      images: [''],
      colors: [''],
      sizes: [''],
    });

    setVariants([]); // Clear variants
    setEditVariants([]);
    setCurrentColorInput('');
    setCurrentSizeInput('');
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingProduct(null);
    setEditVariants([]);
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

  const removeColorField = (index: number) => {
    const newColors = formData.colors.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      colors: newColors.length > 0 ? newColors : [''],
    });
  };

  const removeSizeField = (index: number) => {
    const newSizes = formData.sizes.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      sizes: newSizes.length > 0 ? newSizes : [''],
    });
  };

  // Handle adding a Color
  const handleAddColor = () => {
    if (currentColorInput.trim()) {
      setFormData({
        ...formData,
        colors: [...formData.colors.filter(c => c.trim() !== ''), currentColorInput.trim()],
      });
      setCurrentColorInput(''); // Clear the input
    }
  };

  // Handle adding a Size
  const handleAddSize = () => {
    if (currentSizeInput.trim()) {
      setFormData({
        ...formData,
        sizes: [...formData.sizes.filter(s => s.trim() !== ''), currentSizeInput.trim()],
      });
      setCurrentSizeInput(''); // Clear the input
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

  const handleAddProduct = async () => {
    if (!validateForm()) return;

    try {
      const validImages = formData.images.filter(img => img.trim() !== '');
      const hasOption1Values = variants.some((variant) => Boolean(variant.option1 && variant.option1 !== '-'));
      const hasOption2Values = variants.some((variant) => Boolean(variant.option2 && variant.option2 !== '-'));
      const selectedCategory = (categories.length > 0 ? categories : FALLBACK_CATEGORIES)
        .find((category) => category.name === formData.category);

      const newProduct: SellerProduct = {
        sellerId: seller?.id,
        id: generateUUID(), // Use proper UUID for database compatibility
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
        stock: variants.length > 0
          ? variants.reduce((acc, v) => acc + (parseInt(v.stock) || 0), 0)
          : parseInt(formData.stock),
        category: formData.category,
        images: validImages,
        isActive: true,
        sales: 0,
        rating: 0,
        reviews: 0,
        approval_status: 'pending',
        rejectionReason: undefined,
        vendorSubmittedCategory: undefined,
        adminReclassifiedCategory: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category_id: selectedCategory?.id || null,
        variant_label_1: hasOption1Values ? 'Color' : null,
        variant_label_2: hasOption2Values ? 'Size' : null,
        variants: variants.length > 0 ? variants : undefined,
      } as any;

      // Add to seller store first - this inserts into Supabase and returns the DB ID
      const dbProductId = await addProduct(newProduct);

      // Add to product QA flow using the database product ID
      await addProductToQA(dbProductId, seller?.store_name || 'Tech Shop PH');

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

  const handleDeleteProduct = (id: string, name: any) => {
    const safeName = typeof name === 'object' ? name?.name || '' : String(name || '');
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${safeName}"?`,
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

  const handleToggleProductStatus = async (id: string) => {
    try {
      await toggleProductStatus(id);
    } catch (error) {
      Alert.alert('Update Failed', error instanceof Error ? error.message : 'Failed to update product status');
    }
  };

  const handleEditProduct = (product: SellerProduct) => {
    const categoryName = asText(product.category);

    setEditingProduct(product);
    setFormData({
      name: asText(product.name),
      description: product.description || '',
      price: product.price.toString(),
      originalPrice: product.originalPrice?.toString() || '',
      stock: product.stock.toString(),
      category: categoryName,
      images: product.images,
      colors: product.colors && product.colors.length > 0 ? product.colors : [''],
      sizes: product.sizes && product.sizes.length > 0 ? product.sizes : [''],
    });
    setIsEditModalOpen(true);

    productService
      .getProductById(product.id)
      .then((details) => {
        const detailedVariants = Array.isArray((details as any)?.variants)
          ? (details as any).variants
          : [];

        setEditVariants(
          detailedVariants.map((variant: any) => ({
            id: variant.id,
            name: variant.variant_name || undefined,
            option1Value: variant.option_1_value || variant.size || undefined,
            option2Value: variant.option_2_value || variant.color || undefined,
            price: Number(variant.price ?? product.price ?? 0),
            stock: Number(variant.stock ?? 0),
          })),
        );
      })
      .catch((variantError) => {
        console.error('Failed to load variants for editing:', variantError);
        setEditVariants([]);
      });
  };

  const validateEditForm = () => {
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

    if (editVariants.length > 0) {
      if (editVariants.some((variant) => variant.stock < 0 || variant.price < 0)) {
        Alert.alert('Validation Error', 'Variant stock and price cannot be negative');
        return false;
      }
    } else if (!formData.stock || parseInt(formData.stock, 10) < 0) {
      Alert.alert('Validation Error', 'Please enter a valid stock quantity');
      return false;
    }

    return true;
  };

  const handleUpdateProduct = async () => {
    if (!validateEditForm() || !editingProduct) return;

    try {
      const validImages = formData.images.filter(img => img.trim() !== '');
      const validColors = formData.colors.filter(color => color.trim() !== '');
      const validSizes = formData.sizes.filter(size => size.trim() !== '');
      const totalVariantStock = editVariants.reduce((sum, variant) => sum + variant.stock, 0);
      const selectedCategory = (categories.length > 0 ? categories : FALLBACK_CATEGORIES)
        .find((category) => category.name === formData.category);

      if (editVariants.length > 0) {
        await productService.updateVariants(
          editVariants.map((variant) => ({
            id: variant.id,
            price: variant.price,
            stock: variant.stock,
          })),
        );
      }

      const updatedProduct = {
        ...editingProduct,
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
        stock: editVariants.length > 0 ? totalVariantStock : parseInt(formData.stock, 10),
        category: formData.category,
        category_id: selectedCategory?.id || null,
        images: validImages,
        colors: validColors.length > 0 ? validColors : undefined,
        sizes: validSizes.length > 0 ? validSizes : undefined,
      } as SellerProduct & { category_id?: string | null };

      if (editingProduct) {
        await updateProduct(editingProduct.id, updatedProduct);
      }

      if (seller?.id) {
        await fetchProducts({ sellerId: seller.id });
      }

      Alert.alert(
        'Product Updated',
        'Your product has been updated successfully.',
        [{
          text: 'OK', onPress: () => {
            closeEditModal();
            resetForm();
          }
        }]
      );
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update product');
    }
  };

  const handleBulkUploadCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const fileUri = result.assets[0].uri;
      const csvString = await FileSystem.readAsStringAsync(fileUri);

      const rows = csvString.split('\n').filter((row: string) => row.trim() !== '');
      const defaultCategoryName = (categories.length > 0 ? categories : FALLBACK_CATEGORIES)[0]?.name || 'Electronics';

      // Parse rows into temporary preview state
      const parsedProducts: SellerProduct[] = rows.slice(1).map((row: string, index: number) => {
        // Handles commas inside quotes
        const columns = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

        const price = parseFloat(columns[2]);
        const stock = parseInt(columns[4]);

        const sellerProduct: SellerProduct = {
          id: `PREVIEW-${Date.now()}-${index}`,
          name: columns[0]?.replace(/"/g, '').trim() || 'Untitled Product',
          description: columns[1]?.replace(/"/g, '').trim() || '',
          price: isNaN(price) ? 0 : price,
          originalPrice: columns[3] ? parseFloat(columns[3]) : undefined,
          stock: isNaN(stock) ? 0 : stock,
          category: columns[5]?.trim() || defaultCategoryName,
          isActive: true,
          sales: 0,
          rating: 0,
          reviews: 0,
          approval_status: 'pending',
          rejectionReason: undefined,
          vendorSubmittedCategory: undefined,
          adminReclassifiedCategory: undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sellerId: seller?.id,
          colors: [],
          sizes: [],
          images: columns[6]?.trim() ? [columns[6].trim()] : [`https://placehold.co/400x400?text=${encodeURIComponent(columns[0]?.replace(/"/g, '').trim() || 'Product')}`],
        };
        return sellerProduct;
      });

      setBulkPreviewProducts(parsedProducts);
      setIsPreviewMode(true); // Switch to preview view
    } catch (error) {
      Alert.alert('Error', 'Failed to process the CSV file.');
    }
  };

  const confirmBulkUpload = async () => {
    for (const product of bulkPreviewProducts) {
      // Convert preview ID to actual UUID for database compatibility
      const finalProduct = { ...product, id: generateUUID() };

      // Add to seller store - this inserts into Supabase and returns the DB ID
      const dbProductId = await addProduct(finalProduct);
      // Add to product QA flow using the database product ID
      await addProductToQA(dbProductId, seller?.store_name || 'Tech Shop PH');
    }

    Alert.alert('Success', `${bulkPreviewProducts.length} products added to inventory.`);
    setBulkPreviewProducts([]);
    setIsPreviewMode(false);
    setIsBulkUploadModalOpen(false);
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
    const categoryList = (categories.length > 0 ? categories : FALLBACK_CATEGORIES)
      .map((category) => category.name)
      .join(', ');

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
      `Categories: ${categoryList}`,
      [{ text: 'Got it' }]
    );
  };

  const filteredProducts = products.filter((product) => {
    const productName = asText(product.name);
    const matchesSeller = !seller?.id || product.sellerId === seller.id;
    return matchesSeller && productName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const renderProductCard = ({ item }: { item: SellerProduct }) => (
    <View style={styles.productCard}>
      <Image source={{ uri: item.images?.[0] || 'https://placehold.co/100x100?text=No+Image' }} style={styles.productImage} />

      <View style={styles.productInfo}>
        <View style={styles.productHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName} numberOfLines={1}>{asText(item.name)}</Text>
            <Text style={styles.productCategory}>{asText(item.category)}</Text>
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
          <Text style={styles.productSold}>{item.sales} sold</Text>
        </View>

        <View style={styles.productActions}>
          <Switch
            value={item.isActive}
            onValueChange={() => handleToggleProductStatus(item.id)}
            trackColor={{ false: '#E5E7EB', true: '#D97706' }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#E5E7EB"
          />
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditProduct(item)}
              activeOpacity={0.7}
            >
              <Edit size={20} color="#D97706" strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteProduct(item.id, item.name)}
              activeOpacity={0.7}
            >
              <Trash2 size={20} color="#EF4444" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderPreviewCard = (item: SellerProduct) => (
    <View style={styles.productCard}>
      <Image source={{ uri: item.images?.[0] || 'https://placehold.co/100x100?text=No+Image' }} style={styles.productImage} />

      <View style={styles.productInfo}>
        <View style={styles.productHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName} numberOfLines={1}>{asText(item.name)}</Text>
            <Text style={styles.productCategory}>{asText(item.category)}</Text>
          </View>
        </View>

        <View style={styles.productMeta}>
          <View style={styles.priceContainer}>
            <Text style={styles.productPrice}>₱{item.price.toLocaleString()}</Text>
            <Text style={styles.productStock}>Stock: {item.stock}</Text>
          </View>
          {/* Removed 'sold' count here */}
        </View>

        {/* Removed 'productActions' section (Switch, Edit, and Delete buttons) */}
      </View>
    </View>
  );

  // Null guard for seller - show loading when seller is not available
  if (!seller) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 16, color: '#9CA3AF' }}>Loading seller information...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SellerDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />

      {/* Bright Orange Edge-to-Edge Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={() => setDrawerVisible(true)}
          >
            <Menu size={24} color="#1F2937" strokeWidth={2} />
          </TouchableOpacity>

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
              <Upload size={20} color="#D97706" strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('AddProduct' as never)}
            >
              <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Search Bar moved out of Header (Matches Orders Screen) */}
      <View style={styles.searchSection}>
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
      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Loading products...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <PackageIcon size={64} color="#EF4444" strokeWidth={1.5} />
          <Text style={[styles.emptyTitle, { color: '#EF4444' }]}>Failed to load products</Text>
          <Text style={styles.emptySubtitle}>{error}</Text>
          <TouchableOpacity
            style={[styles.addButton, { marginTop: 16, paddingHorizontal: 24 }]}
            onPress={() => fetchProducts(seller?.id ? { sellerId: seller.id } : undefined)}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
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
      )}

      {/* Edit Product Modal */}
      <Modal
        visible={isEditModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={closeEditModal}
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
                <TouchableOpacity onPress={closeEditModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
                  {loadingCategories ? (
                    <Text style={styles.categoryLoadingText}>Loading categories...</Text>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.pillContainer}
                    >
                      {(categories.length > 0 ? categories : FALLBACK_CATEGORIES).map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.pillChip,
                            formData.category === item.name && styles.pillChipSelected,
                          ]}
                          onPress={() => setFormData({ ...formData, category: item.name })}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.pillChipText,
                              formData.category === item.name && styles.pillChipTextSelected,
                            ]}
                          >
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
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

                {editVariants.length > 0 ? (
                  <View style={styles.variantEditorCard}>
                    <Text style={styles.variantEditorTitle}>Variants ({editVariants.length})</Text>
                    <Text style={styles.variantEditorSubtitle}>
                      Total Stock: {editVariants.reduce((sum, variant) => sum + variant.stock, 0)}
                    </Text>

                    {editVariants.map((variant, index) => (
                      <View key={variant.id} style={styles.variantEditorRow}>
                        <View style={styles.variantEditorInfo}>
                          <Text style={styles.variantEditorName} numberOfLines={1}>
                            {variant.name || [variant.option1Value, variant.option2Value].filter(Boolean).join(' - ') || `Variant ${index + 1}`}
                          </Text>
                        </View>

                        <View style={styles.variantInputsRow}>
                          <TextInput
                            style={styles.variantInput}
                            value={String(variant.price)}
                            onChangeText={(value) => {
                              const parsedPrice = parseFloat(value);
                              setEditVariants((prev) =>
                                prev.map((item) =>
                                  item.id === variant.id
                                    ? { ...item, price: Number.isNaN(parsedPrice) ? 0 : parsedPrice }
                                    : item,
                                ),
                              );
                            }}
                            placeholder="Price"
                            keyboardType="decimal-pad"
                            placeholderTextColor="#9CA3AF"
                          />
                          <TextInput
                            style={styles.variantInput}
                            value={String(variant.stock)}
                            onChangeText={(value) => {
                              const parsedStock = parseInt(value, 10);
                              setEditVariants((prev) =>
                                prev.map((item) =>
                                  item.id === variant.id
                                    ? { ...item, stock: Number.isNaN(parsedStock) ? 0 : parsedStock }
                                    : item,
                                ),
                              );
                            }}
                            placeholder="Stock"
                            keyboardType="number-pad"
                            placeholderTextColor="#9CA3AF"
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
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
                )}

                {/* Others Card with Colors and Variations */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Text style={{ fontSize: 20 }}>✨</Text>
                    <Text style={styles.sectionTitle}>Others</Text>
                    <View style={styles.optionalBadge}>
                      <Text style={styles.optionalBadgeText}>Optional</Text>
                    </View>
                  </View>

                  {/* Colors Subsection */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={[styles.inputLabel, { marginBottom: 10 }]}>Colors</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                      <TextInput
                        style={[styles.modernInput, { flex: 1 }]}
                        placeholder="e.g. Red, Blue, White"
                        placeholderTextColor="#9CA3AF"
                        value={currentColorInput} // Use temp state
                        onChangeText={setCurrentColorInput} // Update temp state
                        onSubmitEditing={handleAddColor} // Add on Enter
                        blurOnSubmit={false} // Keeps keyboard open for next entry
                      />
                      <TouchableOpacity
                        style={[styles.modernInput, { width: 50, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' }]}
                        onPress={handleAddColor}
                      >
                        <Plus size={20} color="#D97706" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>

                    {/* Colors Pills - Only shows saved items */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {formData.colors.filter(c => c.trim()).map((color, index) => (
                        <View key={`color-${index}`} style={styles.variationPillOrange}>
                          <Text style={styles.variationTextOrange}>{color}</Text>
                          <TouchableOpacity onPress={() => removeColorField(index)}>
                            <X size={16} color="#EF4444" strokeWidth={2.5} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Variations Subsection */}
                  <View style={{ marginBottom: 0 }}>
                    <Text style={[styles.inputLabel, { marginBottom: 10 }]}>Variations</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                      <TextInput
                        style={[styles.modernInput, { flex: 1 }]}
                        placeholder="e.g. XL (Press Enter to add)"
                        placeholderTextColor="#9CA3AF"
                        value={currentSizeInput} // Use temp state
                        onChangeText={setCurrentSizeInput} // Update temp state
                        onSubmitEditing={handleAddSize} // Add on Enter
                        blurOnSubmit={false}
                      />
                      <TouchableOpacity
                        style={[styles.modernInput, { width: 50, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' }]}
                        onPress={handleAddSize}
                      >
                        <Plus size={20} color="#D97706" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>

                    {/* Variations Pills - Only shows saved items */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {formData.sizes.filter(s => s.trim()).map((size, index) => (
                        <View key={`size-${index}`} style={styles.variationPillBlue}>
                          <Text style={styles.variationTextBlue}>{size}</Text>
                          <TouchableOpacity onPress={() => removeSizeField(index)}>
                            <X size={16} color="#EF4444" strokeWidth={2.5} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </ScrollView>

              {/* Fixed Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={closeEditModal}
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
                {isPreviewMode ? (
                  <View>
                    <View style={styles.previewHeader}>
                      <Text style={styles.previewTitle}>Preview ({bulkPreviewProducts.length} items)</Text>
                      <TouchableOpacity onPress={() => setIsPreviewMode(false)}>
                        <Text style={{ color: '#D97706', fontWeight: '600' }}>Change File</Text>
                      </TouchableOpacity>
                    </View>

                    {bulkPreviewProducts.map((item) => (
                      <View key={item.id}>
                        {renderPreviewCard(item)}
                      </View>
                    ))}

                    <TouchableOpacity
                      style={[styles.csvUploadButton, { marginTop: 20 }]}
                      onPress={confirmBulkUpload}
                    >
                      <Text style={styles.csvUploadButtonText}>Confirm & Add to Inventory</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    {/* CSV Format Instructions */}
                    <View style={styles.csvInstructionsCard}>
                      <View style={styles.csvHeader}>
                        <FileText size={20} color="#D97706" strokeWidth={2.5} />
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
                      <FileText size={20} color="#D97706" strokeWidth={2.5} />
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
                      <Info size={16} color="#D97706" strokeWidth={2.5} />
                      <Text style={styles.csvHelpButtonText}>Show CSV Format Help</Text>
                    </TouchableOpacity>
                  </View>
                )}
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
    backgroundColor: '#FFF4EC',
  },
  // Bright Orange Edge-to-Edge Header
  header: {
    backgroundColor: '#FFF4EC', // Peach Background
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 20,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    backgroundColor: 'rgba(0,0,0,0.05)', // Subtle dark overlay
    padding: 10,
    borderRadius: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937', // Dark Charcoal
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#4B5563', // Gray Subtitle
    fontWeight: '500',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulkButton: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D97706', // Primary Action Brand Color
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    elevation: 2,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // New Search Section (similar to orders.tsx)
  searchSection: {
    paddingHorizontal: 20,
    marginTop: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    paddingTop: 20,
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
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 18,
  },
  productCategory: {
    fontSize: 12,
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
    fontSize: 11,
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
    color: '#D97706',
  },
  productStock: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  productSold: {
    fontSize: 11,
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
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#FFF4EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
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
    backgroundColor: '#D97706',
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
    backgroundColor: '#FFF4EC',
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
    marginBottom: 16,
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
    backgroundColor: '#FEF2F2',
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
    backgroundColor: '#FEF2F2',
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
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  pillChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  pillChipTextSelected: {
    color: '#FFFFFF',
  },
  categoryLoadingText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  variantEditorCard: {
    backgroundColor: '#FFF4EC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  variantEditorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  variantEditorSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 10,
  },
  variantEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  variantEditorInfo: {
    flex: 1,
    minWidth: 0,
  },
  variantEditorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  variantInputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  variantInput: {
    width: 82,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  // QA Note
  qaNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF4EC',
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
    backgroundColor: '#D97706',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  // CSV Bulk Upload Modal Styles
  csvInstructionsCard: {
    backgroundColor: '#FFF4EC',
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
    backgroundColor: '#FFF4EC',
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
    borderColor: '#D97706',
  },
  csvDownloadButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D97706',
  },
  csvUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#D97706',
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
    color: '#D97706',
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
    backgroundColor: '#FFF4EC',
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
    borderColor: '#FEF2F2',
  },
  requiredBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  optionalBadge: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  optionalBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7',
  },
  variationPillOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF4EC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  variationTextOrange: {
    fontSize: 14,
    color: '#EA580C',
    fontWeight: '600',
  },
  variationPillBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  variationTextBlue: {
    fontSize: 14,
    color: '#0284C7',
    fontWeight: '600',
  },
});
