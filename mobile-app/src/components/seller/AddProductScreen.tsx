import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, Package as PackageIcon, X, Info, Layers, Trash2, Tag } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useSellerStore, SellerProduct } from '../../../src/stores/sellerStore';
import { useProductQAStore } from '../../../src/stores/productQAStore';
import VariantManager, { Variant } from '../../../src/components/VariantManager'; 

// Generate a proper UUID
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function AddProductScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { seller, addProduct } = useSellerStore();
  const { addProductToQA } = useProductQAStore();

  const [variants, setVariants] = useState<Variant[]>([]);
  const [showVariants, setShowVariants] = useState(false);
  
  // Variations and Colors inputs
  const [variationInput, setVariationInput] = useState('');
  const [colorInput, setColorInput] = useState('');
  
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
  
  const addVariation = () => {
    const val = variationInput.trim();
    if (val && !formData.sizes.includes(val)) {
      setFormData({ ...formData, sizes: [...formData.sizes, val] });
      setVariationInput('');
    }
  };
  
  const removeVariation = (val: string) => {
    setFormData({ ...formData, sizes: formData.sizes.filter(s => s !== val) });
  };
  
  const addColor = () => {
    const val = colorInput.trim();
    if (val && !formData.colors.includes(val)) {
      setFormData({ ...formData, colors: [...formData.colors, val] });
      setColorInput('');
    }
  };
  
  const removeColor = (val: string) => {
    setFormData({ ...formData, colors: formData.colors.filter(c => c !== val) });
  };

  const categories = [
    'Electronics', 'Fashion', 'Beauty', 'Food', 'Home & Living', 
    'Sports', 'Books', 'Toys', 'Accessories', 'Others'
  ];

  // --- Image Handlers ---
  const handlePickImage = async (index: number) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to upload images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = [...formData.images];
        newImages[index] = result.assets[0].uri;
        if (result.assets.length > 1) {
          const remainingImages = result.assets.slice(1).map(asset => asset.uri);
          newImages.push(...remainingImages);
        }
        setFormData({ ...formData, images: newImages });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick images.');
    }
  };

  const addImageField = () => setFormData({ ...formData, images: [...formData.images, ''] });
  const removeImageField = (index: number) => {
    if (formData.images.length > 1) {
      setFormData({ ...formData, images: formData.images.filter((_, i) => i !== index) });
    }
  };

  // --- Submit ---
  const validateForm = () => {
    if (!formData.name.trim()) return Alert.alert('Error', 'Name is required');
    if (!formData.price) return Alert.alert('Error', 'Price is required');
    if (!formData.category) return Alert.alert('Error', 'Category is required');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const validImages = formData.images.filter(img => img.trim() !== '');

      const baseStock = parseInt(formData.stock) || 0;
      const customVariantStock = showVariants
        ? variants.reduce((acc, v) => acc + (parseInt(v.stock) || 0), 0)
        : 0;

      // Total stock is base stock + variant stock
      const totalStock = baseStock + customVariantStock;

      if (totalStock <= 0) {
        Alert.alert('Error', 'Total stock must be greater than 0');
        return;
      }

      const baseVariant: Variant | null = showVariants && baseStock > 0
        ? {
            id: `base-${Date.now()}`,
            option1: '-',
            option2: '-',
            price: formData.price || '0',
            stock: baseStock.toString(),
            sku: `${(formData.name || 'ITEM').substring(0, 3).toUpperCase()}-BASE`,
          }
        : null;

      const variantsForSubmit = showVariants
        ? [...(baseVariant ? [baseVariant] : []), ...variants]
        : undefined;

      // Determine variant labels based on what's being used
      let variantLabel1 = null;
      let variantLabel2 = null;
      
      if (showVariants && variants.length > 0) {
        // Check if variants use colors (option1)
        const hasColors = variants.some(v => v.option1 && v.option1 !== '-');
        // Check if variants use sizes (option2)
        const hasSizes = variants.some(v => v.option2 && v.option2 !== '-');
        
        if (hasColors) variantLabel1 = 'Color';
        if (hasSizes) variantLabel2 = 'Size';
      } else if (formData.colors.length > 0 || formData.sizes.length > 0) {
        // Legacy mode without VariantManager
        if (formData.colors.length > 0) variantLabel1 = 'Color';
        if (formData.sizes.length > 0) variantLabel2 = 'Size';
      }

      const newProduct: SellerProduct = {
        sellerId: seller?.id,
        id: generateUUID(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
        stock: totalStock,
        category: formData.category,
        images: validImages.length > 0 ? validImages : ['https://placehold.co/400x400?text=No+Image'],
        isActive: true,
        sales: 0,
        rating: 0,
        reviews: 0,
        approval_status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Pass variant labels and variants to addProduct
        variant_label_1: variantLabel1,
        variant_label_2: variantLabel2,
        variants: variantsForSubmit && variantsForSubmit.length > 0 ? variantsForSubmit : undefined,
      } as any;

      const dbProductId = await addProduct(newProduct);
      await addProductToQA(dbProductId, seller?.store_name || 'Store');

      Alert.alert('Success', 'Product submitted for review.', [{ text: 'OK', onPress: () => navigation.goBack() }]);

    } catch (error) {
      Alert.alert('Error', 'Failed to add product');
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Product</Text>
        <View style={{ width: 24 }} /> 
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* 1. IMAGES */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
               <Camera size={20} color="#FF5722" />
               <Text style={styles.sectionTitle}>Images</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageList}>
              {formData.images.map((img, index) => (
                <View key={index} style={styles.imageWrapper}>
                   <TouchableOpacity onPress={() => handlePickImage(index)} style={styles.imageBox}>
                      {img && !img.startsWith('http') ? (
                        <Image source={{ uri: img }} style={styles.imagePreview} />
                      ) : (
                        <View style={styles.imagePlaceholder}>
                           <Camera size={24} color="#9CA3AF" />
                           <Text style={styles.addImgText}>Upload</Text>
                        </View>
                      )}
                   </TouchableOpacity>
                   {formData.images.length > 1 && (
                     <TouchableOpacity style={styles.removeImgBtn} onPress={() => removeImageField(index)}>
                        <X size={12} color="#FFF" />
                     </TouchableOpacity>
                   )}
                </View>
              ))}
              <TouchableOpacity onPress={addImageField} style={styles.addMoreBtn}>
                  <Text style={styles.addMoreText}>+ Add</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* 2. DETAILS */}
          <View style={styles.card}>
             <View style={styles.sectionHeader}>
                <PackageIcon size={20} color="#FF5722" />
                <Text style={styles.sectionTitle}>Details</Text>
             </View>
             
             <Text style={styles.label}>Product Name</Text>
             <TextInput 
                style={styles.input} 
                placeholder="e.g. iPhone 15" 
                value={formData.name}
                onChangeText={t => setFormData({...formData, name: t})}
             />

             <Text style={styles.label}>Description</Text>
             <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholder="Product description..." 
                multiline
                value={formData.description}
                onChangeText={t => setFormData({...formData, description: t})}
             />

             <Text style={styles.label}>Category</Text>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                {categories.map(cat => (
                   <TouchableOpacity 
                      key={cat} 
                      style={[styles.catChip, formData.category === cat && styles.catChipActive]}
                      onPress={() => setFormData({...formData, category: cat})}
                   >
                      <Text style={[styles.catText, formData.category === cat && styles.catTextActive]}>{cat}</Text>
                   </TouchableOpacity>
                ))}
             </ScrollView>
          </View>

          {/* 3. PRICING & STOCK */}
          <View style={styles.card}>
             <View style={styles.sectionHeader}>
                <Tag size={20} color="#FF5722" />
                <Text style={styles.sectionTitle}>Pricing & Inventory</Text>
             </View>

             <View style={styles.row}>
                <View style={{ flex: 1 }}>
                   <Text style={styles.label}>Display Price (₱)</Text>
                   <Text style={styles.hint}>Shown on product card</Text>
                   <TextInput 
                      style={styles.input} 
                      keyboardType="numeric"
                      placeholder="0.00"
                      value={formData.price}
                      onChangeText={t => setFormData({...formData, price: t})}
                   />
                </View>
                <View style={{ flex: 1 }}>
                   <Text style={styles.label}>Original Price</Text>
                   <Text style={styles.hint}>Strikethrough price</Text>
                   <TextInput 
                      style={styles.input} 
                      keyboardType="numeric"
                      placeholder="Optional"
                      value={formData.originalPrice}
                      onChangeText={t => setFormData({...formData, originalPrice: t})}
                   />
                </View>
             </View>

             {/* Variant Pricing Info */}
             {showVariants && variants.length > 0 && (
                <View style={styles.priceInfoBox}>
                   <Text style={styles.priceInfoText}>
                      💡 Buyers pay the variant price when they select a variant.
                   </Text>
                </View>
             )}

             {/* STOCK INPUT: Always available as base variant stock */}
             <View style={{ marginTop: 12 }}>
                <Text style={styles.label}>{showVariants ? 'Base Stock Quantity' : 'Stock Quantity'}</Text>
                {showVariants && (
                    <Text style={styles.hint}>This stock is used by the base variant (no attributes).</Text>
                )}
                <TextInput 
                    style={styles.input} 
                    keyboardType="numeric"
                    placeholder="e.g. 50"
                    value={formData.stock}
                    onChangeText={t => setFormData({...formData, stock: t})}
                />
                {showVariants && (
                    <Text style={styles.hint}>
                        Total stock preview: {(parseInt(formData.stock) || 0) + variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0)}
                    </Text>
                )}
             </View>
             
             {/* VARIATIONS INPUT */}
             <View style={{ marginTop: 12 }}>
                <Text style={styles.label}>Variations (optional)</Text>
                <Text style={styles.hint}>Sizes, models, flavors, etc.</Text>
                <View style={styles.row}>
                   <TextInput 
                      style={[styles.input, { flex: 1 }]} 
                      placeholder="e.g. Small, Large, 500ml"
                      value={variationInput}
                      onChangeText={setVariationInput}
                      onSubmitEditing={addVariation}
                   />
                   <TouchableOpacity style={styles.addTagBtn} onPress={addVariation}>
                      <Text style={styles.addTagText}>+ Add</Text>
                   </TouchableOpacity>
                </View>
                {formData.sizes.length > 0 && (
                   <View style={styles.tagContainer}>
                      {formData.sizes.map(size => (
                         <View key={size} style={styles.tag}>
                            <Text style={styles.tagText}>{size}</Text>
                            <TouchableOpacity onPress={() => removeVariation(size)}>
                               <X size={14} color="#FF5722" />
                            </TouchableOpacity>
                         </View>
                      ))}
                   </View>
                )}
             </View>
             
             {/* COLORS INPUT */}
             <View style={{ marginTop: 12 }}>
                <Text style={styles.label}>Colors (optional)</Text>
                <View style={styles.row}>
                   <TextInput 
                      style={[styles.input, { flex: 1 }]} 
                      placeholder="e.g. Red, Blue, Green"
                      value={colorInput}
                      onChangeText={setColorInput}
                      onSubmitEditing={addColor}
                   />
                   <TouchableOpacity style={styles.addTagBtn} onPress={addColor}>
                      <Text style={styles.addTagText}>+ Add</Text>
                   </TouchableOpacity>
                </View>
                {formData.colors.length > 0 && (
                   <View style={styles.tagContainer}>
                      {formData.colors.map(color => (
                         <View key={color} style={[styles.tag, styles.colorTag]}>
                            <Text style={[styles.tagText, styles.colorTagText]}>{color}</Text>
                            <TouchableOpacity onPress={() => removeColor(color)}>
                               <X size={14} color="#3B82F6" />
                            </TouchableOpacity>
                         </View>
                      ))}
                   </View>
                )}
             </View>
          </View>

          {/* 4. VARIANTS TOGGLE */}
          {!showVariants ? (
            <TouchableOpacity 
                style={styles.addVariantsBtn} 
                onPress={() => setShowVariants(true)}
                activeOpacity={0.8}
            >
                <Layers size={20} color="#FF5722" />
                <Text style={styles.addVariantsText}>+ Manage Variants</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ position: 'relative' }}>
                {/* Variant Manager Component */}
                <VariantManager 
                    productName={formData.name}
                    basePrice={formData.price}
                    baseStock={formData.stock}
                    availableSizes={formData.sizes}
                    availableColors={formData.colors}
                    onVariantsChange={(newVariants, labels) => {
                        // Map correctly: option1 = Color, option2 = Size
                        const mappedVariants = newVariants.map(v => ({
                            ...v,
                            color: v.option1 === '-' ? '' : v.option1, 
                            size: v.option2 === '-' ? '' : v.option2,  
                        }));

                        setVariants(mappedVariants);
                    }}
                />
                
                {/* Remove Variants Button */}
                <TouchableOpacity 
                    style={styles.removeVariantsBtn}
                    onPress={() => {
                        Alert.alert("Remove Variants?", "This will delete all your variant data and switch back to simple stock management.", [
                            { text: "Cancel", style: "cancel" },
                            { text: "Remove", style: "destructive", onPress: () => {
                                setShowVariants(false);
                                setVariants([]);
                            }}
                        ]);
                    }}
                >
                    <Trash2 size={16} color="#EF4444" />
                    <Text style={styles.removeVariantsText}>Remove Variants</Text>
                </TouchableOpacity>
            </View>
          )}

          <View style={styles.qaNote}>
             <Info size={16} color="#FF5722" />
             <Text style={styles.qaNoteText}>Product will be submitted for Quality Assurance review.</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
         <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitText}>Submit Product</Text>
         </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  backBtn: { padding: 8 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#111827' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  
  imageList: { flexDirection: 'row', gap: 12 },
  imageWrapper: { position: 'relative', marginRight: 12 },
  imageBox: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center' },
  addImgText: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  removeImgBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  addMoreBtn: { width: 60, height: 80, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addMoreText: { fontSize: 12, color: '#6B7280' },
  
  catScroll: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  catChipActive: { backgroundColor: '#FF5722' },
  catText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  catTextActive: { color: '#FFF' },

  row: { flexDirection: 'row', gap: 12 },
  
  // Tag input styles
  hint: { fontSize: 11, color: '#9CA3AF', marginBottom: 8 },
  addTagBtn: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#FF5722', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  addTagText: { fontSize: 14, fontWeight: '600', color: '#FF5722' },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF7ED', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#FFEDD5' },
  tagText: { fontSize: 13, color: '#EA580C', fontWeight: '500' },
  colorTag: { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' },
  colorTagText: { color: '#2563EB' },

  // Buttons for Variants
  addVariantsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFF', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed', marginBottom: 16 },
  addVariantsText: { fontSize: 15, fontWeight: '600', color: '#FF5722' },
  
  removeVariantsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: -8, marginBottom: 20 },
  removeVariantsText: { fontSize: 13, color: '#EF4444', fontWeight: '600' },

  qaNote: { flexDirection: 'row', gap: 8, backgroundColor: '#FFF7ED', padding: 12, borderRadius: 8, marginTop: 8 },
  qaNoteText: { fontSize: 12, color: '#EA580C', flex: 1 },

  priceInfoBox: { backgroundColor: '#FFF7ED', padding: 12, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: '#FFEDD5' },
  priceInfoText: { fontSize: 12, color: '#EA580C' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  submitBtn: { backgroundColor: '#FF5722', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
