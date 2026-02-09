import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Alert,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { SellerStackParamList } from './SellerStack';
import {
  CreditCard,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Scan,
  TrendingUp,
  AlertCircle,
  Package,
  Star,
  Hash,
  CheckCircle,
  X,
  Printer,
  Receipt,
} from 'lucide-react-native';
import { useSellerStore } from '../../src/stores/sellerStore';
import { useOrderStore } from '../../src/stores/orderStore';
import { orderService } from '../../src/services/orderService';
import SellerDrawer from '../../src/components/SellerDrawer';

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  image: string;
  maxStock: number;
  selectedColor?: string;
  selectedSize?: string;
  variantKey?: string;
}

interface ReceiptData {
  orderId: string;
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  note: string;
  date: Date;
  sellerName: string;
}

export default function POSScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SellerStackParamList>>();
  const insets = useSafeAreaInsets();
  const { seller, products = [], fetchProducts, loading } = useSellerStore();
  const { addOfflineOrder, fetchSellerOrders } = useOrderStore();
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Fetch seller's products when screen loads
  useEffect(() => {
    if (seller?.id) {
      console.log('[POS] Fetching products for seller:', seller.id);
      fetchProducts({ sellerId: seller.id });
    }
  }, [seller?.id, fetchProducts]);

  // Fetch seller's orders when screen loads
  useEffect(() => {
    if (seller?.id) {
      console.log('[POS] Fetching orders for seller:', seller.id);
      fetchSellerOrders(seller.id);
    }
  }, [seller?.id, fetchSellerOrders]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'low-stock' | 'best-sellers'>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState('');
  const [showCartModal, setShowCartModal] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  
  // Variant selection state
  const [selectedProduct, setSelectedProduct] = useState<typeof products[0] | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.id.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query)
      );
    }

    if (filterTab === 'low-stock') {
      filtered = filtered.filter((product) => product.stock > 0 && product.stock < 10);
    } else if (filterTab === 'best-sellers') {
      filtered = filtered.filter((product) => product.stock > 0 && (product.sales ?? 0) > 50);
    }

    return filtered.filter((product) => product.isActive);
  }, [products, searchQuery, filterTab]);

  // Cart total
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  // Add to cart
  const addToCart = (product: typeof products[0], color?: string, size?: string) => {
    if (product.stock <= 0) return;

    const hasVariants = (product.colors && product.colors.length > 0) || (product.sizes && product.sizes.length > 0);
    const variantKey = hasVariants 
      ? `${product.id}-${color || 'none'}-${size || 'none'}`
      : product.id;

    const existingItem = cart.find((item) => item.variantKey === variantKey || (!item.variantKey && item.productId === product.id));

    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        Alert.alert('Stock Limit', `Only ${product.stock} units available`);
        return;
      }

      setCart(
        cart.map((item) =>
          (item.variantKey === variantKey || (!item.variantKey && item.productId === product.id)) 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          productName: product.name + (color ? ` - ${color}` : '') + (size ? ` (${size})` : ''),
          quantity: 1,
          price: product.price,
          image: product.images[0] || '',
          maxStock: product.stock,
          selectedColor: color,
          selectedSize: size,
          variantKey,
        },
      ]);
    }
  };

  // Show product details for variant selection
  const showDetails = (product: typeof products[0]) => {
    const hasVariants = (product.colors && product.colors.length > 0) || (product.sizes && product.sizes.length > 0);
    
    if (hasVariants) {
      setSelectedProduct(product);
      setSelectedColor(product.colors?.[0] || null);
      setSelectedSize(product.sizes?.[0] || null);
      setShowProductModal(true);
    } else {
      addToCart(product);
    }
  };

  // Add variant to cart from modal
  const addVariantToCart = () => {
    if (!selectedProduct) return;
    addToCart(selectedProduct, selectedColor || undefined, selectedSize || undefined);
    setShowProductModal(false);
    setSelectedProduct(null);
    setSelectedColor(null);
    setSelectedSize(null);
  };

  // Update quantity
  const updateQuantity = (variantKey: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.variantKey === variantKey || item.productId === variantKey) {
            const newQuantity = item.quantity + delta;
            if (newQuantity <= 0 || newQuantity > item.maxStock) return item;
            return { ...item, quantity: newQuantity };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  // Remove from cart
  const removeFromCart = (variantKey: string) => {
    setCart(cart.filter((item) => item.variantKey !== variantKey && item.productId !== variantKey));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setNote('');
  };

  // Complete sale - saves to Supabase
  const completeSale = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart before completing sale');
      return;
    }

    if (!seller) {
      Alert.alert('Error', 'Please log in to complete a sale');
      return;
    }

    setIsProcessing(true);

    try {
      // Store cart data for receipt before clearing
      const receiptItems = [...cart];
      const subtotal = cartTotal;
      const tax = 0;
      const total = subtotal + tax;
      const receiptNote = note;
      
      // Save to Supabase using orderService
      const result = await orderService.createPOSOrder(
        seller.id,
        seller.store_name || 'Store',
        cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          image: item.image,
          selectedColor: item.selectedColor,
          selectedSize: item.selectedSize
        })),
        total,
        receiptNote
      );

      if (!result) {
        throw new Error('Failed to create order');
      }

      // Also update local store for immediate UI update
      await addOfflineOrder(cart, total, receiptNote);

      // Set receipt data
      setReceiptData({
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        items: receiptItems,
        subtotal,
        tax,
        total,
        note: receiptNote,
        date: new Date(),
        sellerName: seller.store_name || 'BazaarPH Store'
      });

      // Show success
      setSuccessOrderId(result.orderNumber);
      setShowSuccess(true);
      setShowCartModal(false);

      // Refresh orders to show new POS order
      if (seller.id) {
        fetchSellerOrders(seller.id);
      }

      // Clear cart after 2 seconds
      setTimeout(() => {
        clearCart();
      }, 2000);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to complete sale');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadReceipt = async () => {
    if (!receiptData) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            padding: 40px 20px;
            background: white;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #FF5722;
            padding-bottom: 20px;
          }
          .logo { 
            color: #FF5722; 
            font-size: 32px; 
            font-weight: bold;
            margin-bottom: 5px;
          }
          .store-name { 
            color: #6B7280; 
            font-size: 16px;
            margin-bottom: 20px;
          }
          .receipt-title {
            background: #FFF3E0;
            padding: 12px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 18px;
            color: #E65100;
          }
          .info-box {
            background: #F9FAFB;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border: 1px solid #E5E7EB;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px dashed #E5E7EB;
          }
          .info-row:last-child { border-bottom: none; }
          .info-label { 
            color: #6B7280;
            font-size: 14px;
          }
          .info-value { 
            color: #1F2937;
            font-weight: 600;
            font-size: 14px;
          }
          .items-section {
            margin: 30px 0;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #E5E7EB;
          }
          .item {
            padding: 15px 0;
            border-bottom: 1px solid #F3F4F6;
          }
          .item:last-child { border-bottom: none; }
          .item-name {
            font-weight: 600;
            font-size: 15px;
            color: #1F2937;
            margin-bottom: 5px;
          }
          .item-details {
            display: flex;
            justify-content: space-between;
            color: #6B7280;
            font-size: 13px;
          }
          .totals-section {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #E5E7EB;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
          }
          .total-label {
            font-size: 14px;
            color: #6B7280;
          }
          .total-value {
            font-size: 14px;
            font-weight: 600;
            color: #1F2937;
          }
          .grand-total {
            background: #FF5722;
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin-top: 10px;
          }
          .grand-total .total-label,
          .grand-total .total-value {
            color: white;
            font-size: 18px;
            font-weight: bold;
          }
          .paid-badge {
            background: #10B981;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
            font-weight: bold;
            font-size: 16px;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #9CA3AF;
            font-size: 12px;
            border-top: 1px solid #E5E7EB;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🛒 BazaarPH</div>
          <div class="store-name">${receiptData.sellerName}</div>
          <div class="receipt-title">OFFICIAL RECEIPT</div>
        </div>

        <div class="info-box">
          <div class="info-row">
            <span class="info-label">Receipt #</span>
            <span class="info-value">${receiptData.orderNumber}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Date</span>
            <span class="info-value">${new Date(receiptData.date).toLocaleString('en-US', { 
              month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true 
            })}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Customer</span>
            <span class="info-value">Walk-in</span>
          </div>
        </div>

        <div class="items-section">
          <div class="section-title">Items Purchased</div>
          ${receiptData.items.map(item => `
            <div class="item">
              <div class="item-name">${item.productName}</div>
              <div class="item-details">
                <span>${item.quantity} × ₱${item.price.toFixed(2)}</span>
                <span style="font-weight: 600; color: #1F2937;">₱${(item.quantity * item.price).toFixed(2)}</span>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="totals-section">
          <div class="total-row">
            <span class="total-label">Subtotal</span>
            <span class="total-value">₱${receiptData.subtotal.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span class="total-label">Tax</span>
            <span class="total-value">₱${receiptData.tax.toFixed(2)}</span>
          </div>
          <div class="grand-total">
            <div class="total-row">
              <span class="total-label">TOTAL</span>
              <span class="total-value">₱${receiptData.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div class="paid-badge">
          ✓ PAID - CASH
        </div>

        <div class="footer">
          <p>Thank you for your purchase!</p>
          <p style="margin-top: 5px;">BazaarPH - Your Trusted Online Marketplace</p>
          <p style="margin-top: 5px;">Receipt generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    try {
      // Generate PDF from HTML
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      // Share/Download the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Receipt-${receiptData.orderNumber}.pdf`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Success', 'Receipt saved successfully');
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    }
  };

  return (
    <View style={styles.container}>
      {/* Seller Drawer */}
      <SellerDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />

      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: '#FF5722' }]}>
        <View style={styles.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable style={styles.headerIconButton} onPress={() => setDrawerVisible(true)}>
              <CreditCard size={24} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
            <Text style={styles.headerTitle}>POS Lite</Text>
          </View>
          {/* Cart Button - Always visible, clickable to open cart modal */}
          <TouchableOpacity 
            style={styles.cartBadgeHeader}
            onPress={() => setShowCartModal(true)}
            activeOpacity={0.7}
          >
            <ShoppingCart size={22} color="#FFF" />
            {cart.length > 0 && (
              <View style={styles.cartCountBadge}>
                <Text style={styles.cartCountText}>{cart.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar in Header */}
        <View style={styles.searchBar}>
          <Scan size={20} color="#9CA3AF" strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search or Scan product..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={20} color="#9CA3AF" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Main Scroll Container */}
      <ScrollView
        style={styles.mainScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.mainScrollContent}
      >
        {/* Products Section */}
        <View style={styles.productsSection}>
          {/* Filter Tabs */}
          <View style={styles.filterTabs}>
            <TouchableOpacity
              style={[styles.filterTab, filterTab === 'all' && styles.filterTabActive]}
              onPress={() => setFilterTab('all')}
            >
              <Text style={[styles.filterTabText, filterTab === 'all' && styles.filterTabTextActive]}>
                All Items
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filterTab === 'low-stock' && styles.filterTabActive]}
              onPress={() => setFilterTab('low-stock')}
            >
              <AlertCircle size={14} color={filterTab === 'low-stock' ? '#FFF' : '#6B7280'} />
              <Text
                style={[styles.filterTabText, filterTab === 'low-stock' && styles.filterTabTextActive]}
              >
                Low Stock
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filterTab === 'best-sellers' && styles.filterTabActive]}
              onPress={() => setFilterTab('best-sellers')}
            >
              <TrendingUp size={14} color={filterTab === 'best-sellers' ? '#FFF' : '#6B7280'} />
              <Text
                style={[
                  styles.filterTabText,
                  filterTab === 'best-sellers' && styles.filterTabTextActive,
                ]}
              >
                Best Sellers
              </Text>
            </TouchableOpacity>
          </View>

          {/* Products Grid */}
          <View style={styles.productsGridContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF5722" />
                <Text style={styles.loadingText}>Loading products...</Text>
              </View>
            ) : filteredProducts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Package size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No products found</Text>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'Try a different search term' : 'Add products to your store first'}
                </Text>
              </View>
            ) : (
              filteredProducts.map((product) => {
              const isOutOfStock = product.stock === 0;
              const cartItem = cart.find((item) => item.productId === product.id);
              const remainingStock = product.stock - (cartItem?.quantity || 0);

              return (
                <TouchableOpacity
                  key={product.id}
                  style={[styles.productCard, isOutOfStock && styles.productCardDisabled]}
                  onPress={() => !isOutOfStock && showDetails(product)}
                  disabled={isOutOfStock}
                  activeOpacity={0.7}
                >
                  {/* Product Image */}
                  <View style={styles.productImageContainer}>
                    <Image source={{ uri: product.images[0] }} style={styles.productImage} />

                    {/* Stock Badge */}
                    <View
                      style={[
                        styles.stockBadge,
                        remainingStock === 0
                          ? styles.stockBadgeOut
                          : remainingStock < 10
                            ? styles.stockBadgeLow
                            : styles.stockBadgeOk,
                      ]}
                    >
                      <Text style={styles.stockBadgeText}>
                        {remainingStock === 0 ? 'Out' : remainingStock}
                      </Text>
                    </View>

                    {/* Cart Quantity Badge */}
                    {cartItem && (
                      <View style={styles.cartQuantityBadge}>
                        <Text style={styles.cartQuantityText}>×{cartItem.quantity}</Text>
                      </View>
                    )}
                  </View>

                  {/* Product Info */}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.name}
                    </Text>
                    <Text style={styles.productCategory}>{product.category}</Text>

                    {/* Product Details */}
                    <View style={styles.productDetails}>
                      <View style={styles.productDetailRow}>
                        <Hash size={12} color="#9CA3AF" />
                        <Text style={styles.productDetailText}>
                          {product.id.slice(-8)}
                        </Text>
                      </View>
                      <View style={styles.productDetailRow}>
                        <Package size={12} color={remainingStock < 10 ? '#F59E0B' : '#10B981'} />
                        <Text
                          style={[
                            styles.productDetailText,
                            { color: remainingStock < 10 ? '#F59E0B' : '#10B981' },
                          ]}
                        >
                          {remainingStock}
                        </Text>
                      </View>
                    </View>

                    {/* Price & Add Button */}
                    <View style={styles.productFooter}>
                      <Text style={styles.productPrice}>₱{product.price.toLocaleString()}</Text>
                      {!isOutOfStock && (
                        <TouchableOpacity
                          style={styles.addButton}
                          onPress={() => showDetails(product)}
                        >
                          <Plus size={16} color="#FFF" strokeWidth={2.5} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
            )}
          </View>
        </View>

        {/* Cart Section */}
        <View style={styles.cartSection}>
          {/* Cart Header */}
          <View style={styles.cartHeader}>
            <View style={styles.cartHeaderLeft}>
              <ShoppingCart size={22} color="#FF5722" />
              <Text style={styles.cartTitle}>Current Sale</Text>
              {cart.length > 0 && (
                <View style={styles.cartItemCount}>
                  <Text style={styles.cartItemCountText}>{cart.length}</Text>
                </View>
              )}
            </View>
            {cart.length > 0 && (
              <TouchableOpacity onPress={clearCart}>
                <Text style={styles.clearButton}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Cart Items */}
          <View style={styles.cartContent}>
            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <View style={styles.emptyCartIcon}>
                  <ShoppingCart size={40} color="#D1D5DB" />
                </View>
                <Text style={styles.emptyCartTitle}>Cart is empty</Text>
                <Text style={styles.emptyCartText}>Click products to add</Text>
              </View>
            ) : (
              <View style={styles.cartItems}>
                {cart.map((item) => (
                  <View key={item.variantKey || item.productId} style={styles.cartItem}>
                    <Image source={{ uri: item.image }} style={styles.cartItemImage} />
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName} numberOfLines={1}>
                        {item.productName}
                      </Text>
                      <Text style={styles.cartItemPrice}>₱{item.price.toLocaleString()} each</Text>

                      {/* Quantity Controls */}
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.variantKey || item.productId, -1)}
                        >
                          <Minus size={15} color="#6B7280" strokeWidth={2.5} />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateQuantity(item.variantKey || item.productId, 1)}
                          disabled={item.quantity >= item.maxStock}
                        >
                          <Plus size={15} color="#6B7280" strokeWidth={2.5} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => removeFromCart(item.variantKey || item.productId)}
                        >
                          <Trash2 size={15} color="#EF4444" strokeWidth={2} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.cartItemTotal}>
                      ₱{(item.price * item.quantity).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Cart Footer */}
          {cart.length > 0 && (
            <View style={styles.cartFooter}>
              {/* Note Input */}
              <TextInput
                style={styles.noteInput}
                placeholder="Add note (optional)..."
                placeholderTextColor="#9CA3AF"
                value={note}
                onChangeText={setNote}
              />

              {/* Totals */}
              <View style={styles.totals}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>₱{cartTotal.toLocaleString()}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Discount</Text>
                  <Text style={styles.totalValue}>₱0.00</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tax</Text>
                  <Text style={styles.totalValue}>₱0.00</Text>
                </View>
                <View style={styles.grandTotalRow}>
                  <Text style={styles.grandTotalLabel}>Total</Text>
                  <Text style={styles.grandTotalValue}>₱{cartTotal.toLocaleString()}</Text>
                </View>
              </View>

              {/* Charge Button */}
              <TouchableOpacity
                style={[styles.chargeButton, isProcessing && styles.chargeButtonDisabled]}
                onPress={completeSale}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Text style={styles.chargeButtonText}>Processing...</Text>
                ) : (
                  <>
                    <CreditCard size={20} color="#FFF" strokeWidth={2.5} />
                    <Text style={styles.chargeButtonText}>Charge ₱{cartTotal.toLocaleString()}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Success Modal with Receipt */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            {/* Receipt Header */}
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptBrand}>🛒 BazaarPH</Text>
              <Text style={styles.receiptStoreName}>{receiptData?.sellerName || 'Store'}</Text>
            </View>

            {/* Success Icon */}
            <View style={styles.successIconContainer}>
              <CheckCircle size={40} color="#10B981" strokeWidth={2} />
              <Text style={styles.successTitle}>Sale Completed!</Text>
              <Text style={styles.successSubtitle}>Order saved to database</Text>
            </View>

            {/* Receipt Details */}
            <View style={styles.receiptBody}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Receipt #</Text>
                <Text style={styles.receiptValue}>{successOrderId}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Date</Text>
                <Text style={styles.receiptValue}>
                  {receiptData?.date.toLocaleDateString('en-PH', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Customer</Text>
                <Text style={styles.receiptValue}>Walk-in</Text>
              </View>

              {/* Items */}
              <View style={styles.receiptDivider} />
              {receiptData?.items.map((item, idx) => (
                <View key={idx} style={styles.receiptItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.receiptItemName}>{item.productName}</Text>
                    <Text style={styles.receiptItemQty}>{item.quantity} × ₱{item.price.toLocaleString()}</Text>
                  </View>
                  <Text style={styles.receiptItemTotal}>₱{(item.price * item.quantity).toLocaleString()}</Text>
                </View>
              ))}
              <View style={styles.receiptDivider} />

              {/* Totals */}
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Subtotal</Text>
                <Text style={styles.receiptValue}>₱{receiptData?.subtotal.toLocaleString()}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Tax</Text>
                <Text style={styles.receiptValue}>₱0.00</Text>
              </View>
              <View style={styles.receiptGrandRow}>
                <Text style={styles.receiptGrandLabel}>TOTAL</Text>
                <Text style={styles.receiptGrandValue}>₱{receiptData?.total.toLocaleString()}</Text>
              </View>

              {/* Payment Badge */}
              <View style={styles.receiptPaidBadge}>
                <CheckCircle size={14} color="#FFF" />
                <Text style={styles.receiptPaidText}>PAID - CASH</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.receiptActions}>
              <TouchableOpacity
                style={styles.receiptDownloadBtn}
                onPress={async () => {
                  try {
                    await downloadReceipt();
                  } catch (error) {
                    console.error('Failed to download receipt:', error);
                    Alert.alert('Error', 'Failed to download receipt');
                  }
                }}
              >
                <Printer size={18} color="#10B981" />
                <Text style={styles.receiptDownloadBtnText}>Download PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.receiptViewOrdersBtn}
                onPress={() => {
                  console.log('[POS] View Orders button pressed');
                  setShowSuccess(false);
                  
                  try {
                    console.log('[POS] Current navigation state:', navigation.getState());
                    // Navigate directly to Orders tab (we're already in the tab navigator)
                    navigation.navigate('Orders' as any);
                    console.log('[POS] Navigated to Orders tab');
                  } catch (error) {
                    console.error('[POS] Navigation error:', error);
                    Alert.alert('Navigation Error', 'Please go to Orders tab manually');
                  }
                }}
              >
                <Receipt size={18} color="#FF5722" />
                <Text style={styles.receiptViewOrdersBtnText}>View Orders</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.receiptCloseBtn}
                onPress={() => setShowSuccess(false)}
              >
                <Text style={styles.receiptCloseBtnText}>New Sale</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Variant Selection Modal */}
      <Modal visible={showProductModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.variantModalContent}>
            <View style={styles.variantModalHeader}>
              <Text style={styles.variantModalTitle}>Select Options</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => {
                  setShowProductModal(false);
                  setSelectedProduct(null);
                }}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <>
                {/* Product Info */}
                <View style={styles.variantProductInfo}>
                  <Image
                    source={{ uri: selectedProduct.images[0] }}
                    style={styles.variantProductImage}
                  />
                  <View style={styles.variantProductDetails}>
                    <Text style={styles.variantProductName}>{selectedProduct.name}</Text>
                    <Text style={styles.variantProductPrice}>
                      ₱{selectedProduct.price.toLocaleString()}
                    </Text>
                    <Text style={styles.variantProductStock}>
                      {selectedProduct.stock} in stock
                    </Text>
                  </View>
                </View>

                {/* Color Selection */}
                {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                  <View style={styles.variantSection}>
                    <Text style={styles.variantSectionTitle}>Color</Text>
                    <View style={styles.variantOptions}>
                      {selectedProduct.colors.map((color) => (
                        <TouchableOpacity
                          key={color}
                          style={[
                            styles.variantOption,
                            selectedColor === color && styles.variantOptionActive,
                          ]}
                          onPress={() => setSelectedColor(color)}
                        >
                          <Text
                            style={[
                              styles.variantOptionText,
                              selectedColor === color && styles.variantOptionTextActive,
                            ]}
                          >
                            {color}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Size Selection */}
                {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                  <View style={styles.variantSection}>
                    <Text style={styles.variantSectionTitle}>Size</Text>
                    <View style={styles.variantOptions}>
                      {selectedProduct.sizes.map((size) => (
                        <TouchableOpacity
                          key={size}
                          style={[
                            styles.variantOption,
                            selectedSize === size && styles.variantOptionActive,
                          ]}
                          onPress={() => setSelectedSize(size)}
                        >
                          <Text
                            style={[
                              styles.variantOptionText,
                              selectedSize === size && styles.variantOptionTextActive,
                            ]}
                          >
                            {size}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Add to Cart Button */}
                <TouchableOpacity style={styles.addToCartButton} onPress={addVariantToCart}>
                  <Plus size={20} color="#FFF" strokeWidth={2.5} />
                  <Text style={styles.addToCartButtonText}>Add to Cart</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Cart Modal - Full Screen Cart View */}
      <Modal visible={showCartModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.cartModalContainer}>
          {/* Cart Modal Header */}
          <View style={styles.cartModalHeader}>
            <TouchableOpacity onPress={() => setShowCartModal(false)}>
              <X size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.cartModalTitle}>Current Sale</Text>
            <View style={styles.cartModalBadge}>
              <Text style={styles.cartModalBadgeText}>{cart.length} items</Text>
            </View>
          </View>

          {/* Cart Items List */}
          <ScrollView style={styles.cartModalItems} showsVerticalScrollIndicator={false}>
            {cart.length === 0 ? (
              <View style={styles.cartModalEmpty}>
                <ShoppingCart size={60} color="#D1D5DB" />
                <Text style={styles.cartModalEmptyTitle}>Cart is empty</Text>
                <Text style={styles.cartModalEmptyText}>Add products to start a sale</Text>
                <TouchableOpacity 
                  style={styles.cartModalBrowseBtn}
                  onPress={() => setShowCartModal(false)}
                >
                  <Text style={styles.cartModalBrowseBtnText}>Browse Products</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {cart.map((item) => (
                  <View key={item.variantKey || item.productId} style={styles.cartModalItem}>
                    <Image source={{ uri: item.image }} style={styles.cartModalItemImage} />
                    <View style={styles.cartModalItemInfo}>
                      <Text style={styles.cartModalItemName} numberOfLines={2}>{item.productName}</Text>
                      {(item.selectedColor || item.selectedSize) && (
                        <Text style={styles.cartModalItemVariant}>
                          {[item.selectedColor, item.selectedSize].filter(Boolean).join(' / ')}
                        </Text>
                      )}
                      <Text style={styles.cartModalItemPrice}>₱{item.price.toLocaleString()} each</Text>
                      
                      {/* Quantity Controls */}
                      <View style={styles.cartModalQuantityRow}>
                        <View style={styles.cartModalQuantityControls}>
                          <TouchableOpacity
                            style={styles.cartModalQuantityBtn}
                            onPress={() => updateQuantity(item.variantKey || item.productId, -1)}
                          >
                            <Minus size={16} color="#FF5722" strokeWidth={2.5} />
                          </TouchableOpacity>
                          <Text style={styles.cartModalQuantityText}>{item.quantity}</Text>
                          <TouchableOpacity
                            style={styles.cartModalQuantityBtn}
                            onPress={() => updateQuantity(item.variantKey || item.productId, 1)}
                            disabled={item.quantity >= item.maxStock}
                          >
                            <Plus size={16} color="#FF5722" strokeWidth={2.5} />
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                          onPress={() => removeFromCart(item.variantKey || item.productId)}
                        >
                          <Trash2 size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.cartModalItemTotal}>
                      ₱{(item.price * item.quantity).toLocaleString()}
                    </Text>
                  </View>
                ))}

                {/* Note Input */}
                <View style={styles.cartModalNoteContainer}>
                  <Text style={styles.cartModalNoteLabel}>Note (optional)</Text>
                  <TextInput
                    style={styles.cartModalNoteInput}
                    placeholder="Add a note for this sale..."
                    placeholderTextColor="#9CA3AF"
                    value={note}
                    onChangeText={setNote}
                    multiline
                  />
                </View>
              </>
            )}
          </ScrollView>

          {/* Cart Modal Footer */}
          {cart.length > 0 && (
            <View style={styles.cartModalFooter}>
              <View style={styles.cartModalTotals}>
                <View style={styles.cartModalTotalRow}>
                  <Text style={styles.cartModalTotalLabel}>Subtotal</Text>
                  <Text style={styles.cartModalTotalValue}>₱{cartTotal.toLocaleString()}</Text>
                </View>
                <View style={styles.cartModalTotalRow}>
                  <Text style={styles.cartModalTotalLabel}>Tax</Text>
                  <Text style={styles.cartModalTotalValue}>₱0.00</Text>
                </View>
                <View style={styles.cartModalGrandRow}>
                  <Text style={styles.cartModalGrandLabel}>Total</Text>
                  <Text style={styles.cartModalGrandValue}>₱{cartTotal.toLocaleString()}</Text>
                </View>
              </View>

              <View style={styles.cartModalActions}>
                <TouchableOpacity style={styles.cartModalClearBtn} onPress={clearCart}>
                  <Text style={styles.cartModalClearBtnText}>Clear Cart</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cartModalChargeBtn, isProcessing && styles.cartModalChargeBtnDisabled]}
                  onPress={completeSale}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <CreditCard size={20} color="#FFF" />
                      <Text style={styles.cartModalChargeBtnText}>
                        Charge ₱{cartTotal.toLocaleString()}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
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
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  headerIconButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  cartBadgeHeader: {
    position: 'relative',
    marginLeft: 12,
  },
  cartCountBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#10B981',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartCountText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  mainScroll: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  mainScrollContent: {
    paddingBottom: 20,
  },
  productsSection: {
    backgroundColor: '#F3F4F6',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  filterTabActive: {
    backgroundColor: '#FF5722',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  productsGridContainer: {
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  loadingContainer: {
    width: '100%',
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    width: '100%',
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  emptyText: {
    marginTop: 4,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  productCard: {
    width: '47%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  productCardDisabled: {
    opacity: 0.5,
  },
  productImageContainer: {
    aspectRatio: 1,
    backgroundColor: '#F9FAFB',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  stockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stockBadgeOut: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  stockBadgeLow: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  stockBadgeOk: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
  },
  cartQuantityBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF5722',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  cartQuantityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    minHeight: 36,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 11,
    color: '#6B7280',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productDetailText: {
    fontSize: 11,
    color: '#6B7280',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  addButton: {
    backgroundColor: '#FF5722',
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
  },
  cartSection: {
    backgroundColor: '#FFF',
    marginTop: 16,
    marginHorizontal: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  cartHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartItemCount: {
    backgroundColor: '#FF5722',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  cartItemCountText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  clearButton: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  cartContent: {
    maxHeight: 400,
  },
  emptyCart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCartIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyCartTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },
  emptyCartText: {
    fontSize: 13,
    color: '#6B7280',
  },
  cartItems: {
    padding: 16,
    gap: 12,
  },
  cartItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cartItemImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quantityButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  quantityText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827',
    width: 32,
    textAlign: 'center',
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  cartFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  noteInput: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    fontSize: 13,
    color: '#111827',
  },
  totals: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
    marginTop: 12,
    gap: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  chargeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF5722',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 16,
    borderRadius: 8,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  chargeButtonDisabled: {
    opacity: 0.6,
  },
  chargeButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIcon: {
    flex: 1,
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    right: -8,
    top: -8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  orderDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  orderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDetailLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  orderDetailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
    fontFamily: 'monospace',
  },
  orderDetailValueAmount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  paidBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  modalNote: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  viewOrdersButton: {
    flex: 1,
    backgroundColor: '#FF5722',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewOrdersButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  closeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  // Variant Modal Styles
  variantModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  variantModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  variantModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  variantProductInfo: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  variantProductImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  variantProductDetails: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  variantProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  variantProductPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF5722',
    marginBottom: 4,
  },
  variantProductStock: {
    fontSize: 13,
    color: '#6B7280',
  },
  variantSection: {
    marginBottom: 20,
  },
  variantSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  variantOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variantOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  variantOptionActive: {
    backgroundColor: '#FF5722',
    borderColor: '#FF5722',
  },
  variantOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  variantOptionTextActive: {
    color: '#FFF',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5722',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
  },
  addToCartButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  // Cart Modal Styles
  cartModalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  cartModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cartModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  cartModalBadge: {
    backgroundColor: '#FF572220',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cartModalBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF5722',
  },
  cartModalItems: {
    flex: 1,
    paddingHorizontal: 16,
  },
  cartModalEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  cartModalEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  cartModalEmptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  cartModalBrowseBtn: {
    marginTop: 20,
    backgroundColor: '#FF5722',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  cartModalBrowseBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  cartModalItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cartModalItemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  cartModalItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cartModalItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  cartModalItemVariant: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  cartModalItemPrice: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  cartModalQuantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cartModalQuantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F2',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  cartModalQuantityBtn: {
    padding: 8,
  },
  cartModalQuantityText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    minWidth: 30,
    textAlign: 'center',
  },
  cartModalItemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF5722',
    alignSelf: 'center',
  },
  cartModalNoteContainer: {
    marginTop: 16,
    marginBottom: 20,
  },
  cartModalNoteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  cartModalNoteInput: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cartModalFooter: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cartModalTotals: {
    marginBottom: 16,
  },
  cartModalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cartModalTotalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  cartModalTotalValue: {
    fontSize: 14,
    color: '#374151',
  },
  cartModalGrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 4,
  },
  cartModalGrandLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  cartModalGrandValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FF5722',
  },
  cartModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cartModalClearBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cartModalClearBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  cartModalChargeBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5722',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  cartModalChargeBtnDisabled: {
    opacity: 0.7,
  },
  cartModalChargeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  // Receipt/Success Modal Styles
  successModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '90%',
    maxWidth: 380,
    overflow: 'hidden',
  },
  receiptHeader: {
    backgroundColor: '#FF5722',
    paddingVertical: 16,
    alignItems: 'center',
  },
  receiptBrand: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  receiptStoreName: {
    fontSize: 12,
    color: '#FFFFFF99',
    marginTop: 2,
  },
  successIconContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 8,
  },
  successSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  receiptBody: {
    padding: 16,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  receiptLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  receiptValue: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
    borderStyle: 'dashed',
  },
  receiptItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  receiptItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  receiptItemQty: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  receiptItemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  receiptGrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 4,
  },
  receiptGrandLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  receiptGrandValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FF5722',
  },
  receiptPaidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
    gap: 6,
  },
  receiptPaidText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  receiptActions: {
    flexDirection: 'column',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  receiptDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10B981',
    gap: 6,
  },
  receiptDownloadBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  receiptViewOrdersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF5722',
    gap: 6,
  },
  receiptViewOrdersBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF5722',
  },
  receiptCloseBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5722',
    paddingVertical: 12,
    borderRadius: 10,
  },
  receiptCloseBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});
