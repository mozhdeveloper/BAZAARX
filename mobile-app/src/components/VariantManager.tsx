import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { Plus, X, Upload, Barcode, Tag, Box, Layers, Edit2, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

export type Variant = {
  id: string;
  option1: string; // e.g. "Red"
  option2: string; // e.g. "XL" or "-" if unused
  price: string;
  stock: string;
  sku: string;
  image?: string;
};

// We pass back the custom labels so you can save them (e.g. "Model", "Storage")
type Props = {
  productName: string;
  basePrice?: string;
  onVariantsChange: (variants: Variant[], labels: { option1: string, option2: string }) => void;
};

export default function VariantManager({ productName, basePrice, onVariantsChange }: Props) {
  // --- LABELS (Dynamic!) ---
  const [label1, setLabel1] = useState('Variation 1'); 
  const [label2, setLabel2] = useState('Variation 2');
  const [isEditingLabels, setIsEditingLabels] = useState(false);

  // --- TOGGLE FOR 2nd OPTION ---
  const [showOption2, setShowOption2] = useState(false);

  // --- VALUES ---
  const [opt1Values, setOpt1Values] = useState<string[]>([]);
  const [opt2Values, setOpt2Values] = useState<string[]>([]);
  
  const [tempOpt1, setTempOpt1] = useState('');
  const [tempOpt2, setTempOpt2] = useState('');
  
  // Data Store for Edits (Price/Stock/Image preservation)
  const [variantData, setVariantData] = useState<Record<string, Partial<Variant>>>({});

  // --- ACTIONS ---
  const addOpt1 = () => {
    const val = tempOpt1.trim();
    if (val && !opt1Values.includes(val)) {
      setOpt1Values([...opt1Values, val]);
      setTempOpt1('');
    }
  };

  const addOpt2 = () => {
    const val = tempOpt2.trim();
    if (val && !opt2Values.includes(val)) {
      setOpt2Values([...opt2Values, val]);
      setTempOpt2('');
    }
  };

  const removeValue = (type: 1 | 2, value: string) => {
    if (type === 1) setOpt1Values(opt1Values.filter(c => c !== value));
    else setOpt2Values(opt2Values.filter(s => s !== value));
  };

  const removeOption2 = () => {
    Alert.alert("Remove Variation 2?", "This will delete all data for this option.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => {
          setShowOption2(false);
          setOpt2Values([]);
          setTempOpt2('');
      }}
    ]);
  };

  const updateRow = (id: string, field: keyof Variant, value: string) => {
    setVariantData(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

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
        updateRow(id, 'image', result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  // --- GENERATION LOGIC ---
  const activeVariants = useMemo(() => {
    const combos: Variant[] = [];
    
    // Clean string for SKU
    const clean = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 5);
    const prodPrefix = productName ? clean(productName) : 'ITEM';

    const createVariant = (v1: string, v2: string): Variant => {
      const key = `${v1}-${v2}`;
      const saved = variantData[key] || {};
      
      const p1 = v1 !== '-' ? clean(v1) : '';
      const p2 = v2 !== '-' ? clean(v2) : '';
      
      // Auto-SKU: PROD-RED-XL or PROD-MODELA
      let autoSku = prodPrefix;
      if (p1) autoSku += `-${p1}`;
      if (p2) autoSku += `-${p2}`;

      return {
        id: key,
        option1: v1,
        option2: v2,
        price: saved.price !== undefined ? saved.price : (basePrice || ''),
        stock: saved.stock || '',
        sku: saved.sku !== undefined ? saved.sku : autoSku,
        image: saved.image
      };
    };

    // LOGIC: 
    // 1. If Option 2 is ACTIVE and has values -> Cross Join
    // 2. If Option 2 is INACTIVE or empty -> Only Option 1
    if (showOption2 && opt1Values.length > 0 && opt2Values.length > 0) {
      opt1Values.forEach(v1 => opt2Values.forEach(v2 => combos.push(createVariant(v1, v2))));
    } else if (opt1Values.length > 0) {
      opt1Values.forEach(v1 => combos.push(createVariant(v1, '-')));
    }
    
    return combos;
  }, [opt1Values, opt2Values, showOption2, variantData, basePrice, productName]);

  useEffect(() => {
    onVariantsChange(activeVariants, { option1: label1, option2: showOption2 ? label2 : '' });
  }, [activeVariants, label1, label2, showOption2]);

  return (
    <View style={styles.container}>
      {/* HEADER WITH EDITABLE LABELS */}
      <View style={styles.header}>
         <View style={styles.headerIcon}>
           <Layers size={20} color="#FF5722" />
         </View>
         <View style={{ flex: 1 }}>
           <Text style={styles.headerTitle}>Variants</Text>
           <Text style={styles.headerSubtitle}>
             {isEditingLabels ? "Tap names to rename" : "Define your product options"}
           </Text>
         </View>
         <TouchableOpacity 
            onPress={() => setIsEditingLabels(!isEditingLabels)}
            style={[styles.editLabelsBtn, isEditingLabels && styles.editLabelsBtnActive]}
         >
            <Edit2 size={14} color={isEditingLabels ? "#FF5722" : "#6B7280"} />
            <Text style={[styles.editLabelsText, isEditingLabels && { color: "#FF5722" }]}>
                {isEditingLabels ? "Done" : "Rename"}
            </Text>
         </TouchableOpacity>
      </View>

      {/* --- INPUT GROUP 1 (Always Visible) --- */}
      <View style={styles.inputSection}>
        {isEditingLabels ? (
            <TextInput 
                style={styles.labelInput} 
                value={label1} 
                onChangeText={setLabel1} 
                placeholder="e.g. Color"
                autoFocus
            />
        ) : (
            <Text style={styles.label}>{label1}</Text>
        )}
        
        <View style={styles.tagContainer}>
          {opt1Values.map(v => (
            <TouchableOpacity key={v} onPress={() => removeValue(1, v)} style={styles.tagOrange}>
              <Text style={styles.tagTextOrange}>{v}</Text>
              <X size={14} color="#EA580C" />
            </TouchableOpacity>
          ))}
          <View style={styles.addInputWrapper}>
             <TextInput 
                style={styles.ghostInput}
                placeholder={`Add ${label1}...`}
                value={tempOpt1}
                onChangeText={setTempOpt1}
                onSubmitEditing={addOpt1}
                blurOnSubmit={false}
             />
             <TouchableOpacity onPress={addOpt1} hitSlop={10}>
                <Plus size={20} color="#FF5722" />
             </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* --- INPUT GROUP 2 (Conditional) --- */}
      {showOption2 && (
        <View style={styles.inputSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                {isEditingLabels ? (
                    <TextInput 
                        style={styles.labelInput} 
                        value={label2} 
                        onChangeText={setLabel2} 
                        placeholder="e.g. Size"
                    />
                ) : (
                    <Text style={styles.label}>{label2}</Text>
                )}
                <TouchableOpacity onPress={removeOption2} hitSlop={10}>
                    <Trash2 size={14} color="#EF4444" style={{ marginBottom: 6 }}/>
                </TouchableOpacity>
            </View>

            <View style={styles.tagContainer}>
            {opt2Values.map(v => (
                <TouchableOpacity key={v} onPress={() => removeValue(2, v)} style={styles.tagBlue}>
                <Text style={styles.tagTextBlue}>{v}</Text>
                <X size={14} color="#0284C7" />
                </TouchableOpacity>
            ))}
            <View style={styles.addInputWrapper}>
                <TextInput 
                    style={styles.ghostInput}
                    placeholder={`Add ${label2}...`}
                    value={tempOpt2}
                    onChangeText={setTempOpt2}
                    onSubmitEditing={addOpt2}
                    blurOnSubmit={false}
                />
                <TouchableOpacity onPress={addOpt2} hitSlop={10}>
                    <Plus size={20} color="#FF5722" />
                </TouchableOpacity>
            </View>
            </View>
        </View>
      )}

      {/* ADD VARIATION 2 BUTTON (Only if hidden) */}
      {!showOption2 && (
          <TouchableOpacity 
            style={styles.addOptionBtn}
            onPress={() => setShowOption2(true)}
          >
             <Plus size={16} color="#4B5563" />
             <Text style={styles.addOptionText}>Add Variation 2 (e.g. Size)</Text>
          </TouchableOpacity>
      )}

      {/* GENERATED VARIANTS LIST */}
      {activeVariants.length > 0 && (
        <View style={styles.listContainer}>
          <View style={styles.listHeader}>
             <Text style={styles.listTitle}>{activeVariants.length} Variants Generated</Text>
          </View>
          
          {activeVariants.map((v) => (
            <View key={v.id} style={styles.variantCard}>
              
              {/* TOP: Image + Variant Name */}
              <View style={styles.cardTop}>
                 <TouchableOpacity onPress={() => handleImageUpload(v.id)} style={styles.uploadBox}>
                    {v.image ? (
                        <Image source={{ uri: v.image }} style={styles.variantImage} />
                    ) : (
                        <Upload size={18} color="#9CA3AF" />
                    )}
                 </TouchableOpacity>
                 
                 <View style={styles.nameContainer}>
                    <Text style={styles.variantName}>{v.option1}</Text>
                    {v.option2 !== '-' && (
                        <Text style={styles.variantSize}>{label2}: {v.option2}</Text>
                    )}
                 </View>
              </View>

              {/* SKU */}
              <View style={styles.skuRow}>
                 <View style={styles.iconBox}><Barcode size={14} color="#9CA3AF" /></View>
                 <TextInput 
                    style={styles.skuInput}
                    value={v.sku}
                    placeholder="SKU"
                    onChangeText={t => updateRow(v.id, 'sku', t)}
                 />
              </View>

              {/* Stock & Price */}
              <View style={styles.cardBottom}>
                 <View style={styles.bottomInputGroup}>
                    <View style={styles.iconBox}><Box size={14} color="#9CA3AF" /></View>
                    <TextInput 
                       style={styles.bottomInput}
                       value={v.stock}
                       placeholder="Stock"
                       keyboardType="numeric"
                       onChangeText={t => updateRow(v.id, 'stock', t)}
                    />
                 </View>

                 <View style={styles.bottomInputGroup}>
                    <View style={styles.iconBox}><Tag size={14} color="#9CA3AF" /></View>
                    <TextInput 
                       style={[styles.bottomInput, styles.priceText]}
                       value={v.price}
                       placeholder="Price"
                       keyboardType="numeric"
                       onChangeText={t => updateRow(v.id, 'price', t)}
                    />
                 </View>
              </View>

            </View>
          ))}
        </View>
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
  
  editLabelsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  editLabelsBtnActive: { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5' },
  editLabelsText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },

  inputSection: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  labelInput: { fontSize: 13, fontWeight: '700', color: '#FF5722', marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#FF5722', paddingBottom: 2 },

  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 8, minHeight: 48, backgroundColor: '#FAFAFA' },
  addInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 80 },
  ghostInput: { flex: 1, fontSize: 14, paddingVertical: 4, color: '#111827' },
  
  tagOrange: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#FFEDD5' },
  tagTextOrange: { fontSize: 13, color: '#EA580C', fontWeight: '600' },
  tagBlue: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0F9FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E0F2FE' },
  tagTextBlue: { fontSize: 13, color: '#0284C7', fontWeight: '600' },

  addOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed', borderRadius: 12, marginBottom: 16, justifyContent: 'center' },
  addOptionText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },

  listContainer: { marginTop: 8 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 4 },
  listTitle: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' },

  variantCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, marginBottom: 12 },
  cardTop: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  uploadBox: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  variantImage: { width: 48, height: 48, borderRadius: 8 },
  nameContainer: { justifyContent: 'center' },
  variantName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  variantSize: { fontSize: 13, color: '#6B7280' },

  skuRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 10, height: 38, marginBottom: 8 },
  skuInput: { flex: 1, fontSize: 13, color: '#374151', marginLeft: 8 },

  cardBottom: { flexDirection: 'row', gap: 8 },
  bottomInputGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 10, height: 38 },
  bottomInput: { flex: 1, fontSize: 13, color: '#111827', marginLeft: 8 },
  priceText: { fontWeight: '600', color: '#111827' },
  iconBox: { width: 16, alignItems: 'center' },
});