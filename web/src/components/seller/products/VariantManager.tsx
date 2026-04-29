import { VariantList } from "./VariantList";
import { VariantConfig } from "@/types";

interface VariantManagerProps {
    firstAttributeName: string;
    secondAttributeName: string;
    variantConfigs: VariantConfig[];
    formData: {
        variantLabel1Values: string[];
        variantLabel2Values: string[];
        price: string;
        stock: string;
    };
    editingVariantId: string | null;
    errors: Record<string, string | undefined>;
    getTotalVariantStock: () => number;
    updateVariantConfig: (id: string, field: string, value: any) => void;
    cancelEditVariant: () => void;
    startEditVariant: (variant: VariantConfig) => void;
    deleteVariant: (id: string) => void;
}

export function VariantManager({
    firstAttributeName,
    secondAttributeName,
    variantConfigs,
    formData,
    editingVariantId,
    errors,
    getTotalVariantStock,
    updateVariantConfig,
    cancelEditVariant,
    startEditVariant,
    deleteVariant,
}: VariantManagerProps) {
    const baseStock = parseInt(formData.stock) || 0;
    const customVariantStock = getTotalVariantStock();
    const totalStock = baseStock + customVariantStock;

    return (
        <div className="space-y-4">
            {/* Header Section */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                    <h3 className="text-base font-semibold text-gray-900">
                        Product Variants
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Variants are automatically generated based on the attributes you add above.
                    </p>
                </div>
                {(variantConfigs.length > 0 || baseStock > 0) && (
                    <div className="text-right">
                        <p className="text-sm font-medium text-gray-700">
                            Total Stock:{" "}
                            <span className="text-orange-600 font-bold">
                                {totalStock}
                            </span>
                        </p>
                        <p className="text-xs text-gray-500">
                            Base: {baseStock} • Custom variants: {customVariantStock}
                        </p>
                        <p className="text-xs text-gray-500">
                            {variantConfigs.length + (baseStock > 0 ? 1 : 0)} total variant item(s)
                        </p>
                        {variantConfigs.length > 1 &&
                            Math.min(...variantConfigs.map((v) => v.price)) !==
                            Math.max(...variantConfigs.map((v) => v.price)) && (
                                <p className="text-xs text-orange-600 font-medium">
                                    Price Range: ₱
                                    {Math.min(...variantConfigs.map((v) => v.price)).toLocaleString()} - ₱
                                    {Math.max(...variantConfigs.map((v) => v.price)).toLocaleString()}
                                </p>
                            )}
                    </div>
                )}
            </div>

            {/* Error Messages */}
            {errors.variants && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                    {errors.variants}
                </div>
            )}
            {errors.variantImages && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-700 text-sm font-medium">
                    {errors.variantImages}
                </div>
            )}

            {/* Variants List */}
            <VariantList
                variantConfigs={variantConfigs}
                firstAttributeName={firstAttributeName}
                secondAttributeName={secondAttributeName}
                formData={formData}
                editingVariantId={editingVariantId}
                updateVariantConfig={updateVariantConfig}
                cancelEditVariant={cancelEditVariant}
                startEditVariant={startEditVariant}
                deleteVariant={deleteVariant}
            />
        </div>
    );
}