import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Plus, ShoppingBag, Copy, Check, Trash2, Globe } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useNavigate } from "react-router-dom";
import {
  useBuyerStore,
  RegistryProduct,
  RegistryItem,
} from "../stores/buyerStore";
import { cn } from "../lib/utils";
import { EditRegistryItemModal } from "./EditRegistryItemModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const getOccasionLabel = (id: string | undefined | null) => {
  if (!id) return "GIFT LIST";
  if (id === "baby") return "BABY SHOWER";
  const labels: Record<string, string> = {
    wedding: "WEDDING",
    birthday: "BIRTHDAY",
    graduation: "GRADUATION",
    housewarming: "HOUSEWARMING",
    christmas: "CHRISTMAS",
    other: "OTHER"
  };
  return labels[id] || id.replace("_", " ").toUpperCase();
};


interface RegistryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  registry: RegistryItem | null;
  onAddProduct: (registryId: string, productName: string) => void;
  onDelete?: (registryId: string) => void;
}

export const RegistryDetailModal = ({
  isOpen,
  onClose,
  registry,
  onAddProduct,
  onDelete,
}: RegistryDetailModalProps) => {
  const [newProductName, setNewProductName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const navigate = useNavigate();

  const {
    registries,
    updateRegistryItem,
    removeRegistryItem,
    updateRegistryMeta,
    addresses,
  } = useBuyerStore();
  const [selectedItem, setSelectedItem] = useState<RegistryProduct | null>(
    null,
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [addressId, setAddressId] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  // Editable registry meta — mirrors mobile EditCategoryModal
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const selectedAddress = useMemo(
    () => (addresses || []).find((addr) => addr.id === addressId),
    [addresses, addressId],
  );

  const liveRegistry = useMemo(() => {
    if (!registry) return null;
    const fromStore = registries.find((r) => r.id === registry.id);
    console.log('[RegistryDetailModal] registry prop:', registry);
    console.log('[RegistryDetailModal] registry.privacy:', registry.privacy);
    console.log('[RegistryDetailModal] registry.delivery:', registry.delivery);
    console.log('[RegistryDetailModal] matching store registry:', fromStore);
    return fromStore || registry;
  }, [registries, registry]);

  useEffect(() => {
    if (liveRegistry) {
      const show = liveRegistry.delivery?.showAddress ?? false;
      const addr = liveRegistry.delivery?.addressId || "";
      console.log('[RegistryDetailModal] liveRegistry:', liveRegistry);
      console.log('[RegistryDetailModal] liveRegistry.privacy:', liveRegistry.privacy);
      console.log('[RegistryDetailModal] liveRegistry.delivery:', liveRegistry.delivery);
      setShowAddress(show || !!addr);
      setAddressId(addr);
      setDeliveryInstructions(liveRegistry.delivery?.instructions || "");
      setEditTitle(liveRegistry.title || "");
      setEditCategory(liveRegistry.category || "");
    }
  }, [liveRegistry]);

  if (!liveRegistry) return null;

  const handleAdd = () => {
    if (newProductName.trim()) {
      onAddProduct(liveRegistry.id, newProductName);
      setNewProductName("");
      setIsAdding(false);
    }
  };

  const handleItemClick = (item: any) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/registry/${liveRegistry.id}`;
    navigator.clipboard.writeText(link);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleShareClick = () => {
    setShowShareModal(true);
    setIsCopied(false);
  };

  const handleDelete = () => {
    if (onDelete && liveRegistry) {
      onDelete(liveRegistry.id);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  const handleSavePreferences = () => {
    updateRegistryMeta(liveRegistry.id, {
      title: editTitle.trim() || liveRegistry.title,
      category: editCategory.trim() || liveRegistry.category,
      privacy: "link",
      delivery: {
        addressId: addressId || undefined,
        showAddress,
        instructions: deliveryInstructions.trim() || undefined,
      },
    });
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-5xl bg-white rounded-2xl shadow-xl relative z-10 overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-6 relative overflow-y-auto flex-1">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>

              <div className="mb-6 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3 mb-3 pr-12">
                  <span className="text-sm text-[var(--text-secondary)]">
                    Created on {liveRegistry.sharedDate}
                  </span>
                  <div className="flex gap-2 ml-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleShareClick}
                      className="gap-2 text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Share</span>
                    </Button>
                    {onDelete && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </Button>
                    )}
                  </div>
                </div>
                {/* Editable Registry Name — matches mobile EditCategoryModal */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="registry-title" className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Registry Name</Label>
                    <Input
                      id="registry-title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="e.g., Sarah's Wedding"
                      maxLength={50}
                      className="text-xl font-bold text-[var(--text-primary)] border-gray-200 focus-visible:ring-[var(--brand-primary)] h-12"
                    />
                  </div>
                  {/* Editable Gift Category — matches mobile EditCategoryModal occasion field */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Gift Category</Label>
                    <Select value={editCategory} onValueChange={setEditCategory}>
                      <SelectTrigger className="focus:ring-[var(--brand-primary)] border-gray-200">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent className="z-[10200]" position="popper" side="bottom" sideOffset={4}>
                        <SelectItem value="wedding">Wedding</SelectItem>
                        <SelectItem value="baby">Baby Shower</SelectItem>
                        <SelectItem value="birthday">Birthday</SelectItem>
                        <SelectItem value="graduation">Graduation</SelectItem>
                        <SelectItem value="housewarming">Housewarming</SelectItem>
                        <SelectItem value="christmas">Christmas</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Link-Only Banner & Delivery preferences */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 h-full">
                      <Globe className="w-5 h-5 text-[var(--brand-primary)] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-headline)]">
                          Link-Only Access
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          This registry is link-only. Anyone with the link can view it, but it won't appear in public searches.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <input
                        id="detail-showAddress"
                        type="checkbox"
                        className="h-4 w-4"
                        checked={showAddress}
                        disabled={(addresses || []).length === 0}
                        onChange={(e) => setShowAddress(e.target.checked)}
                      />
                      <Label htmlFor="detail-showAddress" className={`text-sm ${(addresses || []).length === 0 ? 'text-gray-400' : ''}`}>
                        Share address with gifters
                      </Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate("/profile?tab=addresses")}
                        className="ml-auto text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900"
                      >
                        Manage addresses
                      </Button>
                    </div>
                    {(addresses || []).length === 0 && (
                      <p className="text-xs text-amber-600">
                        Please add a delivery address in your profile settings to enable address sharing.
                      </p>
                    )}
                    <Select
                      value={addressId}
                      onValueChange={(val) => {
                        setAddressId(val);
                        setShowAddress(true);
                      }}
                      disabled={(addresses || []).length === 0}
                    >
                      <SelectTrigger className="focus:ring-[var(--brand-primary)]">
                        <SelectValue
                          placeholder={
                            (addresses || []).length
                              ? "Select address"
                              : "No addresses saved"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="z-[10100] max-h-64 overflow-auto">
                        {(addresses || []).map((addr) => (
                          <SelectItem key={addr.id} value={addr.id}>
                            {addr.label || addr.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {showAddress && selectedAddress && (
                      <div className="text-xs text-[var(--text-secondary)] bg-white border border-gray-200 rounded-md p-3">
                        <div className="font-semibold text-[var(--text-primary)] mb-1">
                          {selectedAddress.label || selectedAddress.fullName}
                        </div>
                        <div>
                          {selectedAddress.street}
                          {selectedAddress.barangay
                            ? `, ${selectedAddress.barangay}`
                            : ""}
                        </div>
                        <div>
                          {selectedAddress.city}, {selectedAddress.province}
                          {selectedAddress.postalCode
                            ? ` ${selectedAddress.postalCode}`
                            : ""}
                        </div>
                        {selectedAddress.phone && (
                          <div className="mt-1">
                            Phone: {selectedAddress.phone}
                          </div>
                        )}
                      </div>
                    )}
                    <Input
                      placeholder="Delivery instructions (optional)"
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                      disabled={!showAddress}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    Registry Items
                  </h3>
                  <Button
                    onClick={() => {
                      navigate("/shop");
                      onClose();
                    }}
                    size="sm"
                    variant="outline"
                    className="text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {!liveRegistry.products ||
                    liveRegistry.products.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                      <div className="p-4 bg-gray-50 rounded-full mb-4">
                        <ShoppingBag className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-900 font-medium">No items yet</p>
                      <p className="text-gray-500 text-sm mt-1">
                        Start adding items to build your registry.
                      </p>
                      <Button
                        onClick={() => navigate("/shop")}
                        className="mt-6 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white rounded-full px-6"
                      >
                        Browse Products
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {liveRegistry.products.map((product: any, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleItemClick(product)}
                          className="flex flex-col bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden border border-gray-100 group"
                        >
                          <div className="aspect-[1/1] relative bg-gray-100 overflow-hidden">
                            {(product.image || (product as any).images?.[0]) ? (
                              <img loading="lazy"
                                src={product.image || (product as any).images?.[0]}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Gift className="w-12 h-12 text-gray-300" />
                              </div>
                            )}
                            {(product as any).isMostWanted && (
                              <div className="absolute top-2 left-2 bg-[var(--brand-primary)] text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
                                MOST WANTED
                              </div>
                            )}
                            {product.status && product.status !== 'available' && (
                              <div className={cn(
                                "absolute bottom-2 right-2 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide",
                                product.status === 'out_of_stock' ? "bg-red-500 text-white" :
                                product.status === 'seller_on_vacation' ? "bg-amber-500 text-white" :
                                "bg-gray-500 text-white"
                              )}>
                                {product.status.replace(/_/g, ' ')}
                              </div>
                            )}
                          </div>
                          <div className="p-3 flex flex-col">
                            <h4 className="font-medium text-gray-900 line-clamp-2 text-sm mb-1 leading-snug">
                              {product.name}
                            </h4>
                            {product.selectedVariant && (
                              <p className="text-xs text-[var(--text-muted)] mb-1">
                                Variant: {product.selectedVariant.name}
                                {product.selectedVariant.attributes
                                  ? ` • ${Object.values(product.selectedVariant.attributes).join(" / ")}`
                                  : ""}
                              </p>
                            )}
                            <div className="flex items-center gap-1 mb-2">
                              <span className="text-yellow-400 text-xs">★</span>
                              <span className="text-xs text-gray-500">
                                4.9{" "}
                                {product.totalReviews
                                  ? `(${product.totalReviews})`
                                  : ""}
                              </span>
                            </div>
                            <div className="mt-4">
                              <p className="text-lg font-bold text-[var(--brand-primary)]">
                                ₱{product.price.toLocaleString()}
                              </p>
                              <div className="flex justify-between items-center mt-1 text-xs text-gray-500 border-t border-gray-50 pt-2">
                                <span>
                                  Requested:{" "}
                                  {(product as any).requestedQty || 1}
                                </span>
                                <span>
                                  Has: {(product as any).receivedQty || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 p-6 flex justify-center">
              <Button
                onClick={() => {
                  handleSavePreferences();
                  onClose();
                }}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white rounded-full px-8"
              >
                Save
              </Button>
            </div>
          </motion.div>

          {/* Delete Confirmation Dialog */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/50"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl"
                >
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Delete Registry?
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Are you sure you want to delete "{liveRegistry?.title}"?
                    This action cannot be undone and all items in this registry
                    will be removed.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Delete Registry
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <EditRegistryItemModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            item={selectedItem}
            onUpdate={(pid, updates) =>
              updateRegistryItem(liveRegistry.id, pid, updates)
            }
            onRemove={(pid) => removeRegistryItem(liveRegistry.id, pid)}
          />

          {/* Share Modal */}
          <AnimatePresence>
            {showShareModal && (
              <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/50">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">
                      Share Registry
                    </h3>
                    <button
                      onClick={() => setShowShareModal(false)}
                      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
                      <Globe className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-blue-800">
                        This link can only be accessed by those who have it. It
                        won't appear in public searches.
                      </p>
                    </div>
                  </div>

                  {/* Social Media Share Options */}
                  <div className="mb-6">
                    <Label className="mb-3 block text-sm font-medium text-gray-700">
                      Share on Social Media
                    </Label>
                    <div className="flex gap-3">
                      {/* Facebook */}
                      <a
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/registry/${liveRegistry.id}`)}&quote=${encodeURIComponent(`Check out ${liveRegistry.title} on BAZAARX!`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full hover:opacity-80 transition-opacity"
                        aria-label="Share on Facebook"
                      >
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="20" cy="20" r="20" fill="#1877F2"/>
                          <path d="M22.5 21h2.5l1-4h-3.5v-2c0-1.1.45-2 1.8-2H26v-3.5A18.5 18.5 0 0 0 23.1 9C20.3 9 18.5 10.7 18.5 14v3H15.5v4H18.5v10h4V21z" fill="white"/>
                        </svg>
                      </a>
                      {/* Twitter / X */}
                      <a
                        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}/registry/${liveRegistry.id}`)}&text=${encodeURIComponent(`Check out ${liveRegistry.title} on BAZAARX!`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full hover:opacity-80 transition-opacity"
                        aria-label="Share on X (Twitter)"
                      >
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="20" cy="20" r="20" fill="#000"/>
                          <path d="M22.1 18.4L28.7 11h-1.6l-5.7 6.5L16.9 11H11l7 10-7 8h1.6l6.1-7 4.9 7H27l-4.9-7zM13.3 12.2h2.3l11.1 15.6h-2.3L13.3 12.2z" fill="white"/>
                        </svg>
                      </a>
                      {/* LinkedIn */}
                      <a
                        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${window.location.origin}/registry/${liveRegistry.id}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full hover:opacity-80 transition-opacity"
                        aria-label="Share on LinkedIn"
                      >
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="20" cy="20" r="20" fill="#0A66C2"/>
                          <path d="M14 17h-3v11h3V17zm-1.5-1.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5zM29 28h-3v-5.5c0-1.4-.5-2.5-2-2.5-1.2 0-1.8.8-2.1 1.6-.1.3-.1.6-.1 1V28h-3V17h3v1.5c.5-.7 1.4-1.8 3.1-1.8 2.3 0 4.1 1.5 4.1 4.7V28z" fill="white"/>
                        </svg>
                      </a>
                      {/* Email */}
                      <a
                        href={`mailto:?subject=${encodeURIComponent(`Check out ${liveRegistry.title}`)}&body=${encodeURIComponent(`I wanted to share this registry with you: ${liveRegistry.title}\n\n${window.location.origin}/registry/${liveRegistry.id}`)}`}
                        className="rounded-full hover:opacity-80 transition-opacity"
                        aria-label="Share via Email"
                      >
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="20" cy="20" r="20" fill="#7F7F7F"/>
                          <path d="M11 14.5A1.5 1.5 0 0 1 12.5 13h15A1.5 1.5 0 0 1 29 14.5v11A1.5 1.5 0 0 1 27.5 27h-15A1.5 1.5 0 0 1 11 25.5v-11zm2 .9V25h14V15.4l-7 5-7-5zm1.3-1L20 18.6l5.7-4.1H14.3z" fill="white"/>
                        </svg>
                      </a>
                    </div>
                  </div>

                  {/* Copy Link Option */}
                  <div>
                    <Label className="mb-2 block text-sm font-medium text-gray-700">
                      Or copy the link
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={`${window.location.origin}/registry/${liveRegistry.id}`}
                        readOnly
                        className="bg-gray-50 border-gray-200 text-gray-600 flex-1"
                      />
                      <Button
                        onClick={handleCopyLink}
                        className="shrink-0 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white"
                      >
                        {isCopied ? (
                          <Check className="w-5 h-5 text-green-400" />
                        ) : (
                          <Copy className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                    {isCopied && (
                      <p className="text-sm text-green-600 mt-2">
                        Link copied to clipboard!
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end mt-6">
                    <Button
                      onClick={() => setShowShareModal(false)}
                      variant="outline"
                      className="border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      Close
                    </Button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
};
