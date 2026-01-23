import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Plus, Edit2, Trash2, Home, Briefcase, MapPinned } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { COLORS } from '../src/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Addresses'>;

interface Address {
  id: string;
  type: 'home' | 'work' | 'other';
  name: string;
  phone: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  zipCode: string;
  isDefault: boolean;
}

export default function AddressesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [addresses, setAddresses] = useState<Address[]>([
    {
      id: '1',
      type: 'home',
      name: 'John Doe',
      phone: '+63 912 345 6789',
      street: '123 Main Street',
      barangay: 'Barangay San Antonio',
      city: 'Quezon City',
      province: 'Metro Manila',
      zipCode: '1105',
      isDefault: true,
    },
    {
      id: '2',
      type: 'work',
      name: 'John Doe',
      phone: '+63 912 345 6789',
      street: '456 Business Ave',
      barangay: 'Barangay Poblacion',
      city: 'Makati City',
      province: 'Metro Manila',
      zipCode: '1200',
      isDefault: false,
    },
  ]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const getAddressIcon = (type: string) => {
    switch (type) {
      case 'home':
        return Home;
      case 'work':
        return Briefcase;
      default:
        return MapPinned;
    }
  };

  const handleSetDefault = (id: string) => {
    setAddresses(prev =>
      prev.map(addr => ({
        ...addr,
        isDefault: addr.id === id,
      }))
    );
  };

  const handleDeleteConfirm = () => {
    if (selectedAddressId) {
      setAddresses(prev => prev.filter(addr => addr.id !== selectedAddressId));
      setShowDeleteModal(false);
      setSelectedAddressId(null);
    }
  };

  const handleDeleteClick = (id: string) => {
    setSelectedAddressId(id);
    setShowDeleteModal(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: COLORS.primary }]}>
        <View style={styles.headerTop}>
            <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
            <ArrowLeft size={24} color="#FFF" />
            </Pressable>
            <Text style={styles.headerTitle}>My Addresses</Text>
            <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Add New Address Button */}
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
          onPress={() => console.log('Add new address')}
        >
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add New Address</Text>
        </Pressable>
        
        {/* Addresses List */}
        {addresses.length === 0 ? (
          <View style={styles.emptyState}>
            <MapPin size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Addresses Yet</Text>
            <Text style={styles.emptyText}>
              Add your delivery addresses for faster checkout
            </Text>
          </View>
        ) : (
          addresses.map((address) => {
            const IconComponent = getAddressIcon(address.type);
            return (
              <View key={address.id} style={styles.addressCard}>
                <View style={styles.addressHeader}>
                  <View style={styles.addressTypeContainer}>
                    <View style={styles.iconContainer}>
                      <IconComponent size={18} color="#FF6A00" />
                    </View>
                    <Text style={styles.addressType}>
                      {address.type.charAt(0).toUpperCase() + address.type.slice(1)}
                    </Text>
                  </View>
                  {address.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultText}>Default</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.addressName}>{address.name}</Text>
                <Text style={styles.addressPhone}>{address.phone}</Text>
                <Text style={styles.addressDetails}>
                  {address.street}, {address.barangay}
                </Text>
                <Text style={styles.addressDetails}>
                  {address.city}, {address.province} {address.zipCode}
                </Text>

                <View style={styles.actionButtons}>
                  {!address.isDefault && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionButton,
                        pressed && styles.actionButtonPressed,
                      ]}
                      onPress={() => handleSetDefault(address.id)}
                    >
                      <Text style={styles.actionButtonText}>Set as Default</Text>
                    </Pressable>
                  )}
                  <Pressable
                    style={({ pressed }) => [
                      styles.actionButton,
                      pressed && styles.actionButtonPressed,
                    ]}
                    onPress={() => console.log('Edit address:', address.id)}
                  >
                    <Edit2 size={16} color="#FF6A00" />
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.deleteButton,
                      pressed && styles.deleteButtonPressed,
                    ]}
                    onPress={() => handleDeleteClick(address.id)}
                  >
                    <Trash2 size={16} color="#EF4444" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Address</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete this address? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalCancelButton,
                  pressed && styles.modalCancelButtonPressed,
                ]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalDeleteButton,
                  pressed && styles.modalDeleteButtonPressed,
                ]}
                onPress={handleDeleteConfirm}
              >
                <Text style={styles.modalDeleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
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
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF6A00',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  addButtonPressed: {
    backgroundColor: '#E55F00',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addressTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF3E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressType: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  defaultBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  defaultText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  addressName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  addressPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  addressDetails: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FEF3E8',
  },
  actionButtonPressed: {
    backgroundColor: '#FED9B3',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6A00',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  deleteButtonPressed: {
    backgroundColor: '#FEE2E2',
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelButtonPressed: {
    backgroundColor: '#E5E7EB',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  modalDeleteButtonPressed: {
    backgroundColor: '#DC2626',
  },
  modalDeleteText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
