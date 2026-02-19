import { useState, useEffect } from 'react';
import { Package, DollarSign, Tag, Layers, Save, X, Plus, Trash2, ImageIcon, FileText, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';

interface QuickProductModalProps {
  open: boolean;
  onClose: () => void;
  onProductCreated: (product: any) => void;
  initialBarcode?: string;
  sellerId: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface VariantConfig {
  id: string;
  variantLabel1Value: string;
  variantLabel2Value: string;
  stock: number;
  price: number;
  sku: string;
  barcode: string;
}

export function QuickProductModal({
  open,
  onClose,
  onProductCreated,
  initialBarcode = '',
  sellerId,
}: QuickProductModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'variants'>('general');

  // Basic form state
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState(initialBarcode);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [categoryId, setCategoryId] = useState('');
  const [images, setImages] = useState<string[]>(['']);
  const [brand, setBrand] = useState('');
  const [weight, setWeight] = useState('');

  // Variant state
  const [firstAttributeName, setFirstAttributeName] = useState('Size');
  const [secondAttributeName, setSecondAttributeName] = useState('Color');
  const [editingFirstAttr, setEditingFirstAttr] = useState(false);
  const [editingSecondAttr, setEditingSecondAttr] = useState(false);
  const [variantLabel1Values, setVariantLabel1Values] = useState<string[]>([]);
  const [variantLabel2Values, setVariantLabel2Values] = useState<string[]>([]);
  const [variationInput, setVariationInput] = useState('');
  const [colorInput, setColorInput] = useState('');
  const [variantConfigs, setVariantConfigs] = useState<VariantConfig[]>([]);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [newVariant, setNewVariant] = useState<Partial<VariantConfig>>({
    variantLabel1Value: '',
    variantLabel2Value: '',
    stock: 0,
    price: 0,
    sku: '',
    barcode: '',
  });
  const [showVariants, setShowVariants] = useState(false);

  // Reset form when opened with new barcode
  useEffect(() => {
    if (open) {
      setBarcode(initialBarcode);
      setError('');
      setErrors({});
      setActiveTab('general');
      // Reset other fields
      setName('');
      setDescription('');
      setPrice('');
      setOriginalPrice('');
      setStock('1');
      setImages(['']);
      setBrand('');
      setWeight('');
      setVariantLabel1Values([]);
      setVariantLabel2Values([]);
      setVariantConfigs([]);
      setShowVariants(false);
    }
  }, [open, initialBarcode]);

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug')
          .order('name');
        
        if (error) throw error;
        setCategories(data || []);
        
        if (data && data.length > 0 && !categoryId) {
          setCategoryId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    }
    
    if (open) {
      fetchCategories();
    }
  }, [open]);

  // Image handling
  const handleImageChange = (index: number, value: string) => {
    const newImages = [...images];
    newImages[index] = value;
    setImages(newImages);
    if (errors.images) {
      setErrors(prev => ({ ...prev, images: '' }));
    }
  };

  const addImageField = () => setImages(prev => [...prev, '']);
  const removeImageField = (index: number) => {
    if (images.length > 1) {
      setImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Variant attribute handlers
  const addVariation = () => {
    const trimmed = variationInput.trim();
    if (trimmed && !variantLabel1Values.includes(trimmed)) {
      setVariantLabel1Values(prev => [...prev, trimmed]);
      setVariationInput('');
    }
  };

  const removeVariation = (variation: string) => {
    setVariantLabel1Values(prev => prev.filter(v => v !== variation));
    setVariantConfigs(prev => prev.filter(v => v.variantLabel1Value !== variation));
  };

  const addColor = () => {
    const trimmed = colorInput.trim();
    if (trimmed && !variantLabel2Values.includes(trimmed)) {
      setVariantLabel2Values(prev => [...prev, trimmed]);
      setColorInput('');
    }
  };

  const removeColor = (color: string) => {
    setVariantLabel2Values(prev => prev.filter(c => c !== color));
    setVariantConfigs(prev => prev.filter(v => v.variantLabel2Value !== color));
  };

  // Variant CRUD
  const generateVariantId = () => `var-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addVariant = () => {
    if (!newVariant.variantLabel1Value && !newVariant.variantLabel2Value) {
      setErrors(prev => ({ ...prev, variant: 'At least one variant attribute is required' }));
      return;
    }

    const isDuplicate = variantConfigs.some(
      v => v.variantLabel1Value === (newVariant.variantLabel1Value || '') &&
           v.variantLabel2Value === (newVariant.variantLabel2Value || '')
    );
    if (isDuplicate) {
      setErrors(prev => ({ ...prev, variant: 'This variant combination already exists' }));
      return;
    }

    const basePrice = parseFloat(price) || 0;
    const variant: VariantConfig = {
      id: generateVariantId(),
      variantLabel1Value: newVariant.variantLabel1Value || '',
      variantLabel2Value: newVariant.variantLabel2Value || '',
      stock: newVariant.stock || 0,
      price: newVariant.price && newVariant.price > 0 ? newVariant.price : basePrice,
      sku: newVariant.sku || `${name.substring(0, 3).toUpperCase()}-${newVariant.variantLabel1Value || 'DEF'}-${newVariant.variantLabel2Value || 'DEF'}`.replace(/\s+/g, '-'),
      barcode: newVariant.barcode || '',
    };

    setVariantConfigs(prev => [...prev, variant]);
    setNewVariant({ variantLabel1Value: '', variantLabel2Value: '', stock: 0, price: 0, sku: '', barcode: '' });
    setShowVariantForm(false);
    setErrors(prev => ({ ...prev, variant: '' }));
  };

  const updateVariantConfig = (id: string, field: keyof VariantConfig, value: string | number) => {
    setVariantConfigs(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const deleteVariant = (id: string) => {
    setVariantConfigs(prev => prev.filter(v => v.id !== id));
  };

  const getTotalVariantStock = () => variantConfigs.reduce((sum, v) => sum + (v.stock || 0), 0);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Product name is required';
    }
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!price || parseFloat(price) <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }
    if (!categoryId) {
      newErrors.category = 'Please select a category';
    }

    const baseStock = parseInt(stock) || 0;
    const totalStock = baseStock + getTotalVariantStock();

    if (variantConfigs.length > 0) {
      if (totalStock <= 0) {
        newErrors.variants = 'Total stock must be greater than 0';
      }
    } else if (baseStock <= 0) {
      newErrors.stock = 'Stock must be greater than 0';
    }

    const validImages = images.filter(img => img.trim() !== '');
    if (validImages.length === 0) {
      newErrors.images = 'At least one product image URL is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const validImages = images.filter(img => img.trim() !== '');
      const baseStock = parseInt(stock) || 0;
      const priceNum = parseFloat(price);
      const totalStock = baseStock + getTotalVariantStock();

      // Create product
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          name: name.trim(),
          description: description.trim(),
          sku: barcode.trim() || null,
          price: priceNum,
          category_id: categoryId,
          seller_id: sellerId,
          brand: brand.trim() || null,
          weight: weight ? parseFloat(weight) : null,
          variant_label_1: variantConfigs.length > 0 ? firstAttributeName : null,
          variant_label_2: variantConfigs.length > 0 && variantLabel2Values.length > 0 ? secondAttributeName : null,
          approval_status: 'approved',
        })
        .select()
        .single();

      if (productError) throw productError;

      // Create product images
      if (validImages.length > 0) {
        const imageInserts = validImages.map((imageUrl, index) => ({
          product_id: product.id,
          image_url: imageUrl.trim(),
          is_primary: index === 0,
          sort_order: index,
        }));

        const { error: imageError } = await supabase
          .from('product_images')
          .insert(imageInserts);

        if (imageError) {
          console.error('Product images creation warning:', imageError);
        }
      }

      // Create variants
      if (variantConfigs.length > 0) {
        const variantsToCreate = [];
        
        // Include base variant if base stock > 0
        if (baseStock > 0) {
          variantsToCreate.push({
            product_id: product.id,
            variant_name: 'Base',
            sku: barcode.trim() || `SKU-${product.id.slice(0, 8)}-BASE`,
            barcode: barcode.trim() || null,
            price: priceNum,
            stock: baseStock,
          });
        }

        // Add custom variants
        for (const v of variantConfigs) {
          const variantName = [v.variantLabel1Value, v.variantLabel2Value].filter(Boolean).join(' / ') || 'Default';
          variantsToCreate.push({
            product_id: product.id,
            variant_name: variantName,
            sku: v.sku || `SKU-${product.id.slice(0, 8)}-${variantName.replace(/\s+/g, '-').toUpperCase()}`,
            barcode: v.barcode || null,
            option_1_value: v.variantLabel1Value || null,
            option_2_value: v.variantLabel2Value || null,
            price: v.price,
            stock: v.stock,
          });
        }

        const { error: variantError } = await supabase
          .from('product_variants')
          .insert(variantsToCreate);

        if (variantError) {
          console.error('Variant creation warning:', variantError);
        }
      } else {
        // No variants - create default variant with barcode
        const { error: variantError } = await supabase
          .from('product_variants')
          .insert({
            product_id: product.id,
            variant_name: 'Default',
            sku: barcode.trim() || `SKU-${product.id.slice(0, 8)}`,
            barcode: barcode.trim() || null,
            price: priceNum,
            stock: baseStock,
          });

        if (variantError) {
          console.error('Variant creation warning:', variantError);
        }
      }

      // Return full product object
      onProductCreated({
        ...product,
        stock: totalStock,
        primaryImageUrl: validImages[0] || null,
      });
      
      onClose();
    } catch (err: any) {
      console.error('Failed to create product:', err);
      setError(err.message || 'Failed to create product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setName('');
      setDescription('');
      setPrice('');
      setOriginalPrice('');
      setStock('1');
      setImages(['']);
      setError('');
      setErrors({});
      setCategoryId('');
      setVariantConfigs([]);
      setVariantLabel1Values([]);
      setVariantLabel2Values([]);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-[#FF6A00]" />
            Add New Product
          </DialogTitle>
          <DialogDescription>
            Product not found. Fill in the complete details below to create it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2 mb-4">
              <X className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'general' | 'variants')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="general">General Info</TabsTrigger>
              <TabsTrigger value="variants">Variants & Stock</TabsTrigger>
            </TabsList>

            {/* General Info Tab */}
            <TabsContent value="general" className="space-y-4">
              {/* Barcode/SKU */}
              <div className="space-y-2">
                <Label htmlFor="barcode" className="flex items-center gap-2 text-sm font-semibold">
                  <Tag className="h-4 w-4" />
                  Barcode / SKU
                </Label>
                <Input
                  id="barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Barcode or SKU"
                  className="font-mono"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500">This barcode will be linked to the default variant</p>
              </div>

              {/* Product Name */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="name" className="flex items-center gap-2 text-sm font-semibold">
                    <Package className="h-4 w-4" />
                    Product Name <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-xs text-gray-500">Keep it clear and searchable</span>
                </div>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                  }}
                  placeholder="E.g., Classic Linen Button-Down Shirt"
                  autoFocus
                  disabled={isLoading}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description" className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4" />
                    Description <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-xs text-gray-500">Highlight benefits, not just specs</span>
                </div>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
                  }}
                  placeholder="Material, fit, key features, and what makes it special."
                  rows={3}
                  disabled={isLoading}
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
              </div>

              {/* Price and Original Price */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price" className="flex items-center gap-2 text-sm font-semibold">
                    <DollarSign className="h-4 w-4" />
                    Display Price (₱) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value);
                      if (errors.price) setErrors(prev => ({ ...prev, price: '' }));
                    }}
                    placeholder="0.00"
                    disabled={isLoading}
                    className={errors.price ? 'border-red-500' : ''}
                  />
                  {variantConfigs.length > 0 && (
                    <p className="text-xs text-orange-600">ⓘ Actual prices are set per variant. This is the display price.</p>
                  )}
                  {errors.price && <p className="text-sm text-red-600">{errors.price}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="originalPrice" className="text-sm font-semibold">
                    Original Price (₱)
                    <span className="text-xs font-normal text-gray-500 ml-1">(for strikethrough)</span>
                  </Label>
                  <Input
                    id="originalPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    placeholder="0.00"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Category and Brand */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={categoryId} 
                    onValueChange={(value) => {
                      setCategoryId(value);
                      if (errors.category) setErrors(prev => ({ ...prev, category: '' }));
                    }} 
                    disabled={isLoading}
                  >
                    <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-sm text-red-600">{errors.category}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand" className="text-sm font-semibold">Brand</Label>
                  <Input
                    id="brand"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Brand name (optional)"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Weight */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight" className="text-sm font-semibold">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    min="0"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="0.00"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Product Images */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-sm font-semibold">
                    <ImageIcon className="h-4 w-4" />
                    Product Images <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-xs text-gray-500">Use high-res, clean backgrounds</span>
                </div>
                <div className="space-y-2">
                  {images.map((image, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <div className="h-10 w-10 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
                        {image ? (
                          <img
                            src={image}
                            alt={`Preview ${index + 1}`}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>{index === 0 ? 'Main' : 'Alt'}</span>
                        )}
                      </div>
                      <Input
                        value={image}
                        onChange={(e) => handleImageChange(index, e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        disabled={isLoading}
                        className={index === 0 && errors.images ? 'border-red-500' : ''}
                      />
                      {images.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeImageField(index)}
                          disabled={isLoading}
                          className="flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addImageField}
                    disabled={isLoading}
                    className="w-full border-dashed"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Image
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  The first image is the thumbnail. Paste image URLs from the web.
                </p>
                {errors.images && <p className="text-sm text-red-600">{errors.images}</p>}
              </div>
            </TabsContent>

            {/* Variants Tab */}
            <TabsContent value="variants" className="space-y-4">
              {/* Base Stock */}
              <div className="space-y-2">
                <Label htmlFor="stock" className="flex items-center gap-2 text-sm font-semibold">
                  <Layers className="h-4 w-4" />
                  Base Stock Quantity {variantConfigs.length === 0 && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => {
                    setStock(e.target.value);
                    if (errors.stock) setErrors(prev => ({ ...prev, stock: '' }));
                  }}
                  placeholder="0"
                  disabled={isLoading}
                  className={errors.stock ? 'border-red-500' : ''}
                />
                {variantConfigs.length > 0 && (
                  <p className="text-xs text-green-700">
                    Base: {parseInt(stock) || 0} • Custom variants: {getTotalVariantStock()} • Total: {(parseInt(stock) || 0) + getTotalVariantStock()}
                  </p>
                )}
                {errors.stock && <p className="text-sm text-red-600">{errors.stock}</p>}
              </div>

              {/* Toggle Variants Section */}
              <div className="border rounded-lg">
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                  onClick={() => setShowVariants(!showVariants)}
                >
                  <div>
                    <h3 className="font-semibold text-gray-900">Product Variants</h3>
                    <p className="text-xs text-gray-500">Create size, color, or custom variants with individual stock and pricing</p>
                  </div>
                  {showVariants ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </button>

                {showVariants && (
                  <div className="p-4 border-t space-y-4">
                    {/* First Attribute */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {editingFirstAttr ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={firstAttributeName}
                              onChange={(e) => setFirstAttributeName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  setEditingFirstAttr(false);
                                }
                              }}
                              className="w-32 h-8"
                              autoFocus
                            />
                            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingFirstAttr(false)}>
                              Done
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Label className="text-sm font-semibold">{firstAttributeName}</Label>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingFirstAttr(true)}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={variationInput}
                          onChange={(e) => setVariationInput(e.target.value)}
                          placeholder={`Add ${firstAttributeName.toLowerCase()}...`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addVariation();
                            }
                          }}
                          disabled={isLoading}
                        />
                        <Button type="button" onClick={addVariation} disabled={isLoading}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {variantLabel1Values.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {variantLabel1Values.map(v => (
                            <span key={v} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                              {v}
                              <button type="button" onClick={() => removeVariation(v)} className="hover:text-orange-900">
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Second Attribute */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {editingSecondAttr ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={secondAttributeName}
                              onChange={(e) => setSecondAttributeName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  setEditingSecondAttr(false);
                                }
                              }}
                              className="w-32 h-8"
                              autoFocus
                            />
                            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingSecondAttr(false)}>
                              Done
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Label className="text-sm font-semibold">{secondAttributeName}</Label>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingSecondAttr(true)}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={colorInput}
                          onChange={(e) => setColorInput(e.target.value)}
                          placeholder={`Add ${secondAttributeName.toLowerCase()}...`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addColor();
                            }
                          }}
                          disabled={isLoading}
                        />
                        <Button type="button" onClick={addColor} disabled={isLoading}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {variantLabel2Values.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {variantLabel2Values.map(c => (
                            <span key={c} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                              {c}
                              <button type="button" onClick={() => removeColor(c)} className="hover:text-blue-900">
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Variant List */}
                    {variantConfigs.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <h4 className="text-sm font-semibold">Configured Variants ({variantConfigs.length})</h4>
                        <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                          {variantConfigs.map(v => (
                            <div key={v.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                              <div className="flex-1">
                                <p className="font-medium text-sm">
                                  {[v.variantLabel1Value, v.variantLabel2Value].filter(Boolean).join(' / ') || 'Default'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  SKU: {v.sku} • Stock: {v.stock} • ₱{v.price.toFixed(2)}
                                  {v.barcode && ` • Barcode: ${v.barcode}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  value={v.stock}
                                  onChange={(e) => updateVariantConfig(v.id, 'stock', parseInt(e.target.value) || 0)}
                                  className="w-20 h-8"
                                  placeholder="Stock"
                                />
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={v.price}
                                  onChange={(e) => updateVariantConfig(v.id, 'price', parseFloat(e.target.value) || 0)}
                                  className="w-24 h-8"
                                  placeholder="Price"
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => deleteVariant(v.id)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add Variant Form */}
                    {showVariantForm ? (
                      <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                        <h4 className="font-semibold text-sm">Add New Variant</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">{firstAttributeName}</Label>
                            <Select
                              value={newVariant.variantLabel1Value || ''}
                              onValueChange={(v) => setNewVariant(prev => ({ ...prev, variantLabel1Value: v }))}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder={`Select ${firstAttributeName}`} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">None</SelectItem>
                                {variantLabel1Values.map(v => (
                                  <SelectItem key={v} value={v}>{v}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">{secondAttributeName}</Label>
                            <Select
                              value={newVariant.variantLabel2Value || ''}
                              onValueChange={(v) => setNewVariant(prev => ({ ...prev, variantLabel2Value: v }))}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder={`Select ${secondAttributeName}`} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">None</SelectItem>
                                {variantLabel2Values.map(c => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Stock</Label>
                            <Input
                              type="number"
                              min="0"
                              value={newVariant.stock || ''}
                              onChange={(e) => setNewVariant(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                              className="h-8"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Price (₱)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={newVariant.price || ''}
                              onChange={(e) => setNewVariant(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                              className="h-8"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">SKU</Label>
                            <Input
                              value={newVariant.sku || ''}
                              onChange={(e) => setNewVariant(prev => ({ ...prev, sku: e.target.value }))}
                              className="h-8"
                              placeholder="Auto-generated"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Barcode</Label>
                            <Input
                              value={newVariant.barcode || ''}
                              onChange={(e) => setNewVariant(prev => ({ ...prev, barcode: e.target.value }))}
                              className="h-8"
                              placeholder="Optional"
                            />
                          </div>
                        </div>
                        {errors.variant && <p className="text-sm text-red-600">{errors.variant}</p>}
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setShowVariantForm(false)}>
                            Cancel
                          </Button>
                          <Button type="button" size="sm" onClick={addVariant}>
                            Add Variant
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowVariantForm(true)}
                        className="w-full border-dashed"
                        disabled={variantLabel1Values.length === 0 && variantLabel2Values.length === 0}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Custom Variant
                      </Button>
                    )}

                    {(variantLabel1Values.length === 0 && variantLabel2Values.length === 0) && (
                      <p className="text-xs text-gray-500 text-center">
                        Add {firstAttributeName.toLowerCase()} or {secondAttributeName.toLowerCase()} values above first
                      </p>
                    )}

                    {errors.variants && <p className="text-sm text-red-600">{errors.variants}</p>}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#FF6A00] hover:bg-[#E55F00] gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create & Add to Cart
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
