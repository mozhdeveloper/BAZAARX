import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    Pressable,
    ActivityIndicator,
} from 'react-native';

interface TrackingModalProps {
    visible: boolean;
    onClose: () => void;
    trackingNumber: string;
    setTrackingNumber: (val: string) => void;
    onSubmit: () => void;
    isUpdating: boolean;
}

const TrackingModal: React.FC<TrackingModalProps> = ({
    visible,
    onClose,
    trackingNumber,
    setTrackingNumber,
    onSubmit,
    isUpdating,
}) => {
    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            statusBarTranslucent={true}
            onRequestClose={onClose}
        >
            <View style={styles.promptOverlay}>
                <View style={styles.promptContent}>
                    <View style={styles.promptHeader}>
                        <Text style={styles.promptTitle}>Enter Tracking Number</Text>
                        <Text style={styles.promptSubtitle}>Please provide the tracking details for this shipment.</Text>
                    </View>

                    <View style={styles.promptBody}>
                        <TextInput
                            style={styles.promptInput}
                            value={trackingNumber}
                            onChangeText={setTrackingNumber}
                            placeholder="e.g. BAX-12345678"
                            autoFocus
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

                    <View style={styles.promptFooter}>
                        <Pressable
                            style={[styles.promptButton, styles.promptButtonOutline]}
                            onPress={onClose}
                        >
                            <Text style={[styles.promptButtonText, { color: '#6B7280' }]}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.promptButton, styles.promptButtonPrimary]}
                            onPress={onSubmit}
                            disabled={isUpdating}
                        >
                            {isUpdating ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.promptButtonText}>Confirm Shipment</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    promptOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    promptContent: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 8,
    },
    promptHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    promptTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
    },
    promptSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
    },
    promptBody: {
        marginBottom: 24,
    },
    promptInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
        fontSize: 16,
        color: '#1F2937',
        fontWeight: '500',
    },
    promptFooter: {
        flexDirection: 'row',
        gap: 12,
    },
    promptButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    promptButtonPrimary: {
        backgroundColor: '#FF5722',
    },
    promptButtonOutline: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    promptButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default TrackingModal;
