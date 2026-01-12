import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, TextInput } from 'react-native';
import { ArrowLeft, FolderTree, Search, Package, CheckCircle, XCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAdminCategories } from '../../../src/stores/adminStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminCategoriesScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { categories, isLoading, loadCategories } = useAdminCategories();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadCategories();
  }, []);

  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && category.isActive) ||
                         (statusFilter === 'inactive' && !category.isActive);
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <View style={styles.statusBadge}>
        <CheckCircle size={12} color="#059669" />
        <Text style={[styles.statusText, { color: '#059669' }]}>Active</Text>
      </View>
    ) : (
      <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
        <XCircle size={12} color="#DC2626" />
        <Text style={[styles.statusText, { color: '#DC2626' }]}>Inactive</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Categories Management</Text>
            <Text style={styles.headerSubtitle}>Manage product categories</Text>
          </View>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
          {['all', 'active', 'inactive'].map((filter) => (
            <Pressable
              key={filter}
              style={[styles.filterChip, statusFilter === filter && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter as any)}
            >
              <Text style={[styles.filterChipText, statusFilter === filter && styles.filterChipTextActive]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView}>
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#FF5722" />
            <Text style={styles.loadingText}>Loading categories...</Text>
          </View>
        ) : filteredCategories.length === 0 ? (
          <View style={styles.centerContent}>
            <FolderTree size={64} color="#D1D5DB" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No categories found</Text>
          </View>
        ) : (
          filteredCategories.map((category) => (
            <View key={category.id} style={styles.categoryCard}>
              <View style={styles.cardHeader}>
                <Image source={{ uri: category.image }} style={styles.categoryImage} />
                <View style={styles.headerInfo}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categorySlug}>/{category.slug}</Text>
                  {getStatusBadge(category.isActive)}
                </View>
              </View>
              <Text style={styles.description} numberOfLines={2}>{category.description}</Text>
              <View style={styles.cardFooter}>
                <View style={styles.statItem}>
                  <Package size={16} color="#6B7280" />
                  <Text style={styles.statText}>{category.productsCount} products</Text>
                </View>
                <Text style={styles.sortOrder}>Order: {category.sortOrder}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  header: { backgroundColor: '#FF5722', paddingHorizontal: 20, paddingBottom: 20 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { padding: 4 },
  headerTitleContainer: { gap: 2 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 13, color: '#FFFFFF', opacity: 0.9 },
  filtersContainer: { backgroundColor: '#FFFFFF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 12, marginBottom: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: '#111827' },
  filterScrollView: { flexGrow: 0 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterChipActive: { backgroundColor: '#FF5722' },
  filterChipText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  filterChipTextActive: { color: '#FFFFFF' },
  scrollView: { flex: 1, padding: 16 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 16 },
  categoryCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  categoryImage: { width: 80, height: 80, borderRadius: 10 },
  headerInfo: { flex: 1, gap: 4 },
  categoryName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  categorySlug: { fontSize: 13, color: '#6B7280', fontFamily: 'monospace' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: '#D1FAE5', alignSelf: 'flex-start', marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  description: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 13, color: '#6B7280' },
  sortOrder: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
});
