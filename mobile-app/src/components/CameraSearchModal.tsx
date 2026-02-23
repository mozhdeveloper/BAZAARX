import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Linking,
  Image,
  TouchableOpacity,
  Animated,
  PanResponder
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { X, RotateCw, Plus, ImageIcon, Tag } from 'lucide-react-native';
import { createClient } from '@supabase/supabase-js';
import { visualSearchService } from '../services/visualSearchService';

// --- CONFIGURATION ---
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
const BRAND_COLOR = '#FF5722';

const { width, height } = Dimensions.get('window');

interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  description: string;
  similarity?: number;
  total_sold?: number;
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

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [detectedObjects, setDetectedObjects] = useState<any[]>([]);
  const [activeObjectIndex, setActiveObjectIndex] = useState<number | null>(null);
  const [imageDims, setImageDims] = useState({ width: 3, height: 4 });

  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchStatus, setSearchStatus] = useState('Analyzing image...');

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // --- ANIMATED BOTTOM SHEET LOGIC ---
  const MAX_SHEET_HEIGHT = height * 0.85; // 85% of screen when expanded
  const MIN_SHEET_HEIGHT = height * 0.45; // 45% of screen when collapsed
  const SNAP_TOP = 0;
  const SNAP_MID = MAX_SHEET_HEIGHT - MIN_SHEET_HEIGHT;

  const translateY = useRef(new Animated.Value(SNAP_MID)).current;
  const translateYRef = useRef(SNAP_MID);

  // Keep track of the current Y position
  useEffect(() => {
    const listener = translateY.addListener((v) => { translateYRef.current = v.value; });
    return () => translateY.removeListener(listener);
  }, [translateY]);

  // Reset sheet to the middle position when a new item is tapped on the photo
  useEffect(() => {
    if (activeObjectIndex !== null) {
      translateY.setOffset(0);
      Animated.spring(translateY, { toValue: SNAP_MID, useNativeDriver: false, bounciness: 0 }).start();
    }
  }, [activeObjectIndex, translateY]);

  // Handle the drag gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        translateY.setOffset(translateYRef.current);
        translateY.setValue(0);
      },
      onPanResponderMove: Animated.event([null, { dy: translateY }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gestureState) => {
        translateY.flattenOffset();

        let nextY = SNAP_MID;
        if (gestureState.vy < -0.5 || gestureState.dy < -50) {
          // Swiped up -> Expand fully
          nextY = SNAP_TOP;
        } else if (gestureState.vy > 0.5 || gestureState.dy > 50) {
          // Swiped down
          if (translateYRef.current > SNAP_MID + 30) {
            // Dragged past the middle -> Close the sheet entirely!
            setActiveObjectIndex(null);
            return;
          }
          // Collapse to middle
          nextY = SNAP_MID;
        } else {
          // Snap to nearest position if they let go halfway
          nextY = translateYRef.current < (SNAP_MID / 2) ? SNAP_TOP : SNAP_MID;
        }

        Animated.spring(translateY, { toValue: nextY, useNativeDriver: false, bounciness: 0 }).start();
      }
    })
  ).current;

  // Prevent dragging the sheet up past the top of the screen
  const clampedTranslateY = translateY.interpolate({
    inputRange: [0, SNAP_MID + 100],
    outputRange: [0, SNAP_MID + 100],
    extrapolateLeft: 'clamp',
  });
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible]);

  const performVisualSearch = async (base64Data: string) => {
    setSearching(true);
    try {
      const result = await visualSearchService.searchByBase64(base64Data);

      // FIX: Change 'result.objects' to 'result.detected_objects'
      setDetectedObjects(result.objects || []);

      setActiveObjectIndex(null);
      setShowResults(true);
    } catch (error) {
      console.error("Search failed:", error);
      setDetectedObjects([]);
      setShowResults(true);
    } finally {
      setSearching(false);
    }
  };

  const handleCapture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      if (photo.base64) {
        setImageDims({ width: photo.width, height: photo.height });
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
      const asset = result.assets[0];
      setImageDims({ width: asset.width, height: asset.height });
      setPreviewImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      performVisualSearch(result.assets[0].base64);
    }
  };

  const handleClose = () => {
    setSearching(false);
    setShowResults(false);
    setShowRequestForm(false);
    onClose();
  };

  const handleProductPress = (product: Product) => {
    handleClose();
    if (onProductSelect) {
      onProductSelect(product);
    } else {
      navigation.navigate('ProductDetail', { product });
    }
  };

  if (!visible) return null;

  if (!permission?.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Pressable onPress={requestPermission} style={[styles.permissionButton, { backgroundColor: BRAND_COLOR }]}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </Pressable>
          <Pressable onPress={handleClose} style={styles.closeButton}><Text>Cancel</Text></Pressable>
        </View>
      </Modal>
    );
  }

  // --- THE NEW INTERACTIVE RESULTS VIEW ---
  if (showResults) {
    // Safely handle when nothing is selected yet
    const activeObject = activeObjectIndex !== null ? detectedObjects[activeObjectIndex] : null;
    const hasMatches = activeObject && activeObject.matches && activeObject.matches.length > 0;

    return (
      <Modal visible={visible} animationType="fade">
        <View style={{ flex: 1, backgroundColor: '#000' }}>

          {/* LAYER 1: The Base Image */}
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          )}

          {/* LAYER 2: Controls & Interactive Overlays */}
          <View style={StyleSheet.absoluteFill}>
            <View style={{ position: 'absolute', top: 50, left: 20, zIndex: 50 }}>
              <Pressable onPress={() => setShowResults(false)} style={styles.lensCloseBtn}>
                <X size={24} color="#FFF" />
              </Pressable>
            </View>

            {/* Bounding Boxes Map */}
            {(() => {
              const sw = width;
              const sh = height;
              const iw = imageDims.width;
              const ih = imageDims.height;

              const scale = Math.max(sw / iw, sh / ih);
              const rw = iw * scale;
              const rh = ih * scale;
              const offsetX = (sw - rw) / 2;
              const offsetY = (sh - rh) / 2;

              // 1. Calculate Area and keep track of the original index
              const boxesWithArea = detectedObjects.map((obj, index) => {
                if (!obj.bbox || obj.bbox.length !== 4) return { obj, index, area: 0 };
                const [x1, y1, x2, y2] = obj.bbox;
                const area = (x2 - x1) * (y2 - y1);
                return { obj, index, area };
              });

              // 2. Sort so LARGEST boxes render FIRST (bottom), SMALLEST boxes render LAST (top)
              boxesWithArea.sort((a, b) => b.area - a.area);

              // 3. Render in the newly sorted order
              return boxesWithArea.map((item) => {
                const { obj, index } = item;
                if (!obj.bbox || obj.bbox.length !== 4) return null;
                const [x1, y1, x2, y2] = obj.bbox;

                const boxLeft = (x1 / 1000) * rw + offsetX;
                const boxTop = (y1 / 1000) * rh + offsetY;
                const boxWidth = ((x2 - x1) / 1000) * rw;
                const boxHeight = ((y2 - y1) / 1000) * rh;

                const isActive = activeObjectIndex === index;

                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.8}
                    onPress={() => setActiveObjectIndex(isActive ? null : index)}
                    style={[
                      styles.boundingBox,
                      {
                        left: boxLeft, top: boxTop, width: boxWidth, height: boxHeight,
                        borderColor: isActive ? BRAND_COLOR : 'rgba(255,255,255,0.8)',
                        backgroundColor: isActive ? 'rgba(255,87,34,0.2)' : 'transparent',
                        borderWidth: isActive ? 3 : 2,
                        zIndex: isActive ? 100 : 1, // Active box always pops to the very front
                      }
                    ]}
                  >
                    {isActive && (
                      <View style={styles.boxLabel}>
                        <Text style={styles.boxLabelText}>{obj.object_label}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              });
            })()}
          </View>

          {/* LAYER 3: The Animated Bottom Sheet */}
          {activeObjectIndex !== null ? (
            <Animated.View
              style={[
                styles.bottomSheet,
                {
                  height: MAX_SHEET_HEIGHT,
                  transform: [{ translateY: clampedTranslateY }],
                  zIndex: 1000
                }
              ]}
            >
              {/* DRAG HANDLE & HEADER (This is what the user grabs to slide the sheet) */}
              <View {...panResponder.panHandlers} style={styles.dragHeader}>
                <View style={styles.dragKnob} />
                {hasMatches && (
                  <Text style={styles.bottomSheetTitle}>
                    Similar {activeObject.object_label}s
                  </Text>
                )}
              </View>

              {/* SHEET CONTENT (Scrollable list of products) */}
              {hasMatches ? (
                <ScrollView style={{ flex: 1 }} bounces={false} showsVerticalScrollIndicator={false}>
                  <View style={styles.resultsGrid}>
                    {activeObject.matches.map((product: Product) => (
                      <Pressable
                        key={product.id}
                        style={styles.resultCard}
                        onPress={() => handleProductPress(product)}
                      >
                        <Image source={{ uri: product.image }} style={styles.resultImage} />
                        <View style={styles.resultInfo}>
                          <Text style={styles.resultName} numberOfLines={2}>{product.name}</Text>
                          <Text style={[styles.resultPrice, { color: BRAND_COLOR }]}>
                            ₱{(product.price || 0).toLocaleString()}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.noResultsContainer}>
                  <View style={styles.emptyIconContainer}>
                    <Plus size={40} color="#999" />
                  </View>
                  <Text style={styles.noResultsTitle}>No exact match</Text>
                  <Text style={styles.noResultsSub}>We couldn't find this {activeObject?.object_label || 'item'} in our catalog.</Text>
                  <Pressable
                    style={[styles.requestActionBtn, { backgroundColor: BRAND_COLOR }]}
                    onPress={() => { setShowResults(false); setShowRequestForm(true); }}
                  >
                    <Text style={styles.requestActionText}>Request This Product</Text>
                  </Pressable>
                </View>
              )}
            </Animated.View>
          ) : (
            /* LAYER 4: Instruction Pill */
            <View style={styles.instructionPill}>
              <Tag size={18} color="#FFF" />
              <Text style={styles.instructionText}>Tap a highlighted item</Text>
            </View>
          )}
        </View>
      </Modal>
    );
  }

  // --- STANDARD CAMERA VIEW ---
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        {(searching && previewImage) ? (
          <Image source={{ uri: previewImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <CameraView style={StyleSheet.absoluteFill} facing={facing} ref={cameraRef} />
        )}

        <View style={styles.uiContainer}>
          <View style={styles.header}>
            <Pressable onPress={handleClose}><X size={28} color="#FFFFFF" /></Pressable>
            <Text style={styles.headerTitle}>Visual Search</Text>
            <Pressable onPress={() => setFacing(current => current === 'back' ? 'front' : 'back')}>
              <RotateCw size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.overlay}>
            {searching && (
              <View style={styles.analyzingOverlay}>
                <ActivityIndicator size="large" color="#FFF" />
                <Text style={styles.analyzingText}>{searchStatus}</Text>
              </View>
            )}
            {!searching && <View style={[styles.frame, { borderColor: BRAND_COLOR }]} />}
          </View>

          <View style={[styles.controls, searching && { backgroundColor: 'transparent', paddingVertical: 0 }]}>
            {!searching && (
              <View style={styles.uploadRow}>
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
  uiContainer: { flex: 1, justifyContent: 'space-between' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },

  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  frame: { width: width * 0.7, height: width * 0.7, borderWidth: 3, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)' },

  analyzingOverlay: { padding: 30, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  analyzingText: { color: '#FFF', marginTop: 15, fontSize: 16, fontWeight: '700' },

  controls: { paddingBottom: 50, backgroundColor: 'rgba(0,0,0,0.7)', paddingTop: 20, alignItems: 'center' },
  uploadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', width: '100%' },
  captureButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF', borderWidth: 4, justifyContent: 'center', alignItems: 'center' },
  captureButtonInner: { width: 60, height: 60, borderRadius: 30 },
  galleryBtn: { alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 16, width: 80 },
  galleryBtnText: { color: '#FFF', fontSize: 11, fontWeight: '700', marginTop: 4 },

  permissionContainer: { flex: 1, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', padding: 40 },
  permissionTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937', marginBottom: 12, textAlign: 'center' },
  permissionButton: { width: '100%', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  permissionButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  closeButton: { marginTop: 20 },

  // --- NEW STYLES FOR INTERACTIVE OVERLAYS ---
  lensCloseBtn: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 20,
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 3,
    borderRadius: 12,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  boxLabel: {
    backgroundColor: BRAND_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    position: 'absolute',
    top: -30,
    elevation: 4,
  },
  boxLabelText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize'
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    // Removed "height" and "paddingTop" because they are dynamic now!
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  dragHeader: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 15,
    backgroundColor: 'transparent',
  },
  dragKnob: {
    width: 40,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    marginBottom: 10,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    textTransform: 'capitalize',
    alignSelf: 'flex-start',
    marginHorizontal: 20,
  },

  // Grid Styles
  resultsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, justifyContent: 'space-between', paddingBottom: 30 },
  resultCard: { width: (width - 45) / 2, backgroundColor: '#FFF', borderRadius: 18, marginBottom: 15, elevation: 4, overflow: 'hidden' },
  resultImage: { width: '100%', height: 150 },
  resultInfo: { padding: 12 },
  resultName: { fontSize: 14, fontWeight: '700' },
  resultPrice: { fontSize: 16, fontWeight: '900', marginTop: 4 },

  // Empty State Styles
  noResultsContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  noResultsTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 8, textAlign: 'center' },
  noResultsSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  requestActionBtn: { paddingHorizontal: 25, paddingVertical: 12, borderRadius: 12, elevation: 2 },
  requestActionText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  // Instruction Pill Styles
  instructionPill: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 1000,
  },
  instructionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});