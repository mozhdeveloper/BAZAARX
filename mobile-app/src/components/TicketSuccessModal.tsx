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
import { CheckCircle } from 'lucide-react-native';
import { COLORS } from '../constants/theme';

interface TicketSuccessModalProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    message?: string;
}

const { width } = Dimensions.get('window');

export const TicketSuccessModal = ({
    visible,
    onClose,
    title = 'Ticket Submitted!',
    message = 'We will get back to you soon.',
}: TicketSuccessModalProps) => {
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

            // Auto-close after 1.5 seconds to give user time to see it
            const timer = setTimeout(() => {
                handleClose();
            }, 1500);

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
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message}>{message}</Text>
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
        borderRadius: 24,
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
        padding: 32,
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        width: '100%',
        gap: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#111827',
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    message: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
    },
});
