import { VariantItem } from "./VariantItem";
import { VariantConfig } from "@/types";
import { Package } from "lucide-react";

// 1. Removed newVariant from the interface
interface VariantListProps {
  variantConfigs: VariantConfig[];
  firstAttributeName: string;
  secondAttributeName: string;
  formData: {
    variantLabel1Values: string[];
    variantLabel2Values: string[];
    price: string;
    stock: string;
  };
  editingVariantId: string | null;
  updateVariantConfig: (id: string, field: string, value: any) => void;
  cancelEditVariant: () => void;
  startEditVariant: (variant: VariantConfig) => void;
  deleteVariant: (id: string) => void;
}

// 2. Removed newVariant from the component parameters
export function VariantList({
  variantConfigs,
  firstAttributeName,
  secondAttributeName,
  formData,
  editingVariantId,
  updateVariantConfig,
  cancelEditVariant,
  startEditVariant,
  deleteVariant,
}: VariantListProps) {
  const baseStock = parseInt(formData.stock) || 0;
  const basePrice = parseInt(formData.price) || 0;

  return (
    <>
      {baseStock > 0 && variantConfigs.length === 0 && (
        <div className="bg-white rounded-lg border border-green-200 p-3 shadow-sm mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg border border-green-200 bg-green-50 overflow-hidden flex items-center justify-center flex-shrink-0">
                <Package className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">
                  Base Variant (General Stock)
                </span>
                <span className="text-xs text-gray-500">
                  No attributes selected
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Stock: <span className="font-medium">{baseStock}</span>
              </span>
              <span className="text-sm font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                ₱{basePrice.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Generated Variants List */}
      {variantConfigs.length > 0 ? (
        <div className="space-y-2">
          {variantConfigs.map((variant) => (
            <VariantItem
              key={variant.id}
              variant={variant}
              isEditing={editingVariantId === variant.id}
              firstAttributeName={firstAttributeName}
              secondAttributeName={secondAttributeName}
              formData={formData}
              updateVariantConfig={updateVariantConfig}
              cancelEditVariant={cancelEditVariant}
              startEditVariant={startEditVariant}
              deleteVariant={deleteVariant}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-sm text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
          Add attributes above to auto-generate variants.
        </div>
      )}
    </>
  );
}