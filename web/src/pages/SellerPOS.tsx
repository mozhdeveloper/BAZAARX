import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  CheckCircle,
  LogOut,
  CreditCard,
  Scan,
  TrendingUp,
  AlertCircle,
  Package,
  Star,
  Hash
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import { useAuthStore, useProductStore, useOrderStore } from '@/stores/sellerStore';
import { sellerLinks } from '@/config/sellerLinks';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  image: string;
  maxStock: number;
}

export function SellerPOS() {
  const navigate = useNavigate();
  const { seller, logout } = useAuthStore();
  const { products } = useProductStore();
  const { addOfflineOrder } = useOrderStore();
  
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'low-stock' | 'best-sellers'>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState('');
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashingProduct, setFlashingProduct] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<typeof products[0] | null>(null);
  const [showProductDetails, setShowProductDetails] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/seller/auth');
  };

  // Filter products based on search and filter tab
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.id.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
      );
    }
    
    // Apply tab filter
    if (filterTab === 'low-stock') {
      filtered = filtered.filter(product => product.stock > 0 && product.stock < 10);
    } else if (filterTab === 'best-sellers') {
      // Mock best sellers - in real app, this would be based on sales data
      filtered = filtered.filter(product => product.stock > 0);
    }
    
    return filtered;
  }, [products, searchQuery, filterTab]);

  // Calculate cart total
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  // Show product details
  const showDetails = (product: typeof products[0]) => {
    setSelectedProduct(product);
    setShowProductDetails(true);
  };

  // Add product to cart with visual feedback
  const addToCart = (product: typeof products[0], fromModal = false) => {
    if (product.stock <= 0) return;

    // Flash orange border effect
    if (!fromModal) {
      setFlashingProduct(product.id);
      setTimeout(() => setFlashingProduct(null), 300);
    }

    const existingItem = cart.find(item => item.productId === product.id);
    
    if (existingItem) {
      // Check if we can add more
      if (existingItem.quantity >= product.stock) {
        return; // Cannot add more than available stock
      }
      
      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price,
        image: product.images[0],
        maxStock: product.stock
      }]);
    }

    if (fromModal) {
      setShowProductDetails(false);
    }
  };

  // Update quantity in cart
  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        const newQuantity = item.quantity + delta;
        if (newQuantity <= 0) return item; // Will be removed below
        if (newQuantity > item.maxStock) return item; // Don't exceed stock
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setNote('');
  };

  // Complete sale
  const completeSale = async () => {
    if (cart.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      // Call the store action to create offline order and deduct stock
      const orderId = addOfflineOrder(cart, cartTotal, note);
      
      // Show success
      setSuccessOrderId(orderId);
      setShowSuccess(true);
      
      // Clear cart after 2 seconds
      setTimeout(() => {
        clearCart();
      }, 2000);
    } catch (error) {
      console.error('Failed to complete sale:', error);
      alert(error instanceof Error ? error.message : 'Failed to complete sale');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get stock badge
  const Logo = () => (
    <Link
      to="/seller"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <img 
        src="/Logo.png" 
        alt="BazaarPH Logo" 
        className="h-8 w-8 object-contain flex-shrink-0"
      />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-semibold text-gray-900 dark:text-white whitespace-pre"
      >
        BazaarPH Seller
      </motion.span>
    </Link>
  );

  const LogoIcon = () => (
    <Link
      to="/seller"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <img 
        src="/Logo.png" 
        alt="BazaarPH Logo" 
        className="h-8 w-8 object-contain flex-shrink-0"
      />
    </Link>
  );

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-gray-50 overflow-hidden font-['Inter',sans-serif]">
      {/* Sidebar */}
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {sellerLinks.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <SidebarLink
              link={{
                label: seller?.name || "Seller",
                href: "/seller/settings",
                icon: <img 
                  src={seller?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Seller"} 
                  className="h-7 w-7 flex-shrink-0 rounded-full"
                  alt="Avatar"
                />
              }}
            />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-2 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {open && <span>Logout</span>}
            </button>
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden h-[calc(100vh-theme(spacing.0))]">
        {/* Left Panel: Product Catalog */}
        <div className="w-full lg:w-[65%] flex flex-col bg-muted/30 overflow-hidden">
          {/* Header with Search and Filters */}
          <div className="px-6 py-5 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-900">POS Lite</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Quick checkout for offline sales</p>
            </div>
            
            {/* Search Bar */}
            <div className="relative mb-4">
              <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search or Scan product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 text-sm border-gray-300 focus-visible:ring-[#FF5722] shadow-sm"
              />
            </div>

            {/* Quick Filter Pills */}
            <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-9 bg-gray-100">
                <TabsTrigger 
                  value="all" 
                  className="text-xs data-[state=active]:bg-[#FF5722] data-[state=active]:text-white"
                >
                  All Items
                </TabsTrigger>
                <TabsTrigger 
                  value="low-stock" 
                  className="text-xs data-[state=active]:bg-[#FF5722] data-[state=active]:text-white"
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Low Stock
                </TabsTrigger>
                <TabsTrigger 
                  value="best-sellers" 
                  className="text-xs data-[state=active]:bg-[#FF5722] data-[state=active]:text-white"
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Best Sellers
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Product Grid - Scrollable */}
          <ScrollArea className="flex-1 px-6 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-4">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock === 0;
                const cartItem = cart.find(item => item.productId === product.id);
                const remainingStock = product.stock - (cartItem?.quantity || 0);
                const isFlashing = flashingProduct === product.id;
                
                return (
                  <motion.div
                    key={product.id}
                    whileHover={!isOutOfStock ? { y: -2 } : {}}
                    className="group relative"
                  >
                    <Card
                      className={cn(
                        "overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md bg-white cursor-pointer",
                        isOutOfStock && "opacity-50 grayscale cursor-not-allowed",
                        isFlashing && "ring-2 ring-[#FF5722] ring-offset-2"
                      )}
                      onClick={() => !isOutOfStock && showDetails(product)}
                    >
                      {/* Product Image with Overlays */}
                      <div className="aspect-square relative overflow-hidden bg-gray-50">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Stock Badge - Glassmorphism Overlay */}
                        <div className="absolute top-2 right-2">
                          {remainingStock === 0 ? (
                            <Badge className="bg-red-500/90 text-white backdrop-blur-md border-0 text-xs px-2 py-0.5">
                              Out
                            </Badge>
                          ) : remainingStock < 10 ? (
                            <Badge className="bg-black/50 text-white backdrop-blur-md border-0 text-xs px-2 py-0.5">
                              {remainingStock}
                            </Badge>
                          ) : (
                            <Badge className="bg-black/50 text-white backdrop-blur-md border-0 text-xs px-2 py-0.5">
                              {remainingStock}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Cart Quantity Badge - Top Left */}
                        {cartItem && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-2 left-2 bg-[#FF5722] text-white rounded-full h-7 w-7 flex items-center justify-center font-bold text-xs shadow-lg ring-2 ring-white"
                          >
                            ×{cartItem.quantity}
                          </motion.div>
                        )}
                        
                        {/* Hover Add Indicator */}
                        {!isOutOfStock && !cartItem && (
                          <div className="absolute inset-0 bg-[#FF5722]/0 group-hover:bg-[#FF5722]/10 transition-all duration-200 flex items-center justify-center">
                            <Plus className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </div>

                      {/* Product Info - Detailed */}
                      <div className="p-3 space-y-2">
                        {/* Product Name */}
                        <h3 className="font-semibold text-sm line-clamp-2 text-gray-900 min-h-[2.5rem] leading-tight" title={product.name}>
                          {product.name}
                        </h3>
                        
                        {/* Category Badge */}
                        <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 h-5 border-gray-300">
                          {product.category}
                        </Badge>
                        
                        {/* Product Details Grid */}
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground pt-1">
                          {/* SKU */}
                          <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3 text-gray-400" />
                            <span className="font-mono truncate">{product.id.slice(-8)}</span>
                          </div>
                          
                          {/* Stock Count */}
                          <div className="flex items-center gap-1 justify-end">
                            <Package className="h-3 w-3 text-gray-400" />
                            <span className={cn(
                              "font-semibold",
                              remainingStock === 0 ? "text-red-600" : 
                              remainingStock < 10 ? "text-orange-600" : 
                              "text-green-600"
                            )}>
                              {remainingStock} in stock
                            </span>
                          </div>
                          
                          {/* Sales */}
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-gray-400" />
                            <span>{product.sales || 0} sold</span>
                          </div>
                          
                          {/* Rating */}
                          <div className="flex items-center gap-1 justify-end">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span>{product.rating ? product.rating.toFixed(1) : '0.0'} ({product.reviews || 0})</span>
                          </div>
                        </div>
                        
                        {/* Price - Prominent */}
                        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                          <span className="text-lg font-bold text-[#FF5722]">
                            ₱{product.price.toLocaleString()}
                          </span>
                          {!isOutOfStock && (
                            <Button 
                              size="sm" 
                              className="h-7 px-3 bg-[#FF5722] hover:bg-[#F4511E] text-white text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product);
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Search className="h-16 w-16 mb-4" />
                <p className="text-lg font-medium">No products found</p>
                <p className="text-sm">Try a different search or filter</p>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel: Cart/Register */}
        <div className="hidden lg:flex lg:w-[35%] flex-col bg-background border-l border-gray-200">
          {/* Cart Header */}
          <div className="px-5 py-4 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Current Sale</h2>
              {cart.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearCart}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-3"
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Cart Items - Scrollable Area */}
          <ScrollArea className="flex-1 px-5 py-3">
            <AnimatePresence>
              {cart.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center py-12"
                >
                  <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <ShoppingCart className="h-10 w-10 text-gray-300" />
                  </div>
                  <p className="text-base font-bold text-gray-900 mb-1">Cart is empty</p>
                  <p className="text-sm text-muted-foreground">Click products to add</p>
                </motion.div>
              ) : (
                <div className="space-y-2 pb-3">
                  {cart.map((item) => (
                    <motion.div
                      key={item.productId}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      layout
                      className="group bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 p-3">
                        {/* Thumbnail */}
                        <div className="w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                          <img
                            src={item.image}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-xs line-clamp-1 text-gray-900">
                            {item.productName}
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            ₱{item.price.toLocaleString()} each
                          </p>
                          
                          {/* Quantity Controls - Unified Pill */}
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="flex items-center border border-gray-300 rounded-full overflow-hidden">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(item.productId, -1);
                                }}
                                className="h-6 w-6 flex items-center justify-center hover:bg-gray-100 transition-colors"
                              >
                                <Minus className="h-3 w-3 text-gray-600" />
                              </button>
                              
                              <span className="text-xs font-bold w-8 text-center text-gray-900">
                                {item.quantity}
                              </span>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(item.productId, 1);
                                }}
                                disabled={item.quantity >= item.maxStock}
                                className="h-6 w-6 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50"
                              >
                                <Plus className="h-3 w-3 text-gray-600" />
                              </button>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromCart(item.productId);
                              }}
                              className="h-6 w-6 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Item Subtotal */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-gray-900">
                            ₱{(item.price * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>

          {/* Sticky Footer - Payment Section */}
          {cart.length > 0 && (
            <div className="border-t border-gray-200 bg-white flex-shrink-0">
              {/* Note Input */}
              <div className="px-5 py-3 border-b border-gray-100">
                <Input
                  placeholder="Add note (optional)..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="border-gray-300 h-9 text-sm"
                />
              </div>

              {/* Financial Breakdown */}
              <div className="px-5 py-4 space-y-2 bg-gray-50/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-gray-700">₱{cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium text-gray-700">₱0.00</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium text-gray-700">₱0.00</span>
                </div>
                
                {/* Total - Massive */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-3xl font-extrabold text-gray-900">₱{cartTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Charge Button */}
              <div className="px-5 py-4 bg-white">
                <Button
                  onClick={completeSale}
                  disabled={isProcessing}
                  className="w-full h-14 text-base font-bold bg-[#FF5722] hover:bg-[#E64A19] text-white shadow-lg hover:shadow-xl transition-all"
                >
                  {isProcessing ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5 mr-2" />
                      Charge ₱{cartTotal.toLocaleString()}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Details Modal */}
      <Dialog open={showProductDetails} onOpenChange={setShowProductDetails}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Product Details
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Product Images */}
                <div className="space-y-3">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                    <img
                      src={selectedProduct.images[0]}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Thumbnail Gallery */}
                  {selectedProduct.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {selectedProduct.images.slice(1, 5).map((img, idx) => (
                        <div key={idx} className="aspect-square rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                          <img src={img} alt={`${selectedProduct.name} ${idx + 2}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Information */}
                <div className="space-y-4">
                  {/* Name & Price */}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedProduct.name}
                    </h2>
                    <div className="text-3xl font-extrabold text-[#FF5722]">
                      ₱{selectedProduct.price.toLocaleString()}
                    </div>
                  </div>

                  {/* Category & Status */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-sm font-medium">
                      {selectedProduct.category}
                    </Badge>
                    <Badge 
                      className={cn(
                        "text-sm font-medium",
                        selectedProduct.approvalStatus === 'approved' ? "bg-green-500" :
                        selectedProduct.approvalStatus === 'pending' ? "bg-yellow-500" :
                        "bg-red-500"
                      )}
                    >
                      {selectedProduct.approvalStatus}
                    </Badge>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Package className="h-4 w-4" />
                        Stock Available
                      </div>
                      <div className={cn(
                        "text-2xl font-bold",
                        selectedProduct.stock === 0 ? "text-red-600" :
                        selectedProduct.stock < 10 ? "text-orange-600" :
                        "text-green-600"
                      )}>
                        {selectedProduct.stock}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <TrendingUp className="h-4 w-4" />
                        Total Sales
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {selectedProduct.sales || 0}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        Rating
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {selectedProduct.rating ? selectedProduct.rating.toFixed(1) : '0.0'}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Hash className="h-4 w-4" />
                        Reviews
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {selectedProduct.reviews || 0}
                      </div>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-muted-foreground font-medium">Product ID</span>
                      <span className="font-mono text-gray-900">{selectedProduct.id}</span>
                    </div>
                    
                    {selectedProduct.description && (
                      <div className="py-2">
                        <span className="text-muted-foreground font-medium block mb-2">Description</span>
                        <p className="text-gray-700 leading-relaxed">{selectedProduct.description}</p>
                      </div>
                    )}

                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-muted-foreground font-medium">Created</span>
                      <span className="text-gray-900">
                        {new Date(selectedProduct.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-muted-foreground font-medium">Last Updated</span>
                      <span className="text-gray-900">
                        {new Date(selectedProduct.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Add to Cart Button */}
                  <div className="pt-4">
                    <Button
                      onClick={() => addToCart(selectedProduct, true)}
                      disabled={selectedProduct.stock === 0}
                      className="w-full h-12 text-base font-bold bg-[#FF5722] hover:bg-[#E64A19] text-white"
                    >
                      {selectedProduct.stock === 0 ? (
                        'Out of Stock'
                      ) : (
                        <>
                          <ShoppingCart className="h-5 w-5 mr-2" />
                          Add to Cart
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              Sale Completed!
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-4">
              <p className="text-base">
                Inventory has been updated successfully.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-mono font-medium">{successOrderId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-bold text-orange-600">₱{cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <Badge className="bg-green-500">Paid & Completed</Badge>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                This transaction is now visible in your Orders page.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => navigate('/seller/orders')}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              View Orders
            </Button>
            <Button
              onClick={() => setShowSuccess(false)}
              variant="outline"
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SellerPOS;
