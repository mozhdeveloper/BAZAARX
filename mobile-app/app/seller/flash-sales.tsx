import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  Alert,
  Modal, // Added Modal import
  KeyboardAvoidingView, // Added KeyboardAvoidingView import
  Platform, // Added Platform import
  TextInput, // Added TextInput import
  FlatList, // Added FlatList import
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SellerStackParamList } from './SellerStack';
import { ArrowLeft, Zap, Plus, Calendar, Clock, Edit, Trash2 } from 'lucide-react-native';
import { safeImageUri } from '../../src/utils/imageUtils';

import { flashSaleService, FlashSale, FlashSaleProduct } from '../../src/services/flashSaleService';

import { useProductStore, SellerProduct } from '../../src/stores/sellerStore';
import { useAuthStore } from '../../src/stores/sellerStore';

// Product Selection Modal Component
interface ProductSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (product: SellerProduct, flashPrice: number, stock: number) => void;
  editProduct?: FlashSaleProduct | null; // If provided, we are editing this product
}

const ProductSelectionModal = ({ visible, onClose, onSelect, editProduct }: ProductSelectionModalProps) => {
  const { products, fetchProducts } = useProductStore();
  const { seller } = useAuthStore();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [flashPrice, setFlashPrice] = React.useState('');
  const [stock, setStock] = React.useState('');

  React.useEffect(() => {
    if (visible) {
      if (editProduct) {
        // Edit Mode: Pre-fill with existing product data
        setSelectedId(editProduct.id);
        setFlashPrice(editProduct.flashPrice.toString());
        setStock(editProduct.stock.toString());
      } else {
        // Add Mode: Fetch full inventory and reset form
        if (seller?.id) {
          fetchProducts({ sellerId: seller.id });
        }
        setSelectedId(null); // Ensure no product is selected initially in Add mode
        setFlashPrice('');
        setStock('');
      }
    }
  }, [visible, seller, editProduct]);

  const handleSave = () => {
    // In Edit Mode, we use the editProduct.id. In Add Mode, we use selectedId from the list.
    const targetId = editProduct ? editProduct.id : selectedId;

    if (!targetId) {
      Alert.alert('Error', 'Please select a product');
      return;
    }

    // Find the full product details
    let product = products.find(p => p.id === targetId);

    if (!product && editProduct) {
       // Construct a partial SellerProduct from the FlashSaleProduct for the callback
       // This is safe because onSelect handles the update
       product = {
           id: editProduct.id,
           name: editProduct.name,
           price: editProduct.originalPrice,
           stock: 0, // Placeholder, validated below against actual input
           images: [editProduct.image],
           // ... other required fields can be mocked or ignored by the specialized handler
       } as SellerProduct;
    }

    if (!product) return;

    const price = parseFloat(flashPrice);
    const stockNum = parseInt(stock);

    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Invalid price');
      return;
    }
    // Validation: Price should be lower than original
    if (price >= product.price) {
      Alert.alert('Error', 'Flash price must be lower than original price');
      return;
    }
    if (isNaN(stockNum) || stockNum <= 0) {
      Alert.alert('Error', 'Invalid stock');
      return;
    }
    // Note: checking against max stock is tricky in edit mode if we don't fetch full product.
    // We'll skip stringent max stock validation in edit mode for now or rely on backend.
    
    onSelect(product, price, stockNum);
    onClose();
  };

  const handleBackToList = () => {
      setSelectedId(null);
      setFlashPrice('');
      setStock('');
  };

  const renderItem = ({ item }: { item: SellerProduct }) => (
    <TouchableOpacity 
      style={styles.modalProductItem}
      onPress={() => {
          setSelectedId(item.id);
          // Auto-focus logic or screen transition could happen here
      }}
    >
      <Image source={{ uri: safeImageUri(item.images[0]) }} style={styles.modalProductImage} />
      <View style={{ flex: 1 }}>
        <Text style={styles.modalProductName}>{item.name}</Text>
        <Text style={styles.modalProductPrice}>₱{item.price.toLocaleString()}</Text>
        <Text style={styles.modalProductStock}>Stock: {item.stock}</Text>
      </View>
      <View style={styles.iconButton}>
          <Plus size={20} color="#3B82F6" />
      </View>
    </TouchableOpacity>
  );

  // Helper to determine which product we are configuring
  const activeProduct = editProduct 
    ? { name: editProduct.name, price: editProduct.originalPrice, image: editProduct.image }
    : (selectedId ? products.find(p => p.id === selectedId) : null);

  const activeProductImage = activeProduct 
    ? (('image' in activeProduct) ? activeProduct.image : activeProduct?.images?.[0]) 
    : '';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            {/* Show Back button only if we are in Add Mode AND have selected a product (Config Step) */}
            {!editProduct && selectedId && (
                <TouchableOpacity onPress={handleBackToList} style={{ marginRight: 8, padding: 4 }}>
                    <ArrowLeft size={20} color="#4B5563" />
                </TouchableOpacity>
            )}
            <Text style={[styles.modalTitle, { marginBottom: 0 }]}>
                {editProduct ? 'Edit Flash Sale Product' : (selectedId ? 'Configure Product' : 'Select Product')}
            </Text>
          </View>
          
          {/* Show list only if we are in Add Mode AND have NOT selected a product yet */}
          {!editProduct && !selectedId && (
            <View style={{ maxHeight: 400 }}> 
                <FlatList
                data={products}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                style={styles.productList}
                />
            </View>
          )}

          {/* Show inputs if a product is selected (Config Step) or in Edit Mode */}
          {(selectedId || editProduct) && activeProduct && (
            <View style={styles.inputContainer}>
              {/* Always show product info here so they know what they are editing */}
              <View style={styles.readOnlyProductInfo}>
                  <Image source={{ uri: safeImageUri(activeProductImage) }} style={styles.modalProductImage} />
                  <View>
                      <Text style={styles.modalProductName}>{activeProduct.name}</Text>
                      <Text style={styles.modalProductPrice}>Original: ₱{activeProduct.price.toLocaleString()}</Text>
                  </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Flash Price (₱)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={flashPrice}
                  onChangeText={setFlashPrice}
                  placeholder="Enter discounted price"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Campaign Stock</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={stock}
                  onChangeText={setStock}
                  placeholder="Qty for sale"
                />
              </View>
            </View>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            {(selectedId || editProduct) && (
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>
                    {editProduct ? 'Update Product' : 'Add to Sale'}
                </Text>
                </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// Join Campaign Modal Component
interface JoinCampaignModalProps {
  visible: boolean;
  onClose: () => void;
  onJoin: () => void;
  selectedProduct: FlashSaleProduct | null;
  onSelectProduct: () => void;
  // Controlled props
  name: string;
  setName: (text: string) => void;
  startDelay: string;
  setStartDelay: (text: string) => void;
  duration: string;
  setDuration: (text: string) => void;
  durationUnit: 'hours' | 'days';
  setDurationUnit: (unit: 'hours' | 'days') => void;
}

const JoinCampaignModal = ({ 
    visible, 
    onClose, 
    onJoin, 
    selectedProduct, 
    onSelectProduct,
    name, setName,
    startDelay, setStartDelay,
    duration, setDuration,
    durationUnit, setDurationUnit
}: JoinCampaignModalProps) => {

  // Calculate preview dates
  const previewStartDate = React.useMemo(() => {
    const delay = parseFloat(startDelay) || 0;
    return new Date(Date.now() + delay * 3600000);
  }, [startDelay]);

  const previewEndDate = React.useMemo(() => {
    const dur = parseFloat(duration) || 0;
    const multiplier = durationUnit === 'days' ? 24 : 1;
    return new Date(previewStartDate.getTime() + (dur * multiplier) * 3600000);
  }, [previewStartDate, duration, durationUnit]);

  const formatDatePreview = (date: Date) => {
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Join Campaign</Text>
          
          <View style={styles.inputContainer}>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Campaign Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Weekend Flash Sale"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Start Time (Hours from now)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={startDelay}
                  onChangeText={setStartDelay}
                  placeholder="0 for Start Now"
                />
                <Text style={styles.helperText}>
                    Starts: {formatDatePreview(previewStartDate)}
                </Text>
            </View>

            <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.label}>Duration</Text>
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity 
                            style={[styles.toggleButton, durationUnit === 'hours' && styles.toggleButtonActive]}
                            onPress={() => setDurationUnit('hours')}
                        >
                            <Text style={[styles.toggleText, durationUnit === 'hours' && styles.toggleTextActive]}>Hours</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.toggleButton, durationUnit === 'days' && styles.toggleButtonActive]}
                            onPress={() => setDurationUnit('days')}
                        >
                            <Text style={[styles.toggleText, durationUnit === 'days' && styles.toggleTextActive]}>Days</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={duration}
                  onChangeText={setDuration}
                  placeholder={durationUnit === 'hours' ? "e.g. 24, 48" : "e.g. 1, 3, 7"}
                />
                <Text style={styles.helperText}>
                    Ends: {formatDatePreview(previewEndDate)}
                </Text>
            </View>

            {/* Product Selection Section */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Initial Product</Text>
                {selectedProduct ? (
                    <TouchableOpacity onPress={onSelectProduct} style={styles.readOnlyProductInfo}>
                        <Image source={{ uri: safeImageUri(selectedProduct.image) }} style={styles.modalProductImage} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.modalProductName}>{selectedProduct.name}</Text>
                            <Text style={styles.modalProductPrice}>
                                ₱{selectedProduct.flashPrice.toLocaleString()} 
                                <Text style={{ fontSize: 12, color: '#6B7280' }}> (Qty: {selectedProduct.stock})</Text>
                            </Text>
                        </View>
                        <Edit size={16} color="#4B5563" />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.selectProductButton} onPress={onSelectProduct}>
                        <Plus size={20} color="#3B82F6" />
                        <Text style={styles.selectProductButtonText}>Select Product to Promote</Text>
                    </TouchableOpacity>
                )}
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={onJoin}>
              <Text style={styles.saveButtonText}>Join & Add Product</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default function FlashSalesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SellerStackParamList>>();
  const insets = useSafeAreaInsets();
  const [sales, setSales] = React.useState<FlashSale[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [joinModalVisible, setJoinModalVisible] = React.useState(false);
  const [activeSaleId, setActiveSaleId] = React.useState<string | null>(null);
  const [editingProduct, setEditingProduct] = React.useState<FlashSaleProduct | null>(null);
  
  // State for product selected during Join flow
  const [pendingJoinProduct, setPendingJoinProduct] = React.useState<FlashSaleProduct | null>(null);
  const [isPickingJoinProduct, setIsPickingJoinProduct] = React.useState(false);

  // Lifted Form State
  const [joinName, setJoinName] = React.useState('');
  const [joinStartDelay, setJoinStartDelay] = React.useState('');
  const [joinDuration, setJoinDuration] = React.useState('48');
  const [joinDurationUnit, setJoinDurationUnit] = React.useState<'hours' | 'days'>('hours');


  React.useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      const data = await flashSaleService.getFlashSales('seller-id');
      setSales(data);
    } catch (error) {
      console.error('Error loading flash sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const openJoinModal = () => {
    // Do not reset form if we are coming back from product selection
    if (!isPickingJoinProduct) {
        setPendingJoinProduct(null);
        setJoinName('');
        setJoinStartDelay('');
        setJoinDuration('48');
        setJoinDurationUnit('hours');
    }
    setJoinModalVisible(true);
    setIsPickingJoinProduct(false);
  };

  const handleJoinCampaign = async () => {
    if (!joinName.trim()) {
      Alert.alert('Error', 'Please enter a campaign name');
      return;
    }
    if (!pendingJoinProduct) {
        Alert.alert('Error', 'Please select a product for the campaign');
        return;
    }

    const startDelayHours = parseFloat(joinStartDelay) || 0;
    let durationHours = parseFloat(joinDuration);

    if (isNaN(durationHours) || durationHours <= 0) {
      Alert.alert('Error', 'Invalid duration');
      return;
    }
    
    // Convert days to hours if needed
    if (joinDurationUnit === 'days') {
        durationHours = durationHours * 24;
    }

    try {
      const startTime = new Date(Date.now() + startDelayHours * 3600000);
      const endTime = new Date(startTime.getTime() + durationHours * 3600000);
      
      const products = [pendingJoinProduct];

      const newSale = await flashSaleService.joinFlashSale({
        name: joinName,
        startDate: startTime.toISOString(),
        endDate: endTime.toISOString(),
        status: startDelayHours <= 0 ? 'active' : 'scheduled',
        products: products, 
      } as any);

      if (pendingJoinProduct) {
          await flashSaleService.addProductToSale(newSale.id, pendingJoinProduct);
          newSale.products = [pendingJoinProduct];
      }

      setSales(prev => [newSale, ...prev]);
      setJoinModalVisible(false);
      
      // Reset State
      setJoinName('');
      setJoinStartDelay('');
      setJoinDuration('48');
      setPendingJoinProduct(null);
      
      Alert.alert('Success', 'Campaign created with product!');
    } catch (error) {
      Alert.alert('Error', 'Failed to join campaign');
    }
  };

  const handleWithdraw = (saleId: string) => {
    Alert.alert(
      'Withdraw Sale',
      'Are you sure you want to withdraw from this flash sale?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Withdraw', 
          style: 'destructive',
          onPress: async () => {
            try {
              await flashSaleService.withdrawFlashSale(saleId);
              setSales(prev => prev.filter(s => s.id !== saleId));
              Alert.alert('Success', 'Sale withdrawn successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to withdraw sale');
            }
          }
        }
      ]
    );
  };

  const openAddProductModal = (saleId: string) => {
    setActiveSaleId(saleId);
    setEditingProduct(null); // Add mode
    setModalVisible(true);
  };

  const openEditProductModal = (saleId: string, product: FlashSaleProduct) => {
    setActiveSaleId(saleId);
    setEditingProduct(product); // Edit mode
    setModalVisible(true);
  };

  // Handler for "Select Product" from Join Modal
  const openJoinProductSelection = () => {
      // Toggle modals: Close Join, Open Product Select
      setJoinModalVisible(false);
      setIsPickingJoinProduct(true);
      
      // Setup Product Selection Modal
      if (pendingJoinProduct) {
          setEditingProduct(pendingJoinProduct);
      } else {
          setEditingProduct(null);
      }
      setActiveSaleId(null); // Null indicates Join Mode
      setModalVisible(true);
  };

  const handleAddOrUpdateProduct = async (product: SellerProduct, flashPrice: number, stock: number) => {
    // Construct the FlashSaleProduct object
    const flashProduct: FlashSaleProduct = {
      id: product.id,
      name: product.name,
      image: product.images[0] || '',
      originalPrice: product.price,
      flashPrice,
      stock,
      sold: editingProduct ? editingProduct.sold : 0,
    };

    // CASE 1: Adding/Updating to an EXISTING sale
    if (activeSaleId) {
        try {
            await flashSaleService.addProductToSale(activeSaleId, flashProduct);
            // Update local state
            setSales(prev => prev.map(s => {
                if (s.id === activeSaleId) {
                    const existingIndex = s.products.findIndex(p => p.id === product.id);
                    let updatedProducts;
                    if (existingIndex >= 0) {
                        updatedProducts = [...s.products];
                        updatedProducts[existingIndex] = flashProduct;
                    } else {
                        updatedProducts = [...s.products, flashProduct];
                    }
                    return { ...s, products: updatedProducts };
                }
                return s;
            }));
            Alert.alert('Success', editingProduct ? 'Product updated' : 'Product added to flash sale');
        } catch (error) {
            Alert.alert('Error', 'Failed to save product');
        }
    } 
    // CASE 2: Selecting product for NEW campaign (Join Flow)
    else {
        setPendingJoinProduct(flashProduct);
        setModalVisible(false); // Close Product Select
        
        // Re-open Join Modal automatically (with preserved state due to lifted state)
        // We use a small timeout to ensure smooth transition
        setTimeout(() => {
            setJoinModalVisible(true);
        }, 300);
    }
  };

  const handleRemoveProduct = async (saleId: string, productId: string) => {
    try {
        await flashSaleService.removeProductFromSale(saleId, productId);
        setSales(prev => prev.map(s => {
            if (s.id === saleId) {
                return {
                    ...s,
                    products: s.products.filter(p => p.id !== productId)
                };
            }
            return s;
        }));
    } catch (error) {
        Alert.alert('Error', 'Failed to remove product');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderProduct = (product: FlashSaleProduct, saleId: string) => {
    const progress = product.stock > 0 ? (product.sold / product.stock) * 100 : 0;
    
    return (
      <View key={product.id} style={styles.productCard}>
        <Image
          source={{ uri: safeImageUri(product.image) }}
          style={styles.productImage}
        />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {product.name}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.flashPrice}>
              ₱{product.flashPrice.toLocaleString()}
            </Text>
            <Text style={styles.originalPrice}>
              ₱{product.originalPrice.toLocaleString()}
            </Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {product.sold}/{product.stock} sold
            </Text>
          </View>
        </View>
        <View style={styles.productActions}>
            <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => openEditProductModal(saleId, product)}
            >
                <Edit size={16} color="#4B5563" />
            </TouchableOpacity>
            <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => handleRemoveProduct(saleId, product.id)}
            >
                <Trash2 size={16} color="#DC2626" />
            </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSaleCard = (sale: FlashSale) => {
    const isActive = sale.status === 'active';
    const isScheduled = sale.status === 'scheduled';
    
    return (
      <View key={sale.id} style={styles.saleCard}>
        {/* Sale Header */}
        <View style={styles.saleHeaderContainer}>
          <View style={styles.saleHeader}>
            <View style={styles.saleHeaderLeft}>
              <View style={[
                styles.iconContainer,
                isActive ? styles.iconContainerActive : styles.iconContainerScheduled
              ]}>
                <Zap 
                  size={24} 
                  color={isActive ? '#FF5722' : '#3B82F6'} 
                  strokeWidth={2.5} 
                  fill={isActive ? '#FF5722' : '#3B82F6'}
                />
              </View>
              <View style={styles.saleInfo}>
                <Text style={styles.saleName}>{sale.name}</Text>
                <View style={styles.infoRow}>
                  <Calendar size={13} color="#9CA3AF" strokeWidth={2} />
                  <Text style={styles.infoText}>
                    {formatDate(sale.startDate)} - {formatDate(sale.endDate)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Clock size={13} color="#9CA3AF" strokeWidth={2} />
                  <Text style={[
                    styles.timeText,
                    isActive ? styles.timeTextActive : styles.timeTextScheduled
                  ]}>
                    {isActive ? 'Ends in ' + Math.ceil((new Date(sale.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) + ' days' : 'Starts in ' + Math.ceil((new Date(sale.startDate).getTime() - Date.now()) / (1000 * 60 * 60)) + ' hours'}
                  </Text>
                </View>
              </View>
            </View>
            <View style={[
              styles.statusBadge,
              isActive ? styles.statusBadgeActive : styles.statusBadgeScheduled
            ]}>
              <Text style={[
                styles.statusText,
                isActive ? styles.statusTextActive : styles.statusTextScheduled
              ]}>
                {sale.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Products Section */}
        <View style={styles.productsSection}>
          <Text style={styles.productsLabel}>Participating Products</Text>
          
          {sale.products.length > 0 ? (
            <View style={{ gap: 12 }}>
              {sale.products.map(p => renderProduct(p, sale.id))}
            </View>
          ) : (
            <View style={styles.emptyProducts}>
              <View style={styles.emptyIconContainer}>
                <Plus size={28} color="#9CA3AF" strokeWidth={2.5} />
              </View>
              <Text style={styles.emptyText}>No products added yet</Text>
              <Pressable 
                style={styles.addProductsButton}
                onPress={() => openAddProductModal(sale.id)}
              >
                <Text style={styles.addProductsButtonText}>Add Products</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Actions Footer */}
        <View style={styles.actionsFooter}>
          <Pressable 
            style={[styles.actionButton, styles.editButton]}
            onPress={() => openAddProductModal(sale.id)}
          >
            <Plus size={16} color="#4B5563" strokeWidth={2.5} />
            <Text style={styles.editButtonText}>Add Products</Text>
          </Pressable>
          <Pressable 
            style={[styles.actionButton, styles.withdrawButton]}
            onPress={() => handleWithdraw(sale.id)}
          >
            <Trash2 size={16} color="#EF4444" strokeWidth={2.5} />
            <Text style={styles.withdrawButtonText}>Withdraw</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: '#FF5722' }]}>
        <View style={styles.headerTop}>
            <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                <ArrowLeft size={24} color="#FFF" strokeWidth={2.5} />
            </Pressable>
            <Text style={styles.headerTitle}>Flash Sales</Text>
            <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Join Campaign Button */}
        <View style={styles.joinButtonContainer}>
          <Pressable style={styles.joinButton} onPress={openJoinModal}>
            <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.joinButtonText}>Join Campaign</Text>
          </Pressable>
        </View>

        {/* Flash Sales List */}
        <View style={styles.salesList}>
          {sales.map(renderSaleCard)}
        </View>
      </ScrollView>

      <ProductSelectionModal 
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={handleAddOrUpdateProduct}
        editProduct={editingProduct}
      />

      <JoinCampaignModal
        visible={joinModalVisible}
        onClose={() => setJoinModalVisible(false)}
        onJoin={handleJoinCampaign}
        selectedProduct={pendingJoinProduct}
        onSelectProduct={openJoinProductSelection}
        name={joinName}
        setName={setJoinName}
        startDelay={joinStartDelay}
        setStartDelay={setJoinStartDelay}
        duration={joinDuration}
        setDuration={setJoinDuration}
        durationUnit={joinDurationUnit}
        setDurationUnit={setJoinDurationUnit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // Header Styles
  headerContainer: {
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 20,
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIconButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  
  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  
  // Join Campaign Button
  joinButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  joinButton: {
    backgroundColor: '#FF5722',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  
  // Sales List
  salesList: {
    paddingHorizontal: 20,
    gap: 20,
  },
  
  // Sale Card
  saleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  
  // Sale Header
  saleHeaderContainer: {
    padding: 20,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  saleHeaderLeft: {
    flexDirection: 'row',
    gap: 14,
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    backgroundColor: '#FFF5F0',
  },
  iconContainerScheduled: {
    backgroundColor: '#EFF6FF',
  },
  saleInfo: {
    flex: 1,
    gap: 6,
  },
  saleName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeTextActive: {
    color: '#F97316',
  },
  timeTextScheduled: {
    color: '#3B82F6',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusBadgeActive: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgeScheduled: {
    backgroundColor: '#DBEAFE',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statusTextActive: {
    color: '#10B981',
  },
  statusTextScheduled: {
    color: '#3B82F6',
  },
  
  // Products Section
  productsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  productsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  
  // Product Card
  productCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  productImage: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  flashPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FF5722',
  },
  originalPrice: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF5722',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  removeProductButton: {
    justifyContent: 'center',
    padding: 8,
  },
  productActions: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  iconButton: {
      padding: 8,
  },
  
  // Empty State
  emptyProducts: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 16,
    gap: 12,
    backgroundColor: '#FAFAFA',
  },
  readOnlyProductInfo: {
      flexDirection: 'row',
      alignItems: 'center', 
      marginBottom: 20,
      gap: 12,
      padding: 12,
      backgroundColor: '#F3F4F6',
      borderRadius: 12,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  selectProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  selectProductButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  addProductsButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  addProductsButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    letterSpacing: 0.2,
  },
  
  // Actions Footer
  actionsFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  editButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  withdrawButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FCA5A5',
  },
  withdrawButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#111827',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    padding: 2,
    marginTop: -4,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#1F2937',
    fontWeight: '600',
  },
  productList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  modalProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  modalProductItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  modalProductImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  modalProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  modalProductPrice: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalProductStock: {
    fontSize: 12,
    color: '#6B7280',
  },
  radioButtonSelected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 5,
    borderColor: '#FF5722',
  },
  inputContainer: {
    gap: 12,
    marginBottom: 20,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FF5722',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: '600',
    color: '#374151',
  },
  saveButtonText: {
    fontWeight: '600',
    color: 'white',
  },
});
