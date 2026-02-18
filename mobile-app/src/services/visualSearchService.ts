import { supabase } from '../lib/supabase'; // Adjust based on your setup

export const visualSearchService = {
  async searchByBase64(base64: string) {
    // 1. Call Edge Function
    const { data: searchData, error: searchError } = await supabase.functions.invoke('visual-search', {
      body: { image_base64: base64 },
    });

    if (searchError) throw searchError;

    const productIds = searchData?.products?.map((p: any) => p.id) || [];
    
    if (productIds.length === 0) return { products: [], info: null };

    // 2. Enrich from DB
    const { data: fullProducts, error: dbError } = await supabase
      .from("products")
      .select(`
        *,
        category:categories(name),
        images:product_images(image_url, is_primary),
        seller:sellers(store_name)
      `)
      .in('id', productIds)
      .is('deleted_at', null);

    if (dbError) throw dbError;

    // 3. Maintain Rank Order
    const sorted = productIds
      .map((id: string) => fullProducts.find(p => p.id === id))
      .filter(Boolean);

    return {
      products: sorted,
      info: {
        category: searchData?.detectedCategory,
        detectedItem: searchData?.detectedItem,
      }
    };
  }
};