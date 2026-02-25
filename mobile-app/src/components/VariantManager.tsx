import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { Plus, Upload, Box, Layers, Edit2, Trash2, Check, ChevronDown } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

export type Variant = {
  id: string;
  option1: string; // e.g. "Red" (Color)
  option2: string; // e.g. "XL" (Size) or "-" if unused
  price: string;
  stock: string;
  sku: string;
  image?: string;
};

// Props now include available sizes and colors from parent
type Props = {
  productName: string;
  basePrice?: string;
  baseStock?: string;
  availableSizes?: string[];
  availableColors?: string[];
  onVariantsChange: (variants: Variant[], labels: { option1: string, option2: string }) => void;
};

export default function VariantManager({ productName, basePrice, baseStock, availableSizes = [], availableColors = [], onVariantsChange }: Props) {
  // --- LABELS ---
  const label1 = 'Color';
  const label2 = 'Size/Variation';
  
  // --- CRUD VARIANTS (not matrix generation) ---
  const [variants, setVariants] = useState<Variant[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // New variant form state
  const [newSize, setNewSize] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newStock, setNewStock] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newImage, setNewImage] = useState('');
  
  // Dropdown visibility
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  
  // Generate unique ID
  const generateId = () => `var-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  
  // Clean string for SKU
  const clean = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 5);

  // Add a new variant
  const addVariant = () => {
    if (!newSize && !newColor) {
      Alert.alert('Error', 'Please select at least a size or color');
      return;
    }
    
    // Check for duplicates
    const isDuplicate = variants.some(
      v => v.option2 === (newSize || '-') && v.option1 === (newColor || '-')
    );
    if (isDuplicate) {
      Alert.alert('Error', 'This variant combination already exists');
      return;
    }
    
    const prodPrefix = productName ? clean(productName) : 'ITEM';
    const p1 = newColor ? clean(newColor) : '';
    const p2 = newSize ? clean(newSize) : '';
    let autoSku = prodPrefix;
    if (p1) autoSku += `-${p1}`;
    if (p2) autoSku += `-${p2}`;
    
    const newVariant: Variant = {
      id: generateId(),
      option1: newColor || '-',
      option2: newSize || '-',
      price: newPrice || basePrice || '',
      stock: newStock || '0',
      sku: newSku || autoSku,
      image: newImage || undefined,
    };
    
    setVariants(prev => [...prev, newVariant]);
    resetForm();
    setShowAddForm(false);
  };
  
  const resetForm = () => {
    setNewSize('');
    setNewColor('');
    setNewStock('');
    setNewPrice('');
    setNewSku('');
    setNewImage('');
  };
  
  // Update variant
  const updateVariant = (id: string, field: keyof Variant, value: string) => {
    setVariants(prev => prev.map(v => 
      v.id === id ? { ...v, [field]: value } : v
    ));
  };
  
  // Delete variant
  const deleteVariant = (id: string) => {
    Alert.alert('Delete Variant?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setVariants(prev => prev.filter(v => v.id !== id));
      }}
    ]);
  };
  
  // Image upload
  const handleImageUpload = async (id: string) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission', 'Allow access to photos to upload variant images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        updateVariant(id, 'image', result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  // Notify parent of changes
  useEffect(() => {
    onVariantsChange(variants, { option1: label1, option2: label2 });
  }, [variants]);

  const baseVariantStock = parseInt(baseStock || '0') || 0;
  const customVariantStock = variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
  const totalStock = baseVariantStock + customVariantStock;

  // Render dropdown selector
  const renderDropdownSelector = (
    label: string,
    value: string,
    setValue: (val: string) => void,
    options: string[],
    showDropdown: boolean,
    setShowDropdown: (show: boolean) => void,
    placeholder: string,
    bgColor: string,
    textColor: string
  ) => (
    <View style={{ flex: 1 }}>
      <Text style={styles.formLabel}>{label}</Text>
      {options.length > 0 ? (
        <View>
          <TouchableOpacity 
            style={[styles.dropdown, showDropdown && styles.dropdownActive]}
            onPress={() => setShowDropdown(!showDropdown)}
          >
            <Text style={[styles.dropdownText, !value && styles.dropdownPlaceholder]}>
              {value || placeholder}
            </Text>
            <ChevronDown size={16} color="#6B7280" />
          </TouchableOpacity>
          {showDropdown && (
            <View style={styles.dropdownList}>
              <TouchableOpacity 
                style={styles.dropdownItem}
                onPress={() => { setValue(''); setShowDropdown(false); }}
              >
                <Text style={styles.dropdownItemPlaceholder}>-- None --</Text>
              </TouchableOpacity>
              {options.map(opt => (
                <TouchableOpacity 
                  key={opt}
                  style={[styles.dropdownItem, value === opt && { backgroundColor: bgColor }]}
                  onPress={() => { setValue(opt); setShowDropdown(false); }}
                >
                  <Text style={[styles.dropdownItemText, value === opt && { color: textColor, fontWeight: '600' }]}>
                    {opt}
                  </Text>
                  {value === opt && <Check size={14} color={textColor} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ) : (
        <TextInput
          style={styles.formInput}
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Layers size={20} color="#FF5722" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Manage Variants</Text>
          <Text style={styles.headerSubtitle}>
            {variants.length > 0 || baseVariantStock > 0
              ? `${variants.length + (baseVariantStock > 0 ? 1 : 0)} variant(s) • Total stock: ${totalStock}`
              : 'Add individual variants with stock and pricing'
            }
          </Text>
        </View>
      </View>

      {/* BASE VARIANT (mirrors general stock) */}
      {baseVariantStock > 0 && (
        <View style={[styles.variantCard, styles.baseVariantCard]}>
          <View style={styles.cardTop}>
            <View style={[styles.uploadBox, styles.baseUploadBox]}>
              <Box size={18} color="#15803D" />
            </View>

            <View style={styles.nameContainer}>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <View style={styles.baseTag}>
                  <Text style={styles.baseTagText}>Base Variant</Text>
                </View>
              </View>
              <Text style={styles.variantMeta}>
                Stock: {baseVariantStock} • ₱{basePrice || '0'}
              </Text>
              <Text style={styles.skuText}>Mirrors general stock (no attributes)</Text>
            </View>
          </View>
        </View>
      )}

      {/* EXISTING VARIANTS LIST */}
      {variants.map((v) => (
        <View key={v.id} style={styles.variantCard}>
          {editingId === v.id ? (
            // EDIT MODE
            <View>
              <View style={styles.formRow}>
                {renderDropdownSelector(
                  'Size/Variation',
                  v.option2 === '-' ? '' : v.option2,
                  (val) => updateVariant(v.id, 'option2', val || '-'),
                  availableSizes,
                  false, () => {},
                  'Select size...',
                  '#FFF7ED', '#EA580C'
                )}
                {renderDropdownSelector(
                  'Color',
                  v.option1 === '-' ? '' : v.option1,
                  (val) => updateVariant(v.id, 'option1', val || '-'),
                  availableColors,
                  false, () => {},
                  'Select color...',
                  '#EFF6FF', '#0284C7'
                )}
              </View>
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Stock *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={v.stock}
                    onChangeText={(t) => updateVariant(v.id, 'stock', t)}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: '#EA580C' }]}>Variant Price (₱) *</Text>
                  <Text style={styles.priceHint}>Buyer pays this</Text>
                  <TextInput
                    style={[styles.formInput, { borderColor: '#EA580C', backgroundColor: '#FFF7ED' }]}
                    value={v.price}
                    onChangeText={(t) => updateVariant(v.id, 'price', t)}
                    keyboardType="numeric"
                    placeholder={basePrice || '0'}
                  />
                </View>
              </View>
              <View>
                <Text style={styles.formLabel}>SKU</Text>
                <TextInput
                  style={styles.formInput}
                  value={v.sku}
                  onChangeText={(t) => updateVariant(v.id, 'sku', t)}
                  placeholder="Auto-generated"
                />
              </View>
              <TouchableOpacity 
                style={styles.doneBtn}
                onPress={() => setEditingId(null)}
              >
                <Check size={16} color="#FFF" />
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // VIEW MODE
            <View style={styles.cardTop}>
              <TouchableOpacity onPress={() => handleImageUpload(v.id)} style={styles.uploadBox}>
                {v.image ? (
                  <Image source={{ uri: v.image }} style={styles.variantImage} />
                ) : (
                  <Upload size={18} color="#9CA3AF" />
                )}
              </TouchableOpacity>
              
              <View style={styles.nameContainer}>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {v.option2 !== '-' && (
                    <View style={styles.tagOrange}>
                      <Text style={styles.tagTextOrange}>{v.option2}</Text>
                    </View>
                  )}
                  {v.option1 !== '-' && (
                    <View style={styles.tagBlue}>
                      <Text style={styles.tagTextBlue}>{v.option1}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.variantMeta}>
                  Stock: {v.stock} • ₱{v.price || basePrice || '0'}
                </Text>
                {v.sku && <Text style={styles.skuText}>SKU: {v.sku}</Text>}
              </View>
              
              <View style={styles.actionBtns}>
                <TouchableOpacity style={styles.editBtn} onPress={() => setEditingId(v.id)}>
                  <Edit2 size={14} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteVariant(v.id)}>
                  <Trash2 size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      ))}

      {/* ADD NEW VARIANT FORM */}
      {showAddForm ? (
        <View style={styles.addForm}>
          <Text style={styles.addFormTitle}>Add New Variant</Text>
          
          <View style={styles.formRow}>
            {renderDropdownSelector(
              'Size/Variation',
              newSize,
              setNewSize,
              availableSizes,
              showSizeDropdown,
              setShowSizeDropdown,
              'Select or type...',
              '#FFF7ED', '#EA580C'
            )}
            {renderDropdownSelector(
              'Color',
              newColor,
              setNewColor,
              availableColors,
              showColorDropdown,
              setShowColorDropdown,
              'Select or type...',
              '#EFF6FF', '#0284C7'
            )}
          </View>
          
          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.formLabel}>Stock *</Text>
              <TextInput
                style={styles.formInput}
                value={newStock}
                onChangeText={setNewStock}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.formLabel, { color: '#EA580C' }]}>Variant Price (₱) *</Text>
              <Text style={styles.priceHint}>Buyer pays this</Text>
              <TextInput
                style={[styles.formInput, { borderColor: '#EA580C', backgroundColor: '#FFF7ED' }]}
                value={newPrice}
                onChangeText={setNewPrice}
                keyboardType="numeric"
                placeholder={basePrice || '0'}
              />
            </View>
          </View>
          
          <View>
            <Text style={styles.formLabel}>SKU (optional)</Text>
            <TextInput
              style={styles.formInput}
              value={newSku}
              onChangeText={setNewSku}
              placeholder="Auto-generated if empty"
            />
          </View>
          
          {/* Variant Image */}
          <View>
            <Text style={styles.formLabel}>Variant Image (optional)</Text>
            <View style={styles.imageInputRow}>
              <TouchableOpacity 
                style={styles.imagePickerBtn}
                onPress={async () => {
                  try {
                    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (!permissionResult.granted) {
                      Alert.alert('Permission', 'Allow access to photos to upload variant images.');
                      return;
                    }
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsEditing: true,
                      aspect: [1, 1],
                      quality: 0.8,
                    });
                    if (!result.canceled && result.assets[0]) {
                      setNewImage(result.assets[0].uri);
                    }
                  } catch (error) {
                    Alert.alert('Error', 'Failed to pick image.');
                  }
                }}
              >
                {newImage ? (
                  <Image source={{ uri: newImage }} style={styles.imagePreview} />
                ) : (
                  <Upload size={20} color="#9CA3AF" />
                )}
              </TouchableOpacity>
              <TextInput
                style={[styles.formInput, { flex: 1 }]}
                value={newImage}
                onChangeText={setNewImage}
                placeholder="Or paste image URL..."
              />
            </View>
          </View>
          
          <View style={styles.formActions}>
            <TouchableOpacity 
              style={styles.cancelBtn}
              onPress={() => { resetForm(); setShowAddForm(false); }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.addBtn}
              onPress={addVariant}
            >
              <Plus size={16} color="#FFF" />
              <Text style={styles.addBtnText}>Add Variant</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.addVariantBtn}
          onPress={() => setShowAddForm(true)}
        >
          <Plus size={18} color="#FF5722" />
          <Text style={styles.addVariantBtnText}>Add Variant</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#F3F4F6', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  header: { flexDirection: 'row', gap: 10, marginBottom: 16, alignItems: 'center' },
  headerIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSubtitle: { fontSize: 12, color: '#6B7280' },

  // Variant Card
  variantCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, marginBottom: 12 },
  baseVariantCard: { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  uploadBox: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  baseUploadBox: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  variantImage: { width: 48, height: 48, borderRadius: 8 },
  nameContainer: { flex: 1, gap: 4 },
  variantMeta: { fontSize: 13, color: '#6B7280' },
  skuText: { fontSize: 11, color: '#9CA3AF' },
  baseTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#86EFAC' },
  baseTagText: { fontSize: 12, color: '#15803D', fontWeight: '600' },
  
  // Tags
  tagOrange: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#FFEDD5' },
  tagTextOrange: { fontSize: 12, color: '#EA580C', fontWeight: '600' },
  tagBlue: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0F9FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#E0F2FE' },
  tagTextBlue: { fontSize: 12, color: '#0284C7', fontWeight: '600' },
  
  // Action Buttons
  actionBtns: { flexDirection: 'row', gap: 8 },
  editBtn: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 8 },
  deleteBtn: { padding: 8, backgroundColor: '#FEE2E2', borderRadius: 8 },
  
  // Add Form
  addForm: { backgroundColor: '#FAFAFA', borderWidth: 2, borderColor: '#FFEDD5', borderStyle: 'dashed', borderRadius: 12, padding: 16, marginBottom: 12 },
  addFormTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 },
  formRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  formLabel: { fontSize: 12, fontWeight: '500', color: '#6B7280', marginBottom: 6 },
  formInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827' },
  priceHint: { fontSize: 10, color: '#EA580C', marginBottom: 4, fontWeight: '500' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', backgroundColor: '#FFF' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  addBtn: { flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: 10, backgroundColor: '#FF5722', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  
  // Done Button (for edit mode)
  doneBtn: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-end' },
  doneBtnText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
  
  // Dropdown
  dropdown: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownActive: { borderColor: '#FF5722' },
  dropdownText: { fontSize: 14, color: '#111827' },
  dropdownPlaceholder: { color: '#9CA3AF' },
  dropdownList: { position: 'absolute', top: 44, left: 0, right: 0, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, zIndex: 100, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownItemText: { fontSize: 14, color: '#374151' },
  dropdownItemPlaceholder: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic' },
  
  // Add Variant Button
  addVariantBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderWidth: 2, borderColor: '#FFEDD5', borderStyle: 'dashed', borderRadius: 12, backgroundColor: '#FFFBF5' },
  addVariantBtnText: { fontSize: 14, fontWeight: '600', color: '#FF5722' },
  
  // Image input styles
  imageInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  imagePickerBtn: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imagePreview: { width: 48, height: 48, borderRadius: 10 },
});
