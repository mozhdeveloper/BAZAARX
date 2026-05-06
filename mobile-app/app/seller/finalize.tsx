import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    Alert,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, AlertCircle, Loader } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { COLORS } from '../../src/constants/theme';
import { authService } from '../../src/services/authService';
import { useAuthStore } from '../../src/stores/authStore';

type Props = NativeStackScreenProps<RootStackParamList, 'SellerFinalize'>;

interface FinalizationState {
    status: 'idle' | 'loading' | 'success' | 'error';
    error?: string;
    retryCount: number;
}

const MAX_RETRIES = 3;
const TIMEOUT_MS = 30000; // 30 second timeout

export default function SellerFinalizeScreen({ navigation, route }: Props) {
    const insets = useSafeAreaInsets();
    const [state, setState] = useState<FinalizationState>({
        status: 'idle',
        retryCount: 0,
    });
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        navigation.setOptions({
            animation: 'fade',
        });

        return () => {
            isMountedRef.current = false;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [navigation]);

    // Auto-run finalization on mount
    useEffect(() => {
        if (state.status === 'idle') {
            performFinalization();
        }
    }, []);

    const performFinalization = async () => {
        if (!isMountedRef.current) return;

        setState((prev) => ({ ...prev, status: 'loading' }));

        // Set timeout protection
        timeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
                setState((prev) => ({
                    ...prev,
                    status: 'error',
                    error: 'Finalization timed out. Please try again.',
                }));
            }
        }, TIMEOUT_MS);

        try {
            // Get current user session
            const authState = useAuthStore.getState();
            const userId = authState.user?.id;

            if (!userId) {
                throw new Error('User session not found. Please log in again.');
            }

            // Get pending signup data
            const pendingSignupData = authState.pendingSignupData;
            if (!pendingSignupData) {
                throw new Error('Signup data not found. Please complete signup again.');
            }

            // Prepare seller data for registration
            const sellerData = {
                store_name: pendingSignupData.storeName,
                store_description: pendingSignupData.storeDescription || '',
                owner_name: `${pendingSignupData.firstName} ${pendingSignupData.lastName}`.trim(),
            };

            // Call registerBuyerAsSeller to:
            // 1. Add 'seller' role to user_roles table
            // 2. Create seller record in sellers table
            const seller = await authService.registerBuyerAsSeller(userId, sellerData);

            if (!seller) {
                throw new Error('Failed to create seller record');
            }

            // Clear timeout on success
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            if (!isMountedRef.current) return;

            // Update state to success
            setState((prev) => ({ ...prev, status: 'success' }));

            // Navigate to SellerEmailConfirmed after brief delay
            setTimeout(() => {
                if (isMountedRef.current) {
                    navigation.replace('SellerEmailConfirmed');
                }
            }, 1500);
        } catch (err: any) {
            // Clear timeout on error
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            if (!isMountedRef.current) return;

            console.error('[SellerFinalize] Error:', err);

            setState((prev) => ({
                ...prev,
                status: 'error',
                error: err.message || 'An unexpected error occurred during finalization.',
                retryCount: prev.retryCount + 1,
            }));
        }
    };

    const handleRetry = () => {
        if (state.retryCount < MAX_RETRIES) {
            setState({
                status: 'idle',
                retryCount: state.retryCount + 1,
            });
            performFinalization();
        } else {
            Alert.alert(
                'Max Retries Exceeded',
                'Please try again later or contact support.',
                [
                    {
                        text: 'Go Back',
                        onPress: () => navigation.goBack(),
                    },
                ]
            );
        }
    };

    const handleGoBack = () => {
        navigation.goBack();
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <SafeAreaView style={{ flex: 1 }}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Pressable
                            onPress={handleGoBack}
                            style={styles.backButton}
                            accessibilityRole="button"
                            accessibilityLabel="Go back"
                            disabled={state.status === 'loading'}
                        >
                            <ArrowLeft size={20} color="#6B7280" />
                        </Pressable>
                        <Text style={styles.headerLabel}>Finalizing Account</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.content}>
                            {/* Status Icon */}
                            <View style={styles.illustrationContainer}>
                                {state.status === 'loading' && (
                                    <View style={[styles.iconCircle, styles.loadingCircle]}>
                                        <ActivityIndicator size="large" color="#D97706" />
                                    </View>
                                )}

                                {state.status === 'success' && (
                                    <View style={[styles.iconCircle, styles.successCircle]}>
                                        <CheckCircle2 size={64} color="#16A34A" strokeWidth={1.5} />
                                    </View>
                                )}

                                {state.status === 'error' && (
                                    <View style={[styles.iconCircle, styles.errorCircle]}>
                                        <AlertCircle size={64} color="#DC2626" strokeWidth={1.5} />
                                    </View>
                                )}
                            </View>

                            {/* Status Title */}
                            {state.status === 'loading' && (
                                <>
                                    <Text style={styles.title}>Setting up your seller account</Text>
                                    <Text style={styles.subtitle}>
                                        We're creating your store and finalizing your registration. This should only take a moment.
                                    </Text>
                                </>
                            )}

                            {state.status === 'success' && (
                                <>
                                    <Text style={styles.title}>Account finalized!</Text>
                                    <Text style={styles.subtitle}>
                                        Your seller account has been successfully created. You're all set to start selling on BazaarX.
                                    </Text>
                                </>
                            )}

                            {state.status === 'error' && (
                                <>
                                    <Text style={styles.title}>Finalization failed</Text>
                                    <Text style={styles.subtitle}>{state.error}</Text>
                                    <Text style={styles.retryInfo}>
                                        Attempt {state.retryCount} of {MAX_RETRIES}
                                    </Text>
                                </>
                            )}

                            {/* Action Buttons */}
                            {state.status === 'error' && state.retryCount < MAX_RETRIES && (
                                <View style={styles.actionContainer}>
                                    <Pressable
                                        style={styles.primaryButton}
                                        onPress={handleRetry}
                                        accessibilityRole="button"
                                        accessibilityLabel="Retry finalization"
                                    >
                                        <Text style={styles.buttonText}>Try Again</Text>
                                    </Pressable>

                                    <Pressable
                                        style={styles.secondaryButton}
                                        onPress={handleGoBack}
                                        accessibilityRole="button"
                                        accessibilityLabel="Go back to previous screen"
                                    >
                                        <Text style={styles.secondaryButtonText}>Go Back</Text>
                                    </Pressable>
                                </View>
                            )}

                            {state.status === 'error' && state.retryCount >= MAX_RETRIES && (
                                <View style={styles.actionContainer}>
                                    <Pressable
                                        style={styles.primaryButton}
                                        onPress={handleGoBack}
                                        accessibilityRole="button"
                                        accessibilityLabel="Go back to previous screen"
                                    >
                                        <Text style={styles.buttonText}>Go Back</Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background || '#F9FAFB',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 0,
        marginTop: 0,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6B7280',
    },
    content: {
        paddingTop: 60,
        paddingBottom: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    illustrationContainer: {
        marginBottom: 40,
        marginTop: 20,
    },
    iconCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        position: 'relative',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    loadingCircle: {
        borderColor: '#FDE68A',
        backgroundColor: '#FFFBF0',
        shadowColor: '#F59E0B',
    },
    successCircle: {
        borderColor: '#DCFCE7',
        backgroundColor: '#F0FDF4',
        shadowColor: '#16A34A',
    },
    errorCircle: {
        borderColor: '#FEE2E2',
        backgroundColor: '#FEF2F2',
        shadowColor: '#DC2626',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    retryInfo: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
        marginBottom: 24,
        fontWeight: '500',
    },
    actionContainer: {
        width: '100%',
        gap: 12,
        marginTop: 20,
    },
    primaryButton: {
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#D97706',
        shadowColor: '#D97706',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#FDE68A',
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        gap: 8,
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#D97706',
    },
});
