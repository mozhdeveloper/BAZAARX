import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Category } from '@/types/database.types';

export class CategoryService {
  private static instance: CategoryService;
  private activeCategoriesCache: { data: Category[] | null; timestamp: number } = { data: null, timestamp: 0 };
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): CategoryService {
    if (!CategoryService.instance) {
      CategoryService.instance = new CategoryService();
    }
    return CategoryService.instance;
  }

  /**
   * Fetch all categories that are marked as active (with in-memory cache).
   * Used for the mobile app's navigation and filtering.
   */
  async getActiveCategories(): Promise<Category[]> {
    if (!isSupabaseConfigured()) return [];

    const now = Date.now();
    if (this.activeCategoriesCache.data && (now - this.activeCategoriesCache.timestamp) < CategoryService.CACHE_TTL) {
      return this.activeCategoriesCache.data;
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, description, parent_id, is_active, sort_order, icon, image_url, created_at, updated_at')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      this.activeCategoriesCache = { data: data || [], timestamp: now };
      return data || [];
    } catch (error) {
      console.error('[CategoryService] Error fetching active categories:', error);
      return [];
    }
  }

  /**
   * Get or create category by name.
   * Ensures mobile uploads can resolve category IDs from strings.
   */
  async getOrCreateCategoryByName(name: string): Promise<string | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const trimmedName = name.trim();
      if (!trimmedName) return null;

      // Check for existing
      const { data: existing, error: findError } = await supabase
        .from('categories')
        .select('id')
        .eq('name', trimmedName)
        .maybeSingle();

      if (existing) return existing.id;

      // Create if missing
      const slug = trimmedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const { data: created, error: createError } = await supabase
        .from('categories')
        .insert({ 
          name: trimmedName, 
          slug, 
          is_active: true // Default new categories to active for mobile
        })
        .select('id')
        .single();

      if (createError) throw createError;
      return created?.id || null;
    } catch (error) {
      console.error('[CategoryService] Error in getOrCreateCategoryByName:', error);
      return null;
    }
  }

  /**
   * Resolves a default category ID if none is provided.
   */
  async getDefaultCategoryId(): Promise<string | null> {
    const { data, error } = await supabase
      .from('categories')
      .select('id')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return data?.id || null;
  }
}

export const categoryService = CategoryService.getInstance();