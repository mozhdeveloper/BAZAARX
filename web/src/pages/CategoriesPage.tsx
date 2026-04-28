/* eslint-disable @typescript-eslint/no-explicit-any */
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, FolderTree, Loader2, Package, Search } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';
import { Input } from '../components/ui/input';
import { isSupabaseConfigured } from '../lib/supabase';
import { categoryService } from '../services/categoryService';
import { useProductStore } from '../stores/sellerStore';

interface CategoryDisplay {
  id: string;
  name: string;
  description: string;
  image: string;
  slug: string;
  parentId: string | null;
  productsCount: number;
}

const GRADIENT_COLORS = [
  'from-orange-50 to-amber-100',
  'from-blue-50 to-indigo-100',
  'from-pink-50 to-rose-100',
  'from-green-50 to-emerald-100',
  'from-purple-50 to-violet-100',
  'from-yellow-50 to-amber-100',
] as const;

const CategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParent, setSelectedParent] = useState<CategoryDisplay | null>(null);

  const { products: sellerProducts, fetchProducts } = useProductStore();

  useEffect(() => {
    const fetchData = async () => {
      if (!isSupabaseConfigured()) { setLoading(false); return; }
      try {
        const catsData = await categoryService.getActiveCategories();
        await fetchProducts({ isActive: true, approvalStatus: 'approved', limit: 200 });
        setCategories(catsData.map((row: any) => ({
          id: row.id,
          name: row.name,
          description: row.description || '',
          image: row.image_url || '',
          slug: row.slug,
          parentId: row.parent_id || null,
          productsCount: 0,
        })));
      } catch (err) {
        console.error('Failed to load categories:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const categoryCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of sellerProducts || []) {
      if (p.isActive && p.approvalStatus === 'approved') {
        const cat = p.category || "Uncategorized";
        map.set(cat, (map.get(cat) || 0) + 1);
      }
    }
    return map;
  }, [sellerProducts]);

  const otherProductsCount = useMemo(() => {
    const activeCategoryNames = new Set(categories.map(c => c.name.toLowerCase()));
    let count = 0;
    for (const [catName, catCount] of categoryCountMap.entries()) {
      if (!activeCategoryNames.has(catName.toLowerCase()) || catName.toLowerCase() === 'others') {
        count += catCount;
      }
    }
    return count;
  }, [categories, categoryCountMap]);

  const categoriesWithCounts = useMemo(() => {
    const filteredCats = categories.filter(c => c.name.toLowerCase() !== 'others');
    const catsWithCounts: CategoryDisplay[] = filteredCats.map(cat => ({
      ...cat,
      productsCount: categoryCountMap.get(cat.name) || 0
    }));
    if (otherProductsCount > 0) {
      catsWithCounts.push({
        id: 'virtual-others',
        name: 'Others',
        description: 'Other items across various categories',
        image: '',
        slug: 'Others',
        parentId: null,
        productsCount: otherProductsCount
      });
    }
    return catsWithCounts;
  }, [categories, categoryCountMap, otherProductsCount]);

  // Build a map of parentId → children for quick lookup
  const childrenMap = useMemo(() => {
    const map = new Map<string, CategoryDisplay[]>();
    for (const c of categoriesWithCounts) {
      if (c.parentId) {
        const existing = map.get(c.parentId) || [];
        existing.push(c);
        map.set(c.parentId, existing);
      }
    }
    return map;
  }, [categoriesWithCounts]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return categoriesWithCounts;
    const q = searchTerm.toLowerCase();
    return categoriesWithCounts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    );
  }, [categoriesWithCounts, searchTerm]);

  const topLevel = useMemo(() => filtered.filter((c) => !c.parentId), [filtered]);

  // Navigate to product listing for a category
  const navigateToListing = (category: CategoryDisplay) => {
    navigate(`/products?category=${encodeURIComponent(category.name)}&categoryId=${category.id}`);
  };

  // Handle clicking a main category
  const handleCategoryClick = (category: CategoryDisplay) => {
    const children = childrenMap.get(category.id) || [];
    if (children.length > 0) {
      // Has subcategories → show them
      setSelectedParent(category);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // No subcategories → go directly to product listing
      navigateToListing(category);
    }
  };

  // Handle clicking a subcategory
  const handleSubCategoryClick = (category: CategoryDisplay) => {
    navigateToListing(category);
  };

  // Go back from subcategory view
  const handleBackToMain = () => {
    setSelectedParent(null);
  };

  // Get subcategories for the selected parent
  const visibleSubCategories = selectedParent ? (childrenMap.get(selectedParent.id) || []) : [];

  return (
    <div className="min-h-screen bg-transparent">
      <Header />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-0 flex flex-col gap-2">
        {/* Page Navigation */}
        <div className="flex items-center justify-center gap-10 pt-1 pb-1">
          <Link to="/shop" className="text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-all duration-300">Shop</Link>
          <Link to="/categories" className="text-sm font-bold text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)] pb-0.5">Categories</Link>
          <Link to="/collections" className="text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-all duration-300">Collections</Link>
          <Link to="/stores" className="text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-all duration-300">Stores</Link>
          <Link to="/registry" className="text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-all duration-300">Registry & Gifting</Link>
        </div>

        {/* Hero */}
        <div className="py-24 bg-hero-gradient backdrop-blur-md shadow-md rounded-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center px-4">
            <h1 className="text-4xl md:text-6xl font-black text-[var(--text-headline)] mb-2 tracking-tight font-primary">
              Browse by<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-primary)] to-[var(--text-accent)]">Category</span>
            </h1>
            <p className="text-medium text-[var(--text-primary)] max-w-2xl mx-auto font-medium">
              Explore products organized by category — find exactly what you're looking for.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Search */}
        {!selectedParent && (
          <div className="relative max-w-md mx-auto mb-10">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search categories…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        )}

        {/* Content */}
        {!loading && (
          <AnimatePresence mode="wait">
            {selectedParent ? (
              /* ── Subcategory View ── */
              <motion.div
                key="subcategory-view"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
              >
                {/* Back button + parent info */}
                <div className="mb-6">
                  <button
                    onClick={handleBackToMain}
                    className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors mb-4"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to all categories
                  </button>

                  <div className="flex items-center gap-4 mb-2">
                    {selectedParent.image && (
                      <img
                        src={selectedParent.image}
                        alt={selectedParent.name}
                        className="w-16 h-16 rounded-xl object-cover border border-gray-100"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-[var(--text-headline)]">{selectedParent.name}</h2>
                      {selectedParent.description && (
                        <p className="text-sm text-[var(--text-muted)] mt-1">{selectedParent.description}</p>
                      )}
                    </div>
                  </div>

                  {/* "View all in this category" link */}
                  <button
                    onClick={() => navigateToListing(selectedParent)}
                    className="text-sm font-semibold text-[var(--brand-primary)] hover:underline flex items-center gap-1 mt-2"
                  >
                    View all {selectedParent.name} products
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Subcategory grid */}
                {visibleSubCategories.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                    {visibleSubCategories.map((cat, index) => (
                      <CategoryCard
                        key={cat.id}
                        category={cat}
                        index={index}
                        onClick={() => handleSubCategoryClick(cat)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No subcategories found.</p>
                  </div>
                )}
              </motion.div>
            ) : (
              /* ── Main Category View ── */
              <motion.div
                key="main-view"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.25 }}
              >
                {filtered.length === 0 ? (
                  <div className="text-center py-16">
                    <FolderTree className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 mb-1">No categories found</h3>
                    <p className="text-sm text-gray-500">
                      {searchTerm ? 'Try a different search term.' : 'No categories are available yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                    {topLevel.map((category, index) => (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        index={index}
                        onClick={() => handleCategoryClick(category)}
                        hasChildren={(childrenMap.get(category.id) || []).length > 0}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <BazaarFooter />
    </div>
  );
};

// ── Category Card ────────────────────────────────────────────────────
interface CardProps {
  category: CategoryDisplay;
  index: number;
  onClick: () => void;
  hasChildren?: boolean;
}

const CategoryCard: React.FC<CardProps> = ({ category, index, onClick, hasChildren }) => (
  <motion.button
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: index * 0.04 }}
    onClick={onClick}
    className="group text-left rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
  >
    <div className="relative h-40 overflow-hidden">
      {category.image ? (
        <img
          loading="lazy"
          src={category.image}
          alt={category.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            const fb = e.currentTarget.parentElement?.querySelector('.img-fb') as HTMLElement | null;
            if (fb) fb.style.display = 'flex';
          }}
        />
      ) : null}
      <div
        className={`img-fb w-full h-full items-center justify-center bg-gradient-to-br ${GRADIENT_COLORS[index % GRADIENT_COLORS.length]} ${category.image ? 'hidden' : 'flex'}`}
      >
        <FolderTree className="w-10 h-10 text-orange-300" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      <h3 className="absolute bottom-3 left-3 right-3 text-white font-bold text-base leading-tight drop-shadow flex items-center gap-1">
        {category.name}
        {hasChildren && <ChevronRight className="w-4 h-4 opacity-70" />}
      </h3>
    </div>

    <div className="px-3 py-3">
      {category.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{category.description}</p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Package className="w-3.5 h-3.5" />
          <span>{category.productsCount.toLocaleString()} products</span>
        </div>
        {hasChildren && (
          <span className="text-[10px] font-semibold text-[var(--brand-primary)] bg-[var(--brand-primary)]/10 px-2 py-0.5 rounded-full">
            Subcategories
          </span>
        )}
      </div>
    </div>
  </motion.button>
);

export default CategoriesPage;
