import { supabase } from '../lib/supabase';

export const visualSearchService = {
  async searchByBase64(base64: string) {
    // 1. Call the NEW v2 Edge Function
    const { data, error } = await supabase.functions.invoke('visual-search-v2', {
      body: { image_base64: base64 },
    });
    
    if (error) throw error;

    // The new response structure: { detected_objects: [ { object_label, matches: [] } ] }
    const detectedObjects = data?.detected_objects || [];
    
    if (detectedObjects.length === 0) return { objects: [] };

    // 2. Enrich matches for ALL detected objects
    const enrichedObjects = await Promise.all(detectedObjects.map(async (obj: any) => {
      const productIds = obj.matches.map((m: any) => m.id);
      
      if (productIds.length === 0) return { label: obj.object_label, products: [] };

      // Fetch full details from DB
      const { data: fullProducts } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(name),
          images:product_images(image_url, is_primary),
          seller:sellers(store_name)
        `)
        .in('id', productIds)
        .is('deleted_at', null);

      // Map back to maintain rank and add total_sold (similar to your previous logic)
      const mapped = obj.matches.map((match: any) => {
        const p = fullProducts?.find(fp => fp.id === match.id);
        if (!p) return null;
        return {
          ...p,
          image: p.images?.find((img: any) => img.is_primary)?.image_url || p.images?.[0]?.image_url,
          similarity: match.similarity
        };
      }).filter(Boolean);

      return {
        label: obj.object_label,
        products: mapped
      };
    }));

    return { objects: enrichedObjects };
  }
};