import { supabase } from '../lib/supabase'; // Adjust based on your setup

export const visualSearchService = {
  async searchByBase64(base64: string) {
    const payloadSize = base64.length;
    console.log(`[VisualSearch] Invoking Edge Function | Payload Size: ${(payloadSize / 1024).toFixed(2)} KB`);

    // 1. Call Edge Function
    const { data: searchData, error: searchError } = await supabase.functions.invoke('visual-search', {
      body: { image_base64: base64 },
    });
    
    if (searchError) {
      console.error("Visual Search Edge Function Error:", {
        message: searchError.message,
        name: searchError.name,
        // @ts-ignore
        status: searchError.status,
        // @ts-ignore
        context: searchError.context,
      });
      throw searchError;
    }

    const productIds = searchData?.products?.map((p: any) => p.id) || [];
    
    if (productIds.length === 0) return { products: [], info: null };

    // 2. Enrich from DB (fetch all products in batches if needed)
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

    // 3. Fetch sold counts from order_items for all products
    const { data: soldData } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .in('product_id', productIds);

    // Build a sold count map
    const soldMap: Record<string, number> = {};
    if (soldData) {
      for (const item of soldData) {
        soldMap[item.product_id] = (soldMap[item.product_id] || 0) + (item.quantity || 0);
      }
    }

    // 4. Maintain Rank Order and attach total_sold
    const sorted = productIds
      .map((id: string) => {
        const product = fullProducts.find(p => p.id === id);
        if (!product) return null;
        return {
          ...product,
          total_sold: soldMap[product.id] || 0,
        };
      })
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