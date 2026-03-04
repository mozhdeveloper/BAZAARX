// categoryService.ts
import { supabase } from "@/lib/supabase";
import type { Category } from "@/types/database.types"; 

export class CategoryService {
    private static instance: CategoryService;

    private constructor() {}

    public static getInstance(): CategoryService {
        if (!CategoryService.instance) {
            CategoryService.instance = new CategoryService();
        }
        return CategoryService.instance;
    }

    // For Sellers & Buyers: Only fetches active categories
    async getActiveCategories() {
        const { data, error } = await supabase
            .from("categories")
            .select("*")
            .eq('is_active', true)
            .order("sort_order", { ascending: true });

        if (error) throw error;
        return data || [];
    }

    // For Admins: Fetches ALL categories WITH product counts
    async getAllCategories() {
        const { data, error } = await supabase
            .from("categories")
            .select("*, products(count)")
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