import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, Paperclip, X, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { COLORS } from '../../src/constants/theme';
import { TicketService } from '../../services/TicketService';
import { useAuthStore } from '../../src/stores/authStore';
import type { TicketCategoryDb, TicketPriority } from '../types/ticketTypes';

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
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);

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
    if (!user?.id) {
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
      await TicketService.createTicket(user.id, {
        subject,
        description,
        priority: 'medium', // Default
        images,
      });
      Alert.alert('Success', 'Ticket created successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('HelpSupport', { activeTab: 'tickets' }) }
      ]);
    } catch (error) {
      console.error('Error creating ticket:', error);
      Alert.alert('Error', 'Failed to create ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredSellers = sellers.filter(s => 
    s.store_name.toLowerCase().includes(storeSearchQuery.toLowerCase()) ||
    (s.owner_name?.toLowerCase().includes(storeSearchQuery.toLowerCase()))
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={28} color="#1F2937" />
        </Pressable>
        <Text style={styles.headerTitle}>Create New Ticket</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Store Selection (Optional) */}
        <Text style={styles.label}>Report about a store (optional)</Text>
        <Pressable
          style={styles.pickerButton}
          onPress={() => setShowStorePicker(true)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Store size={20} color="#6B7280" style={{ marginRight: 8 }} />
            <Text style={[styles.pickerButtonText, !selectedSeller && { color: '#9CA3AF' }]}>
              {selectedSeller ? selectedSeller.store_name : 'Select a store (optional)'}
            </Text>
          </View>
          {selectedSeller ? (
            <Pressable onPress={() => setSelectedSeller(null)} hitSlop={8}>
              <X size={20} color="#9CA3AF" />
            </Pressable>
          ) : (
            <ChevronDown size={24} color="#6B7280" />
          )}
        </Pressable>

        {/* Category Selection */}
        <Text style={styles.label}>What can we help you with?</Text>
        {loadingCategories ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
        ) : (
          <>
            <Pressable
              style={styles.pickerButton}
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
      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
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

      {/* Store Picker Modal */}
      <Modal
        visible={showStorePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowStorePicker(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowStorePicker(false)}>
              <X size={24} color="#374151" />
            </Pressable>
            <Text style={styles.modalTitle}>Select Store</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <View style={styles.searchContainer}>
            <Search size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search stores..."
              placeholderTextColor="#9CA3AF"
              value={storeSearchQuery}
              onChangeText={setStoreSearchQuery}
            />
          </View>

          <FlatList
            data={filteredSellers}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              <Pressable
                style={[
                  styles.storeItem,
                  styles.generalOption,
                  !selectedSeller && styles.storeItemSelected
                ]}
                onPress={() => {
                  setSelectedSeller(null);
                  setShowStorePicker(false);
                  setStoreSearchQuery('');
                }}
              >
                <View style={[styles.storeIcon, { backgroundColor: '#F3F4F6' }]}>
                  <Store size={24} color="#9CA3AF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.storeName}>General Issue (No specific store)</Text>
                  <Text style={styles.storeOwner}>Submit a general support ticket</Text>
                </View>
              </Pressable>
            }
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.storeItem,
                  selectedSeller?.id === item.id && styles.storeItemSelected
                ]}
                onPress={() => {
                  setSelectedSeller(item);
                  setShowStorePicker(false);
                  setStoreSearchQuery('');
                }}
              >
                <View style={styles.storeIcon}>
                  <Store size={24} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.storeName}>{item.store_name}</Text>
                  {item.owner_name && (
                    <Text style={styles.storeOwner}>by {item.owner_name}</Text>
                  )}
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No stores found</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE5CC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#FFE5CC',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
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
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  pickerContainer: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pickerItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerItemSelected: {
    backgroundColor: '#FEF3E8',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#374151',
  },
  pickerItemTextSelected: {
    color: '#E65100', // Deep Orange
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#0F172A', // text-primary from global.css
  },
  inputFocused: {
    borderColor: COLORS.primary, // brand-primary from global.css
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 150,
  },
  attachButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
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
    backgroundColor: '#FFE5CC',
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  storeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  storeItemSelected: {
    backgroundColor: '#FEF3E8',
  },
  generalOption: {
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
  },
  storeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  storeOwner: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
});
