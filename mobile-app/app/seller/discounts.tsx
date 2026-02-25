import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Pressable, RefreshControl, ActivityIndicator, Alert, Modal, TextInput, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SellerStackParamList } from './SellerStack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Zap, Plus, Search, Calendar, Package, MoreVertical, Play, Pause, Trash2, Clock, X, ChevronDown, Check, Edit2, ShoppingBag, XCircle } from 'lucide-react-native';
import { useSellerStore } from '../../src/stores/sellerStore';
import { discountService } from '../../src/services/discountService';
import { ProductService } from '../../src/services/productService';
import type { DiscountCampaign, CampaignType, DiscountType, AppliesTo } from '../../src/types/discount';
import { campaignTypeLabels } from '../../src/types/discount';
import type { ProductWithSeller } from '../../src/types/database.types';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function SellerDiscountsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SellerStackParamList>>();
  const insets = useSafeAreaInsets();
  const { seller } = useSellerStore();
  
  const [campaigns, setCampaigns] = useState<DiscountCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'scheduled' | 'ended'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editingCampaign, setEditingCampaign] = useState<DiscountCampaign | null>(null);
  const [selectedCampaignForProducts, setSelectedCampaignForProducts] = useState<DiscountCampaign | null>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [activeDropdown, setActiveDropdown] = useState<'campaignType' | 'discountType' | 'appliesTo' | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [sellerProducts, setSellerProducts] = useState<ProductWithSeller[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    campaignType: 'flash_sale' as CampaignType,
    discountType: 'percentage' as DiscountType,
    discountValue: '',
    maxDiscountAmount: '',
    minPurchaseAmount: '',
    startsAt: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    endsAt: new Date(Date.now() + 86400000 * 7).toISOString(), // 1 week
    badgeText: '',
    badgeColor: '#FF6A00',
    claimLimit: '',
    perCustomerLimit: '1',
    appliesTo: 'all_products' as AppliesTo,
    selectedProducts: [] as string[],
  });

  // Removed duplicate resetForm

  const resetForm = () => {
    setEditingCampaign(null);
    setSelectedCampaignForProducts(null);
    setFormData({
      name: '',
      description: '',
      campaignType: 'flash_sale',
      discountType: 'percentage',
      discountValue: '',
      maxDiscountAmount: '',
      minPurchaseAmount: '',
      startsAt: new Date(Date.now() + 86400000).toISOString(),
      endsAt: new Date(Date.now() + 86400000 * 7).toISOString(),
      badgeText: '',
      badgeColor: '#FF6A00',
      claimLimit: '',
      perCustomerLimit: '1',
      appliesTo: 'all_products',
      selectedProducts: [],
    });
  };

  const [activeContextMenu, setActiveContextMenu] = useState<string | null>(null);
  const [datePickerConfig, setDatePickerConfig] = useState<{
    visible: boolean;
    mode: 'date' | 'time';
    field: 'startsAt' | 'endsAt' | null;
  }>({ visible: false, mode: 'date', field: null });

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setDatePickerConfig(prev => ({ ...prev, visible: false }));
    }
    
    if (selectedDate && datePickerConfig.field) {
      const currentStr = formData[datePickerConfig.field];
      const currentDate = new Date(currentStr);
      
      if (datePickerConfig.mode === 'date') {
        currentDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        setFormData({ ...formData, [datePickerConfig.field]: currentDate.toISOString() });
      } else {
        currentDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
        setFormData({ ...formData, [datePickerConfig.field]: currentDate.toISOString() });
      }
    }
  };

  const handleCreateCampaign = async () => {
    if (!seller?.id) return;
    if (!formData.name || !formData.discountValue) {
      Alert.alert('Validation Error', 'Please fill in the required fields (Name, Discount Value).');
      return;
    }

    if (new Date(formData.startsAt).getTime() >= new Date(formData.endsAt).getTime()) {
      Alert.alert('Validation Error', 'End Date must be after Start Date.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCampaign) {
        await discountService.updateCampaign(editingCampaign.id, {
          name: formData.name,
          description: formData.description,
          campaignType: formData.campaignType,
          discountType: formData.discountType,
          discountValue: parseFloat(formData.discountValue),
          maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : undefined,
          minPurchaseAmount: formData.minPurchaseAmount ? parseFloat(formData.minPurchaseAmount) : 0,
          startsAt: new Date(formData.startsAt),
          endsAt: new Date(formData.endsAt),
          badgeText: formData.badgeText,
          badgeColor: formData.badgeColor,
          claimLimit: formData.claimLimit ? parseInt(formData.claimLimit) : undefined,
          perCustomerLimit: parseInt(formData.perCustomerLimit),
          appliesTo: formData.appliesTo,
        });

        // For updates, product management is handled in a separate modal to keep it simple,
        // so we don't automatically overwrite products here unless appliesTo changes from specific_products
        
        Alert.alert('Success', 'Campaign updated!');
      } else {
        const newCampaign = await discountService.createCampaign({
          sellerId: seller.id,
          name: formData.name,
          description: formData.description,
          campaignType: formData.campaignType,
          discountType: formData.discountType,
          discountValue: parseFloat(formData.discountValue),
          maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : undefined,
          minPurchaseAmount: formData.minPurchaseAmount ? parseFloat(formData.minPurchaseAmount) : 0,
          startsAt: new Date(formData.startsAt),
          endsAt: new Date(formData.endsAt),
          badgeText: formData.badgeText,
          badgeColor: formData.badgeColor,
          claimLimit: formData.claimLimit ? parseInt(formData.claimLimit) : undefined,
          perCustomerLimit: parseInt(formData.perCustomerLimit),
          appliesTo: formData.appliesTo,
        });

        if (formData.appliesTo === 'specific_products' && formData.selectedProducts.length > 0) {
          await discountService.addProductsToCampaign(
            newCampaign.id,
            seller.id,
            formData.selectedProducts,
            formData.selectedProducts.map(id => ({
              productId: id,
              discountType: formData.discountType,
              discountValue: parseFloat(formData.discountValue),
            }))
          );
        }
        Alert.alert('Success', 'Campaign created!');
      }

      setIsCreateModalOpen(false);
      resetForm();
      fetchCampaigns();
    } catch (error) {
      console.error('Failed to create campaign:', error);
      Alert.alert('Error', 'Failed to create campaign.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchProducts = async () => {
    if (!seller?.id) return;
    setLoadingProducts(true);
    try {
      if (sellerProducts.length === 0) {
        const products = await ProductService.getInstance().getProducts({ sellerId: seller.id });
        setSellerProducts(products);
      }
      
      // If we are opening this for an existing campaign, pre-select those products
      if (selectedCampaignForProducts) {
        const campaignProducts = await discountService.getProductsInCampaign(selectedCampaignForProducts.id);
        const selectedIds = campaignProducts.map(p => p.productId);
        setFormData(prev => ({ ...prev, selectedProducts: selectedIds }));
      }
    } catch (e) {
      console.error('Failed to fetch products:', e);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (isProductModalOpen) {
      fetchProducts();
    }
  }, [isProductModalOpen]);

  const fetchCampaigns = async () => {
    if (!seller?.id) return;
    try {
      const data = await discountService.getCampaignsBySeller(seller.id);
      setCampaigns(data || []);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      Alert.alert('Error', 'Could not load campaigns');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [seller?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCampaigns();
  };

  const handleToggleStatus = async (campaign: DiscountCampaign) => {
    if (campaign.status === 'ended' || campaign.status === 'cancelled') return;
    
    const pause = campaign.status !== 'paused';
    try {
      await discountService.toggleCampaignStatus(campaign.id, pause);
      fetchCampaigns();
    } catch (e) {
      Alert.alert('Error', 'Failed to toggle status');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Campaign', 'Are you sure you want to delete this campaign?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            await discountService.deleteCampaign(id);
            fetchCampaigns();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete campaign');
          }
        }
      }
    ]);
  };

  const handleEditCampaign = (campaign: DiscountCampaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      campaignType: campaign.campaignType,
      discountType: campaign.discountType,
      discountValue: campaign.discountValue.toString(),
      maxDiscountAmount: campaign.maxDiscountAmount?.toString() || '',
      minPurchaseAmount: campaign.minPurchaseAmount?.toString() || '',
      startsAt: new Date(campaign.startsAt).toISOString(),
      endsAt: new Date(campaign.endsAt).toISOString(),
      badgeText: campaign.badgeText || '',
      badgeColor: campaign.badgeColor || '#FF6A00',
      claimLimit: campaign.claimLimit?.toString() || '',
      perCustomerLimit: campaign.perCustomerLimit.toString(),
      appliesTo: campaign.appliesTo,
      selectedProducts: [],
    });
    setIsCreateModalOpen(true);
  };

  const handleManageProducts = (campaign: DiscountCampaign) => {
    setSelectedCampaignForProducts(campaign);
    setIsProductModalOpen(true);
  };

  const handleSaveCampaignProducts = async () => {
    if (!seller?.id || !selectedCampaignForProducts) {
      setIsProductModalOpen(false);
      return;
    }
    
    setIsSubmitting(true);
    try {
      await discountService.addProductsToCampaign(
        selectedCampaignForProducts.id,
        seller.id,
        formData.selectedProducts,
        formData.selectedProducts.map(id => ({
          productId: id,
          discountType: selectedCampaignForProducts.discountType,
          discountValue: selectedCampaignForProducts.discountValue,
        }))
      );
      Alert.alert('Success', 'Products updated!');
      setIsProductModalOpen(false);
      setSelectedCampaignForProducts(null);
    } catch (e) {
      console.error('Failed to update products', e);
      Alert.alert('Error', 'Failed to update campaign products');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === 'all') return matchesSearch;
    if (filter === 'ended') return matchesSearch && (c.status === 'ended' || c.status === 'cancelled');
    return matchesSearch && c.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981'; // green
      case 'scheduled': return '#3B82F6'; // blue
      case 'paused': return '#F59E0B'; // yellow
      case 'ended': 
      case 'cancelled': 
        return '#6B7280'; // gray
      default: return '#6B7280';
    }
  };

  const activeCount = campaigns.filter(c => c.status === 'active').length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
            <ArrowLeft size={24} color="#1F2937" strokeWidth={2.5} />
          </Pressable>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Discounts</Text>
            <Text style={styles.headerSubtitle}>Manage your promotional campaigns</Text>
          </View>
          <Pressable onPress={() => setIsCreateModalOpen(true)} style={styles.headerIconButton}>
            <Plus size={24} color="#D97706" strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Active Campaigns</Text>
          <Text style={styles.statValue}>{activeCount}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Campaigns</Text>
          <Text style={styles.statValue}>{campaigns.length}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search campaigns..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <XCircle size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {(['all', 'active', 'scheduled', 'ended'] as const).map(tab => (
            <TouchableOpacity 
              key={tab} 
              style={[styles.tab, filter === tab && styles.activeTab]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[styles.tabText, filter === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Campaigns List */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#D97706']} />}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#D97706" />
          </View>
        ) : filteredCampaigns.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Zap size={32} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No Campaigns Found</Text>
            <Text style={styles.emptySubtext}>You don't have any {filter !== 'all' ? filter : ''} discount campaigns yet.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredCampaigns.map(campaign => (
              <View key={campaign.id} style={styles.campaignCard}>
                <View style={[styles.campaignHeader, { zIndex: activeContextMenu === campaign.id ? 100 : 1 }]}>
                  <View style={styles.campaignHeaderLeft}>
                    <Text style={styles.campaignName} numberOfLines={1}>{campaign.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(campaign.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(campaign.status) }]}>
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Context Menu Icon */}
                  <TouchableOpacity onPress={() => setActiveContextMenu(activeContextMenu === campaign.id ? null : campaign.id)} style={{ padding: 4 }}>
                    <MoreVertical size={20} color="#6B7280" />
                  </TouchableOpacity>
                  
                  {/* Context Menu Dropdown */}
                  {activeContextMenu === campaign.id && (
                    <View style={styles.contextMenu}>
                      <TouchableOpacity 
                        style={styles.contextMenuItem} 
                        onPress={() => {
                          setActiveContextMenu(null);
                          handleEditCampaign(campaign);
                        }}
                      >
                        <Edit2 size={16} color="#4B5563" />
                        <Text style={styles.contextMenuText}>Edit</Text>
                      </TouchableOpacity>
                      <View style={styles.contextMenuDivider} />
                      <TouchableOpacity 
                        style={styles.contextMenuItem} 
                        onPress={() => {
                          setActiveContextMenu(null);
                          handleDelete(campaign.id);
                        }}
                      >
                        <Trash2 size={16} color="#EF4444" />
                        <Text style={[styles.contextMenuText, { color: '#EF4444' }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {campaign.description ? (
                  <Text style={styles.campaignDesc} numberOfLines={2}>{campaign.description}</Text>
                ) : null}

                <View style={styles.campaignDetails}>
                  <View style={styles.detailRow}>
                    <Zap size={14} color="#6B7280" />
                    <Text style={styles.detailText}>
                      {campaign.discountValue}{campaign.discountType === 'percentage' ? '%' : '₱'} OFF
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Calendar size={14} color="#6B7280" />
                    <Text style={styles.detailText}>
                      {new Date(campaign.startsAt).toLocaleDateString()} - {new Date(campaign.endsAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Package size={14} color="#6B7280" />
                    <Text style={styles.detailText}>{campaign.usageCount} used</Text>
                  </View>
                </View>

                <View style={[styles.campaignActions, { flexWrap: 'wrap', gap: 8, zIndex: 0 }]}>
                  {(campaign.status === 'active' || campaign.status === 'paused') && (
                    <TouchableOpacity 
                      style={[styles.actionBtn, { flex: campaign.appliesTo === 'specific_products' ? 0.5 : 1 }]} 
                      onPress={() => handleToggleStatus(campaign)}
                    >
                      {campaign.status === 'paused' ? <Play size={18} color="#10B981" /> : <Pause size={18} color="#F59E0B" />}
                      <Text style={styles.actionBtnText}>
                        {campaign.status === 'paused' ? 'Resume' : 'Pause'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {campaign.appliesTo === 'specific_products' && (
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB', flex: campaign.status === 'active' || campaign.status === 'paused' ? 0.5 : 1 }]} 
                      onPress={() => handleManageProducts(campaign)}
                    >
                      <ShoppingBag size={18} color="#4B5563" />
                      <Text style={[styles.actionBtnText, { color: '#4B5563' }]}>Products</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create / Edit Campaign Modal */}
      <Modal visible={isCreateModalOpen} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modalHeaderContainer}>
          <View style={styles.modalHeaderTop}>
            <Text style={styles.modalTitle}>{editingCampaign ? 'Edit Campaign' : 'Create Campaign'}</Text>
            <TouchableOpacity onPress={() => { setIsCreateModalOpen(false); resetForm(); }} style={styles.headerIconButton}>
              <X size={24} color="#1F2937" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
          <Text style={styles.inputLabel}>Campaign Name *</Text>
          <TextInput
            style={styles.textInput}
            value={formData.name}
            onChangeText={(t) => setFormData({ ...formData, name: t })}
            placeholder="e.g., Weekend Flash Sale"
          />

          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
            value={formData.description}
            onChangeText={(t) => setFormData({ ...formData, description: t })}
            placeholder="Brief description of the campaign"
            multiline
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>Campaign Type *</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setActiveDropdown('campaignType')}
              >
                <Text style={styles.dropdownButtonText}>
                  {campaignTypeLabels[formData.campaignType] || 'Select'}
                </Text>
                <ChevronDown size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>Discount Type *</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setActiveDropdown('discountType')}
              >
                <Text style={styles.dropdownButtonText}>
                  {formData.discountType === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                </Text>
                <ChevronDown size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>Discount Value * {formData.discountType === 'percentage' ? '(%)' : '(₱)'}</Text>
              <TextInput
                style={styles.textInput}
                value={formData.discountValue}
                onChangeText={(t) => setFormData({ ...formData, discountValue: t })}
                placeholder="e.g. 10"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>Max Discount (₱)</Text>
              <TextInput
                style={styles.textInput}
                value={formData.maxDiscountAmount}
                onChangeText={(t) => setFormData({ ...formData, maxDiscountAmount: t })}
                placeholder="Optional"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={styles.inputLabel}>Starts At *</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={[styles.dateInputContainer, { flex: 1 }]} onPress={() => setDatePickerConfig({ visible: true, mode: 'date', field: 'startsAt' })}>
                <Text style={[styles.textInput, styles.dateInput, { paddingTop: 10 }]}>
                  {new Date(formData.startsAt).toLocaleDateString()}
                </Text>
                <Calendar size={16} color="#6B7280" style={styles.dateIcon} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dateInputContainer, { flex: 1 }]} onPress={() => setDatePickerConfig({ visible: true, mode: 'time', field: 'startsAt' })}>
                <Text style={[styles.textInput, styles.dateInput, { paddingTop: 10 }]}>
                  {new Date(formData.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Clock size={16} color="#6B7280" style={styles.dateIcon} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={styles.inputLabel}>Ends At *</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={[styles.dateInputContainer, { flex: 1 }]} onPress={() => setDatePickerConfig({ visible: true, mode: 'date', field: 'endsAt' })}>
                <Text style={[styles.textInput, styles.dateInput, { paddingTop: 10 }]}>
                  {new Date(formData.endsAt).toLocaleDateString()}
                </Text>
                <Calendar size={16} color="#6B7280" style={styles.dateIcon} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dateInputContainer, { flex: 1 }]} onPress={() => setDatePickerConfig({ visible: true, mode: 'time', field: 'endsAt' })}>
                <Text style={[styles.textInput, styles.dateInput, { paddingTop: 10 }]}>
                  {new Date(formData.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Clock size={16} color="#6B7280" style={styles.dateIcon} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>Badge Text</Text>
              <TextInput
                style={styles.textInput}
                value={formData.badgeText}
                onChangeText={(t) => setFormData({ ...formData, badgeText: t })}
                placeholder="FLASH SALE 30% OFF"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>Badge Color</Text>
              <View style={styles.colorPickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
                  {[
                    '#EF4444', '#DC2626', '#991B1B', // Reds
                    '#F97316', '#EA580C', '#9A3412', // Oranges
                    '#F59E0B', '#D97706', '#B45309', // Ambers
                    '#10B981', '#059669', '#065F46', // Greens
                    '#3B82F6', '#2563EB', '#1E3A8A', // Blues
                    '#6366F1', '#4F46E5', '#312E81', // Indigos
                    '#8B5CF6', '#7C3AED', '#4C1D95', // Purples
                    '#EC4899', '#DB2777', '#831843', // Pinks
                    '#9CA3AF', '#4B5563', '#111827', // Grays/Blacks
                  ].map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[styles.colorCircle, formData.badgeColor === color && styles.colorCircleActive, { backgroundColor: color }]}
                      onPress={() => setFormData({ ...formData, badgeColor: color })}
                    />
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>Per Customer Limit *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.perCustomerLimit}
                onChangeText={(t) => setFormData({ ...formData, perCustomerLimit: t })}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>Claim Limit</Text>
              <TextInput
                style={styles.textInput}
                value={formData.claimLimit}
                onChangeText={(t) => setFormData({ ...formData, claimLimit: t })}
                placeholder="Optional"
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Apply Discount To *</Text>
          <TouchableOpacity
            style={[styles.dropdownButton, { width: '100%' }, editingCampaign && { opacity: 0.6 }]}
            onPress={() => !editingCampaign && setActiveDropdown('appliesTo')}
            disabled={!!editingCampaign}
          >
            <Text style={styles.dropdownButtonText}>
              {formData.appliesTo === 'all_products' ? 'All Products' : 'Specific Products'}
            </Text>
            {!editingCampaign && <ChevronDown size={16} color="#6B7280" />}
          </TouchableOpacity>

          {formData.appliesTo === 'specific_products' && !editingCampaign && (
            <TouchableOpacity style={styles.selectProductsBtn} onPress={() => setIsProductModalOpen(true)}>
              <Text style={styles.selectProductsBtnText}>
                Select Products ({formData.selectedProducts.length} selected)
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.submitBtn, (!formData.name || !formData.discountValue || isSubmitting) && styles.submitBtnDisabled]}
            onPress={handleCreateCampaign}
            disabled={!formData.name || !formData.discountValue || isSubmitting}
          >
            {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>{editingCampaign ? 'Save Changes' : 'Create Campaign'}</Text>}
          </TouchableOpacity>
          
          <View style={{ height: 80 }} />
        </ScrollView>
        {Platform.OS === 'ios' && datePickerConfig.visible && (
          <Modal transparent animationType="slide">
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <View style={{ backgroundColor: 'white', paddingBottom: insets.bottom }}>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                  <TouchableOpacity onPress={() => setDatePickerConfig({ visible: false, mode: 'date', field: null })}>
                    <Text style={{ color: '#D97706', fontWeight: 'bold', fontSize: 16 }}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={new Date(formData[datePickerConfig.field!] || Date.now())}
                  mode={datePickerConfig.mode}
                  display="spinner"
                  onChange={onDateChange}
                />
              </View>
            </View>
          </Modal>
        )}
        {Platform.OS === 'android' && datePickerConfig.visible && (
          <DateTimePicker
            value={new Date(formData[datePickerConfig.field!] || Date.now())}
            mode={datePickerConfig.mode}
            display="default"
            onChange={onDateChange}
          />
        )}
        
        {/* Dropdown Options Overlay */}
        {activeDropdown !== null && (
          <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}>
            <Pressable style={styles.dropdownOverlay} onPress={() => setActiveDropdown(null)}>
              <View style={styles.dropdownContent}>
                {activeDropdown === 'campaignType' && Object.entries(campaignTypeLabels).map(([val, label]) => (
                  <TouchableOpacity key={val} style={styles.dropdownOption} onPress={() => { setFormData({...formData, campaignType: val as CampaignType}); setActiveDropdown(null); }}>
                    <Text style={styles.dropdownOptionText}>{label}</Text>
                    {formData.campaignType === val && <Check size={18} color="#D97706" />}
                  </TouchableOpacity>
                ))}
                {activeDropdown === 'discountType' && [
                  { val: 'percentage', label: 'Percentage' },
                  { val: 'fixed_amount', label: 'Fixed Amount' }
                ].map(({val, label}) => (
                  <TouchableOpacity key={val} style={styles.dropdownOption} onPress={() => { setFormData({...formData, discountType: val as DiscountType}); setActiveDropdown(null); }}>
                    <Text style={styles.dropdownOptionText}>{label}</Text>
                    {formData.discountType === val && <Check size={18} color="#D97706" />}
                  </TouchableOpacity>
                ))}
                {activeDropdown === 'appliesTo' && [
                  { val: 'all_products', label: 'All Products' },
                  { val: 'specific_products', label: 'Specific Products' }
                ].map(({val, label}) => (
                  <TouchableOpacity key={val} style={styles.dropdownOption} onPress={() => { setFormData({...formData, appliesTo: val as AppliesTo}); setActiveDropdown(null); }}>
                    <Text style={styles.dropdownOptionText}>{label}</Text>
                    {formData.appliesTo === val && <Check size={18} color="#D97706" />}
                  </TouchableOpacity>
                ))}
              </View>
            </Pressable>
          </View>
        )}
      </Modal>

      {/* Product Select Modal */}
      <Modal visible={isProductModalOpen} animationType="slide" presentationStyle="formSheet">
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F3F4F6' }]}>
          <View style={styles.modalHeaderContainer}>
            <View style={styles.modalHeaderTop}>
              <Text style={styles.modalTitle}>Select Products</Text>
              <TouchableOpacity onPress={() => {
                setIsProductModalOpen(false);
                if (selectedCampaignForProducts) setSelectedCampaignForProducts(null);
              }} style={styles.headerIconButton}>
                <X size={24} color="#1F2937" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
          {loadingProducts ? (
             <View style={styles.centerContainer}><ActivityIndicator color="#D97706" /></View>
          ) : (
            <View style={{ flex: 1 }}>
              <ScrollView style={styles.modalScroll} contentContainerStyle={[styles.modalContent, { paddingBottom: 100 }]}>
                {sellerProducts.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Package size={32} color="#9CA3AF" />
                  <Text style={styles.emptyTitle}>No Products Found</Text>
                  <Text style={styles.emptySubtext}>You don't have any products to include in this campaign.</Text>
                </View>
              ) : (
                sellerProducts.map(product => {
                  const isSelected = formData.selectedProducts.includes(product.id);
                  return (
                    <TouchableOpacity 
                      key={product.id} 
                      style={[styles.productSelectCard, isSelected && styles.productSelectCardActive]}
                      onPress={() => {
                        const newArr = isSelected 
                          ? formData.selectedProducts.filter(id => id !== product.id)
                          : [...formData.selectedProducts, product.id];
                        setFormData({...formData, selectedProducts: newArr});
                      }}
                    >
                      <View style={styles.productSelectLeft}>
                        <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                          {isSelected && <Check size={14} color="#FFF" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.productSelectName} numberOfLines={1}>{product.name}</Text>
                          <Text style={styles.productSelectPrice}>₱{product.price}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
              </ScrollView>
              {selectedCampaignForProducts && (
                <View style={[styles.modalFooter, { backgroundColor: '#FFF', position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: insets.bottom || 20 }]}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                    setIsProductModalOpen(false);
                    setSelectedCampaignForProducts(null);
                  }}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]} 
                    onPress={handleSaveCampaignProducts}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Products</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerContainer: {
    backgroundColor: '#FFF4EC',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIconButton: { 
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 10,
    borderRadius: 12,
  },
  headerTitleRow: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937' },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  tabsContainer: {
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 24,
  },
  tab: {
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#D97706',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#D97706',
  },
  scrollView: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  centerContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  campaignCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  campaignHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  campaignName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  campaignDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  campaignDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  campaignActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    height: 44, // Increased height for better tap target
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contextMenu: {
    position: 'absolute',
    top: 30,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 4,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 100,
  },
  contextMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  contextMenuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 8,
  },
  contextMenuText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  modalHeaderContainer: {
    backgroundColor: '#FFF4EC',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  modalHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
  },
  modalScroll: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  typeBtnActive: {
    backgroundColor: '#FFF4EC',
    borderColor: '#D97706',
  },
  typeBtnText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  typeBtnTextActive: {
    color: '#D97706',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#111827',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
  },
  dateInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingRight: 40, 
  },
  dateIcon: {
    position: 'absolute',
    right: 12,
  },
  colorPickerContainer: {
    height: 48,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 4,
  },
  colorPreview: {
    flex: 1,
    borderRadius: 6,
  },
  submitBtn: {
    backgroundColor: '#D97706',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: {
    backgroundColor: '#FCD34D',
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dropdownContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleActive: {
    borderColor: '#111827',
  },
  productSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 8,
  },
  productSelectCardActive: {
    borderColor: '#D97706',
    backgroundColor: '#FFF4EC',
  },
  productSelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  productSelectName: {
    fontSize: 15,
    color: '#111827',
    flexShrink: 1,
    marginBottom: 4,
  },
  productSelectPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  selectProductsBtn: {
    backgroundColor: '#F3F4F6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectProductsBtnText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 15,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: '#111827',
  },
  clearSearchBtn: {
    padding: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFF',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  saveBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#FCD34D',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});
