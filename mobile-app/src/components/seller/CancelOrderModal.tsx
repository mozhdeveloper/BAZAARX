import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { COLORS } from '../../constants/theme';

// Move logic outside component to prevent re-declaration
export const CANCEL_REASONS = [
    { id: 'changed_mind', label: 'Changed my mind' },
    { id: 'wrong_item', label: 'Ordered by mistake' },
    { id: 'better_price', label: 'Found a better price elsewhere' },
    { id: 'no_longer_needed', label: 'Item no longer needed' },
    { id: 'delivery_too_long', label: 'Delivery takes too long' },
    { id: 'other', label: 'Other' },
] as const;

export type CancelReason = (typeof CANCEL_REASONS)[number]['id'];

interface CancelOrderModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    isUpdating: boolean;
}

const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
    visible,
    onClose,
    onConfirm,
    isUpdating,
}) => {
    const [selectedReason, setSelectedReason] = useState<CancelReason | null>(null);

    const handleClose = useCallback(() => {
        if (isUpdating) return;
        setSelectedReason(null);
        onClose();
    }, [onClose, isUpdating]);

    const handleConfirm = () => {
        if (!selectedReason) return;
        const selected = CANCEL_REASONS.find(r => r.id === selectedReason);
        onConfirm(selected?.label ?? selectedReason);
        // We don't nullify here if we expect the modal to unmount; 
        // otherwise, do it in a useEffect or on dismiss.
    };

    // Memoize the list to prevent unnecessary re-renders of the logic
    const renderReasons = useMemo(() => (
        CANCEL_REASONS.map((reason) => {
            const isSelected = selectedReason === reason.id;
            return (
                <Pressable
                    key={reason.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={reason.label}
                    style={[
                        styles.radioRow,
                        isSelected ? styles.radioRowSelected : styles.radioRowUnselected
                    ]}
                    onPress={() => setSelectedReason(reason.id)}
                >
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                        {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[styles.radioLabel, isSelected && styles.radioLabelSelected]}>
                        {reason.label}
                    </Text>
                </Pressable>
            );
        })
    ), [selectedReason]);

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            statusBarTranslucent={true}
            onRequestClose={handleClose}
        >
            <Pressable
                style={styles.overlay}
                onPress={handleClose} // Dismiss on backdrop tap
            >
                <Pressable style={styles.content} pointerEvents="auto">
                    <View style={styles.header}>
                        <Text style={styles.title}>Cancel Order</Text>
                        <Text style={styles.subtitle}>
                            Please tell us why you'd like to cancel this order.
                        </Text>
                    </View>

                    <ScrollView
                        style={styles.bodyScroll}
                        contentContainerStyle={styles.bodyContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {renderReasons}
                    </ScrollView>

                    <View style={styles.footer}>
                        <Pressable
                            style={[styles.button, styles.buttonOutline]}
                            onPress={handleClose}
                            disabled={isUpdating}
                            accessibilityRole="button"
                        >
                            <Text style={styles.buttonTextSecondary}>Keep Order</Text>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.button,
                                styles.buttonDestructive,
                                (!selectedReason || isUpdating) && styles.buttonDisabled,
                            ]}
                            onPress={handleConfirm}
                            disabled={!selectedReason || isUpdating}
                            accessibilityRole="button"
                        >
                            {isUpdating ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.buttonText}>Yes, Cancel</Text>
                            )}
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        maxHeight: '80%', // Ensure it doesn't bleed off screen on small phones
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#4B5563',
        textAlign: 'center',
        lineHeight: 22,
    },
    bodyScroll: {
        marginBottom: 24,
        maxHeight: 300,
    },
    bodyContent: {
        gap: 10,
    },
    radioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1.5,
    },
    radioRowUnselected: {
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
    },
    radioRowSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary,
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    radioOuterSelected: {
        borderColor: '#FFFFFF',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FFFFFF', // Changed to white for better contrast against primary background
    },
    radioLabel: {
        fontSize: 15,
        color: '#374151',
        flex: 1,
    },
    radioLabelSelected: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonDestructive: {
        backgroundColor: COLORS.primary,
    },
    buttonOutline: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    buttonTextSecondary: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
});

export default CancelOrderModal;