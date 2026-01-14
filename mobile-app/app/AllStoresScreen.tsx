import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, StatusBar, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, Star, Search } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { officialStores } from '../src/data/stores';

export default function AllStoresScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const BRAND_COLOR = '#FF5722';

    // State for Filter/Search
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedCategory, setSelectedCategory] = React.useState('All');

    const categories = ['All', 'Fashion', 'Electronics', 'Sports', 'Home', 'Beauty'];

    const filteredStores = officialStores.filter(store => {
        const matchesSearch = store.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || store.categories.includes(selectedCategory);
        return matchesSearch && matchesCategory;
    });

    const renderStoreItem = ({ item }: { item: any }) => (
        <Pressable
            style={styles.storeCard}
            onPress={() => navigation.navigate('StoreDetail', { store: item })}
        >
            {/* Banner */}
            <View style={styles.bannerContainer}>
                <Image source={{ uri: item.banner }} style={styles.banner} resizeMode="cover" />
                <View style={styles.bannerOverlay} />
            </View>

            {/* Content Container */}
            <View style={styles.cardContent}>
                <View style={styles.headerRow}>
                    {/* Logo overlapping banner */}
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoText}>{item.logo}</Text>
                    </View>
                </View>

                {/* Store Info */}
                <View style={styles.storeInfo}>
                    <View style={styles.nameRow}>
                        <View style={styles.nameContainer}>
                            <Text style={styles.storeName} numberOfLines={1}>{item.name}</Text>
                            {item.verified && <CheckCircle2 size={16} color="#3B82F6" fill="#FFF" />}
                        </View>
                        <Pressable
                            style={({ pressed }) => [styles.visitButton, pressed && { opacity: 0.8 }]}
                            onPress={() => navigation.navigate('StoreDetail', { store: item })}
                        >
                            <Text style={styles.visitText}>Visit</Text>
                        </Pressable>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statChip}>
                            <Star size={12} color="#F59E0B" fill="#F59E0B" />
                            <Text style={styles.statText}>{item.rating}</Text>
                        </View>
                        <Text style={styles.divider}>•</Text>
                        <Text style={styles.followersText}>{item.followers > 1000 ? (item.followers / 1000).toFixed(1) + 'k' : item.followers} Followers</Text>
                        <Text style={styles.divider}>•</Text>
                        <Text style={styles.locationText}>{item.location}</Text>
                    </View>
                </View>

                {/* Product Previews - Bento Grid Style */}
                <View style={styles.productsContainer}>
                    <View style={styles.mainProductContainer}>
                        <Image source={{ uri: item.products[0] }} style={styles.mainProductImage} />
                    </View>
                    <View style={styles.sideProductsContainer}>
                        <Image source={{ uri: item.products[1] }} style={styles.sideProductImage} />
                        <Image source={{ uri: item.products[2] }} style={styles.sideProductImage} />
                    </View>
                </View>
            </View>
        </Pressable>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* 1. BRANDED HEADER with Search */}
            <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: BRAND_COLOR }]}>
                <View style={styles.headerTop}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#FFFFFF" />
                    </Pressable>
                    <Text style={styles.headerTitle}>Official Stores</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Search Bar */}
                <View style={styles.searchBarWrapper}>
                    <Search size={18} color="#9CA3AF" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search official stores..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor="#9CA3AF"
                    />
                </View>
            </View>

            {/* 2. CATEGORY FILTER CHIPS */}
            <View style={styles.chipsContainer}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={categories}
                    keyExtractor={item => item}
                    contentContainerStyle={styles.chipsContent}
                    renderItem={({ item }) => (
                        <Pressable
                            style={[
                                styles.chip,
                                selectedCategory === item && { backgroundColor: BRAND_COLOR, borderColor: BRAND_COLOR }
                            ]}
                            onPress={() => setSelectedCategory(item)}
                        >
                            <Text style={[styles.chipText, selectedCategory === item && { color: '#FFF' }]}>{item}</Text>
                        </Pressable>
                    )}
                />
            </View>


            <FlatList
                data={filteredStores}
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
    headerContainer: {
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        paddingBottom: 20,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    backButton: {
        padding: 4,
    },
    searchBarWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 100,
        paddingHorizontal: 16,
        height: 44,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#1F2937',
    },
    chipsContainer: {
        paddingVertical: 12,
        backgroundColor: '#F9FAFB',
    },
    chipsContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    chipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
    },
    listContent: {
        padding: 16,
        paddingTop: 4,
        paddingBottom: 40,
    },
    storeCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        marginBottom: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
    },
    bannerContainer: {
        height: 120,
        width: '100%',
        position: 'relative',
    },
    banner: {
        width: '100%',
        height: '100%',
        backgroundColor: '#F3F4F6',
    },
    bannerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    cardContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    headerRow: {
        flexDirection: 'row',
        marginTop: -32, // Pull up overlap
        marginBottom: 8,
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
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    logoText: {
        fontSize: 28,
    },
    visitButton: {
        backgroundColor: '#FFF5F0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FF5722',
        alignSelf: 'center',
    },
    visitText: {
        color: '#FF5722',
        fontSize: 12,
        fontWeight: '700',
    },
    storeInfo: {
        marginBottom: 16,
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
        gap: 8,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    storeName: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1F2937',
        letterSpacing: -0.5,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    statChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    statText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#B45309',
    },
    divider: {
        marginHorizontal: 8,
        color: '#D1D5DB',
    },
    followersText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    locationText: {
        fontSize: 13,
        color: '#9CA3AF',
    },
    productsContainer: {
        flexDirection: 'row',
        height: 100,
        gap: 10,
    },
    mainProductContainer: {
        flex: 2,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    mainProductImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#F3F4F6',
    },
    sideProductsContainer: {
        flex: 1,
        flexDirection: 'column',
        gap: 10,
    },
    sideProductImage: {
        flex: 1,
        width: '100%',
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
});
