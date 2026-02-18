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
import { X, Camera as CameraIcon, RotateCw, Plus, CheckCircle, ImageIcon, Tag } from 'lucide-react-native';
import { createClient } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';
import { visualSearchService } from '../services/visualSearchService';

// --- CONFIGURATION ---
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
const BRAND_COLOR = '#FF5722';

const { width, height } = Dimensions.get('window');

// Interface Definitions
interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  description: string;
  similarity?: number;
}

interface CameraSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onProductSelect?: (product: Product) => void;
}

export default function CameraSearchModal({ visible, onClose, onProductSelect }: CameraSearchModalProps) {
  const navigation = useNavigation<any>();
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();

  const [detectedInfo, setDetectedInfo] = useState<{ category?: string; detectedItem?: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Search State
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchStatus, setSearchStatus] = useState('Analyzing image...');

  // Request Form State
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible]);

  // --- CORE FUNCTION: Visual Search ---
  const performVisualSearch = async (base64Data: string) => {
    setSearching(true);
    setSearchStatus('Analyzing image...');
    setSearchResults([]); // Clear previous
    
    try {
      // The service now handles the Edge Function call, DB enrichment, 
      // and sorting internally.
      const result = await visualSearchService.searchByBase64(base64Data);

      if (!result.products || result.products.length === 0) {
        // No products found: Transition to Request Form view
        setSearchResults([]);
        setShowResults(true); 
      } else {
        // Map properties for UI (Fixing image loading from the enriched DB data)
        const mappedResults = result.products.map((p: any) => ({
          ...p,
          // Ensure we extract the correct primary image URL from the enriched data
          image: p.images?.find((img: any) => img.is_primary)?.image_url || p.images?.[0]?.image_url || '',
        }));
        
        setSearchResults(mappedResults);
        setDetectedInfo(result.info);
        setShowResults(true);
      }
    } catch (error) {
      console.error("Search failed:", error);
      // Empty results will trigger the 'No matches found' UI with the Request button
      setSearchResults([]);
      setShowResults(true);
    } finally {
      setSearching(false);
    }
  };

// 3. Update handleCapture and handleUpload to set the preview
const handleCapture = async () => {
  if (cameraRef.current) {
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
    if (photo.base64) {
      setPreviewImage(`data:image/jpeg;base64,${photo.base64}`);
      performVisualSearch(photo.base64);
    }
  }
};

const handleUploadImageToSearch = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.5,
    base64: true,
  });

  if (!result.canceled && result.assets[0].base64) {
    setPreviewImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    performVisualSearch(result.assets[0].base64);
  }
};

  const handleClose = () => {
    setSearching(false);
    setShowResults(false);
    setShowRequestForm(false);
    setProductName('');
    setProductDescription('');
    onClose();
  };

  const handleGrantPermission = async () => {
    const result = await requestPermission();
    if (!result.granted && !result.canAskAgain) {
      Linking.openSettings();
    }
  };

  const handleSubmitRequest = () => {
    setRequestSubmitted(true);
    setTimeout(() => {
      setRequestSubmitted(false);
      handleClose();
    }, 2500);
  };

  if (!visible) return null;

  if (!permission?.granted) {
    // ... (Permission View - same as before)
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Pressable onPress={handleGrantPermission} style={[styles.permissionButton, { backgroundColor: BRAND_COLOR }]}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </Pressable>
          <Pressable onPress={handleClose} style={styles.closeButton}><Text>Cancel</Text></Pressable>
        </View>
      </Modal>
    );
  }

  // Request & Success Views (Same as before, abbreviated for clarity)
  if (requestSubmitted) return <Modal visible={visible} transparent><View style={styles.successContainer}><Text style={styles.successTitle}>Request Submitted!</Text></View></Modal>;
  if (showRequestForm) return <Modal visible={visible} animationType="slide"><View style={styles.requestContainer}><Text>Request Form Here</Text><Pressable onPress={() => setShowRequestForm(false)}><Text>Close</Text></Pressable></View></Modal>;
  
  // Results View (Same as before, abbreviated)
  if (showResults) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.resultsContainer}>
             <View style={[styles.resultsHeader, { backgroundColor: BRAND_COLOR }]}>
            <Pressable onPress={() => setShowResults(false)}><X size={24} color="#FFF" /></Pressable>
            <Text style={styles.resultsTitle}>Search Results</Text>
            <View style={{ width: 24 }} />
          </View>
          {/* Insert this inside your Results View ScrollView */}
{detectedInfo && (detectedInfo.detectedItem || detectedInfo.category) && (
  <View style={styles.aiBanner}>
    <Tag size={16} color="#4A90E2" />
    <Text style={styles.aiBannerTitle}>AI Detected:</Text>
    {detectedInfo.detectedItem && (
      <View style={styles.aiChip}>
        <Text style={styles.aiChipText}>{detectedInfo.detectedItem}</Text>
      </View>
    )}
    {detectedInfo.category && (
      <Text style={styles.aiCategoryText}>Category: {detectedInfo.category}</Text>
    )}
  </View>
)}
          <ScrollView style={styles.resultsScroll}>
            <View style={[styles.detectedBadge, { borderColor: BRAND_COLOR }]}>
              <Text style={styles.detectedText}>{searchResults.length > 0 ? `Found ${searchResults.length} similar items` : "No matches found."}</Text>
            </View>
            {/* Inside Results Modal ScrollView */}
{searchResults.length === 0 ? (
  <View style={styles.noResultsContainer}>
    <View style={styles.emptyIconContainer}>
      <Plus size={48} color="#999" />
    </View>
    <Text style={styles.noResultsTitle}>No similar products found</Text>
    <Text style={styles.noResultsSub}>We couldn't find a match in our catalog. Would you like to request this item?</Text>
    
    <Pressable 
      style={[styles.requestActionBtn, { backgroundColor: BRAND_COLOR }]}
      onPress={() => { setShowResults(false); setShowRequestForm(true); }}
    >
      <Text style={styles.requestActionText}>Request This Product</Text>
    </Pressable>
  </View>
) : (
  <View style={styles.resultsGrid}>
              {searchResults.map((product) => (
                <Pressable
                  key={product.id}
                  style={styles.resultCard}
                  onPress={() => { onClose(); if (onProductSelect) onProductSelect(product); else navigation.navigate('ProductDetail', { product }); }}
                >
                  <Image source={{ uri: product.image }} style={styles.resultImage} />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName} numberOfLines={2}>{product.name}</Text>
                    <Text style={[styles.resultPrice, { color: BRAND_COLOR }]}>₱{product.price.toLocaleString()}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
)}
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // --- FIX 1: NEW CAMERA STRUCTURE ---
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* LAYER 1: The Camera (Background) */}
        {(searching && previewImage) ? (
          <Image source={{ uri: previewImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <CameraView 
            style={StyleSheet.absoluteFill} 
            facing={facing} 
            ref={cameraRef} 
          />
        )}

        {/* LAYER 2: The Overlays (Foreground) */}
        <View style={styles.uiContainer}>
          
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={handleClose}><X size={28} color="#FFFFFF" /></Pressable>
            <Text style={styles.headerTitle}>Visual Search</Text>
            <Pressable onPress={() => setFacing(current => current === 'back' ? 'front' : 'back')}>
              <RotateCw size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Center Guide */}
          <View style={styles.overlay}>
            {searching && (
              <View style={styles.analyzingOverlay}>
                  <ActivityIndicator size="large" color="#FFF" />
                  <Text style={styles.analyzingText}>{searchStatus}</Text>
              </View>
            )}
            {!searching && <View style={[styles.frame, { borderColor: BRAND_COLOR }]} />}
          </View>

          {/* Controls Footer */}
          <View style={[
            styles.controls, 
            searching && { backgroundColor: 'transparent', paddingVertical: 0 } // Remove background and padding when searching
          ]}>
            {searching ? (
              <View style={{ height: 80, alignItems: 'center', justifyContent: 'center' }}>
              </View>
            ) : (
              <View style={styles.uploadRow}>
                {/* ... Gallery, Capture, and Request buttons ... */}
                <Pressable onPress={handleUploadImageToSearch} style={[styles.galleryBtn, { backgroundColor: BRAND_COLOR }]}>
                  <ImageIcon size={22} color="#FFF" />
                  <Text style={styles.galleryBtnText}>Gallery</Text>
                </Pressable>

                <Pressable onPress={handleCapture} style={[styles.captureButton, { borderColor: BRAND_COLOR }]}>
                  <View style={[styles.captureButtonInner, { backgroundColor: BRAND_COLOR }]} />
                </Pressable>

                <Pressable onPress={() => setShowRequestForm(true)} style={[styles.galleryBtn, { backgroundColor: '#333' }]}>
                  <Plus size={22} color="#FFF" />
                  <Text style={styles.galleryBtnText}>Request</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  // IMPORTANT: uiContainer makes sure the buttons sit ON TOP of the camera
  uiContainer: { flex: 1, justifyContent: 'space-between' }, 
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  frame: { width: width * 0.7, height: width * 0.7, borderWidth: 3, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)' },
  guideText: { color: '#FFF', marginTop: 20, fontSize: 15, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  
  analyzingOverlay: {
    padding: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzingText: {
    color: '#FFF',
    marginTop: 15,
    fontSize: 16,
    fontWeight: '700',
  },

  // No Results / Request Product View
  noResultsContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  noResultsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 10,
    textAlign: 'center',
  },
  noResultsSub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  requestActionBtn: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 15,
    elevation: 3,
  },
  requestActionText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },

  controls: { paddingBottom: 50, backgroundColor: 'rgba(0,0,0,0.7)', paddingTop: 20, alignItems: 'center' },
  uploadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', width: '100%' },
  captureButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF', borderWidth: 4, justifyContent: 'center', alignItems: 'center' },
  captureButtonInner: { width: 60, height: 60, borderRadius: 30 },
  galleryBtn: { alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 16, width: 80 },
  galleryBtnText: { color: '#FFF', fontSize: 11, fontWeight: '700', marginTop: 4 },
  
  // ... Permission and Result styles (kept same as before) ...
  permissionContainer: { flex: 1, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', padding: 40 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  permissionTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937', marginBottom: 12, textAlign: 'center' },
  permissionButton: { width: '100%', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  permissionButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  closeButton: { marginTop: 20 },
  
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    margin: 15,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  aiBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E88E5',
  },
  aiChip: {
    backgroundColor: '#1E88E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  aiChipText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  aiCategoryText: {
    fontSize: 13,
    color: '#546E7A',
    fontStyle: 'italic',
  },

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
  scanAgainText: { fontSize: 16, fontWeight: '700' },
  
  successContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  successTitle: { fontSize: 22, fontWeight: '800', marginTop: 20, color: '#FFF' },
  requestContainer: { flex: 1, backgroundColor: '#FFF' },
});