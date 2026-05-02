import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { Camera, Upload, X, CheckCircle } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants/theme';
import { orderMutationService } from '../services/orders/orderMutationService';

interface ConfirmReceivedModalProps {
  visible: boolean;
  onClose: () => void;
  orderId: string;
  transactionId: string;
  buyerId: string;
  onSuccess: (photoUrls: string[]) => void;
}

export default function ConfirmReceivedModal({
  visible,
  onClose,
  orderId,
  transactionId,
  buyerId,
  onSuccess,
}: ConfirmReceivedModalProps) {
  const [images, setImages] = useState<{ uri: string; base64: string | null | undefined }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);

  const handlePickImage = async (source: 'camera' | 'library') => {
    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera access is needed to take proof of delivery.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Media library access is needed to upload proof.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          selectionLimit: 5 - images.length,
          quality: 0.8,
          base64: true,
        });
      }

      if (!result.canceled) {
        // Store both URI for display and base64 for upload
        const newImages = result.assets.map(asset => ({
          uri: asset.uri,
          base64: asset.base64
        }));
        setImages(prev => [...prev, ...newImages].slice(0, 5));
        setShowValidationError(false);
      }
    } catch (error) {
      console.error('Image picking error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadPromises = images.map(async (img) => {
      const fileName = `${buyerId}/${orderId}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      
      let fileData;
      try {
        if (img.base64) {
          fileData = decode(img.base64);
        } else {
          // Fallback to FileSystem if base64 is missing for some reason
          const base64 = await FileSystem.readAsStringAsync(img.uri, {
            encoding: 'base64',
          });
          fileData = decode(base64);
        }
      } catch (err) {
        console.error('File read error:', err);
        throw new Error('Failed to process image file');
      }

      const { data, error } = await supabase.storage
        .from('review-images')
        .upload(fileName, fileData, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        console.error('Supabase storage upload error:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('review-images')
        .getPublicUrl(fileName);

      return publicUrl;
    });

    return Promise.all(uploadPromises);
  };

  const handleSubmit = async () => {
    if (images.length === 0) {
      setShowValidationError(true);
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload images to storage
      const photoUrls = await uploadImages();

      // 2. Update order status in DB
      const success = await orderMutationService.confirmOrderReceived(orderId, buyerId, photoUrls);

      if (success) {
        onSuccess(photoUrls);
        setImages([]);
        onClose();
      } else {
        throw new Error('Failed to update order status');
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      Alert.alert('Upload Failed', error.message || 'There was a problem confirming your receipt. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.content}>
            <Text style={styles.title}>Confirm Order Received</Text>
            
            <View style={styles.orderInfo}>
              <Text style={styles.orderQuestion}>
                Have you received your order <Text style={styles.orderIdHighlight}>{transactionId}</Text>?
              </Text>
              <Text style={styles.orderInstruction}>
                This will confirm that the package was delivered to you.
              </Text>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Photo Proof <Text style={styles.requiredStar}>*</Text></Text>
              <Text style={styles.sectionSubtitle}>
                Take a photo or upload an image of the received package as proof of delivery.
              </Text>
            </View>

            <View style={styles.pickerRow}>
              <Pressable
                style={styles.pickerBox}
                onPress={() => handlePickImage('camera')}
                disabled={isUploading}
              >
                <View style={styles.pickerContent}>
                  <Camera size={20} color={COLORS.gray400} />
                  <Text style={styles.pickerText}>Take Photo</Text>
                </View>
              </Pressable>
              <Pressable
                style={styles.pickerBox}
                onPress={() => handlePickImage('library')}
                disabled={isUploading}
              >
                <View style={styles.pickerContent}>
                  <Upload size={20} color={COLORS.gray400} />
                  <Text style={styles.pickerText}>Upload</Text>
                </View>
              </Pressable>
            </View>

            {showValidationError && (
              <Text style={styles.validationText}>At least one photo is required</Text>
            )}

            {images.length > 0 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.previewScroll}
                contentContainerStyle={styles.previewContainer}
              >
                {images.map((img, index) => (
                  <View key={index} style={styles.imageWrapper}>
                    <Image source={{ uri: img.uri }} style={styles.image} />
                    <Pressable
                      style={styles.removeImage}
                      onPress={() => handleRemoveImage(index)}
                      disabled={isUploading}
                    >
                      <X size={12} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}

            <Text style={styles.noticeText}>
              Only confirm if you have actually received the items.
            </Text>
          </View>

          <View style={styles.footer}>
            <Pressable
              style={[styles.footerButton, styles.cancelButton]}
              onPress={onClose}
              disabled={isUploading}
            >
              <Text style={styles.cancelButtonText}>Not Yet</Text>
            </Pressable>
            <Pressable
              style={[
                styles.footerButton,
                styles.confirmButton,
                (images.length === 0 || isUploading) && styles.disabledButton,
              ]}
              onPress={handleSubmit}
              disabled={isUploading || images.length === 0}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Yes, I Received It</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  orderInfo: {
    marginBottom: 24,
    alignItems: 'center',
  },
  orderQuestion: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 24,
  },
  orderIdHighlight: {
    fontWeight: '800',
    color: '#111827',
  },
  orderInstruction: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 4,
  },
  sectionHeader: {
    width: '100%',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  requiredStar: {
    color: '#EF4444',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  pickerRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 8,
  },
  pickerBox: {
    flex: 1,
    height: 60,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  validationText: {
    color: '#EF4444',
    fontSize: 12,
    fontStyle: 'italic',
    width: '100%',
    marginTop: 4,
    marginBottom: 12,
  },
  previewScroll: {
    width: '100%',
    marginBottom: 16,
  },
  previewContainer: {
    gap: 8,
    paddingVertical: 4,
  },
  imageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeImage: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noticeText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '700',
    fontSize: 15,
  },
  confirmButton: {
    backgroundColor: '#16A34A', // Vibrant green that 'lights up' when enabled
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.6,
  },
});

