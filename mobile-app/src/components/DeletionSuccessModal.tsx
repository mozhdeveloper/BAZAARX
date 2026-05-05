import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Animated,
    Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Trash2 } from 'lucide-react-native';

interface DeletionSuccessModalProps {
    visible: boolean;
    onClose: () => void;
    collectionName: string;
}

const { width } = Dimensions.get('window');

export const DeletionSuccessModal = ({
    visible,
    onClose,
    collectionName,
}: DeletionSuccessModalProps) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const translateYAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        if (visible) {
            // Animate In
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.spring(translateYAnim, {
                    toValue: 0,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();

            // Auto-close after 0.8 seconds
            const timer = setTimeout(() => {
                handleClose();
            }, 800);

            return () => clearTimeout(timer);
        } else {
            // Reset animations when hidden
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.9);
            translateYAnim.setValue(20);
        }
    }, [visible]);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.9,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(translateYAnim, {
                toValue: 10,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => onClose());
    };

    if (!visible) return null;

    return (
        <View style={styles.overlay} pointerEvents="none">
            <Animated.View
                style={[
                    styles.modalContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
                    },
                ]}
            >
                <BlurView intensity={Platform.OS === 'ios' ? 20 : 0} style={styles.blurContainer} tint="light">
                    <View style={styles.content}>
                        <View style={styles.iconContainer}>
                            <Trash2 size={24} color="#DC2626" />
                        </View>
                        
                        <View style={styles.textGroup}>
                            <Text style={styles.title}>Collection Deleted</Text>
                            <Text style={styles.collectionName} numberOfLines={1}>
                                "{collectionName}" has been removed
                            </Text>
                        </View>
                    </View>
                </BlurView>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        elevation: 1000,
    },
    modalContainer: {
        width: width * 0.85,
        maxWidth: 340,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    blurContainer: {
        padding: 24,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    textGroup: {
        flex: 1,
        gap: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    collectionName: {
        fontSize: 14,
        color: '#4B5563',
    },
});
