import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, ImagePlus, Send, CheckCircle, Upload, Trash2, Link, Plus } from 'lucide-react';
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
  const [referenceLinks, setReferenceLinks] = useState<string[]>(['']);
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
        referenceLinks: referenceLinks.map(l => l.trim()).filter(Boolean),
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
        setReferenceLinks(['']);
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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 380 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col"
          style={{ maxHeight: 'min(90vh, 720px)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {!isSuccess ? (
            <>
              {/* ── Sticky Header ── */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-gray-900 leading-tight">Request a Product</h2>
                  <p className="text-xs text-gray-500 leading-tight mt-0.5">Can't find what you're looking for?</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ── Scrollable Body ── */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-hide">
                {/* Info Banner */}
                <div className="flex gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <div className="w-1 rounded-full bg-blue-400 flex-shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Tell us what you need and we'll notify you when it becomes available or find a seller who can provide it.
                  </p>
                </div>

                {/* Product Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="productName" className="text-sm font-semibold text-gray-700">
                    Product Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="productName"
                    name="productName"
                    value={formData.productName}
                    onChange={handleChange}
                    placeholder="What product are you looking for?"
                    className="h-10 text-sm border-gray-200 focus:border-orange-400 focus:ring-orange-400/20 rounded-lg"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-sm font-semibold text-gray-700">
                    Description <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Brand, specifications, features, preferred price range…"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/20 focus:border-orange-400 resize-none placeholder:text-gray-400 transition-colors"
                    rows={3}
                    required
                  />
                  <p className="text-[11px] text-gray-400">More details = faster match.</p>
                </div>

                {/* Image Upload */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">
                    Reference Image <span className="text-gray-400 font-normal">(Optional)</span>
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
                        "flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 transition-all hover:border-orange-300 hover:bg-orange-50/40",
                        isDragging && "border-orange-400 bg-orange-50",
                      )}
                    >
                      <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center">
                        <ImagePlus className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium text-gray-600">Click to upload or drag & drop</p>
                        <p className="text-[11px] text-gray-400">JPG, PNG, GIF — max 10 MB</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative group rounded-xl overflow-hidden border border-gray-200 h-36">
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

                {/* Reference Links */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-gray-700">
                    Reference Links <span className="text-gray-400 font-normal">(Optional)</span>
                  </Label>
                  <p className="text-[11px] text-gray-400">Paste links from Shopee, Lazada, Amazon, etc.</p>
                  <div className="space-y-2 mt-2">
                    {referenceLinks.map((link, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
                          <Link className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <Input
                          type="url"
                          value={link}
                          onChange={(e) => {
                            const updated = [...referenceLinks];
                            updated[idx] = e.target.value;
                            setReferenceLinks(updated);
                          }}
                          placeholder={`https://shopee.ph/product-${idx + 1}`}
                          className="flex-1 h-9 text-sm border-gray-200 focus:border-orange-400 focus:ring-orange-400/20 rounded-lg"
                        />
                        {referenceLinks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setReferenceLinks(referenceLinks.filter((_, i) => i !== idx))}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {referenceLinks.length < 5 && (
                      <button
                        type="button"
                        onClick={() => setReferenceLinks([...referenceLinks, ''])}
                        className="flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-600 font-semibold mt-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add another link
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Sticky Footer ── */}
              <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-white flex-shrink-0 rounded-b-2xl">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-10 text-sm font-semibold border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="product-request-form"
                  className="flex-1 h-10 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-sm shadow-orange-200 active:scale-[0.98] transition-all"
                  disabled={isSubmitting || !formData.productName || !formData.description}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-3.5 h-3.5" />
                      Submit Request
                    </span>
                  )}
                </Button>
              </div>
            </>
          ) : (
            /* Success State */
            <div className="flex flex-col items-center justify-center px-8 py-12 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 18, stiffness: 320 }}
                className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-5"
              >
                <CheckCircle className="w-8 h-8 text-green-500" />
              </motion.div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Request Submitted!</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                We've received your request and will notify you when we find a match or when the product becomes available.
              </p>
              <div className="w-full bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-xs text-orange-700 text-left">
                <strong>Tip:</strong> Check your profile page for request status updates.
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
