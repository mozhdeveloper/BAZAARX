// Forced sync at 2026-03-12 11:30
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, FolderOpen, Search } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../App';
import { CURATED_CATEGORY_IMAGES } from '../src/constants/categories';
import { COLORS } from '../src/constants/theme';
import { supabase } from '../src/lib/supabase';
import { safeImageUri } from '../src/utils/imageUtils';

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

export default function CategoriesScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [displayCategories, setDisplayCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParent, setSelectedParent] = useState<Category | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);
  const categoryId = route.params?.categoryId;

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug, description, image_url, icon, sort_order, parent_id')
          .eq('is_active', true)
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

        // Filter out test/dummy categories
        const unique = mapped.filter((c) => {
          const name = c.name.toLowerCase().trim();
          const isUnnecessary =
            !name ||
            name === 'test' ||
            name === 'dummy' ||
            name === 'others' ||
            name === 'other';

          return !isUnnecessary;
        });

        // Remove duplicates by name
        const deduplicated = unique.reduce((acc: Category[], curr) => {
          if (!acc.find(c => c.name.toLowerCase() === curr.name.toLowerCase())) {
            acc.push(curr);
          }
          return acc;
        }, []);

        console.log('[CategoriesScreen] Total categories:', deduplicated.length);
        console.log('[CategoriesScreen] Sample categories:', deduplicated.slice(0, 5).map(c => ({ name: c.name, parentId: c.parentId })));

        setAllCategories(deduplicated);
        // Initially show only main categories (parent_id is null, undefined, or empty string)
        const mainCategories = deduplicated.filter(c => !c.parentId || c.parentId === '' || c.parentId === 'null');
        console.log('[CategoriesScreen] Main categories:', mainCategories.length);

        if (categoryId) {
          const parentCategory = deduplicated.find((c) => c.id === categoryId);
          if (parentCategory) {
            const subcategories = deduplicated.filter((c) => c.parentId === parentCategory.id);
            setSelectedParent(parentCategory);
            setBreadcrumb([parentCategory.name]);
            setDisplayCategories(subcategories);
          } else {
            setDisplayCategories(mainCategories);
          }
        } else {
          setDisplayCategories(mainCategories);
        }
      } catch (err) {
        console.error('[CategoriesScreen] Failed to load categories:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, [categoryId]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return displayCategories;
    const q = searchQuery.toLowerCase();
    return displayCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    );
  }, [displayCategories, searchQuery]);

  const handleCategoryPress = useCallback(
    (id: string) => {
      const category = allCategories.find(c => c.id === id);
      if (!category) return;

      // Find subcategories for this category
      const subcategories = allCategories.filter(c => c.parentId === id);

      if (subcategories.length > 0) {
        // Show subcategories
        setSelectedParent(category);
        setDisplayCategories(subcategories);
        setBreadcrumb([...breadcrumb, category.name]);
        setSearchQuery('');
      } else {
        // No subcategories, navigate to ProductListingScreen with category filter
        navigation.navigate('ProductListing', { searchQuery: category.name });
      }
    },
    [allCategories, navigation, breadcrumb],
  );

  const handleBackToParent = useCallback(() => {
    if (categoryId) {
      navigation.goBack();
    } else {
      setSelectedParent(null);
      setDisplayCategories(allCategories.filter(c => !c.parentId));
      setBreadcrumb([]);
      setSearchQuery('');
    }
  }, [categoryId, selectedParent, allCategories, navigation]);

  const renderItem = useCallback(
    ({ item, index }: { item: Category; index: number }) => (
      <CategoryCard item={item} index={index} onPress={handleCategoryPress} />
    ),
    [handleCategoryPress, selectedParent],
  );

  const keyExtractor = useCallback((item: Category) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {selectedParent ? (
            <Pressable style={styles.backButton} onPress={handleBackToParent}>
              <ArrowLeft size={22} color={COLORS.textHeadline} />
            </Pressable>
          ) : (
            <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
              <ArrowLeft size={22} color={COLORS.textHeadline} />
            </Pressable>
          )}
          <Text style={styles.headerTitle}>
            {breadcrumb.length > 0 ? breadcrumb.join(' > ') : 'Categories'}
          </Text>
        </View>
        <View style={styles.backButton} />
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Search size={16} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder={selectedParent ? `Search in ${selectedParent.name}...` : "Search categories..."}
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

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <FolderOpen size={56} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No results found' : (selectedParent ? 'No subcategories' : 'No categories yet')}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery 
              ? 'Try a different search term.' 
              : (selectedParent 
                ? 'This category has no subcategories.'
                : 'Categories will appear here once added.')}
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginLeft: 12 },
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
  cardBody: { padding: 12, alignItems: 'center', justifyContent: 'center', minHeight: 54, position: 'relative' },
  arrowContainer: { position: 'absolute', right: 8, top: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#374151', textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
});
