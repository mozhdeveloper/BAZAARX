import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Check, Upload, Package, AlertTriangle } from "lucide-react";

interface VariantConfig {
  id: string;
  size: string;
  color: string;
  stock: number;
  price: number;
  sku: string;
  image: string;
}

interface VariantManagerProps {
  useVariantStock: boolean;
  variantConfigs: VariantConfig[];
  formData: {
    sizes: string[];
    colors: string[];
    price: string;
  };
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

export function VariantManager({
  useVariantStock,
  variantConfigs,
  formData,
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
}: VariantManagerProps) {
  return (
    <div className="space-y-4 p-4 bg-gradient-to-r from-orange-50 to-blue-50 rounded-xl border border-orange-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={useVariantStock}
              onChange={toggleVariantMode}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
          </label>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              Manage Variants
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Create size, color, or custom variants with individual stock
            </p>
          </div>
        </div>
        {variantConfigs.length > 0 && (
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">
              Total Stock: <span className="text-orange-600 font-bold">{getTotalVariantStock()}</span>
            </p>
            <p className="text-xs text-gray-500">{variantConfigs.length} variant(s)</p>
            <p className="text-xs text-orange-600 font-medium">
              Price Range: ₱{Math.min(...variantConfigs.map(v => v.price)).toLocaleString()} - ₱{Math.max(...variantConfigs.map(v => v.price)).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {useVariantStock && (
        <>
          {/* Important Notice */}
          <div className="bg-orange-100 border border-orange-300 rounded-lg p-3 text-sm">
            <p className="font-medium text-orange-800 flex items-center gap-2">
              💡 Variant Pricing
            </p>
            <p className="text-orange-700 text-xs mt-1">
              Each variant has its own price. When a buyer selects a variant, they will be charged <strong>that variant's price</strong>, not the display price above.
            </p>
          </div>

          {/* Existing Variants List */}
          {variantConfigs.length > 0 && (
            <div className="space-y-2">
              {variantConfigs.map((variant) => (
                <div 
                  key={variant.id} 
                  className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm"
                >
                  {editingVariantId === variant.id ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500">Size/Variation</label>
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
                          <label className="text-xs font-medium text-gray-500">Color</label>
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
                        {variant.size && (
                          <span className="inline-flex items-center rounded-full bg-orange-50 text-orange-700 px-2 py-0.5 text-xs font-medium border border-orange-200">
                            {variant.size}
                          </span>
                        )}
                        {variant.color && (
                          <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium border border-blue-200">
                            {variant.color}
                          </span>
                        )}
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
              ))}
            </div>
          )}

          {/* Add New Variant Form */}
          {showAddVariantForm ? (
            <div className="bg-white rounded-lg border-2 border-dashed border-orange-300 p-4 space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Add New Variant</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Size/Variation {formData.sizes.length === 0 ? '(optional)' : ''}</label>
                  {formData.sizes.length > 0 ? (
                    <select
                      value={newVariant.size || ''}
                      onChange={(e) => setNewVariant(prev => ({ ...prev, size: e.target.value }))}
                      className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                    >
                      <option value="">-- Select variation --</option>
                      {formData.sizes.map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newVariant.size || ''}
                      onChange={(e) => setNewVariant(prev => ({ ...prev, size: e.target.value }))}
                      className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., Small, Large, 500ml"
                    />
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Color {formData.colors.length === 0 ? '(optional)' : ''}</label>
                  {formData.colors.length > 0 ? (
                    <select
                      value={newVariant.color || ''}
                      onChange={(e) => setNewVariant(prev => ({ ...prev, color: e.target.value }))}
                      className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                    >
                      <option value="">-- Select color --</option>
                      {formData.colors.map((color) => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={newVariant.color || ''}
                      onChange={(e) => setNewVariant(prev => ({ ...prev, color: e.target.value }))}
                      className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., Red, Blue, Green"
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
                    value={newVariant.stock || 0}
                    onChange={(e) => setNewVariant(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                    className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-orange-600 flex items-center gap-1">
                    Variant Price (₱) *
                    <span className="text-[10px] text-gray-400 font-normal">(buyer pays this)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newVariant.price !== undefined && newVariant.price > 0 ? newVariant.price : parseInt(formData.price) || 0}
                    onChange={(e) => setNewVariant(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                    className="w-full mt-1 rounded-lg border-2 border-orange-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-orange-50"
                    placeholder={formData.price || "0"}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">SKU</label>
                  <input
                    type="text"
                    value={newVariant.sku || ''}
                    onChange={(e) => setNewVariant(prev => ({ ...prev, sku: e.target.value }))}
                    className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Auto-generated if empty"
                  />
                </div>
              </div>
              {/* Variant Image */}
              <div>
                <label className="text-xs font-medium text-gray-500">Variant Image URL (optional)</label>
                <div className="flex gap-2 mt-1">
                  <div className="h-10 w-10 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
                    {newVariant.image ? (
                      <img src={newVariant.image} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <Upload className="h-4 w-4 text-gray-300" />
                    )}
                  </div>
                  <input
                    type="url"
                    value={newVariant.image || ''}
                    onChange={(e) => setNewVariant(prev => ({ ...prev, image: e.target.value }))}
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
                    setNewVariant({ size: '', color: '', stock: 0, price: 0, sku: '', image: '' });
                    setErrors(prev => ({ ...prev, variant: '' }));
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={addVariant}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Variant
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
        </>
      )}
    </div>
  );
}
