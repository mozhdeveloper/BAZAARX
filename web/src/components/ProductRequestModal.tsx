import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, ImagePlus, Send, CheckCircle, Upload, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useImageUpload } from './hooks/use-image-upload';
import { cn } from '@/lib/utils';
import { productRequestService } from '@/services/productRequestService';
import { supabase } from '@/lib/supabase';

interface ProductRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSearchTerm?: string;
}

export default function ProductRequestModal({ 
  isOpen, 
  onClose, 
  initialSearchTerm = '' 
}: ProductRequestModalProps) {
  const [formData, setFormData] = useState({
    productName: initialSearchTerm,
    description: '',
    imageUrl: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const {
    previewUrl,
    fileName,
    fileInputRef,
    handleThumbnailClick,
    handleFileChange,
    handleRemove,
  } = useImageUpload({
    onUpload: (url) => {
      setFormData(prev => ({
        ...prev,
        imageUrl: url
      }));
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName.trim() || !formData.description.trim()) return;

    setIsSubmitting(true);

    try {
      // Get current user info for attribution
      let requestedByName = 'Anonymous Buyer';
      let requestedById: string | undefined;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        requestedById = session.user.id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', session.user.id)
          .single();
        if (profile) {
          requestedByName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Buyer';
        }
      }

      await productRequestService.addRequest({
        productName: formData.productName.trim(),
        description: formData.description.trim(),
        category: 'General',
        requestedByName,
        requestedById,
      });

      setIsSubmitting(false);
      setIsSuccess(true);

      // Reset and close after 2 seconds
      setTimeout(() => {
        setIsSuccess(false);
        setFormData({
          productName: '',
          description: '',
          imageUrl: ''
        });
        handleRemove();
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('[ProductRequest] Error submitting:', error);
      setIsSubmitting(false);
      alert('Failed to submit product request. Please try again.');
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
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
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {!isSuccess ? (
            <>
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Request Product</h2>
                    <p className="text-sm text-gray-600">Can't find what you're looking for?</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Info Banner */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Tell us what you need and we'll notify you when it becomes available or find a seller who can provide it!
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Product Name */}
                <div>
                  <Label htmlFor="productName" className="text-sm font-medium text-gray-700">
                    Product Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="productName"
                    name="productName"
                    value={formData.productName}
                    onChange={handleChange}
                    placeholder="What product are you looking for?"
                    className="mt-1"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                    Description <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Provide more details about what you're looking for (brand, specifications, features, etc.)"
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                    rows={4}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The more details you provide, the better we can help you!
                  </p>
                </div>

                {/* Image Upload */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Product Image (Optional)
                  </Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Upload a reference image to help us find exactly what you need
                  </p>

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
                        "flex h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:bg-gray-100",
                        isDragging && "border-orange-500 bg-orange-50",
                      )}
                    >
                      <div className="rounded-full bg-white p-3 shadow-sm">
                        <ImagePlus className="h-6 w-6 text-gray-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700">Click to upload or drag & drop</p>
                        <p className="text-xs text-gray-500">JPG, PNG, GIF (Max 10MB)</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="group relative h-48 overflow-hidden rounded-lg border border-gray-200">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100" />
                        <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={handleThumbnailClick}
                            className="h-9 w-9 p-0"
                            type="button"
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleRemove}
                            className="h-9 w-9 p-0"
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {fileName && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                          <span className="truncate">{fileName}</span>
                          <button
                            onClick={handleRemove}
                            className="ml-auto rounded-full p-1 hover:bg-gray-200"
                            type="button"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 border-gray-300"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={isSubmitting || !formData.productName || !formData.description}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Request
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="text-center py-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="w-10 h-10 text-green-600" />
              </motion.div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h3>
              <p className="text-gray-600 mb-6">
                We've received your product request. We'll notify you via email when we find a match or when the product becomes available.
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800">
                  💡 <strong>Tip:</strong> Check your profile for request status updates
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
