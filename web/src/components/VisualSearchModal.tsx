import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, ImagePlus, Search, Package } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useImageUpload } from './hooks/use-image-upload';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

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
  products = []
}: VisualSearchModalProps) {
  const navigate = useNavigate();
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const {
    previewUrl,
    fileName,
    fileInputRef,
    handleThumbnailClick,
    handleFileChange: originalHandleFileChange,
    handleRemove,
  } = useImageUpload({
    onUpload: (url) => {
      // Simulate visual search
      handleVisualSearch(url);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    originalHandleFileChange(e);
  };

  const handleVisualSearch = async (imageUrl: string) => {
    setIsSearching(true);
    setHasSearched(false);

    // Simulate AI visual search
    // In production, send imageUrl to AI vision API for product matching
    console.log('Analyzing image:', imageUrl);
    
    setTimeout(() => {
      // Mock search results - in real app, this would call an AI vision API with imageUrl
      const mockResults = products.slice(0, 6);
      setSearchResults(mockResults);
      setIsSearching(false);
      setHasSearched(true);
    }, 2000);
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
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Camera className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Visual Search</h2>
                <p className="text-sm text-gray-600">Upload an image to find similar products</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
            {/* Upload Area */}
            <div className="mb-6">
              <Input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />

              {!previewUrl ? (
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
                    <p className="text-lg font-medium text-gray-700">Upload Product Image</p>
                    <p className="text-sm text-gray-500 mt-1">Click to browse or drag & drop</p>
                    <p className="text-xs text-gray-400 mt-2">Supports JPG, PNG, GIF (Max 10MB)</p>
                  </div>
                </div>
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
                      onClick={() => {
                        handleRemove();
                        setSearchResults([]);
                        setHasSearched(false);
                      }}
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
                    <p className="font-semibold text-gray-900">Analyzing image...</p>
                    <p className="text-sm text-gray-600">Finding similar products</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Search Results */}
            {hasSearched && !isSearching && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {searchResults.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Search className="w-5 h-5 text-orange-500" />
                        <h3 className="font-semibold text-gray-900">
                          Found {searchResults.length} similar products
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      {searchResults.map((product) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          onClick={() => handleProductClick(product.id)}
                          className="bg-white border border-gray-200 rounded-xl p-3 cursor-pointer hover:shadow-lg hover:border-orange-300 transition-all group"
                        >
                          <div className="aspect-square mb-2 overflow-hidden rounded-lg bg-gray-100">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                          </div>
                          <h4 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">
                            {product.name}
                          </h4>
                          <p className="text-orange-600 font-bold text-sm">
                            ₱{product.price.toLocaleString()}
                          </p>
                        </motion.div>
                      ))}
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
                      We couldn't find products matching your image. Would you like to request it?
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
                        Request this product and we'll notify you when it becomes available or connect you with a seller.
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
