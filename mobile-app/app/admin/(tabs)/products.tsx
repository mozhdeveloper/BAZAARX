import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  TextInput,
  Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Menu, Bell, Package, Search, Edit, Ban, CheckCircle, Eye, XCircle, X } from 'lucide-react-native';
import { safeImageUri } from '../../../src/utils/imageUtils';
import AdminDrawer from '../../../src/components/AdminDrawer';
import { useAdminProducts } from '../../../src/stores/adminStore';
import { COLORS } from '../../../src/constants/theme';

export default function AdminProductsScreen() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { products, isLoading, loadProducts, deactivateProduct, activateProduct } = useAdminProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'banned'>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [deactivateDialogVisible, setDeactivateDialogVisible] = useState(false);
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  
  // Edit form states
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  // Focus states
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  
  const insets = useSafeAreaInsets();

  // Reload products every time screen comes into focus (e.g., when switching accounts)
  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [])
  );

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sellerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
    const matchesVerified = verifiedFilter === 'all' || 
                           (verifiedFilter === 'verified' && product.isVerified) ||
                           (verifiedFilter === 'unverified' && !product.isVerified);
    return matchesSearch && matchesStatus && matchesVerified;
  });

  const getStatusConfig = (status: string) => {
    const configs = {
      active: { bg: '#D1FAE5', color: '#059669', text: 'Active' },
      inactive: { bg: '#F3F4F6', color: '#6B7280', text: 'Inactive' },
      banned: { bg: '#FEE2E2', color: '#DC2626', text: 'Banned' },
    };
    return configs[status as keyof typeof configs] || configs.inactive;
  };

  const handleDeactivateClick = (product: any) => {
    setSelectedProduct(product);
    setDeactivateReason('');
    setDeactivateDialogVisible(true);
  };

  const handleConfirmDeactivate = async () => {
    if (selectedProduct && deactivateReason) {
      await deactivateProduct(selectedProduct.id, deactivateReason);
      setDeactivateDialogVisible(false);
      setSelectedProduct(null);
    }
  };

  const handleActivateClick = async (product: any) => {
    await activateProduct(product.id);
  };

  const handleEditClick = (product: any) => {
    setSelectedProduct(product);
    setEditName(product.name);
    setEditPrice(product.price.toString());
    setEditStock(product.stock.toString());
    setEditDescription(product.description || '');
    setEditDialogVisible(true);
  };

  const handleSaveChanges = async () => {
    if (selectedProduct && editName && editPrice && editStock) {
      // TODO: Add updateProduct function to adminStore
      // For now, we'll just log and reload
      console.log('Product update:', {
        id: selectedProduct.id,
        name: editName,
        price: parseFloat(editPrice),
        stock: parseInt(editStock),
        description: editDescription
      });
      
      setEditDialogVisible(false);
      setSelectedProduct(null);
      
      // Reload products after update
      await loadProducts();
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.menuButton} onPress={() => setDrawerVisible(true)}>
              <Menu size={24} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Products</Text>
              <Text style={styles.headerSubtitle}>{products.length} total products</Text>
            </View>
          </View>
          <Pressable style={styles.notificationButton}>
            <Bell size={22} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products or sellers..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        
        <Text style={styles.filterLabel}>Status</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
          {['all', 'active', 'inactive', 'banned'].map((filter) => (
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

        <Text style={styles.filterLabel}>Verification</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
          {[
            { key: 'all', label: 'All Products' },
            { key: 'verified', label: 'Verified' },
            { key: 'unverified', label: 'Unverified' }
          ].map((filter) => (
            <Pressable
              key={filter.key}
              style={[styles.filterChip, verifiedFilter === filter.key && styles.filterChipActive]}
              onPress={() => setVerifiedFilter(filter.key as any)}
            >
              <Text style={[styles.filterChipText, verifiedFilter === filter.key && styles.filterChipTextActive]}>
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView}>
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.centerContent}>
            <Package size={64} color="#D1D5DB" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No products found</Text>
          </View>
        ) : (
          filteredProducts.map((product) => {
            const statusConfig = getStatusConfig(product.status);
            return (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.cardHeader}>
                  <Image source={{ uri: safeImageUri(product.images?.[0]) }} style={styles.productImage} />
                  <View style={styles.productInfo}>
                    <View style={styles.productNameRow}>
                      <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                      {product.isVerified && (
                        <View style={styles.verifiedBadge}>
                          <CheckCircle size={14} color="#10B981" strokeWidth={2.5} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.productCategory}>{product.category}</Text>
                    <Text style={styles.sellerName}>{product.sellerName}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.text}</Text>
                  </View>
                </View>

                <View style={styles.priceStockRow}>
                  <View style={styles.priceBox}>
                    <Text style={styles.priceLabel}>Price</Text>
                    <Text style={styles.priceValue}>₱{product.price.toLocaleString()}</Text>
                  </View>
                  <View style={styles.stockBox}>
                    <Text style={styles.stockLabel}>Stock</Text>
                    <Text style={styles.stockValue}>{product.stock}</Text>
                  </View>
                  <View style={styles.statsBox}>
                    <Text style={styles.statsLabel}>Sales</Text>
                    <Text style={styles.statsValue}>{product.sales}</Text>
                  </View>
                  <View style={styles.statsBox}>
                    <Text style={styles.statsLabel}>Rating</Text>
                    <Text style={styles.statsValue}>{product.rating} ⭐</Text>
                  </View>
                </View>

                <View style={styles.actionsRow}>
                  <Pressable style={styles.actionButton}>
                    <Eye size={16} color="#6B7280" />
                  </Pressable>
                  <Pressable style={styles.actionButton} onPress={() => handleEditClick(product)}>
                    <Edit size={16} color="#3B82F6" />
                  </Pressable>
                  {product.status === 'banned' ? (
                    <Pressable style={styles.actionButton} onPress={() => handleActivateClick(product)}>
                      <CheckCircle size={16} color="#059669" />
                    </Pressable>
                  ) : (
                    <Pressable style={styles.actionButton} onPress={() => handleDeactivateClick(product)}>
                      <Ban size={16} color="#DC2626" />
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Edit Product Dialog */}
      <Modal visible={editDialogVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Product</Text>
                <Text style={styles.modalSubtitle}>
                  Update the details for "{selectedProduct?.name}"
                </Text>
              </View>
              <Pressable onPress={() => setEditDialogVisible(false)}>
                <X size={24} color="#6B7280" />
              </Pressable>
            </View>
            
            <ScrollView style={styles.editModalBody}>
              <Text style={styles.inputLabel}>Product Name</Text>
              <TextInput
                style={[styles.textInput, focusedInput === 'name' && styles.textInputFocused]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter product name"
                placeholderTextColor="#9CA3AF"
                onFocus={() => setFocusedInput('name')}
                onBlur={() => setFocusedInput(null)}
              />

              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Price (₱)</Text>
                  <TextInput
                    style={[styles.textInput, focusedInput === 'price' && styles.textInputFocused]}
                    value={editPrice}
                    onChangeText={setEditPrice}
                    placeholder="2499"
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                    onFocus={() => setFocusedInput('price')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Stock</Text>
                  <TextInput
                    style={[styles.textInput, focusedInput === 'stock' && styles.textInputFocused]}
                    value={editStock}
                    onChangeText={setEditStock}
                    placeholder="20"
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                    onFocus={() => setFocusedInput('stock')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, focusedInput === 'description' && styles.textInputFocused]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Enter product description"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                onFocus={() => setFocusedInput('description')}
                onBlur={() => setFocusedInput(null)}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelButton} onPress={() => setEditDialogVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.saveButton, (!editName || !editPrice || !editStock) && styles.saveButtonDisabled]} 
                onPress={handleSaveChanges}
                disabled={!editName || !editPrice || !editStock}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Deactivate Dialog */}
      <Modal visible={deactivateDialogVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Deactivate Product</Text>
              <Pressable onPress={() => setDeactivateDialogVisible(false)}>
                <XCircle size={24} color="#6B7280" />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalDesc}>
                Are you sure you want to deactivate "{selectedProduct?.name}"? This will hide the product from the marketplace.
              </Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Reason for deactivation..."
                placeholderTextColor="#9CA3AF"
                value={deactivateReason}
                onChangeText={setDeactivateReason}
                multiline
                numberOfLines={3}
              />
            </View>
            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelButton} onPress={() => setDeactivateDialogVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.deactivateButton, !deactivateReason && styles.deactivateButtonDisabled]} 
                onPress={handleConfirmDeactivate}
                disabled={!deactivateReason}
              >
                <Text style={styles.deactivateButtonText}>Deactivate</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <AdminDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  header: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingBottom: 10, borderBottomLeftRadius: 30, borderBottomRightRadius: 20 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuButton: { padding: 4 },
  headerTitleContainer: { gap: 2 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 14, color: '#FFFFFF', opacity: 0.95, fontWeight: '500' },
  notificationButton: { padding: 4 },
  filtersContainer: { backgroundColor: '#FFFFFF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 12, marginBottom: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: '#111827' },
  filterLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 8 },
  filterScrollView: { flexGrow: 0, marginBottom: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterChipText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  filterChipTextActive: { color: '#FFFFFF' },
  scrollView: { flex: 1, padding: 16 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 16 },
  productCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  productImage: { width: 60, height: 60, borderRadius: 8 },
  productInfo: { flex: 1, gap: 4 },
  productNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  productName: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  verifiedBadge: { 
    backgroundColor: '#D1FAE5', 
    borderRadius: 12, 
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  productCategory: { fontSize: 12, color: '#6B7280' },
  sellerName: { fontSize: 13, color: '#374151' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  priceStockRow: { flexDirection: 'row', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 },
  priceBox: { flex: 1 },
  priceLabel: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
  priceValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  stockBox: { flex: 1 },
  stockLabel: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
  stockValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  statsBox: { flex: 1 },
  statsLabel: { fontSize: 11, color: '#6B7280', marginBottom: 2 },
  statsValue: { fontSize: 12, fontWeight: '500', color: '#374151' },
  actionsRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  actionButton: { padding: 8, borderRadius: 8, backgroundColor: '#F9FAFB' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  editModalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  modalSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  modalBody: { padding: 20 },
  editModalBody: { padding: 20, maxHeight: 400 },
  modalDesc: { fontSize: 14, color: '#6B7280', marginBottom: 16, lineHeight: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8, marginTop: 12 },
  textInput: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 8, 
    padding: 12, 
    fontSize: 15, 
    color: '#111827', 
    borderWidth: 2, 
    borderColor: '#E5E7EB',
    marginBottom: 4
  },
  textInputFocused: {
    borderColor: COLORS.primary
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputHalf: { flex: 1 },
  reasonInput: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, fontSize: 14, color: '#111827', borderWidth: 1, borderColor: '#E5E7EB', height: 80, textAlignVertical: 'top' },
  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  deactivateButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#DC2626', alignItems: 'center' },
  deactivateButtonDisabled: { backgroundColor: '#FCA5A5', opacity: 0.5 },
  deactivateButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  saveButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveButtonDisabled: { backgroundColor: '#FCA5A5', opacity: 0.5 },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});