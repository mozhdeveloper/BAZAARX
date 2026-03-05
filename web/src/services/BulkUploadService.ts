import { supabase } from "@/lib/supabase";
import { productService } from "./productService";

export class BulkUploadService {
    private static instance: BulkUploadService;
    public static getInstance(): BulkUploadService {
        if (!BulkUploadService.instance) BulkUploadService.instance = new BulkUploadService();
        return BulkUploadService.instance;
    }

    async processBulkUpload(rows: any[], sellerId: string) {
        // 1. Group rows by Parent SKU
        const groups = new Map<string, any[]>();
        rows.forEach(row => {
            const sku = row["Parent SKU"];
            if (!groups.has(sku)) groups.set(sku, []);
            groups.get(sku)?.push(row);
        });

        const results = { success: 0, failed: 0 };

        for (const [parentSku, variantRows] of groups.entries()) {
            try {
                const firstRow = variantRows[0];
                
                // 2. Resolve Category ID
                const categoryId = await productService.getOrCreateCategoryByName(firstRow["Category"]);
                if (!categoryId) throw new Error(`Category ${firstRow["Category"]} not found`);

                // 3. Calculate Product Display Price (lowest variant price)
                const prices = variantRows.map(r => parseFloat(r["Variant Price"])).filter(p => !isNaN(p));
                const minPrice = Math.min(...prices);

                // 4. Insert Parent Product
                const { data: product, error: pError } = await supabase
                    .from("products")
                    .insert({
                        name: firstRow["Product Name"],
                        description: firstRow["Description"],
                        category_id: categoryId,
                        price: minPrice,
                        seller_id: sellerId,
                        variant_label_1: firstRow["Attribute 1"] || null,
                        variant_label_2: firstRow["Attribute 2"] || null,
                        approval_status: "pending",
                        weight: parseFloat(firstRow["Weight"]) || 0.1
                    })
                    .select()
                    .single();

                if (pError || !product) throw pError;

                // 5. Insert Variants
                const variantInserts = variantRows.map(v => ({
                    product_id: product.id,
                    sku: v["Variant SKU"],
                    variant_name: [v["Option 1 Value"], v["Option 2 Value"]].filter(Boolean).join(" - "),
                    option_1_value: v["Option 1 Value"] || null,
                    option_2_value: v["Option 2 Value"] || null,
                    price: parseFloat(v["Variant Price"]),
                    stock: parseInt(v["Variant Stock"]),
                    thumbnail_url: v["Variant Image (Unique)"] || null
                }));

                const { error: vError } = await supabase.from("product_variants").insert(variantInserts);
                if (vError) throw vError;

                // 6. Insert Gallery Images (Split by comma or pipe)
                const galleryString = firstRow["Gallery Images (Product Level)"] || "";
                const imageUrls = galleryString.split(/[|,]/).map((url: string) => url.trim()).filter(Boolean);
                
                if (imageUrls.length > 0) {
                    const imageInserts = imageUrls.map((url: string, idx: number) => ({
                        product_id: product.id,
                        image_url: url,
                        sort_order: idx,
                        is_primary: idx === 0
                    }));
                    await supabase.from("product_images").insert(imageInserts);
                }

                results.success++;
            } catch (err) {
                console.error(`Failed to upload product ${parentSku}:`, err);
                results.failed++;
            }
        }
        return results;
    }
}

export const bulkUploadService = BulkUploadService.getInstance();