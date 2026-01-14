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
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    banner: {
        width: '100%',
        height: 110,
        backgroundColor: '#EEEEEE',
    },
    cardContent: {
        padding: 16,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -45, // Pull up over banner
        marginBottom: 16,
    },
    logoContainer: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
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
