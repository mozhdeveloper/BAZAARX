// Forced sync at 2026-03-12 11:30
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, FolderOpen, Package, ArrowLeft } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { supabase } from '../src/lib/supabase';
import { COLORS } from '../src/constants/theme';
import { safeImageUri } from '../src/utils/imageUtils';
import { Image as ExpoImage } from 'expo-image';
import { CURATED_CATEGORY_IMAGES } from '../src/constants/categories';

type Props = NativeStackScreenProps<RootStackParamList, 'Categories'>;

interface DbCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  icon: string | null;
  sort_order: number;
  parent_id: string | null;
  products: { count: number }[] | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  parentId: string | null;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - CARD_GAP) / 2;

const GRADIENT_PAIRS: [string, string][] = [
  ['#FFFBF0', '#FFE0A3'],
  ['#FFF9F0', '#FFEDD5'],
  ['#FFF7ED', '#FFDBBB'],
  ['#FFFEF9', '#FFF1CC'],
  ['#FFF9EB', '#FEF3C7'],
  ['#FFFFFF', '#FFF4EC'],
];

const CategoryCard = React.memo(({ item, index, onPress }: { item: Category; index: number; onPress: (id: string) => void }) => {
  const gradient = GRADIENT_PAIRS[index % GRADIENT_PAIRS.length];
  const [imageError, setImageError] = useState(false);

  const curatedFallback = useMemo(() => {
    const key = item.name.toLowerCase().replace(/[']/g, '').replace(/\s+/g, '-');
    return CURATED_CATEGORY_IMAGES[key] || null;
  }, [item.name]);

  const finalImageUri = (!imageError && item.image) ? safeImageUri(item.image) : curatedFallback;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(item.id)}
    >
      <View style={styles.imageContainer}>
        {finalImageUri ? (
          <ExpoImage
            source={{ uri: finalImageUri }}
            style={styles.cardImage}
            contentFit="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <LinearGradient colors={gradient} style={styles.cardImageFallback}>
            <FolderOpen size={32} color={COLORS.textPrimary} />
          </LinearGradient>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)']}
          style={styles.imageOverlay}
        />
      </View>
      <View style={styles.cardBody}>
        <Text 
          style={styles.cardName} 
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {item.name}
        </Text>
      </View>
    </Pressable>
  );
});

export default function CategoriesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug, description, image_url, icon, sort_order, parent_id')
          .order('sort_order', { ascending: true });

        if (error) throw error;

        const mapped: Category[] = ((data as DbCategory[]) || []).map((row) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          description: row.description || '',
          image: row.image_url || '',
          parentId: row.parent_id || null,
        }));
        
        const unique = mapped.reduce((acc: Category[], curr) => {
          const name = curr.name.toLowerCase().trim();
          const isUnnecessary = 
            !name || 
            name === 'test' || 
            name === 'dummy' || 
            name === 'others' || 
            name === 'other';

          if (!isUnnecessary && !acc.find(c => (c.slug && c.slug === curr.slug) || c.name.toLowerCase() === curr.name.toLowerCase())) {
            acc.push(curr);
          }
          return acc;
        }, []);
        setCategories(unique);
      } catch (err) {
        console.error('[CategoriesScreen] Failed to load categories:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    );
  }, [categories, searchQuery]);

  const handleCategoryPress = useCallback(
    (id: string) => {
      (navigation as any).navigate('MainTabs', {
        screen: 'Shop',
        params: { category: id },
      });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Category; index: number }) => (
      <CategoryCard item={item} index={index} onPress={handleCategoryPress} />
    ),
    [handleCategoryPress],
  );

  const keyExtractor = useCallback((item: Category) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={COLORS.textHeadline} />
        </Pressable>
        <Text style={styles.headerTitle}>Categories</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.searchWrapper}>
        <Search size={16} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search categories..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Text style={styles.clearText}>X</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <FolderOpen size={56} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No results found' : 'No categories yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery ? 'Try a different search term.' : 'Categories will appear here once added.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 14, height: 46, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textHeadline },
  clearText: { fontSize: 14, color: '#9CA3AF', paddingHorizontal: 4 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  row: { gap: CARD_GAP, marginBottom: CARD_GAP },
  card: { width: CARD_WIDTH, backgroundColor: '#FFFFFF', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.96 }] },
  imageContainer: { height: 140, width: '100%', position: 'relative', backgroundColor: '#F9FAFB' },
  cardImage: { width: '100%', height: '100%' },
  cardImageFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.02)' },
  cardName: { fontSize: 14, fontWeight: '800', color: COLORS.textHeadline, textAlign: 'center', lineHeight: 18 },
  cardBody: { padding: 12, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#374151', textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
});
