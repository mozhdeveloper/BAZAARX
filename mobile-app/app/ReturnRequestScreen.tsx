import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  TextInput,
  Image,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, Upload, X, ChevronRight, AlertCircle } from 'lucide-react-native';
import { COLORS } from '../src/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useReturnStore } from '../src/stores/returnStore';
import { useAuthStore } from '../src/stores/authStore';
import { ReturnReason, ReturnType } from '../src/types';
import { safeImageUri } from '../src/utils/imageUtils';
import * as ImagePicker from 'expo-image-picker';

type Props = NativeStackScreenProps<RootStackParamList, 'ReturnRequest'>;

export default function ReturnRequestScreen({ route, navigation }: Props) {
  const { order } = route.params;
  const insets = useSafeAreaInsets();
  const BRAND_COLOR = COLORS.primary;
  
  // Get User for ID
  const { user } = useAuthStore();
  const createReturnRequest = useReturnStore((state) => state.createReturnRequest);

  const [selectedItems, setSelectedItems] = useState<{ [key: string]: boolean }>({});
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [reason, setReason] = useState<ReturnReason | ''>('');
  const [returnType, setReturnType] = useState<ReturnType>('return_refund');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize quantities
  React.useEffect(() => {
    const initialQuantities: { [key: string]: number } = {};
    order.items.forEach((item) => {
      initialQuantities[item.id] = item.quantity;
    });
    setQuantities(initialQuantities);
  }, [order]);

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[itemId] || 1;
      const max = order.items.find((i) => i.id === itemId)?.quantity || 1;
      const newValue = Math.max(1, Math.min(max, current + delta));
      return { ...prev, [itemId]: newValue };
    });
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const itemsToReturn = Object.keys(selectedItems)
      .filter((id) => selectedItems[id])
      .map((id) => ({
        itemId: id,
        quantity: quantities[id],
      }));

    if (itemsToReturn.length === 0) {
      Alert.alert('Error', 'Please select at least one item to return.');
      return;
    }

    if (!reason) {
      Alert.alert('Error', 'Please select a reason for the return.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please provide a description.');
      return;
    }

    setIsSubmitting(true);

    const amount = itemsToReturn.reduce((total, item) => {
      const orderItem = order.items.find((i) => i.id === item.itemId);
      return total + (orderItem ? (orderItem.price ?? 0) * item.quantity : 0);
    }, 0);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate API call

      const sellerId = order.items[0].seller || 'Unknown Seller';
      console.log('🔍 Creating return request with sellerId:', sellerId);
      console.log('🔍 Order items:', order.items.map(i => ({ name: i.name, seller: i.seller })));

      createReturnRequest({
        orderId: order.id,
        userId: user?.id || 'guest',
        sellerId: sellerId,
        items: itemsToReturn,
        reason: reason as ReturnReason,
        description,
        images,
        type: returnType,
        amount,
      });

      Alert.alert('Success', 'Return request submitted successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit return request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const reasons: { label: string; value: ReturnReason; sub: string }[] = [
    { label: 'Defective / Not Working', value: 'defective', sub: 'Does not function as expected' },
    { label: 'Damaged / Broken', value: 'damaged', sub: 'Product arrived with visible damage' },
    { label: 'Incorrect Item', value: 'incorrect', sub: 'Received wrong product, color, or size' },
    { label: 'Not as Described', value: 'not_as_described', sub: 'Features do not match description' },
    { label: 'Other', value: 'other', sub: 'Any other reason not listed above' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* BRANDED HEADER */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: BRAND_COLOR }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
            <ArrowLeft size={24} color="#FFF" strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Return / Refund</Text>
          <View style={{ width: 40 }} /> 
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* INFO BOX */}
        <View style={styles.infoBox}>
           <AlertCircle size={20} color={BRAND_COLOR} />
           <Text style={styles.infoText}>Please select items and provide a valid reason to help us process your request faster.</Text>
        </View>

        <Text style={styles.sectionTitle}>Select Items to Return</Text>
        <View style={styles.sectionCard}>
          {order.items.map((item, index) => (
            <Pressable 
                key={item.id} 
                style={[styles.itemRow, index !== order.items.length - 1 && styles.borderBottom]}
                onPress={() => toggleItemSelection(item.id)}
            >
              <View style={styles.checkboxContainer}>
                {selectedItems[item.id] ? (
                  <CheckCircle2 size={24} color={BRAND_COLOR} fill={BRAND_COLOR + '20'} />
                ) : (
                  <View style={styles.unchecked} />
                )}
              </View>
              <Image source={{ uri: safeImageUri(item.image) }} style={styles.itemImage} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.itemPrice}>₱{(item.price ?? 0).toLocaleString()}</Text>
                
                {selectedItems[item.id] && (
                  <View style={styles.quantityContainer}>
                    <Text style={styles.qtyLabel}>Qty:</Text>
                    <Pressable style={styles.qtyBtn} onPress={(e) => { e.stopPropagation(); updateQuantity(item.id, -1); }}>
                      <Text style={styles.qtyBtnText}>-</Text>
                    </Pressable>
                    <Text style={styles.qtyText}>{quantities[item.id] || 1}</Text>
                    <Pressable style={styles.qtyBtn} onPress={(e) => { e.stopPropagation(); updateQuantity(item.id, 1); }}>
                      <Text style={styles.qtyBtnText}>+</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Why are you returning this?</Text>
        <View style={styles.sectionCard}>
          {reasons.map((r, i) => (
            <Pressable
              key={r.value}
              style={[
                styles.reasonOption, 
                i !== reasons.length - 1 && styles.borderBottom,
                reason === r.value && { backgroundColor: '#FFF5F0' }
              ]}
              onPress={() => setReason(r.value)}
            >
              <View>
                <Text style={[styles.reasonText, reason === r.value && { color: BRAND_COLOR, fontWeight: '700' }]}>{r.label}</Text>
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{r.sub}</Text>
              </View>
              <View style={styles.radioOuter}>
                {reason === r.value && <View style={styles.radioInner} />}
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Preferred Solution</Text>
        <View style={styles.sectionCard}>
          {[
             { id: 'return_refund', label: 'Return & Refund', sub: 'Return item(s) and get money back' }, 
             { id: 'replacement', label: 'Replacement', sub: 'Receive a new item as replacement' }, 
             { id: 'refund_only', label: 'Refund Only', sub: 'Keep item(s) and get money back' }
          ].map((type, index, arr) => (
            <Pressable
                key={type.id}
                style={[
                    styles.reasonOption, 
                    index !== arr.length - 1 && styles.borderBottom,
                    returnType === type.id && { backgroundColor: '#FFF5F0' }
                ]}
                onPress={() => setReturnType(type.id as ReturnType)}
            >
                <View>
                  <Text style={[styles.reasonText, returnType === type.id && { color: BRAND_COLOR, fontWeight: '700' }]}>{type.label}</Text>
                  <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{type.sub}</Text>
                </View>
                <View style={styles.radioOuter}>
                  {returnType === type.id && <View style={styles.radioInner} />}
                </View>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Additional Comments {reason === 'other' && <Text style={{color: '#EF4444'}}>*</Text>}</Text>
        <TextInput
          style={styles.textArea}
          placeholder={reason === 'other' ? "Please specify your reason here..." : "Please describe the defect or issue in detail..."}
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
          textAlignVertical="top"
        />

        <Text style={styles.sectionTitle}>Evidence (Photos/Videos)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
          <Pressable style={styles.uploadButton} onPress={pickImage}>
            <Upload size={24} color={BRAND_COLOR} />
            <Text style={[styles.uploadText, { color: BRAND_COLOR }]}>Add Photo</Text>
          </Pressable>
          {images.map((uri, index) => (
            <View key={index} style={styles.imagePreview}>
              <Image source={{ uri }} style={styles.uploadedImage} />
              <Pressable style={styles.removeImageBtn} onPress={() => removeImage(index)}>
                <X size={12} color="#FFF" />
              </Pressable>
            </View>
          ))}
        </ScrollView>

      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerInfo}>
             <Text style={styles.footerLabel}>Refund Amount:</Text>
             <Text style={[styles.footerAmount, { color: BRAND_COLOR }]}>
               {returnType === 'replacement' ? 'Replacement' : '₱' + Object.keys(selectedItems)
                .filter(id => selectedItems[id])
                .reduce((total, id) => {
                    const item = order.items.find(i => i.id === id);
                    return total + (item ? (item.price ?? 0) * quantities[id] : 0);
                }, 0).toLocaleString()}
             </Text>
        </View>
        <Pressable
          style={[styles.submitButton, { backgroundColor: BRAND_COLOR }, isSubmitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Request</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  
  // Header Style
  headerContainer: {
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 20,
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIconButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },

  scrollContent: { padding: 20, paddingBottom: 40 },

  infoBox: {
     flexDirection: 'row',
     padding: 12,
     backgroundColor: '#FFF5F0',
     borderRadius: 12,
     marginBottom: 10,
     gap: 10,
  },
  infoText: { flex: 1, fontSize: 13, color: '#4B5563', lineHeight: 20 },

  // Section Cards
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginTop: 15, marginBottom: 12, marginLeft: 5 },
  sectionCard: { backgroundColor: '#FFF', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
  
  itemRow: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  checkboxContainer: { marginRight: 12 },
  unchecked: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB' },
  itemImage: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#F3F4F6' },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  
  quantityContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#F9FAFB', alignSelf: 'flex-start', borderRadius: 8, padding: 4 },
  qtyLabel: { fontSize: 11, color: '#6B7280', marginRight: 6, paddingLeft: 4 },
  qtyBtn: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderRadius: 6, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2 },
  qtyBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  qtyText: { marginHorizontal: 8, fontSize: 13, fontWeight: '600' },

  reasonOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11, // Slightly unaligned in previous step if right aligned, but we are float right in row
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  reasonText: { fontSize: 14, color: '#374151', fontWeight: '500' },

  typeContainer: { flexDirection: 'row', gap: 10 },
  typeOption: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFF' },
  typeText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },

  textArea: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, height: 120, borderWidth: 1, borderColor: '#E5E7EB', fontSize: 14, textAlignVertical: 'top' },

  mediaScroll: { flexDirection: 'row', overflow: 'visible' },
  uploadButton: { width: 90, height: 90, borderRadius: 16, borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', marginRight: 12 },
  uploadText: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  imagePreview: { width: 90, height: 90, marginRight: 12 },
  uploadedImage: { width: '100%', height: '100%', borderRadius: 16 },
  removeImageBtn: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },

  footer: { padding: 20, backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, elevation: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  footerInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  footerLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  footerAmount: { fontSize: 18, fontWeight: '800' },
  submitButton: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: {width:0, height:4}, shadowRadius: 6 },
  disabledButton: { opacity: 0.7 },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
