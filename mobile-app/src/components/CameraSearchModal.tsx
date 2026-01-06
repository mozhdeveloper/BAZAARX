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
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { X, Camera as CameraIcon, RotateCw, Plus, CheckCircle, Upload, ImageIcon } from 'lucide-react-native';
import { mouseProducts } from '../data/products';
import { ProductCard } from './ProductCard';
import type { Product } from '../types';

const { width, height } = Dimensions.get('window');

interface CameraSearchModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CameraSearchModal({ visible, onClose }: CameraSearchModalProps) {
  const navigation = useNavigation<any>();
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const cameraRef = useRef<any>(null);
  
  // Request form state
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [category, setCategory] = useState('');
  const [productImage, setProductImage] = useState<string | null>(null);

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible]);

  const handleCapture = async () => {
    if (cameraRef.current) {
      setSearching(true);
      
      // Simulation Logic - Detect "Mouse" and show results
      setTimeout(() => {
        setSearching(false);
        setSearchResults(mouseProducts);
        setShowResults(true);
      }, 2000);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const handleClose = () => {
    setSearching(false);
    setShowResults(false);
    setSearchResults([]);
    setShowRequestForm(false);
    setRequestSubmitted(false);
    setProductName('');
    setProductDescription('');
    setEstimatedPrice('');
    setCategory('');
    setProductImage(null);
    onClose();
  };

  const handleBackToCamera = () => {
    setShowResults(false);
    setSearchResults([]);
  };

  const handleRequestProduct = () => {
    setShowRequestForm(true);
  };

  const handleImagePicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProductImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
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
        // Simulate image search
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
    if (!productName.trim()) {
      Alert.alert('Required Field', 'Please enter a product name');
      return;
    }
    if (!productDescription.trim()) {
      Alert.alert('Required Field', 'Please provide a product description');
      return;
    }

    // Simulate submission
    setRequestSubmitted(true);
    
    // Reset form after 3 seconds and close
    setTimeout(() => {
      handleClose();
    }, 3000);
  };

  if (!visible) return null;

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera permission required</Text>
          <Pressable onPress={requestPermission} style={styles.permissionButton}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </Pressable>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  // Results Modal
  if (showResults && searchResults.length > 0) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <View style={styles.resultsContainer}>
          {/* Header */}
          <View style={styles.resultsHeader}>
            <Pressable onPress={handleBackToCamera} style={styles.backButton}>
              <X size={24} color="#FFFFFF" />
            </Pressable>
            <View style={styles.resultsHeaderCenter}>
              <Text style={styles.resultsTitle}>Search Results</Text>
              <Text style={styles.resultsSubtitle}>Found {searchResults.length} mouse products</Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Results Grid */}
          <ScrollView style={styles.resultsScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.detectedBadge}>
              <Text style={styles.detectedText}>🖱️ Detected: Computer Mouse</Text>
            </View>

            <View style={styles.resultsGrid}>
              {searchResults.map((product) => (
                <View key={product.id} style={styles.resultCard}>
                  <Pressable
                    onPress={() => {
                      handleClose();
                      navigation.navigate('ProductDetail', { product: product });
                    }}
                  >
                    <Image
                      source={{ uri: product.image }}
                      style={styles.resultImage}
                      resizeMode="cover"
                    />
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName} numberOfLines={2}>
                        {product.name}
                      </Text>
                      <Text style={styles.resultPrice}>₱{product.price.toLocaleString()}</Text>
                      {product.originalPrice && (
                        <Text style={styles.resultOriginalPrice}>
                          ₱{product.originalPrice.toLocaleString()}
                        </Text>
                      )}
                      <View style={styles.resultMeta}>
                        <Text style={styles.resultRating}>⭐ {product.rating}</Text>
                        <Text style={styles.resultSold}>{product.sold} sold</Text>
                      </View>
                    </View>
                  </Pressable>
                </View>
              ))}
            </View>

            <Pressable onPress={handleBackToCamera} style={styles.scanAgainButton}>
              <CameraIcon size={20} color="#FF5722" />
              <Text style={styles.scanAgainText}>Scan Another Product</Text>
            </Pressable>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    );
  }

  if (requestSubmitted) {
    return (
      <Modal visible={visible} animationType="fade" onRequestClose={handleClose}>
        <View style={styles.successContainer}>
          <View style={styles.successContent}>
            <View style={styles.successIconContainer}>
              <CheckCircle size={80} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Request Submitted!</Text>
            <Text style={styles.successMessage}>
              Your product request has been submitted and is now under review. We'll notify you once it's available.
            </Text>
            <View style={styles.successBadge}>
              <Text style={styles.successBadgeText}>Under Review</Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  if (showRequestForm) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.requestContainer}
        >
          <View style={styles.requestHeader}>
            <Pressable onPress={() => setShowRequestForm(false)} style={styles.backButton}>
              <X size={24} color="#1F2937" />
            </Pressable>
            <Text style={styles.requestTitle}>Request Product</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView style={styles.requestScroll}>
            <Text style={styles.requestSubtitle}>
              Can't find what you're looking for? Tell us what product you need and we'll try to add it to our catalog.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Product Name *</Text>
              <TextInput
                style={styles.input}
                value={productName}
                onChangeText={setProductName}
                placeholder="e.g., Wireless Bluetooth Speaker"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={productDescription}
                onChangeText={setProductDescription}
                placeholder="Describe the product you're looking for..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Category (Optional)</Text>
              <TextInput
                style={styles.input}
                value={category}
                onChangeText={setCategory}
                placeholder="e.g., Electronics, Fashion, Home"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Expected Price Range (Optional)</Text>
              <TextInput
                style={styles.input}
                value={estimatedPrice}
                onChangeText={setEstimatedPrice}
                placeholder="e.g., ₱500 - ₱1,000"
                placeholderTextColor="#9CA3AF"
                keyboardType="default"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Product Image (Optional)</Text>
              {productImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: productImage }} style={styles.imagePreview} />
                  <Pressable
                    onPress={() => setProductImage(null)}
                    style={styles.removeImageButton}
                  >
                    <X size={20} color="#FFFFFF" />
                  </Pressable>
                  <Pressable onPress={handleImagePicker} style={styles.changeImageButton}>
                    <Upload size={16} color="#FF6A00" />
                    <Text style={styles.changeImageText}>Change Image</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={handleImagePicker} style={styles.uploadButton}>
                  <ImageIcon size={24} color="#6B7280" />
                  <Text style={styles.uploadButtonText}>Upload Image</Text>
                  <Text style={styles.uploadButtonSubtext}>
                    Help us find your product faster
                  </Text>
                </Pressable>
              )}
            </View>

            <Pressable onPress={handleSubmitRequest} style={styles.submitButton}>
              <Text style={styles.submitButtonText}>Submit Request</Text>
            </Pressable>

            <Text style={styles.reviewNote}>
              Your request will be reviewed by our team within 24-48 hours.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={handleClose} style={styles.headerButton}>
              <X size={28} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.headerTitle}>Visual Search</Text>
            <Pressable onPress={toggleCameraFacing} style={styles.headerButton}>
              <RotateCw size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Overlay guide */}
          <View style={styles.overlay}>
            <View style={styles.frameContainer}>
              <View style={styles.frame} />
              <Text style={styles.guideText}>
                Point camera at a product
              </Text>
            </View>
          </View>

          {/* Upload from Gallery Button */}
          <View style={styles.uploadGalleryButtonContainer}>
            <Pressable onPress={handleUploadImageToSearch} style={styles.uploadGalleryButton}>
              <ImageIcon size={24} color="#FFFFFF" />
              <Text style={styles.uploadGalleryText}>Upload Image</Text>
            </Pressable>
          </View>

          {/* Bottom controls */}
          <View style={styles.controls}>
            {searching ? (
              <View style={styles.searchingContainer}>
                <ActivityIndicator size="large" color="#FF6A00" />
                <Text style={styles.searchingText}>Scanning...</Text>
              </View>
            ) : (
              <>
                <View style={styles.controlsHeader}>
                  <View style={styles.divider} />
                  <Text style={styles.controlsText}>
                    Capture Photo
                  </Text>
                  <View style={styles.divider} />
                </View>
                <Pressable onPress={handleCapture} style={styles.captureButton}>
                  <View style={styles.captureButtonInner} />
                </Pressable>
                
                <Pressable onPress={handleRequestProduct} style={styles.requestButtonCamera}>
                  <Plus size={20} color="#FF6A00" />
                  <Text style={styles.requestButtonCameraText}>Request Product</Text>
                </Pressable>
              </>
            )}
          </View>
        </CameraView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameContainer: {
    alignItems: 'center',
  },
  frame: {
    width: width * 0.7,
    height: width * 0.7,
    borderWidth: 3,
    borderColor: '#FF6A00',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 106, 0, 0.1)',
  },
  guideText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  uploadGalleryButtonContainer: {
    position: 'absolute',
    bottom: 220,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: 30,
  },
  uploadGalleryButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6A00',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minWidth: 200,
    shadowColor: '#FF6A00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  uploadGalleryText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  controls: {
    paddingBottom: 45,
    paddingTop: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
  },
  controlsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 30,
    width: '100%',
  },
  divider: {
    flex: 1,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  controlsText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginHorizontal: 15,
    letterSpacing: 0.5,
  },
  captureButton: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#FF6A00',
    marginVertical: 5,
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FF6A00',
  },
  searchingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  searchingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 10,
    fontWeight: '500',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#FF6A00',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 10,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: 10,
  },
  closeButtonText: {
    color: '#6B7280',
    fontSize: 16,
  },
  requestProductButton: {
    flexDirection: 'row',
    backgroundColor: '#FFF5ED',
    paddingVertical: 14,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#FF6A00',
  },
  requestProductText: {
    color: '#FF6A00',
    fontSize: 16,
    fontWeight: '600',
  },
  searchAgainButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6A00',
    paddingVertical: 14,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  searchAgainText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  requestButtonCamera: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    marginTop: 18,
    alignItems: 'center',
    gap: 10,
    borderWidth: 2.5,
    borderColor: '#FF6A00',
  },
  requestButtonCameraText: {
    color: '#FF6A00',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  requestContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  requestTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestScroll: {
    flex: 1,
  },
  requestSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    padding: 20,
    paddingBottom: 20,
    lineHeight: 20,
  },
  formGroup: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 40,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
  },
  uploadButtonSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeImageButton: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#FF6A00',
  },
  changeImageText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6A00',
  },
  submitButton: {
    backgroundColor: '#FF6A00',
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  reviewNote: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    lineHeight: 18,
  },
  successContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  successBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  successBadgeText: {
    color: '#D97706',
    fontSize: 14,
    fontWeight: '600',
  },
  // Results Modal Styles
  resultsContainer: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  resultsHeader: {
    backgroundColor: '#FF5722',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  resultsHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  resultsSubtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  resultsScroll: {
    flex: 1,
  },
  detectedBadge: {
    backgroundColor: '#FFF5F0',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF5722',
  },
  detectedText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  resultCard: {
    width: (width - 48) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  resultImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F3F4F6',
  },
  resultInfo: {
    padding: 12,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
    lineHeight: 18,
  },
  resultPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FF5722',
    marginBottom: 2,
  },
  resultOriginalPrice: {
    fontSize: 13,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginBottom: 6,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultRating: {
    fontSize: 12,
    color: '#6B7280',
  },
  resultSold: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  scanAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#FF5722',
  },
  scanAgainText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF5722',
  },
});
