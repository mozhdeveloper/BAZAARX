import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Plus, ShoppingBag, Copy, Check, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useNavigate } from "react-router-dom";
import {
  useBuyerStore,
  RegistryProduct,
  RegistryItem,
  RegistryPrivacy,
} from "../stores/buyerStore";
import { EditRegistryItemModal } from "./EditRegistryItemModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

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
  const [privacy, setPrivacy] = useState<RegistryPrivacy>("link");
  const [showAddress, setShowAddress] = useState(false);
  const [addressId, setAddressId] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

  useEffect(() => {
    if (registry) {
      setPrivacy(registry.privacy || "link");
      setShowAddress(registry.delivery?.showAddress || false);
      setAddressId(registry.delivery?.addressId || "");
      setDeliveryInstructions(registry.delivery?.instructions || "");
    }
  }, [registry]);

  if (!registry) return null;

  const handleAdd = () => {
    if (newProductName.trim()) {
      onAddProduct(registry.id, newProductName);
      setNewProductName("");
      setIsAdding(false);
    }
  };

  const handleItemClick = (item: any) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/registry/${registry.id}`;
    navigator.clipboard.writeText(link);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDelete = () => {
    if (onDelete && registry) {
      onDelete(registry.id);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  const handleSavePreferences = () => {
    updateRegistryMeta(registry.id, {
      privacy,
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
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-orange-100 text-[var(--brand-primary)] px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                    {registry.category || "Gift List"}
                  </span>
                  <span className="text-sm text-[var(--text-secondary)]">
                    Created on {registry.sharedDate}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-3xl font-bold text-[var(--text-primary)]">
                    {registry.title}
                  </h2>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyLink}
                      className="gap-2 text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-4 h-4 text-green-600" />
                          <span className="text-green-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Share</span>
                        </>
                      )}
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
              </div>

              <div className="space-y-6">
                {/* Privacy & Delivery preferences */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <div className="space-y-2">
                    <Label>Privacy</Label>
                    <Select
                      value={privacy}
                      onValueChange={(val) =>
                        setPrivacy(val as RegistryPrivacy)
                      }
                    >
                      <SelectTrigger className="focus:ring-[var(--brand-primary)]">
                        <SelectValue placeholder="Select privacy" />
                      </SelectTrigger>
                      <SelectContent className="z-[200]">
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="link">Link only</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[var(--text-muted)]">
                      Link-only is recommended: only people with the link can
                      view.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <input
                        id="detail-showAddress"
                        type="checkbox"
                        className="h-4 w-4"
                        checked={showAddress}
                        onChange={(e) => setShowAddress(e.target.checked)}
                      />
                      <Label htmlFor="detail-showAddress" className="text-sm">
                        Share address with gifters
                      </Label>
                    </div>
                    <Select
                      value={addressId}
                      onValueChange={setAddressId}
                      disabled={!showAddress || (addresses || []).length === 0}
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
                      <SelectContent className="z-[200] max-h-64 overflow-auto">
                        {(addresses || []).map((addr) => (
                          <SelectItem key={addr.id} value={addr.id}>
                            {addr.label || addr.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    onClick={() => setIsAdding(!isAdding)}
                    size="sm"
                    variant="outline"
                    className="text-[var(--brand-primary)] border-[var(--brand-primary)]/30 hover:bg-[var(--brand-primary)]/10"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                {isAdding && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="bg-gray-50 p-4 rounded-xl border border-gray-200"
                  >
                    <Label className="mb-2 block">
                      Add a Product (Quick Add)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        placeholder="Enter product name..."
                        className="bg-white"
                        autoFocus
                      />
                      <Button
                        onClick={handleAdd}
                        className="btn-primary shrink-0"
                      >
                        Add
                      </Button>
                    </div>
                  </motion.div>
                )}

                <div className="space-y-3">
                  {!registry.products || registry.products.length === 0 ? (
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
                      {registry.products.map((product: any, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleItemClick(product)}
                          className="flex flex-col bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden border border-gray-100 group"
                        >
                          <div className="aspect-[1/1] relative bg-gray-100 overflow-hidden">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Gift className="w-12 h-12 text-gray-300" />
                              </div>
                            )}
                            {(product as any).isMostWanted && (
                              <div className="absolute top-2 left-2 bg-[var(--brand-primary)] text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                                Most Wanted
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
                    Are you sure you want to delete "{registry?.title}"? This
                    action cannot be undone and all items in this registry will
                    be removed.
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
              updateRegistryItem(registry.id, pid, updates)
            }
            onRemove={(pid) => removeRegistryItem(registry.id, pid)}
          />
        </div>
      )}
    </AnimatePresence>
  );
};
