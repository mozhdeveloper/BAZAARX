import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronDown, Paperclip, X, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { COLORS } from '../../src/constants/theme';
import { TicketService } from '../../services/TicketService';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase } from '../../src/lib/supabase';
import type { TicketCategoryDb, TicketPriority } from '../types/ticketTypes';
import { TicketSuccessModal } from '../../src/components/TicketSuccessModal';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateTicket'>;

interface SellerOption {
  id: string;
  store_name: string;
  owner_name: string | null;
}

export default function CreateTicketScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { initialSubject, initialDescription, sellerId: initialSellerId } = (route.params as any) || {};
  const { user } = useAuthStore();

  const [subject, setSubject] = useState(initialSubject || '');
  const [description, setDescription] = useState(initialDescription || '');
  const [categories, setCategories] = useState<TicketCategoryDb[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<TicketCategoryDb | null>(null);
  const [showcategoryPicker, setShowCategoryPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  React.useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const cats = await TicketService.getCategories();
      setCategories(cats);
      if (cats.length > 0) {
        setSelectedCategory(cats[0]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const selectedUris = result.assets.map(asset => asset.uri);
      setImages([...images, ...selectedUris]);
    }
  };

  const removeImage = (uri: string) => {
    setImages(images.filter((img: string) => img !== uri));
  };

  const handleSubmit = async () => {
    // Get user ID from store or Supabase session
    let userId = user?.id;

    if (!userId) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id;
      } catch (error) {
        console.error('Error getting session:', error);
      }
    }

    if (!userId) {
      Alert.alert('Error', 'You must be logged in to create a ticket.');
      return;
    }

    if (!subject.trim()) {
      Alert.alert('Missing Information', 'Please enter a subject.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing Information', 'Please describe your issue.');
      return;
    }

    setLoading(true);
    try {
      await TicketService.createTicket(userId, {
        categoryId: selectedCategory?.id || null,
        subject,
        description,
        priority: 'normal', // Default
        images,
      });
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error creating ticket:', error);
      Alert.alert('Error', 'Failed to create ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    navigation.navigate('HelpSupport', { activeTab: 'tickets' });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 5 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={28} color={COLORS.textHeadline} strokeWidth={2.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Create New Ticket</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Category Selection */}
        <Text style={styles.label}>What can we help you with?</Text>
        {loadingCategories ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
        ) : (
          <>
            <Pressable
              style={[
                styles.pickerButton,
                showcategoryPicker && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 }
              ]}
              onPress={() => setShowCategoryPicker(!showcategoryPicker)}
            >
              <Text style={styles.pickerButtonText}>{selectedCategory?.name || 'Select category'}</Text>
              <ChevronDown size={24} color="#6B7280" />
            </Pressable>

            {showcategoryPicker && (
              <View style={styles.pickerContainer}>
                {categories.map((cat) => (
                  <Pressable
                    key={cat.id}
                    style={[styles.pickerItem, selectedCategory?.id === cat.id && styles.pickerItemSelected]}
                    onPress={() => {
                      setSelectedCategory(cat);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, selectedCategory?.id === cat.id && styles.pickerItemTextSelected]}>
                      {cat.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}

        {/* Subject */}
        <Text style={styles.label}>Subject</Text>
        <TextInput
          style={[
            styles.input,
            focusedField === 'subject' && styles.inputFocused
          ]}
          placeholder="Brief summary of issue"
          placeholderTextColor="#9CA3AF"
          value={subject}
          onChangeText={setSubject}
          maxLength={50}
          onFocus={() => setFocusedField('subject')}
          onBlur={() => setFocusedField(null)}
        />

        {/* Description */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            focusedField === 'description' && styles.inputFocused
          ]}
          placeholder="Please describe your issue in detail..."
          placeholderTextColor="#9CA3AF"
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          onFocus={() => setFocusedField('description')}
          onBlur={() => setFocusedField(null)}
        />

        {/* Attachments */}
        <Text style={styles.label}>Attachments</Text>

        {images.length > 0 && (
          <View style={styles.imagePreviewList}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {images.map((uri: string, index: number) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.previewImage} />
                  <Pressable
                    style={styles.removeImageButton}
                    onPress={() => removeImage(uri)}
                  >
                    <X size={16} color="#FFF" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <Pressable style={styles.attachButton} onPress={pickImage}>
          <Paperclip size={20} color="#6B7280" />
          <Text style={styles.attachButtonText}>
            {images.length === 0 ? 'Attach Photo or Screenshot' : 'Add More Photos'}
          </Text>
        </Pressable>

      </ScrollView>

      {/* Footer / Submit Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20, backgroundColor: COLORS.background }]}>
        <Pressable
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Ticket</Text>
          )}
        </Pressable>
      </View>

      <TicketSuccessModal
        visible={showSuccessModal}
        onClose={handleModalClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 4,
    backgroundColor: COLORS.background,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textHeadline,
  },
  content: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 8,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  pickerContainer: {
    marginTop: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 12,
  },
  pickerItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerItemSelected: {
    backgroundColor: 'transparent',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#374151',
  },
  pickerItemTextSelected: {
    color: '#F59E0B', // Brand Accent color
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#0F172A', // text-primary from global.css
    marginBottom: 12,
  },
  inputFocused: {
    borderColor: COLORS.primary, // brand-primary from global.css
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 150,
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  attachButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  imagePreviewList: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  imageWrapper: {
    marginRight: 12,
    position: 'relative',
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: COLORS.background,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  // Priority styles
  priorityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  priorityButtonSelected: {
    backgroundColor: '#FEF3E8',
    borderColor: COLORS.primary,
  },
  priorityButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  priorityButtonTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
