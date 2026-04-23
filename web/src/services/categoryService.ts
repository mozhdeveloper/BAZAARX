// categoryService.ts
import { supabase } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Category } from "@/types/database.types"; 

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

    // For Sellers & Buyers: Only fetches active categories (with in-memory cache, matching mobile)
    async getActiveCategories(): Promise<Category[]> {
        if (!isSupabaseConfigured()) return [];

        const now = Date.now();
        if (this.activeCategoriesCache.data && (now - this.activeCategoriesCache.timestamp) < CategoryService.CACHE_TTL) {
            return this.activeCategoriesCache.data;
        }

        const { data, error } = await supabase
            .from("categories")
            .select("id, name, slug, description, parent_id, is_active, sort_order, icon, image_url, created_at, updated_at")
            .eq('is_active', true)
            .order("sort_order", { ascending: true });

        if (error) throw error;
        this.activeCategoriesCache = { data: data || [], timestamp: now };
        return data || [];
    }

    // For Admins: Fetches ALL categories WITH product counts
    async getAllCategories() {
        const { data, error } = await supabase
            .from("categories")
            .select("id, name, slug, parent_id, icon, image_url, sort_order, is_active, products(count)")
            .order("sort_order", { ascending: true });

        if (error) throw error;
        return data || [];
    }

    // For Admins: Toggles the active status
    async updateCategoryStatus(id: string, isActive: boolean): Promise<void> {
        const { error } = await supabase
            .from("categories")
            .update({ is_active: isActive, updated_at: new Date().toISOString() })
            .eq("id", id);

        if (error) throw error;
    }
}

export const categoryService = CategoryService.getInstance();