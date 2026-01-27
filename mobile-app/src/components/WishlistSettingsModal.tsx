import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MapPin, Lock, Globe, Users } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { useWishlistStore } from '../stores/wishlistStore';
import { useAuthStore } from '../stores/authStore';

// Mock addresses - in real app would come from addressStore or user profile
const MOCK_ADDRESSES = [
    { id: 'addr_1', label: 'Home', text: '123 Acacia Ave, Makati City' },
    { id: 'addr_2', label: 'Office', text: 'Unit 404, Tech Tower, BGC' },
];

interface Props {
    visible: boolean;
    onClose: () => void;
}

export default function WishlistSettingsModal({ visible, onClose }: Props) {
    const insets = useSafeAreaInsets();
    const { settings, updateSettings } = useWishlistStore();
    
    const [privacy, setPrivacy] = useState(settings.privacy);
    const [addressId, setAddressId] = useState(settings.shippingAddressId);
    const [defaultPriority, setDefaultPriority] = useState(settings.defaultPriority);

    const handleSave = () => {
        updateSettings({
            privacy,
            shippingAddressId: addressId,
            defaultPriority
        });
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Wishlist Settings</Text>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#374151" />
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Privacy Settings */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Privacy</Text>
                            <Pressable 
                                style={[styles.option, privacy === 'public' && styles.selectedOption]}
                                onPress={() => setPrivacy('public')}
                            >
                                <Globe size={20} color={privacy === 'public' ? COLORS.primary : '#6B7280'} />
                                <View style={styles.optionTextContainer}>
                                    <Text style={[styles.optionTitle, privacy === 'public' && styles.selectedText]}>Public</Text>
                                    <Text style={styles.optionDesc}>Anyone can search for and view this list.</Text>
                                </View>
                            </Pressable>
                            
                            <Pressable 
                                style={[styles.option, privacy === 'shared' && styles.selectedOption]}
                                onPress={() => setPrivacy('shared')}
                            >
                                <Users size={20} color={privacy === 'shared' ? COLORS.primary : '#6B7280'} />
                                <View style={styles.optionTextContainer}>
                                    <Text style={[styles.optionTitle, privacy === 'shared' && styles.selectedText]}>Shared (Link Only)</Text>
                                    <Text style={styles.optionDesc}>Only people with the link can view.</Text>
                                </View>
                            </Pressable>

                            <Pressable 
                                style={[styles.option, privacy === 'private' && styles.selectedOption]}
                                onPress={() => setPrivacy('private')}
                            >
                                <Lock size={20} color={privacy === 'private' ? COLORS.primary : '#6B7280'} />
                                <View style={styles.optionTextContainer}>
                                    <Text style={[styles.optionTitle, privacy === 'private' && styles.selectedText]}>Private</Text>
                                    <Text style={styles.optionDesc}>Only you can view this list.</Text>
                                </View>
                            </Pressable>
                        </View>

                        {/* Registry Address */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Shipping Address for Gifts</Text>
                            <Text style={styles.sectionHelp}>
                                Friends can send gifts to this address. We'll hide your full address details from them to protect your privacy.
                            </Text>
                            
                            {MOCK_ADDRESSES.map((addr) => (
                                <Pressable
                                    key={addr.id}
                                    style={[styles.option, addressId === addr.id && styles.selectedOption]}
                                    onPress={() => setAddressId(addr.id)}
                                >
                                    <MapPin size={20} color={addressId === addr.id ? COLORS.primary : '#6B7280'} />
                                    <View style={styles.optionTextContainer}>
                                        <Text style={[styles.optionTitle, addressId === addr.id && styles.selectedText]}>{addr.label}</Text>
                                        <Text style={styles.optionDesc}>{addr.text}</Text>
                                    </View>
                                </Pressable>
                            ))}
                        </View>

                        {/* Default Priority */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Default Priority</Text>
                            <View style={styles.priorityRow}>
                                {(['low', 'medium', 'high'] as const).map((p) => (
                                    <Pressable
                                        key={p}
                                        style={[
                                            styles.priorityChip,
                                            defaultPriority === p && styles.selectedPriorityChip,
                                            defaultPriority === p && { backgroundColor: p === 'high' ? '#FEE2E2' : p === 'medium' ? '#FEF3C7' : '#E0F2FE' }
                                        ]}
                                        onPress={() => setDefaultPriority(p)}
                                    >
                                        <Text style={[
                                            styles.priorityText,
                                            defaultPriority === p && { 
                                                color: p === 'high' ? '#DC2626' : p === 'medium' ? '#D97706' : '#0284C7',
                                                fontWeight: '700'
                                            }
                                        ]}>
                                            {p.charAt(0).toUpperCase() + p.slice(1)}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    </ScrollView>

                    <Pressable style={styles.saveButton} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>Save Settings</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#111827',
    },
    closeButton: {
        padding: 4,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 12,
    },
    sectionHelp: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 12,
        lineHeight: 18,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 8,
        gap: 12,
    },
    selectedOption: {
        borderColor: COLORS.primary,
        backgroundColor: '#FFF7ED',
    },
    optionTextContainer: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 2,
    },
    selectedText: {
        color: COLORS.primary,
    },
    optionDesc: {
        fontSize: 12,
        color: '#6B7280',
    },
    priorityRow: {
        flexDirection: 'row',
        gap: 12,
    },
    priorityChip: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
    },
    selectedPriorityChip: {
        borderColor: 'transparent',
    },
    priorityText: {
        fontSize: 14,
        color: '#6B7280',
    },
    saveButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        marginTop: 12,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
