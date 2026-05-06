import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, ImagePlus, Send, CheckCircle, Upload, Trash2, Link, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useImageUpload } from './hooks/use-image-upload';
import { cn } from '@/lib/utils';
import { productRequestService } from '@/services/productRequestService';
import { supabase } from '@/lib/supabase';

const CATEGORIES = [
  'Electronics', 'Home & Living', 'Fashion', 'Beauty & Care',
  'Sports & Outdoors', 'Toys & Hobbies', 'Food & Beverage',
  'Office & School', 'Pet Supplies', 'Tools & Hardware', 'Other',
];

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
    category: '',
    imageUrl: ''
  });
  const [referenceLink, setReferenceLink] = useState<string>('');
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

      const link = referenceLink.trim();
      await productRequestService.addRequest({
        productName: formData.productName.trim(),
        description: formData.description.trim(),
        category: formData.category || 'General',
        requestedByName,
        requestedById,
        referenceLinks: link ? [link] : [],
      });

      setIsSubmitting(false);
      setIsSuccess(true);

      // Reset and close after 2 seconds
      setTimeout(() => {
        setIsSuccess(false);
        setFormData({
          productName: '',
          description: '',
          category: '',
          imageUrl: ''
        });
        setReferenceLink('');
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
      {/* Backdrop — z-[200] sits above Header's z-[100] */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[200] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ type: 'spring', damping: 28, stiffness: 400 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
          style={{ maxHeight: 'min(88vh, 680px)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {!isSuccess ? (
            <>
              {/* ── Header ── */}
              <div className="relative flex-shrink-0 bg-gradient-to-br from-orange-500 to-amber-500 px-6 pt-5 pb-6">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Icon + title */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-white leading-tight">Request a Product</h2>
                    <p className="text-xs text-white/75 mt-0.5">Can't find it? We'll source it for you.</p>
                  </div>
                </div>

                {/* Info strip */}
                <div className="mt-4 flex items-start gap-2.5 bg-white/15 rounded-xl px-3.5 py-3">
                  <span className="text-base mt-0.5">💡</span>
                  <p className="text-xs text-white/90 leading-relaxed">
                    Tell us what you need and we'll notify you when it becomes available or when we find a trusted seller.
                  </p>
                </div>
              </div>

              {/* ── Scrollable body ── */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-hide">

                {/* Product Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="productName" className="text-sm font-semibold text-gray-800">
                    Product Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="productName"
                    name="productName"
                    value={formData.productName}
                    onChange={handleChange}
                    placeholder="e.g. USB-C cable that won't fray"
                    className="h-11 text-sm border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 rounded-xl"
                    required
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-sm font-semibold text-gray-800">Category</Label>
                  <div className="relative">
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full h-11 pl-3.5 pr-10 text-sm border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400 appearance-none transition-colors"
                    >
                      <option value="">Select a category</option>
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-sm font-semibold text-gray-800">
                    Description <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe the brand, specifications, features, or preferred price range…"
                    className="w-full px-3.5 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400 resize-none placeholder:text-gray-400 transition-colors leading-relaxed"
                    rows={3}
                    required
                  />
                  <p className="text-[11px] text-gray-400">More detail = faster match.</p>
                </div>

                {/* Image Upload */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-800">
                    Reference Image <span className="text-gray-400 font-normal text-xs">(optional)</span>
                  </Label>

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
                        "flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 transition-all hover:border-orange-400 hover:bg-orange-50/40",
                        isDragging && "border-orange-400 bg-orange-50",
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                        <ImagePlus className="h-4.5 w-4.5 text-gray-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-semibold text-gray-600">Click to upload or drag & drop</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">JPG, PNG, GIF — max 10 MB</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative group rounded-xl overflow-hidden border border-gray-200 h-28">
                      <img
                        loading="lazy"
                        src={previewUrl}
                        alt="Preview"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button size="sm" variant="secondary" onClick={handleThumbnailClick} className="h-8 w-8 p-0" type="button">
                          <Upload className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={handleRemove} className="h-8 w-8 p-0" type="button">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {fileName && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-3 py-1.5 flex items-center gap-2">
                          <span className="text-[11px] text-white truncate flex-1">{fileName}</span>
                          <button onClick={handleRemove} className="text-white/70 hover:text-white" type="button">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Reference Link */}
                <div className="space-y-1.5">
                  <Label htmlFor="referenceLink" className="text-sm font-semibold text-gray-800">
                    Reference Link <span className="text-gray-400 font-normal text-xs">(optional)</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
                      <Link className="w-4 h-4 text-gray-400" />
                    </div>
                    <Input
                      id="referenceLink"
                      type="url"
                      value={referenceLink}
                      onChange={(e) => setReferenceLink(e.target.value)}
                      placeholder="https://shopee.ph/product-link"
                      className="flex-1 h-11 text-sm border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 rounded-xl"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">Optional — paste a link from Shopee, Lazada, Amazon, etc.</p>
                </div>
              </div>

              {/* ── Footer ── */}
              <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50/60 px-6 py-4 flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-11 text-sm font-semibold border-gray-200 text-gray-600 hover:bg-white rounded-xl"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1 h-11 text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-sm shadow-orange-200 active:scale-[0.98] transition-all disabled:opacity-50"
                  disabled={isSubmitting || !formData.productName.trim() || !formData.description.trim()}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Submit Request
                    </span>
                  )}
                </Button>
              </div>
            </>
          ) : (
            /* ── Success State ── */
            <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 16, stiffness: 280, delay: 0.05 }}
                className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-green-50/60"
              >
                <CheckCircle className="w-10 h-10 text-green-500" />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <h3 className="text-xl font-extrabold text-gray-900 mb-2">Request Submitted!</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto mb-6">
                  We've received your request and will notify you when we find a match or the product becomes available.
                </p>
                <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 text-xs text-orange-700 text-left">
                  <strong>Tip:</strong> Visit your profile to track the status of your request.
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
