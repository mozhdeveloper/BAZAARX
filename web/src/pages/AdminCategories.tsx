/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useAdminAuth, useAdminCategories, Category } from '../stores/adminStore';
import AdminSidebar from '../components/AdminSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FolderTree,
  Package,
  Loader2,
  ArrowUpDown,
  ImageIcon,
  Hash,
  LayoutGrid,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

interface FormData {
  name: string;
  description: string;
  image: string;
  icon: string;
  slug: string;
  sortOrder: number;
  parentId: string;
}

const EMPTY_FORM: FormData = {
  name: '',
  description: '',
  image: '',
  icon: '',
  slug: '',
  sortOrder: 0,
  parentId: '',
};

// ── Component ────────────────────────────────────────────────────────
const AdminCategories: React.FC = () => {
  const { isAuthenticated } = useAdminAuth();
  const {
    categories,
    selectedCategory,
    isLoading,
    error,
    loadCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryStatus,
    selectCategory,
    clearError,
  } = useAdminCategories();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<FormData>({ ...EMPTY_FORM });
  const [autoSlug, setAutoSlug] = useState(true);
  const [formError, setFormError] = useState('');

  // ── Load on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated) loadCategories();
  }, [isAuthenticated, loadCategories]);

  // ── Populate edit form ─────────────────────────────────────────────
  useEffect(() => {
    if (selectedCategory && showEditDialog) {
      const t = setTimeout(() => {
        setFormData({
          name: selectedCategory.name,
          description: selectedCategory.description,
          image: selectedCategory.image,
          icon: selectedCategory.icon,
          slug: selectedCategory.slug,
          sortOrder: selectedCategory.sortOrder,
          parentId: selectedCategory.parentId || '',
        });
        setAutoSlug(false);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [selectedCategory, showEditDialog]);

  // ── Filtered list (memoized) ───────────────────────────────────────
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    const q = searchTerm.toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
    );
  }, [categories, searchTerm]);

  // ── Parent options (exclude self when editing) ─────────────────────
  const parentOptions = useMemo(() => {
    if (!showEditDialog || !selectedCategory) return categories;
    return categories.filter((c) => c.id !== selectedCategory.id);
  }, [categories, showEditDialog, selectedCategory]);

  // ── Auth guard ─────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // ── Form handlers ──────────────────────────────────────────────────
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: name === 'sortOrder' ? Number(value) || 0 : value };
      if (name === 'name' && autoSlug) {
        next.slug = generateSlug(value);
      }
      return next;
    });
    setFormError('');
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoSlug(false);
    setFormData((prev) => ({ ...prev, slug: e.target.value }));
    setFormError('');
  };

  const handleToggleStatus = async (id: string, checked: boolean) => {
    await toggleCategoryStatus(id, checked);
  };

  const resetForm = () => {
    setFormData({ ...EMPTY_FORM });
    setAutoSlug(true);
    setFormError('');
    clearError();
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setFormError('Category name is required.');
      return false;
    }
    if (!formData.slug.trim()) {
      setFormError('URL slug is required.');
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      setFormError('Slug must only contain lowercase letters, numbers, and hyphens.');
      return false;
    }
    return true;
  };

  // ── CRUD ───────────────────────────────────────────────────────────
  const handleAddCategory = async () => {
    if (!validateForm()) return;
    try {
      await addCategory({
        name: formData.name.trim(),
        description: formData.description.trim(),
        image: formData.image.trim(),
        icon: formData.icon.trim(),
        slug: formData.slug.trim(),
        sortOrder: formData.sortOrder,
        parentId: formData.parentId || undefined,
      });
      setShowAddDialog(false);
      resetForm();
    } catch (err) {
      console.error('Error adding category:', err);
    }
  };

  const handleEditCategory = async () => {
    if (!selectedCategory || !validateForm()) return;
    try {
      await updateCategory(selectedCategory.id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        image: formData.image.trim(),
        icon: formData.icon.trim(),
        slug: formData.slug.trim(),
        sortOrder: formData.sortOrder,
        parentId: formData.parentId || undefined,
      });
      setShowEditDialog(false);
      selectCategory(null);
      resetForm();
    } catch (err) {
      console.error('Error updating category:', err);
    }
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    try {
      await deleteCategory(selectedCategory.id);
      setShowDeleteDialog(false);
      selectCategory(null);
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  const openEditDialog = (cat: Category) => {
    selectCategory(cat);
    setShowEditDialog(true);
  };

  const openDeleteDialog = (cat: Category) => {
    selectCategory(cat);
    setShowDeleteDialog(true);
  };

  // ── Loading state ──────────────────────────────────────────────────
  if (isLoading && categories.length === 0) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminSidebar open={sidebarOpen} setOpen={setSidebarOpen} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading categories…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Shared form fields (DRY for Add + Edit dialogs) ────────────────
  const renderFormFields = (prefix: string) => (
    <div className="grid gap-5 py-4">
      {/* Name */}
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-name`} className="text-sm font-medium">
          Category Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id={`${prefix}-name`}
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="e.g. Electronics, Fashion, Home & Living"
        />
      </div>

      {/* Description */}
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-desc`} className="text-sm font-medium">
          Description
        </Label>
        <Textarea
          id={`${prefix}-desc`}
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Brief description of products in this category"
          rows={3}
        />
      </div>

      {/* Slug */}
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-slug`} className="text-sm font-medium">
          URL Slug <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            id={`${prefix}-slug`}
            value={formData.slug}
            onChange={handleSlugChange}
            placeholder="auto-generated-from-name"
            className="pl-9 font-mono text-sm"
          />
        </div>
        <p className="text-xs text-gray-400">
          Used in URL: /shop?category=<span className="font-mono">{formData.slug || '…'}</span>
        </p>
      </div>

      {/* Image URL + Icon (side by side) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor={`${prefix}-image`} className="text-sm font-medium">
            Image URL
          </Label>
          <div className="relative">
            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id={`${prefix}-image`}
              name="image"
              type="url"
              value={formData.image}
              onChange={handleInputChange}
              placeholder="https://…"
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`${prefix}-icon`} className="text-sm font-medium">
            Icon Name
          </Label>
          <div className="relative">
            <LayoutGrid className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id={`${prefix}-icon`}
              name="icon"
              value={formData.icon}
              onChange={handleInputChange}
              placeholder="e.g. laptop, shirt, home"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Image preview */}
      {formData.image && (
        <div className="rounded-lg border overflow-hidden bg-gray-50">
          <img
            src={formData.image}
            alt="Preview"
            className="w-full h-32 object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Parent Category + Sort Order (side by side) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label className="text-sm font-medium">Parent Category</Label>
          <Select
            value={formData.parentId || 'none'}
            onValueChange={(val) =>
              setFormData((prev) => ({ ...prev, parentId: val === 'none' ? '' : val }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="None (top-level)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (top-level)</SelectItem>
              {parentOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`${prefix}-sortOrder`} className="text-sm font-medium">
            Sort Order
          </Label>
          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id={`${prefix}-sortOrder`}
              name="sortOrder"
              type="number"
              value={formData.sortOrder}
              onChange={handleInputChange}
              min="0"
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Errors */}
      {formError && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{formError}</p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
      )}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-gray-50 overflow-hidden">
      <AdminSidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Categories</h1>
              <p className="text-gray-500 text-sm">
                Manage product categories and organize your marketplace
              </p>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setShowAddDialog(true);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </div>

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex-1 relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search categories by name, description, or slug…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <span className="text-sm text-gray-400 whitespace-nowrap">
                  {filteredCategories.length} of {categories.length} categories
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Grid */}
          {filteredCategories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredCategories.map((category, index) => (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.04 }}
                    layout
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 group">
                      {/* Image */}
                      <div className="relative h-44 bg-gray-100">
                        {category.image ? (
                          <img
                            src={category.image}
                            alt={category.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100">
                            <FolderTree className="w-12 h-12 text-orange-300" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-xs font-medium text-gray-600 px-2 py-1 rounded-full shadow-sm">
                          #{category.sortOrder}
                        </div>
                      </div>

                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg text-gray-900 mb-0.5 truncate">
                          {category.name}
                        </h3>
                        <p className="text-xs text-gray-400 font-mono mb-2">/{category.slug}</p>

                        {category.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {category.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                          <div className="flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            <span>{category.productsCount} products</span>
                          </div>
                          {category.parentId && (
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                              Sub-category
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(category)}
                            className="flex-1"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteDialog(category)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between">
                          <p className="text-xs text-gray-400">
                            Created {category.createdAt.toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-400">
                            Updated {category.updatedAt.toLocaleDateString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-16">
              <FolderTree className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
              <p className="text-gray-500 mb-4 text-sm">
                {searchTerm
                  ? 'Try adjusting your search term.'
                  : 'Get started by creating your first category.'}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => {
                    resetForm();
                    setShowAddDialog(true);
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Category
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Add Category Dialog ─────────────────────────────────────── */}
      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Add New Category</DialogTitle>
            <DialogDescription>
              Create a new product category. The slug is auto-generated from the name.
            </DialogDescription>
          </DialogHeader>

          {renderFormFields('add')}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCategory}
              disabled={isLoading || !formData.name.trim()}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create Category'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Category Dialog ────────────────────────────────────── */}
      <Dialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) {
            selectCategory(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Category</DialogTitle>
            <DialogDescription>
              Update the category details below.
            </DialogDescription>
          </DialogHeader>

          {renderFormFields('edit')}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                selectCategory(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditCategory}
              disabled={isLoading || !formData.name.trim()}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ─────────────────────────────────────── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                Are you sure you want to delete "<strong>{selectedCategory?.name}</strong>"?
                This action cannot be undone.
                {selectedCategory && selectedCategory.productsCount > 0 && (
                  <span className="block mt-2 text-red-600 font-medium">
                    Warning: This category has {selectedCategory.productsCount} product
                    {selectedCategory.productsCount !== 1 ? 's' : ''} linked to it.
                  </span>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete Category'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCategories;
