import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, Star, MapPin } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { officialStores } from '../src/data/stores';

export default function AllStoresScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const BRAND_COLOR = '#FF5722';

    const renderStoreItem = ({ item }: { item: any }) => (
        <Pressable
            style={styles.storeCard}
            onPress={() => navigation.navigate('StoreDetail', { store: item })}
        >
            {/* Banner */}
            <Image source={{ uri: item.banner }} style={styles.banner} resizeMode="cover" />

            {/* Overlay Content */}
            <View style={styles.cardContent}>
                <View style={styles.logoRow}>
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoText}>{item.logo}</Text>
                    </View>
                    <View style={styles.infoContainer}>
                        <View style={styles.nameRow}>
                            <Text style={styles.storeName}>{item.name}</Text>
                            {item.verified && <CheckCircle2 size={16} color="#3B82F6" fill="#FFF" />}
                        </View>
                        <View style={styles.statsRow}>
                            <Star size={12} color="#F59E0B" fill="#F59E0B" />
                            <Text style={styles.statsText}>{item.rating} • {item.followers.toLocaleString()} Followers</Text>
                        </View>
                    </View>
                    <Pressable style={styles.visitButton}>
                        <Text style={styles.visitText}>Visit</Text>
                    </Pressable>
                </View>

                {/* Product Previews */}
                <View style={styles.productsRow}>
                    {item.products.slice(0, 3).map((url: string, index: number) => (
                        <Image key={index} source={{ uri: url }} style={styles.productThumb} />
                    ))}
                </View>
            </View>
        </Pressable>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1F2937" />
                </Pressable>
                <Text style={styles.headerTitle}>Official Stores</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={officialStores}
                renderItem={renderStoreItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    storeCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    banner: {
        width: '100%',
        height: 100,
        backgroundColor: '#EEEEEE',
    },
    cardContent: {
        padding: 16,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -40, // Pull up over banner
        marginBottom: 16,
    },
    logoContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    logoText: {
        fontSize: 30,
    },
    infoContainer: {
        flex: 1,
        marginLeft: 12,
        marginTop: 24, // Push down to align with bottom of logo
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    storeName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    statsText: {
        fontSize: 12,
        color: '#6B7280',
    },
    visitButton: {
        backgroundColor: '#FFF5F0',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FF5722',
        marginTop: 24,
    },
    visitText: {
        color: '#FF5722',
        fontSize: 12,
        fontWeight: '700',
    },
    productsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    productThumb: {
        flex: 1,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
    },
});
