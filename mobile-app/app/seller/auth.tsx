import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, LogIn, UserPlus, ChevronRight } from 'lucide-react-native';
import { COLORS } from '../../src/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function SellerAuthChoice() {
    const navigation = useNavigation<any>();

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header with Back Button */}
                <View style={styles.header}>
                    <Pressable onPress={() => navigation.navigate('Login')} style={styles.backButton}>
                        <ArrowLeft size={24} color="#1F2937" />
                    </Pressable>
                    <View style={styles.logoRow}>
                        <Image
                            source={require('../../assets/icon.png')}
                            style={styles.logoSmall}
                        />
                        <Text style={styles.brandName}>BazaarPH</Text>
                    </View>
                </View>

                {/* Hero Section (Replicating Web Left Side) */}
                <View style={styles.heroSection}>
                    <LinearGradient
                        colors={['#FFF5F0', '#FFE4D6']}
                        style={styles.heroBackground}
                    />
                    <View style={styles.heroContent}>
                        <Text style={styles.quoteMark}>"</Text>
                        <Text style={styles.heroText}>
                            BazaarPH has transformed how I manage my online store. My customers love the easy checkout system!
                        </Text>
                        <Text style={styles.heroAuthor}>- Juan Dela Cruz, Online Seller</Text>
                    </View>
                </View>

                {/* Content Section (Replicating Web Right Side) */}
                <View style={styles.content}>
                    <View style={styles.titleWrapper}>
                        <Text style={styles.title}>Welcome to BazaarPH</Text>
                        <Text style={styles.subtitle}>Choose how you'd like to continue</Text>
                    </View>

                    <View style={styles.buttonContainer}>
                        {/* Create Seller Account */}
                        <Pressable
                            style={styles.primaryButton}
                            onPress={() => navigation.navigate('SellerSignup')}
                        >
                            <LinearGradient
                                colors={['#FF6A00', '#FF8C42']}
                                style={styles.buttonGradient}
                            >
                                <View style={styles.buttonIconWrapper}>
                                    <UserPlus size={24} color="#FFF" />
                                </View>
                                <View style={styles.buttonTextWrapper}>
                                    <Text style={styles.buttonTitle}>Create Seller Account</Text>
                                    <Text style={styles.buttonSubtitle}>Start selling and grow your business online</Text>
                                </View>
                                <ChevronRight size={20} color="rgba(255,255,255,0.7)" />
                            </LinearGradient>
                        </Pressable>

                        {/* Sign In */}
                        <Pressable
                            style={styles.secondaryButton}
                            onPress={() => navigation.navigate('SellerLogin')}
                        >
                            <View style={[styles.buttonIconWrapper, { backgroundColor: '#FFF5F0' }]}>
                                <LogIn size={24} color="#FF6A00" />
                            </View>
                            <View style={styles.buttonTextWrapper}>
                                <Text style={[styles.buttonTitle, { color: '#1F2937' }]}>Sign in to your account</Text>
                                <Text style={styles.buttonSubtitleGrey}>Access your store and manage your listing</Text>
                            </View>
                            <ChevronRight size={20} color="#D1D5DB" />
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        flexGrow: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backButton: {
        padding: 8,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logoSmall: {
        width: 32,
        height: 32,
        borderRadius: 8,
    },
    brandName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    heroSection: {
        margin: 20,
        borderRadius: 30,
        overflow: 'hidden',
        minHeight: 200,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    heroBackground: {
        ...StyleSheet.absoluteFillObject,
    },
    heroContent: {
        padding: 30,
        justifyContent: 'center',
    },
    quoteMark: {
        fontSize: 60,
        color: '#FF6A00',
        opacity: 0.2,
        position: 'absolute',
        top: 10,
        left: 20,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    heroText: {
        fontSize: 22,
        fontWeight: '600',
        color: '#1F2937',
        fontStyle: 'italic',
        lineHeight: 32,
        marginTop: 20,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    heroAuthor: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 15,
        fontWeight: '500',
    },
    content: {
        flex: 1,
        paddingHorizontal: 25,
        paddingTop: 10,
    },
    titleWrapper: {
        alignItems: 'center',
        marginBottom: 35,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
        textAlign: 'center',
    },
    buttonContainer: {
        gap: 20,
    },
    primaryButton: {
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#FF6A00',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 24,
    },
    buttonIconWrapper: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
    },
    buttonTextWrapper: {
        flex: 1,
    },
    buttonTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    buttonSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#F3F4F6',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    buttonSubtitleGrey: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    footer: {
        marginTop: 40,
        marginBottom: 30,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 25,
    },
    footerText: {
        fontSize: 15,
        color: '#6B7280',
        fontWeight: '500',
    },
    footerLink: {
        color: '#FF6A00',
        fontWeight: '700',
    },
});
