import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { X, Camera as CameraIcon, RotateCw, Plus, CheckCircle, Upload, ImageIcon } from 'lucide-react-native';
import { mouseProducts } from '../data/products';
import type { Product } from '../types';

const { width, height } = Dimensions.get('window');

interface CameraSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onProductSelect?: (product: Product) => void;
}

export default function CameraSearchModal({ visible, onClose, onProductSelect }: CameraSearchModalProps) {
  const navigation = useNavigation<any>();
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const cameraRef = useRef<any>(null);

  const BRAND_COLOR = '#FF5722';

  // Request form state
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [category, setCategory] = useState('');
  const [productImage, setProductImage] = useState<string | null>(null);

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible]);

  const handleGrantPermission = async () => {
    const result = await requestPermission();
    if (!result.granted && !result.canAskAgain) {
      Alert.alert(
        'Permission Required',
        'Camera access is permanently denied. Please enable it in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
    }
  };

  const handleCapture = async () => {
    if (cameraRef.current) {
      setSearching(true);
      setTimeout(() => {
        setSearching(false);
        setSearchResults(mouseProducts);
        setShowResults(true);
      }, 2000);
    }
  };

  const handleUploadImageToSearch = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSearching(true);
        setTimeout(() => {
          setSearching(false);
          setSearchResults(mouseProducts);
          setShowResults(true);
        }, 2000);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSubmitRequest = () => {
    if (!productName.trim() || !productDescription.trim()) {
      Alert.alert('Required Fields', 'Please fill in the product name and description.');
      return;
    }
    setRequestSubmitted(true);
    setTimeout(() => {
      handleClose();
    }, 2500);
  };

  const handleClose = () => {
    setSearching(false);
    setShowResults(false);
    setShowRequestForm(false);
    setRequestSubmitted(false);
    setProductName('');
    setProductDescription('');
    setProductImage(null);
    onClose();
  };

  if (!visible) return null;

  if (!permission?.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.permissionContainer}>
          <View style={[styles.iconCircle, { backgroundColor: BRAND_COLOR + '15' }]}>
            <CameraIcon size={40} color={BRAND_COLOR} />
          </View>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionSubtitle}>We need camera access to help you search for products using photos.</Text>
          <Pressable onPress={handleGrantPermission} style={[styles.permissionButton, { backgroundColor: BRAND_COLOR }]}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </Pressable>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Maybe Later</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  // Request Submitted View
  if (requestSubmitted) {
    return (
      <Modal visible={visible} transparent>
        <View style={styles.successContainer}>
          <View style={styles.successContent}>
            <CheckCircle size={80} color="#10B981" />
            <Text style={styles.successTitle}>Request Submitted!</Text>
            <Text style={styles.successMessage}>We'll notify you once this product is available.</Text>
          </View>
        </View>
      </Modal>
    );
  }

  // Request Form View
  if (showRequestForm) {
    return (
      <Modal visible={visible} animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.requestContainer}>
          <View style={styles.requestHeader}>
            <Pressable onPress={() => setShowRequestForm(false)}><X size={24} color="#1F2937" /></Pressable>
            <Text style={styles.requestTitle}>Request Product</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.requestScroll}>
            <Text style={styles.requestSubtitle}>Can't find it? Tell us what you need and we'll source it for you.</Text>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Product Name *</Text>
              <TextInput style={styles.input} value={productName} onChangeText={setProductName} placeholder="What are you looking for?" />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput style={[styles.input, styles.textArea]} value={productDescription} onChangeText={setProductDescription} multiline placeholder="Color, brand, features..." />
            </View>
            <Pressable onPress={handleSubmitRequest} style={[styles.submitButton, { backgroundColor: BRAND_COLOR }]}>
              <Text style={styles.submitButtonText}>Submit Request</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  // Results View
  if (showResults && searchResults.length > 0) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.resultsContainer}>
          <View style={[styles.resultsHeader, { backgroundColor: BRAND_COLOR }]}>
            <Pressable onPress={() => setShowResults(false)}><X size={24} color="#FFF" /></Pressable>
            <Text style={styles.resultsTitle}>Search Results</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.resultsScroll}>
            <View style={[styles.detectedBadge, { borderColor: BRAND_COLOR }]}>
              <Text style={styles.detectedText}>🖱️ Detected: Computer Mouse</Text>
            </View>
            <View style={styles.resultsGrid}>
              {searchResults.map((product) => (
                <Pressable
                  key={product.id}
                  style={styles.resultCard}
                  onPress={() => {
                    if (onProductSelect) {
                      onProductSelect(product);
                    } else {
                      // Fallback if no callback provided
                      onClose(); // Close first
                      navigation.navigate('ProductDetail', { product });
                    }
                  }}
                >
                  <Image source={{ uri: product.image }} style={styles.resultImage} />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName} numberOfLines={2}>{product.name}</Text>
                    <Text style={[styles.resultPrice, { color: BRAND_COLOR }]}>₱{(product.price ?? 0).toLocaleString()}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setShowResults(false)} style={[styles.scanAgainButton, { borderColor: BRAND_COLOR }]}>
              <CameraIcon size={20} color={BRAND_COLOR} />
              <Text style={[styles.scanAgainText, { color: BRAND_COLOR }]}>Scan Another Product</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // Viewfinder View
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
          <View style={styles.header}>
            <Pressable onPress={handleClose}><X size={28} color="#FFFFFF" /></Pressable>
            <Text style={styles.headerTitle}>Visual Search</Text>
            <Pressable onPress={() => setFacing(current => current === 'back' ? 'front' : 'back')}><RotateCw size={24} color="#FFFFFF" /></Pressable>
          </View>
          <View style={styles.overlay}>
            <View style={[styles.frame, { borderColor: BRAND_COLOR }]} />
            <Text style={styles.guideText}>Point camera at a product</Text>
          </View>
          <View style={styles.controls}>
            {searching ? (
              <ActivityIndicator size="large" color={BRAND_COLOR} />
            ) : (
              <View style={styles.uploadRow}>
                <Pressable onPress={handleUploadImageToSearch} style={[styles.galleryBtn, { backgroundColor: BRAND_COLOR }]}>
                  <ImageIcon size={22} color="#FFF" /><Text style={styles.galleryBtnText}>Gallery</Text>
                </Pressable>
                <Pressable onPress={handleCapture} style={[styles.captureButton, { borderColor: BRAND_COLOR }]}>
                  <View style={[styles.captureButtonInner, { backgroundColor: BRAND_COLOR }]} />
                </Pressable>
                <Pressable onPress={() => setShowRequestForm(true)} style={[styles.galleryBtn, { backgroundColor: '#333' }]}>
                  <Plus size={22} color="#FFF" /><Text style={styles.galleryBtnText}>Request</Text>
                </Pressable>
              </View>
            )}
          </View>
        </CameraView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  frame: { width: width * 0.7, height: width * 0.7, borderWidth: 3, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)' },
  guideText: { color: '#FFF', marginTop: 20, fontSize: 15, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  controls: { paddingBottom: 50, backgroundColor: 'rgba(0,0,0,0.7)', paddingTop: 20, alignItems: 'center' },
  uploadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', width: '100%' },
  captureButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF', borderWidth: 4, justifyContent: 'center', alignItems: 'center' },
  captureButtonInner: { width: 60, height: 60, borderRadius: 30 },
  galleryBtn: { alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 16, width: 80 },
  galleryBtnText: { color: '#FFF', fontSize: 11, fontWeight: '700', marginTop: 4 },
  permissionContainer: { flex: 1, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', padding: 40 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  permissionTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937', marginBottom: 12, textAlign: 'center' },
  permissionSubtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  permissionButton: { width: '100%', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  permissionButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  closeButton: { marginTop: 20 },
  closeButtonText: { color: '#9CA3AF', fontWeight: '600' },
  requestContainer: { flex: 1, backgroundColor: '#FFF' },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  requestTitle: { fontSize: 18, fontWeight: '800' },
  requestScroll: { padding: 20 },
  requestSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 12, padding: 15 },
  textArea: { height: 100, textAlignVertical: 'top' },
  submitButton: { padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  submitButtonText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  successContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  successContent: { backgroundColor: '#FFF', padding: 40, borderRadius: 30, alignItems: 'center' },
  successTitle: { fontSize: 22, fontWeight: '800', marginTop: 20 },
  successMessage: { color: '#666', textAlign: 'center', marginTop: 10 },
  resultsContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  resultsHeader: { padding: 20, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultsTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  resultsScroll: { flex: 1 },
  detectedBadge: { margin: 20, padding: 15, borderRadius: 15, backgroundColor: '#FFF', borderWidth: 1, alignItems: 'center' },
  detectedText: { fontWeight: '800', fontSize: 16 },
  resultsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, justifyContent: 'space-between' },
  resultCard: { width: (width - 45) / 2, backgroundColor: '#FFF', borderRadius: 18, marginBottom: 15, elevation: 4, overflow: 'hidden' },
  resultImage: { width: '100%', height: 150 },
  resultInfo: { padding: 12 },
  resultName: { fontSize: 14, fontWeight: '700' },
  resultPrice: { fontSize: 16, fontWeight: '900' },
  scanAgainButton: { margin: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 15, borderWidth: 2, gap: 10 },
  scanAgainText: { fontSize: 16, fontWeight: '700' }
});