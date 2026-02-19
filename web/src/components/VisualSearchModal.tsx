import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, ImagePlus, Search, Package, Tag, Store, Palette, AlertCircle, Link as LinkIcon, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { productService } from "@/services/productService";

interface VisualSearchResult {
  id: string;
  name: string;
  price: number;
  brand?: string | null;
  category?: string | { name: string } | null;
  primary_image_url?: string;
  images?: Array<{ image_url: string; is_primary?: boolean }>;
  variants?: Array<{
    id: string;
    variant_name: string;
    color?: string | null;
    size?: string | null;
    price: number;
    stock: number;
  }>;
  variant_label_1?: string | null;
  variant_label_2?: string | null;
  seller?: { store_name?: string } | null;
  sellerName?: string;
  rating?: number;
  reviewCount?: number;
}

interface VisualSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestProduct: () => void;
  products?: any[];
}

export default function VisualSearchModal({
  isOpen,
  onClose,
  onRequestProduct,
}: VisualSearchModalProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<VisualSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedInfo, setDetectedInfo] = useState<{ category?: string; possibleBrand?: string; detectedItem?: string } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // URL input state
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [inputMode, setInputMode] = useState<'upload' | 'url'>('upload');

  const handleThumbnailClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setFileName(file.name);
      setSelectedFile(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Trigger visual search
      await handleVisualSearch(file);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setFileName("");
    setSelectedFile(null);
    setSearchResults([]);
    setHasSearched(false);
    setDetectedInfo(null);
    setSearchError(null);
    setImageUrlInput("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleVisualSearch = async (imageFile: File) => {
    setIsSearching(true);
    setHasSearched(false);
    setSearchError(null);
    setDetectedInfo(null);

    console.log("Performing visual search for:", imageFile.name);

    try {
      const result = await productService.visualSearch(imageFile);

      setSearchResults(result.products);
      setDetectedInfo(result.detectedInfo || null);
      setHasSearched(true);
    } catch (error) {
      console.error("Visual search failed:", error);
      setSearchError("Visual search failed. Please try again or use a different image.");
      setSearchResults([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUrlSearch = async () => {
    if (!imageUrlInput.trim()) {
      setSearchError("Please enter an image URL");
      return;
    }

    // Validate URL format
    try {
      new URL(imageUrlInput);
    } catch {
      setSearchError("Please enter a valid URL");
      return;
    }

    setIsSearching(true);
    setHasSearched(false);
    setSearchError(null);
    setDetectedInfo(null);
    setPreviewUrl(imageUrlInput);
    setFileName(imageUrlInput.split('/').pop() || 'URL Image');

    console.log("Performing visual search for URL:", imageUrlInput);

    try {
      const result = await productService.visualSearchByUrl(imageUrlInput);

      setSearchResults(result.products);
      setDetectedInfo(result.detectedInfo || null);
      setHasSearched(true);
    } catch (error) {
      console.error("Visual search failed:", error);
      setSearchError("Visual search failed. Please check the URL or try a different image.");
      setSearchResults([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const fakeEvent = {
        target: {
          files: dataTransfer.files,
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(fakeEvent);
    }
  };

  const handleProductClick = (productId: string) => {
    navigate(`/product/${productId}`);
    onClose();
  };

  const handleRequestClick = () => {
    onClose();
    onRequestProduct();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button - floating in top right */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 transition-colors bg-white rounded-full p-2 shadow-md hover:shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[90vh]">
            {/* Input Mode Toggle */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={inputMode === 'upload' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setInputMode('upload'); handleRemove(); }}
                className={inputMode === 'upload' ? 'bg-orange-500 hover:bg-orange-600' : ''}
              >
                <ImagePlus className="w-4 h-4 mr-2" />
                Upload Image
              </Button>
              <Button
                variant={inputMode === 'url' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setInputMode('url'); handleRemove(); }}
                className={inputMode === 'url' ? 'bg-orange-500 hover:bg-orange-600' : ''}
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Paste URL
              </Button>
            </div>

            {/* Upload Area or URL Input */}
            <div className="mb-6">
              <Input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />

              {!previewUrl ? (
                inputMode === 'upload' ? (
                  <div
                    onClick={handleThumbnailClick}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      "flex h-64 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition-all hover:bg-gray-100 hover:border-orange-400",
                      isDragging && "border-orange-500 bg-orange-50 scale-105",
                    )}
                  >
                    <div className="rounded-full bg-white p-4 shadow-sm">
                      <ImagePlus className="h-8 w-8 text-gray-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-medium text-gray-700">
                        Upload Product Image
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Click to browse or drag & drop
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Supports JPG, PNG, GIF (Max 10MB)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        type="url"
                        placeholder="Paste image URL here (e.g., https://example.com/image.jpg)"
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUrlSearch()}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleUrlSearch}
                        disabled={isSearching || !imageUrlInput.trim()}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        {isSearching ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Tips for URL search:</strong>
                      </p>
                      <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                        <li>Use direct image URLs ending with .jpg, .png, .gif, etc.</li>
                        <li>Make sure the image is publicly accessible</li>
                        <li>Product images work best for accurate results</li>
                      </ul>
                    </div>
                  </div>
                )
              ) : (
                <div className="relative">
                  <div className="relative h-64 overflow-hidden rounded-xl border-2 border-gray-200">
                    <img
                      src={previewUrl}
                      alt="Search preview"
                      className="h-full w-full object-contain bg-gray-50"
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="truncate">{fileName}</span>
                    </div>
                    <Button
                      onClick={handleRemove}
                      variant="outline"
                      size="sm"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Searching State */}
            {isSearching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="inline-flex items-center gap-3 px-6 py-4 bg-orange-50 rounded-xl">
                  <div className="w-6 h-6 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">
                      Analyzing image...
                    </p>
                    <p className="text-sm text-gray-600">
                      Finding similar products in our catalog
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Error State */}
            {searchError && hasSearched && !isSearching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{searchError}</p>
                </div>
              </motion.div>
            )}

            {/* Search Results */}
            {hasSearched && !isSearching && !searchError && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {searchResults.length > 0 ? (
                  <>
                    {/* Detected Info Banner */}
                    {detectedInfo && (detectedInfo.detectedItem || detectedInfo.category || detectedInfo.possibleBrand) && (
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-2 flex-wrap text-blue-800">
                          <Tag className="w-4 h-4" />
                          <span className="font-medium">AI Detected:</span>
                          {detectedInfo.detectedItem && (
                            <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium capitalize">
                              {detectedInfo.detectedItem}
                            </span>
                          )}
                          {detectedInfo.category && (
                            <span className="bg-blue-100 px-2 py-0.5 rounded text-sm">
                              Category: {detectedInfo.category}
                            </span>
                          )}
                          {detectedInfo.possibleBrand && (
                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-sm">
                              Brand: {detectedInfo.possibleBrand}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Search className="w-5 h-5 text-orange-500" />
                        <h3 className="font-semibold text-gray-900">
                          Found {searchResults.length} similar products
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {searchResults.map((product) => {
                        // Get the product image
                        const productImage = product.primary_image_url ||
                          product.images?.find((img: any) => img.is_primary)?.image_url ||
                          product.images?.[0]?.image_url ||
                          'https://via.placeholder.com/200?text=No+Image';

                        // Get category name
                        const categoryName = typeof product.category === 'string'
                          ? product.category
                          : product.category?.name || 'Uncategorized';

                        // Get available variants summary
                        const variants = product.variants || [];
                        const colors = [...new Set(variants.map((v: any) => v.color).filter(Boolean))];
                        const sizes = [...new Set(variants.map((v: any) => v.size).filter(Boolean))];

                        // Get seller name
                        const sellerName = product.sellerName || product.seller?.store_name;

                        return (
                          <motion.div
                            key={product.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={() => handleProductClick(product.id)}
                            className="bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg hover:border-orange-300 transition-all group"
                          >
                            {/* Product Image */}
                            <div className="aspect-square overflow-hidden bg-gray-100 relative">
                              <img
                                src={productImage}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                              {/* Category Badge */}
                              <div className="absolute top-2 left-2">
                                <span className="bg-white/90 backdrop-blur-sm text-xs px-2 py-1 rounded-full text-gray-700 font-medium">
                                  {categoryName}
                                </span>
                              </div>
                            </div>

                            {/* Product Info */}
                            <div className="p-3">
                              {/* Product Name */}
                              <h4 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">
                                {product.name}
                              </h4>

                              {/* Brand */}
                              {product.brand && (
                                <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                  <Tag className="w-3 h-3" />
                                  <span>{product.brand}</span>
                                </div>
                              )}

                              {/* Seller */}
                              {sellerName && (
                                <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                                  <Store className="w-3 h-3" />
                                  <span className="truncate">{sellerName}</span>
                                </div>
                              )}

                              {/* Variants Info */}
                              {(colors.length > 0 || sizes.length > 0) && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {colors.length > 0 && (
                                    <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                      <Palette className="w-3 h-3" />
                                      <span>{colors.length} {colors.length === 1 ? 'color' : 'colors'}</span>
                                    </div>
                                  )}
                                  {sizes.length > 0 && (
                                    <div className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                      {sizes.length} {sizes.length === 1 ? 'size' : 'sizes'}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Price */}
                              <p className="text-orange-600 font-bold">
                                ₱{(product.price || 0).toLocaleString()}
                              </p>

                              {/* Rating if available */}
                              {product.rating !== undefined && product.rating > 0 && (
                                <div className="flex items-center gap-1 mt-1">
                                  <span className="text-yellow-500">★</span>
                                  <span className="text-xs text-gray-600">
                                    {product.rating.toFixed(1)}
                                    {product.reviewCount !== undefined && ` (${product.reviewCount})`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No similar products found
                    </h3>
                    <p className="text-gray-600 mb-6">
                      We couldn't find products matching your image. Would you
                      like to request it?
                    </p>
                  </div>
                )}

                {/* Request Product Button */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        Can't find what you're looking for?
                      </h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Request this product and we'll notify you when it
                        becomes available or connect you with a seller.
                      </p>
                      <Button
                        onClick={handleRequestClick}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        <Package className="w-4 h-4 mr-2" />
                        Request This Product
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
