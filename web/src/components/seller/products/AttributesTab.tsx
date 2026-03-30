import { Button } from "@/components/ui/button";
import { Plus, X, Ruler } from "lucide-react";
import { VariantManager } from "@/components/seller/products/VariantManager";
import { VariantConfig } from "@/types";

interface AttributesTabProps {
    formData: {
        variantLabel1Values: string[];
        variantLabel2Values: string[];
        sizesValues: string[];
        price: string;
        stock: string;
        category: string;
    };
    variationInput: string;
    setVariationInput: (value: string) => void;
    colorInput: string;
    setColorInput: (value: string) => void;
    sizeInput: string;
    setSizeInput: (value: string) => void;
    addVariation: () => void;
    removeVariation: (variation: string) => void;
    addColor: () => void;
    removeColor: (color: string) => void;
    addSize: () => void;
    removeSize: (size: string) => void;
    sizeGuideImageUrl: string;
    onSizeGuideImageSelect: (file: File | null) => void;
    errors: Record<string, string | undefined>;

    // Custom attribute names
    firstAttributeName: string;
    setFirstAttributeName: (value: string) => void;
    secondAttributeName: string;
    setSecondAttributeName: (value: string) => void;
    editingFirstAttributeName: boolean;
    setEditingFirstAttributeName: (value: boolean) => void;
    editingSecondAttributeName: boolean;
    setEditingSecondAttributeName: (value: boolean) => void;

    // Variant Manager props
    variantConfigs: VariantConfig[];
    editingVariantId: string | null;
    showAddVariantForm: boolean;
    newVariant: Partial<VariantConfig>;
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
    setErrors: (
        errors:
            | Record<string, string>
            | ((prev: Record<string, string>) => Record<string, string>),
    ) => void;
    addVariant: () => void;
}

export function AttributesTab({
    formData,
    variationInput,
    setVariationInput,
    colorInput,
    setColorInput,
    sizeInput,
    setSizeInput,
    addVariation,
    removeVariation,
    addColor,
    removeColor,
    addSize,
    removeSize,
    sizeGuideImageUrl,
    onSizeGuideImageSelect,
    errors,
    firstAttributeName,
    setFirstAttributeName,
    secondAttributeName,
    setSecondAttributeName,
    editingFirstAttributeName,
    setEditingFirstAttributeName,
    editingSecondAttributeName,
    setEditingSecondAttributeName,
    variantConfigs,
    editingVariantId,
    showAddVariantForm,
    newVariant,
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
        <>
            {/* Attributes Section */}
            <div className="space-y-6">
                {/* First Attribute (Variations) */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {editingFirstAttributeName ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={firstAttributeName}
                                        onChange={(e) =>
                                            setFirstAttributeName(
                                                e.target.value,
                                            )
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                setEditingFirstAttributeName(
                                                    false,
                                                );
                                            }
                                        }}
                                        className="rounded-lg border border-orange-300 px-2 py-1 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setEditingFirstAttributeName(false)
                                        }
                                        className="text-green-600 hover:text-green-700 p-1"
                                        title="Done"
                                    >
                                        <span className="text-xs">
                                            Save changes
                                        </span>
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <label className="block text-sm font-semibold text-gray-800">
                                        {firstAttributeName}
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setEditingFirstAttributeName(true)
                                        }
                                        className="text-gray-400 hover:text-orange-600 transition-colors p-1"
                                        title="Edit attribute"
                                    >
                                        <span className="text-xs">
                                            Edit attribute
                                        </span>
                                    </button>
                                </>
                            )}
                        </div>
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
                    {formData.variantLabel1Values.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {formData.variantLabel1Values.map((variation) => (
                                <span
                                    key={variation}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 text-orange-700 px-3 py-1.5 text-sm font-medium border border-orange-200"
                                >
                                    {variation}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            removeVariation(variation)
                                        }
                                        className="hover:bg-orange-200 rounded-full p-0.5 transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Second Attribute (Colors) */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {editingSecondAttributeName ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={secondAttributeName}
                                        onChange={(e) =>
                                            setSecondAttributeName(
                                                e.target.value,
                                            )
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                setEditingSecondAttributeName(
                                                    false,
                                                );
                                            }
                                        }}
                                        className="rounded-lg border border-blue-300 px-2 py-1 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setEditingSecondAttributeName(false)
                                        }
                                        className="text-green-600 hover:text-green-700 p-1"
                                        title="Done"
                                    >
                                        <span className="text-xs">
                                            Save changes
                                        </span>
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <label className="block text-sm font-semibold text-gray-800">
                                        {secondAttributeName}
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setEditingSecondAttributeName(true)
                                        }
                                        className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                        title="Edit attribute"
                                    >
                                        <span className="text-xs">
                                            Edit attribute
                                        </span>
                                    </button>
                                </>
                            )}
                        </div>
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
                    {formData.variantLabel2Values.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {formData.variantLabel2Values.map((color) => (
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

                {/* Size Guide Image Upload - Only show for apparel */}
                {formData.category && (formData.category.toLowerCase().includes('apparel') || formData.category.toLowerCase().includes('fashion') || formData.category.toLowerCase().includes('clothing')) && (
                    <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-800">
                            Size Guide Image
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                            Upload a size chart or guide image to help customers find their perfect fit
                        </p>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-orange-400 transition-colors">
                            {sizeGuideImageUrl ? (
                                <div className="space-y-3">
                                    <img loading="lazy" 
                                        src={sizeGuideImageUrl}
                                        alt="Size Guide Preview"
                                        className="w-full h-48 object-cover rounded-lg"
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            onClick={() => onSizeGuideImageSelect(null)}
                                            variant="outline"
                                            className="flex-1 rounded-xl"
                                        >
                                            Remove
                                        </Button>
                                        <Button
                                            type="button"
                                            asChild
                                            className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600"
                                        >
                                            <label className="cursor-pointer">
                                                Change Image
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) =>
                                                        onSizeGuideImageSelect(
                                                            e.target.files?.[0] || null,
                                                        )
                                                    }
                                                    className="hidden"
                                                />
                                            </label>
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <label className="cursor-pointer block text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Ruler className="text-gray-400 text-3xl" />
                                        <p className="text-sm font-medium text-gray-600">
                                            Click to upload or drag and drop
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            PNG, JPG up to 5MB
                                        </p>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                            onSizeGuideImageSelect(
                                                e.target.files?.[0] || null,
                                            )
                                        }
                                        className="hidden"
                                    />
                                </label>
                            )}
                        </div>
                        {errors.sizeGuide && (
                            <p className="text-xs text-red-500">{errors.sizeGuide}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Variant Manager Section */}
            <VariantManager
                firstAttributeName={firstAttributeName}
                secondAttributeName={secondAttributeName}
                variantConfigs={variantConfigs}
                formData={formData}
                editingVariantId={editingVariantId}
                errors={errors}
                getTotalVariantStock={getTotalVariantStock}
                updateVariantConfig={updateVariantConfig}
                cancelEditVariant={cancelEditVariant}
                startEditVariant={startEditVariant}
                deleteVariant={deleteVariant}
            />
        </>
    );
}
