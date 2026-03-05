import React, { useState } from 'react';
import { COLORS } from '../../constants/theme';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    ActivityIndicator,
} from 'react-native';

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

    const handleClose = () => {
        setSelectedReason(null);
        onClose();
    };

    const handleConfirm = () => {
        if (!selectedReason) return;
        const label = CANCEL_REASONS.find(r => r.id === selectedReason)?.label ?? selectedReason;
        onConfirm(label);
        setSelectedReason(null);
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            statusBarTranslucent={true}
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Cancel Order</Text>
                        <Text style={styles.subtitle}>
                            Please tell us why you'd like to cancel this order.
                        </Text>
                    </View>

                    <View style={styles.body}>
                        {CANCEL_REASONS.map((reason) => {
                            const isSelected = selectedReason === reason.id;
                            return (
                                <Pressable
                                    key={reason.id}
                                    style={[styles.radioRow, isSelected && styles.radioRowSelected]}
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
                        })}
                    </View>

                    <View style={styles.footer}>
                        <Pressable
                            style={[styles.button, styles.buttonOutline]}
                            onPress={handleClose}
                            disabled={isUpdating}
                        >
                            <Text style={[styles.buttonText, { color: '#1F2937' }]}>Keep Order</Text>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.button,
                                styles.buttonDestructive,
                                (!selectedReason || isUpdating) && styles.buttonDisabled,
                            ]}
                            onPress={handleConfirm}
                            disabled={!selectedReason || isUpdating}
                        >
                            {isUpdating ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.buttonText}>Yes, Cancel</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
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
        maxWidth: 360,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 8,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937', // Off black
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#1F2937', // Off black
        textAlign: 'center',
        lineHeight: 20,
    },
    body: {
        marginBottom: 24,
        gap: 8,
    },
    radioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D1D5DB', // Light gray border
        backgroundColor: '#FFFFFF', // White for unselected
    },
    radioRowSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary,
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
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
        backgroundColor: COLORS.primary,
    },
    radioLabel: {
        fontSize: 14,
        color: '#1F2937', // Off black text
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
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonDestructive: {
        backgroundColor: COLORS.primary,
    },
    buttonOutline: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB', // Light gray color
    },
    buttonDisabled: {
        opacity: 0.45,
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default CancelOrderModal;
