import { Button } from "@/components/ui/button";
import { Plus, Upload, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { VariantConfig } from "@/types";

interface VariantFormProps {
    firstAttributeName: string;
    secondAttributeName: string;
    formData: {
        variantLabel1Values: string[];
        variantLabel2Values: string[];
        price: string;
        stock: string;
    };
    variantConfigs: VariantConfig[];
    showAddVariantForm: boolean;
    setShowAddVariantForm: (show: boolean) => void;
    newVariant: Partial<VariantConfig>;
    setNewVariant: (
        variant:
            | Partial<VariantConfig>
            | ((prev: Partial<VariantConfig>) => Partial<VariantConfig>),
    ) => void;
    errors: {
        variant?: string;
        variants?: string;
    };
    setErrors: (
        errors:
            | Record<string, string>
            | ((prev: Record<string, string>) => Record<string, string>),
    ) => void;
    addVariant: () => void;
}

export function VariantForm({
    firstAttributeName,
    secondAttributeName,
    formData,
    variantConfigs,
    showAddVariantForm,
    setShowAddVariantForm,
    newVariant,
    setNewVariant,
    errors,
    setErrors,
    addVariant,
}: VariantFormProps) {
    // Local string state so the user can clear the field without it snapping back to 0
    const defaultPrice = String(parseInt(formData.price) || 0);
    const [stockInput, setStockInput] = useState(() =>
        newVariant.stock !== undefined ? String(newVariant.stock) : "0",
    );
    const [priceInput, setPriceInput] = useState(() =>
        newVariant.price !== undefined ? String(newVariant.price) : defaultPrice,
    );

    // Sync when the parent resets newVariant (e.g. after Save or Cancel)
    useEffect(() => {
        setStockInput(
            newVariant.stock !== undefined ? String(newVariant.stock) : "0",
        );
    }, [newVariant.stock]);

    useEffect(() => {
        setPriceInput(
            newVariant.price !== undefined
                ? String(newVariant.price)
                : defaultPrice,
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [newVariant.price]);

    return (
        <div className="space-y-4">
            {/* Add New Variant Form */}
            {showAddVariantForm || variantConfigs.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700">
                            Add New Variant
                        </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-gray-500">
                                Select {firstAttributeName}
                            </label>
                            {formData.variantLabel1Values.length > 0 ? (
                                <select
                                    value={newVariant.variantLabel1Value || ""}
                                    onChange={(e) =>
                                        setNewVariant((prev) => ({
                                            ...prev,
                                            variantLabel1Value: e.target.value,
                                        }))
                                    }
                                    className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                                >
                                    <option value="">
                                        -- Select variation --
                                    </option>
                                    {formData.variantLabel1Values.map((val) => (
                                        <option key={val} value={val}>
                                            {val}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder={`No ${firstAttributeName} available`}
                                    disabled
                                />
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500">
                                Select {secondAttributeName}
                            </label>
                            {formData.variantLabel2Values.length > 0 ? (
                                <select
                                    value={newVariant.variantLabel2Value || ""}
                                    onChange={(e) =>
                                        setNewVariant((prev) => ({
                                            ...prev,
                                            variantLabel2Value: e.target.value,
                                        }))
                                    }
                                    className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                                >
                                    <option value="">-- Select variation --</option>
                                    {formData.variantLabel2Values.map((val) => (
                                        <option key={val} value={val}>
                                            {val}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder={`No ${secondAttributeName} available`}
                                    disabled
                                />
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-xs font-medium text-gray-500">
                                Stock *
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={stockInput}
                                onChange={(e) => {
                                    const raw = e.target.value;
                                    setStockInput(raw);
                                    const parsed = parseInt(raw, 10);
                                    setNewVariant((prev) => ({
                                        ...prev,
                                        stock: isNaN(parsed) ? 0 : Math.max(0, parsed),
                                    }));
                                }}
                                onBlur={() => {
                                    // Show 0 if field is left empty
                                    if (stockInput === '' || stockInput === '-') {
                                        setStockInput('0');
                                    }
                                }}
                                className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500">
                                Price (₱) *
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={priceInput}
                                onChange={(e) => {
                                    const raw = e.target.value;
                                    setPriceInput(raw);
                                    const parsed = parseFloat(raw);
                                    setNewVariant((prev) => ({
                                        ...prev,
                                        price: isNaN(parsed) ? 0 : Math.max(0, parsed),
                                    }));
                                }}
                                onBlur={() => {
                                    // Show 0 if field is left empty
                                    if (priceInput === '' || priceInput === '-') {
                                        setPriceInput('0');
                                    }
                                }}
                                className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder={formData.price || "0"}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500">
                                SKU
                            </label>
                            <input
                                type="text"
                                value={newVariant.sku || ""}
                                onChange={(e) =>
                                    setNewVariant((prev) => ({
                                        ...prev,
                                        sku: e.target.value,
                                    }))
                                }
                                className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="Auto-generated if empty"
                            />
                        </div>
                    </div>
                    {/* Variant Image */}
                    <div>
                        <label className="text-xs font-medium text-gray-500">
                            Variant Image URL (optional)
                        </label>
                        <div className="flex gap-2 mt-1">
                            <div className="h-10 w-10 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
                                {newVariant.image ? (
                                    <img
                                        src={newVariant.image}
                                        alt="Preview"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <Upload className="h-4 w-4 text-gray-300" />
                                )}
                            </div>
                            <input
                                type="url"
                                value={newVariant.image || ""}
                                onChange={(e) =>
                                    setNewVariant((prev) => ({
                                        ...prev,
                                        image: e.target.value,
                                    }))
                                }
                                className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                    {errors.variant && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            {errors.variant}
                        </p>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setShowAddVariantForm(false);
                                setNewVariant({
                                    variantLabel1Value: "",
                                    variantLabel2Value: "",
                                    stock: 0,
                                    price: 0,
                                    sku: "",
                                    image: "",
                                });
                                setErrors((prev) => ({ ...prev, variant: "" }));
                            }}
                            disabled={variantConfigs.length === 0} // Cannot cancel if it's the only/first variant
                            className={
                                variantConfigs.length === 0
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                            }
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={addVariant}
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                        >
                            Save Variant
                        </Button>
                    </div>
                </div>
            ) : (
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddVariantForm(true)}
                    className="w-full border-dashed border-2 hover:border-orange-400 hover:text-orange-600"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Variant
                </Button>
            )}

            {errors.variants && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {errors.variants}
                </p>
            )}
        </div>
    );
}
