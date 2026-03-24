import { Button } from "@/components/ui/button";
import { Edit, Trash2, Check, Upload, Package } from "lucide-react";
import { VariantConfig } from "@/types";

// Update the interface to accept the local file object
interface VariantItemProps {
  variant: VariantConfig & { file?: File | null };
  isEditing: boolean;
  firstAttributeName: string;
  secondAttributeName: string;
  formData: {
    variantLabel1Values: string[];
    variantLabel2Values: string[];
  };
  updateVariantConfig: (id: string, field: string, value: any) => void;
  cancelEditVariant: () => void;
  startEditVariant: (variant: VariantConfig) => void;
  deleteVariant: (id: string) => void;
}

export function VariantItem({
  variant,
  isEditing,
  firstAttributeName,
  secondAttributeName,
  formData,
  updateVariantConfig,
  cancelEditVariant,
  startEditVariant,
  deleteVariant,
}: VariantItemProps) {
  // Determine what to show in the thumbnail preview (File takes precedence, then URL)
  const previewUrl = variant.file ? URL.createObjectURL(variant.file) : variant.image;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
      {isEditing ? (
        // Edit Mode
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
            {variant.variantLabel1Value && (
              <div className="flex flex-col">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {firstAttributeName || 'Variation'}
                </label>
                <span className="text-sm font-bold text-[var(--brand-primary)]">
                  {variant.variantLabel1Value}
                </span>
              </div>
            )}
            {variant.variantLabel2Value && (
              <div className="flex flex-col border-l border-gray-200 pl-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {secondAttributeName || 'Color'}
                </label>
                <span className="text-sm font-bold text-[var(--brand-primary)]">
                  {variant.variantLabel2Value}
                </span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Stock *</label>
              <input
                type="number"
                min="0"
                value={variant.stock}
                onChange={(e) => updateVariantConfig(variant.id, 'stock', parseInt(e.target.value) || 0)}
                className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-orange-600 flex items-center gap-1">
                Variant Price (₱) *
              </label>
              <input
                type="number"
                min="0"
                value={variant.price}
                onChange={(e) => updateVariantConfig(variant.id, 'price', parseInt(e.target.value) || 0)}
                className="w-full mt-1 rounded-lg border-2 border-orange-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-orange-50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">SKU</label>
              <input
                type="text"
                value={variant.sku}
                onChange={(e) => updateVariantConfig(variant.id, 'sku', e.target.value)}
                className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Variant Image: File Upload OR URL */}
          <div>
            <label className="text-xs font-medium text-gray-500">Variant Image (File or URL)</label>
            <div className="flex gap-2 mt-1 items-start">
              {/* File Upload Thumbnail */}
              <label
                htmlFor={`file-upload-${variant.id}`}
                className="relative h-10 w-10 flex-shrink-0 rounded-lg border border-gray-200 bg-gray-50 hover:bg-orange-50 overflow-hidden flex items-center justify-center transition-colors cursor-pointer group"
                title="Click to upload image"
              >
                {previewUrl ? (
                  <>
                    <img loading="lazy" src={previewUrl} alt="Variant preview" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Edit className="h-4 w-4 text-white" />
                    </div>
                  </>
                ) : (
                  <Upload className="h-4 w-4 text-gray-400 group-hover:text-orange-500" />
                )}
                <input
                  id={`file-upload-${variant.id}`}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file) {
                      updateVariantConfig(variant.id, 'file', file);
                      updateVariantConfig(variant.id, 'image', ""); // Clear URL if they upload a file
                    }
                    e.target.value = ""; // Reset so same file can be selected again
                  }}
                />
              </label>

              {/* URL Input */}
              <div className="flex-1 flex flex-col gap-1">
                <input
                  type="url"
                  value={variant.image || ""}
                  onChange={(e) => {
                    updateVariantConfig(variant.id, 'image', e.target.value);
                    if (variant.file) {
                      updateVariantConfig(variant.id, 'file', null); // Clear file if they type a URL
                    }
                  }}
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="https://... (or click icon to upload)"
                />
                {(variant.file || variant.image) && (
                  <button
                    type="button"
                    onClick={() => {
                      updateVariantConfig(variant.id, 'file', null);
                      updateVariantConfig(variant.id, 'image', "");
                    }}
                    className="text-[10px] text-red-500 hover:underline text-left self-start"
                  >
                    Remove image
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={cancelEditVariant}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Check className="h-4 w-4 mr-1" />
              Done
            </Button>
          </div>
        </div>
      ) : (
        // View Mode
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Variant Image Thumbnail */}
            <div className="h-10 w-10 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center flex-shrink-0">
              {previewUrl ? (
                <img loading="lazy" src={previewUrl} alt={`${variant.variantLabel1Value} ${variant.variantLabel2Value}`} className="h-full w-full object-cover" />
              ) : (
                <Package className="h-4 w-4 text-gray-300" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">
                {[
                  variant.variantLabel1Value && `${firstAttributeName || 'Variation 1'}: ${variant.variantLabel1Value}`,
                  variant.variantLabel2Value && `${secondAttributeName || 'Variation 2'}: ${variant.variantLabel2Value}`
                ].filter(Boolean).join(', ')}
              </span>
            </div>
            <span className="text-sm text-gray-600">
              Stock: <span className="font-medium">{variant.stock}</span>
            </span>
            <span className="text-sm font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
              ₱{variant.price.toLocaleString()}
            </span>
            {variant.sku && (
              <span className="text-xs text-gray-400">SKU: {variant.sku}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => startEditVariant(variant)}
              className="px-2 py-1"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => deleteVariant(variant.id)}
              className="px-2 py-1 text-red-500 hover:text-red-700 hover:border-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}