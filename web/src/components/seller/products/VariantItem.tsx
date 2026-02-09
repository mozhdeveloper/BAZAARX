
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Check, Upload, Package } from "lucide-react";
import { VariantConfig } from "@/types";

interface VariantItemProps {
  variant: VariantConfig;
  isEditing: boolean;
  firstAttributeName: string;
  secondAttributeName: string;
  formData: {
    sizes: string[];
    colors: string[];
  };
  updateVariantConfig: (id: string, field: keyof VariantConfig, value: string | number) => void;
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
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
      {isEditing ? (
        // Edit Mode
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">{firstAttributeName || 'Size/Variation'}</label>
              {formData.sizes.length > 0 ? (
                <select
                  value={variant.size}
                  onChange={(e) => updateVariantConfig(variant.id, 'size', e.target.value)}
                  className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="">-- No size --</option>
                  {formData.sizes.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={variant.size}
                  onChange={(e) => updateVariantConfig(variant.id, 'size', e.target.value)}
                  className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., Small, Large, XL"
                />
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">{secondAttributeName || 'Color'}</label>
              {formData.colors.length > 0 ? (
                <select
                  value={variant.color}
                  onChange={(e) => updateVariantConfig(variant.id, 'color', e.target.value)}
                  className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="">-- No color --</option>
                  {formData.colors.map((color) => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={variant.color}
                  onChange={(e) => updateVariantConfig(variant.id, 'color', e.target.value)}
                  className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., Red, Blue"
                />
              )}
            </div>
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
                <span className="text-[10px] text-gray-400 font-normal">(buyer pays)</span>
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
          {/* Variant Image */}
          <div>
            <label className="text-xs font-medium text-gray-500">Variant Image (URL)</label>
            <div className="flex gap-2 mt-1">
              <div className="h-10 w-10 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
                {variant.image ? (
                  <img src={variant.image} alt="Variant" className="h-full w-full object-cover" />
                ) : (
                  <Upload className="h-4 w-4 text-gray-300" />
                )}
              </div>
              <input
                type="url"
                value={variant.image}
                onChange={(e) => updateVariantConfig(variant.id, 'image', e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="https://... (optional)"
              />
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
              {variant.image ? (
                <img src={variant.image} alt={`${variant.size} ${variant.color}`} className="h-full w-full object-cover" />
              ) : (
                <Package className="h-4 w-4 text-gray-300" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">
                {[
                  variant.size && `${firstAttributeName || 'Size'}: ${variant.size}`,
                  variant.color && `${secondAttributeName || 'Color'}: ${variant.color}`
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
