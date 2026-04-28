import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Gift, Plus, Globe } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useNavigate } from "react-router-dom";
import {
  useBuyerStore,
  RegistryDeliveryPreference,
} from "../stores/buyerStore";

interface CreateRegistryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: {
    name: string;
    category: string;
    delivery: RegistryDeliveryPreference;
  }) => void;
  hideBrowseLink?: boolean;
  initialCategory?: string;
}

export const CreateRegistryModal = ({
  isOpen,
  onClose,
  onCreate,
  hideBrowseLink = false,
  initialCategory = "",
}: CreateRegistryModalProps) => {
  const navigate = useNavigate();
  const addresses = useBuyerStore((s) => s.addresses || []);
  const [registryName, setRegistryName] = useState("");
  const [category, setCategory] = useState("");
  const [otherCategory, setOtherCategory] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [products, setProducts] = useState<string[]>([]); // Placeholder for selected products
  const [showAddress, setShowAddress] = useState(false);
  const [addressId, setAddressId] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

  // Sync category when modal opens with initialCategory
  useEffect(() => {
    if (isOpen && initialCategory) {
      setCategory(initialCategory);
    } else if (isOpen && !initialCategory) {
      setCategory("");
    }

    if (isOpen) {
      if (addresses.length === 1) {
        setAddressId(addresses[0].id);
        setShowAddress(true);
      } else if (addresses.length > 0) {
        setAddressId(addresses[0].id);
        setShowAddress(false);
      } else {
        setAddressId("");
        setShowAddress(false);
      }
    }
  }, [isOpen, initialCategory, addresses.length]);

  // Generate share link based on registry name
  useEffect(() => {
    if (registryName) {
      const slug = registryName.toLowerCase().replace(/\s+/g, "-");
      setShareLink(`${window.location.origin}/registry/${slug}`);
    } else {
      setShareLink("");
    }
  }, [registryName]);

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleCreate = () => {
    const finalCategory = category === "other" ? otherCategory : category;
    const delivery: RegistryDeliveryPreference = {
      addressId: addressId || undefined,
      showAddress,
      instructions: deliveryInstructions.trim() || undefined,
    };
    const payload = {
      name: registryName,
      category: finalCategory,
      delivery,
    };

    console.log("[CreateRegistryModal] Creating registry with payload:", payload);
    onCreate(payload);
    // Reset form
    setRegistryName("");
    setCategory("");
    setOtherCategory("");
    setProducts([]);
    setShowAddress(false);
    setAddressId("");
    setDeliveryInstructions("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
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
            className="w-full max-w-3xl bg-white rounded-2xl shadow-xl relative z-10 overflow-visible max-h-[90vh] flex flex-col"
          >
            <div className="p-6 relative overflow-y-auto max-h-[calc(90vh-80px)] scrollbar-hide">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                  Create New Registry
                </h2>
                <p className="text-[var(--text-secondary)] text-sm mt-1">
                  Start your wishlist for your special occasion.
                </p>
              </div>

              {/* Link-Only Banner */}
              <div className="mb-6 bg-[var(--brand-wash)] border border-[var(--brand-primary)]/20 rounded-xl p-4 flex items-start gap-3">
                <Globe className="w-5 h-5 text-[var(--brand-primary)] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[var(--text-headline)]">
                    Link-Only Access
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    All registries are link-only. Anyone with the link can view your registry, but it won't appear in public searches.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Registry Name Input */}
                <div className="space-y-2">
                  <Label htmlFor="registryName">Registry Name</Label>
                  <Input
                    id="registryName"
                    placeholder="e.g., Sarah's Wedding, Baby Doe 2026"
                    value={registryName}
                    onChange={(e) => setRegistryName(e.target.value)}
                    maxLength={50}
                    className="focus-visible:ring-[var(--brand-primary)]"
                  />
                </div>

                {/* Category Dropdown */}
                <div className="space-y-2">
                  <Label>Gift Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="focus:ring-[var(--brand-primary)]">
                      <SelectValue placeholder="Select an occasion" />
                    </SelectTrigger>
                    <SelectContent
                      className="z-[200]"
                      position="popper"
                      side="top"
                      sideOffset={4}
                    >
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

                {/* Other Category Input */}
                {category === "other" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Label htmlFor="otherCategory">Specify Category</Label>
                    <Input
                      id="otherCategory"
                      placeholder="e.g., Anniversary, Promotion"
                      value={otherCategory}
                      onChange={(e) => setOtherCategory(e.target.value)}
                      className="focus-visible:ring-[var(--brand-primary)]"
                    />
                  </div>
                )}

                {!hideBrowseLink && (
                  <div className="space-y-3">
                    <Label>Registry Products</Label>
                    <div className="border border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-gray-50/50">
                      <div className="p-4 bg-white rounded-full shadow-sm mb-3">
                        <Gift className="w-6 h-6 text-[var(--brand-primary)]" />
                      </div>
                      {products.length === 0 ? (
                        <>
                          <p className="text-sm text-[var(--text-secondary)] font-medium">
                            Your registry is empty
                          </p>
                          <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
                            Add products from the shop after creating your
                            registry.
                          </p>
                          <Button
                            onClick={() => navigate("/shop")}
                            variant="outline"
                            size="sm"
                            className="text-[var(--brand-primary)] border-[var(--brand-primary)]/30 hover:bg-[var(--brand-primary)]"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Browse Products
                          </Button>
                        </>
                      ) : (
                        <div className="w-full text-left">
                          {/* Product list would go here */}
                          <p>Length: {products.length}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Share Link Section */}
                {registryName && (
                  <div className="space-y-2 pt-2">
                    <Label>Registry Link Preview</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 px-4 py-2 rounded-lg text-sm text-[var(--text-secondary)] font-mono truncate border border-gray-200">
                        {shareLink || "..."}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleCopyLink}
                        className="shrink-0 text-[var(--text-muted)] hover:bg-[var(--brand-primary)]"
                        title="Copy Link"
                      >
                        {isCopied ? (
                          <Check className="w-4 h-4 text-[var(--color-success)]" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Delivery Preference */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="space-y-2">
                    <Label>Delivery Preference</Label>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <input
                          id="showAddress"
                          type="checkbox"
                          className="h-4 w-4"
                          checked={showAddress}
                          disabled={addresses.length === 0}
                          onChange={(e) => setShowAddress(e.target.checked)}
                        />
                        <Label htmlFor="showAddress" className={`text-sm ${addresses.length === 0 ? 'text-gray-400' : ''}`}>
                          Share address with gifters
                        </Label>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          navigate('/profile?tab=addresses');
                        }}
                        className="text-xs font-semibold text-[var(--brand-primary)] hover:underline"
                      >
                        Manage
                      </button>
                    </div>
                    {addresses.length === 0 && (
                      <p className="text-xs text-amber-600">
                        Please add a delivery address in your profile settings to enable address sharing.
                      </p>
                    )}
                    <Select
                      value={addressId}
                      onValueChange={setAddressId}
                      disabled={!showAddress || addresses.length === 0}
                    >
                      <SelectTrigger className="focus:ring-[var(--brand-primary)]">
                        <SelectValue
                          placeholder={
                            addresses.length
                              ? "Select delivery address"
                              : "No saved addresses"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent
                        className="z-[200] max-h-64"
                        position="popper"
                        side="top"
                        sideOffset={4}
                      >
                        {addresses.map((addr) => (
                          <SelectItem key={addr.id} value={addr.id}>
                            {addr.label || `${addr.firstName} ${addr.lastName}`}{" "}
                            — {addr.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Delivery instructions (optional)"
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                      disabled={!showAddress}
                      className="focus-visible:ring-[var(--brand-primary)]"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="text-[var(--text-secondary)] bg-base hover:bg-base hover:text-red-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-lg px-8 h-10 font-bold transition-all active:scale-[0.98] shadow-lg shadow-[var(--brand-primary)]/20 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={
                    !registryName ||
                    !category ||
                    (category === "other" && !otherCategory)
                  }
                >
                  Create Registry
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
