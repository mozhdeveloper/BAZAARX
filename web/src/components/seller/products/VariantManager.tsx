import { VariantList } from "./VariantList";
import { VariantForm } from "./VariantForm";
import { VariantConfig } from "@/types";
import { AlertTriangle } from "lucide-react";

interface VariantManagerProps {
    firstAttributeName: string;
    secondAttributeName: string;
    variantConfigs: VariantConfig[];
    formData: {
        sizes: string[];
        colors: string[];
        price: string;
        stock: string;
    };
    editingVariantId: string | null;
    showAddVariantForm: boolean;
    newVariant: Partial<VariantConfig>;
    errors: Record<string, string | undefined>;
    getTotalVariantStock: () => number;
    updateVariantConfig: (
        id: string,
        field: keyof VariantConfig,
        value: string | number,
    ) => void;
    cancelEditVariant: () => void;
    startEditVariant: (variant: VariantConfig) => void;
    deleteVariant: (id: string) => void;
    setShowAddVariantForm: (show: boolean) => void;
    setNewVariant: (
        variant:
            | Partial<VariantConfig>
            | ((prev: Partial<VariantConfig>) => Partial<VariantConfig>),
    ) => void;
    setErrors: (errors: any | ((prev: any) => any)) => void;
    addVariant: () => void;
}

export function VariantManager({
    firstAttributeName,
    secondAttributeName,
    variantConfigs,
    formData,
    editingVariantId,
    showAddVariantForm,
    newVariant,
    errors,
    getTotalVariantStock,
    updateVariantConfig,
    cancelEditVariant,
    startEditVariant,
    deleteVariant,
    setShowAddVariantForm,
    setNewVariant,
    setErrors,
    addVariant,
}: VariantManagerProps) {
    // Calculate stock allocation status
    const totalStock = parseInt(formData.stock) || 0;
    const allocatedStock = variantConfigs.reduce(
        (sum, variant) => sum + (variant.stock || 0),
        0,
    );
    const remainingStock = totalStock - allocatedStock;

    return (
        <div className="space-y-4">
            {/* Header Section */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                    <h3 className="text-base font-semibold text-gray-900">
                        Product Variants
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Create size, color, or custom variants with individual
                        stock and pricing
                    </p>
                </div>
                {variantConfigs.length > 0 && (
                    <div className="text-right">
                        <p className="text-sm font-medium text-gray-700">
                            Total Stock:{" "}
                            <span className="text-orange-600 font-bold">
                                {getTotalVariantStock()}
                            </span>
                        </p>
                        <p className="text-xs text-gray-500">
                            {variantConfigs.length} variant(s)
                        </p>
                        {/* Show price range only if variants have different prices */}
                        {variantConfigs.length > 1 &&
                            Math.min(...variantConfigs.map((v) => v.price)) !==
                                Math.max(
                                    ...variantConfigs.map((v) => v.price),
                                ) && (
                                <p className="text-xs text-orange-600 font-medium">
                                    Price Range: ₱
                                    {Math.min(
                                        ...variantConfigs.map((v) => v.price),
                                    ).toLocaleString()}{" "}
                                    - ₱
                                    {Math.max(
                                        ...variantConfigs.map((v) => v.price),
                                    ).toLocaleString()}
                                </p>
                            )}
                    </div>
                )}
            </div>

            {/* Stock Allocation Warning */}
            {variantConfigs.length > 0 && remainingStock !== 0 && (
                <div
                    className={`rounded-lg border p-4 flex items-start gap-3 ${
                        remainingStock > 0
                            ? "bg-yellow-50 border-yellow-200"
                            : "bg-red-50 border-red-200"
                    }`}
                >
                    <AlertTriangle
                        className={`h-5 w-5 flex-shrink-0 ${
                            remainingStock > 0
                                ? "text-yellow-600"
                                : "text-red-600"
                        }`}
                    />
                    <div className="flex-1">
                        <h4
                            className={`text-sm font-semibold ${
                                remainingStock > 0
                                    ? "text-yellow-800"
                                    : "text-red-800"
                            }`}
                        >
                            {remainingStock > 0
                                ? "Stock Not Fully Allocated"
                                : "Stock Over-Allocated"}
                        </h4>
                        <p
                            className={`text-sm mt-1 ${
                                remainingStock > 0
                                    ? "text-yellow-700"
                                    : "text-red-700"
                            }`}
                        >
                            {remainingStock > 0
                                ? `You have ${remainingStock} unit(s) of stock not allocated to any variant. Please allocate all stock to variants before submitting.`
                                : `You have over-allocated stock by ${Math.abs(remainingStock)} unit(s). Total variant stock cannot exceed the total product stock.`}
                        </p>
                    </div>
                </div>
            )}

            {/* Variants List & Unsaved Preview */}
            <VariantList
                variantConfigs={variantConfigs}
                firstAttributeName={firstAttributeName}
                secondAttributeName={secondAttributeName}
                formData={formData}
                editingVariantId={editingVariantId}
                newVariant={newVariant}
                updateVariantConfig={updateVariantConfig}
                cancelEditVariant={cancelEditVariant}
                startEditVariant={startEditVariant}
                deleteVariant={deleteVariant}
            />

            {/* Add Variant Form */}
            <VariantForm
                firstAttributeName={firstAttributeName}
                secondAttributeName={secondAttributeName}
                formData={formData}
                variantConfigs={variantConfigs}
                showAddVariantForm={showAddVariantForm}
                setShowAddVariantForm={setShowAddVariantForm}
                newVariant={newVariant}
                setNewVariant={setNewVariant}
                errors={errors}
                setErrors={setErrors}
                addVariant={addVariant}
            />
        </div>
    );
}
