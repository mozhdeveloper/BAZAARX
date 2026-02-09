import { Button } from "@/components/ui/button";
import {Plus, X } from "lucide-react";
import { VariantManager } from "@/components/seller/products/VariantManager";

interface VariantConfig {
  id: string;
  size: string;
  color: string;
  stock: number;
  price: number;
  sku: string;
  image: string;
}

interface AttributesTabProps {
  formData: {
    sizes: string[];
    colors: string[];
    price: string;
  };
  variationInput: string;
  setVariationInput: (value: string) => void;
  colorInput: string;
  setColorInput: (value: string) => void;
  addVariation: () => void;
  removeVariation: (variation: string) => void;
  addColor: () => void;
  removeColor: (color: string) => void;
  
  // Variant Manager props
  useVariantStock: boolean;
  variantConfigs: VariantConfig[];
  editingVariantId: string | null;
  showAddVariantForm: boolean;
  newVariant: Partial<VariantConfig>;
  errors: {
    variant?: string;
    variants?: string;
  };
  toggleVariantMode: () => void;
  getTotalVariantStock: () => number;
  updateVariantConfig: (id: string, field: keyof VariantConfig, value: string | number) => void;
  cancelEditVariant: () => void;
  startEditVariant: (variant: VariantConfig) => void;
  deleteVariant: (id: string) => void;
  setShowAddVariantForm: (show: boolean) => void;
  setNewVariant: (variant: Partial<VariantConfig> | ((prev: Partial<VariantConfig>) => Partial<VariantConfig>)) => void;
  setErrors: (errors: any | ((prev: any) => any)) => void;
  addVariant: () => void;
}

export function AttributesTab({
  formData,
  variationInput,
  setVariationInput,
  colorInput,
  setColorInput,
  addVariation,
  removeVariation,
  addColor,
  removeColor,
  useVariantStock,
  variantConfigs,
  editingVariantId,
  showAddVariantForm,
  newVariant,
  errors,
  toggleVariantMode,
  getTotalVariantStock,
  updateVariantConfig,
  cancelEditVariant,
  startEditVariant,
  deleteVariant,
  setShowAddVariantForm,
  setNewVariant,
  setErrors,
  addVariant,
}: AttributesTabProps) {
  return (
    <div className="space-y-8">
      {/* Variations */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-gray-800">
            Variations (optional)
          </label>
          <span className="text-xs text-gray-500">
            Sizes, models, flavors, etc.
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={variationInput}
            onChange={(e) => setVariationInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addVariation();
              }
            }}
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="E.g., Small, 32GB, Chocolate"
          />
          <Button
            type="button"
            onClick={addVariation}
            variant="outline"
            className="rounded-xl border-dashed border-gray-300 hover:border-orange-400"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        {formData.sizes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.sizes.map((variation) => (
              <span
                key={variation}
                className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 text-orange-700 px-3 py-1.5 text-sm font-medium border border-orange-200"
              >
                {variation}
                <button
                  type="button"
                  onClick={() => removeVariation(variation)}
                  className="hover:bg-orange-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Colors */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-gray-800">
            Colors (optional)
          </label>
          <span className="text-xs text-gray-500">
            For products with color options
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={colorInput}
            onChange={(e) => setColorInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addColor();
              }
            }}
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="E.g., Space Gray, Forest Green"
          />
          <Button
            type="button"
            onClick={addColor}
            variant="outline"
            className="rounded-xl border-dashed border-gray-300 hover:border-orange-400"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        {formData.colors.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.colors.map((color) => (
              <span
                key={color}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 px-3 py-1.5 text-sm font-medium border border-blue-200"
              >
                {color}
                <button
                  type="button"
                  onClick={() => removeColor(color)}
                  className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Variant Manager */}
      <VariantManager
        useVariantStock={useVariantStock}
        variantConfigs={variantConfigs}
        formData={formData}
        editingVariantId={editingVariantId}
        showAddVariantForm={showAddVariantForm}
        newVariant={newVariant}
        errors={errors}
        toggleVariantMode={toggleVariantMode}
        getTotalVariantStock={getTotalVariantStock}
        updateVariantConfig={updateVariantConfig}
        cancelEditVariant={cancelEditVariant}
        startEditVariant={startEditVariant}
        deleteVariant={deleteVariant}
        setShowAddVariantForm={setShowAddVariantForm}
        setNewVariant={setNewVariant}
        setErrors={setErrors}
        addVariant={addVariant}
      />
    </div>
  );
}
