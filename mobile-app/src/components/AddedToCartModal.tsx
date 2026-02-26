import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    Dimensions,
    Animated,
    Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS } from '../constants/theme';

interface AddedToCartModalProps {
    visible: boolean;
    onClose: () => void;
    productName: string;
    productImage: string;
}

const { width } = Dimensions.get('window');

export const AddedToCartModal = ({
    visible,
    onClose,
    productName,
    productImage,
}: AddedToCartModalProps) => {
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
                        <Text style={styles.title}>Item added to your cart!</Text>

                        <View style={styles.productPreview}>
                            <View style={styles.imageContainer}>
                                <Image
                                    source={{ uri: productImage || 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=200' }}
                                    style={styles.productImage}
                                    resizeMode="cover"
                                />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.productName} numberOfLines={1}>
                                    {productName}
                                </Text>
                            </View>
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
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        width: '100%',
        gap: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
        lineHeight: 28,
    },
    productPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(249, 250, 251, 0.8)',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        width: '100%',
        gap: 12,
    },
    imageContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FFF',
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    productImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
});
