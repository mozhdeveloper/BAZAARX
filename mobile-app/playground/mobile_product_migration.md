## Mobile Seller Products: Normalized Categories + Variants Parity

### Summary
Implement full parity for category/variant handling on mobile by updating both active seller flows and required data-layer support:
1. Edit flow in `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/mobile-app/app/seller/(tabs)/products.tsx`.
2. Add flow in `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/mobile-app/src/components/seller/AddProductScreen.tsx`.
3. Supporting normalized-schema logic in `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/mobile-app/src/stores/sellerStore.ts` and `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/mobile-app/src/services/productService.ts`.

You selected:
- Scope: full parity.
- Add-flow target: both screens.
- Cleanup preference: keep stale add logic in `products.tsx`, but mark deprecated.

### Public API / Interface Changes
1. Extend `SellerProduct` in `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/mobile-app/src/stores/sellerStore.ts` with normalized variant fields:
- `variantLabel1Values?: string[]`
- `variantLabel2Values?: string[]`
- `variantLabel1?: string`
- `variantLabel2?: string`
- `variants?: Array<{ id: string; name?: string; variantLabel1Value?: string; variantLabel2Value?: string; price: number; stock: number; image?: string; sku?: string }>`
- Keep legacy `sizes` and `colors` for backward compatibility.

2. Add service methods in `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/mobile-app/src/services/productService.ts`:
- `getCategories(): Promise<Category[]>`
- `getOrCreateCategoryByName(name: string): Promise<string | null>`

### Implementation Plan

1. Update category resolution and inserts in `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/mobile-app/src/stores/sellerStore.ts`.
- Change `buildProductInsert` to accept `categoryId` and set `category_id`.
- In `addProduct`, resolve `categoryId` via `productService.getOrCreateCategoryByName(product.category)` before insert; fail with explicit error if unresolved.
- Keep variant label columns in product insert (`variant_label_1`, `variant_label_2`) mapped from camelCase first (`variantLabel1/2`) with snake_case fallback for compatibility.
- In `updateProduct`, if `updates.category` is present and Supabase is enabled, resolve category and send `category_id` update.
- Preserve existing disabled/approval update mapping.

2. Normalize DB-to-app variant/category mapping in `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/mobile-app/src/stores/sellerStore.ts`.
- Update `mapDbProductToSellerProduct` to include `variants`, `variantLabel1Values`, `variantLabel2Values`, `variantLabel1`, `variantLabel2`.
- Map each DB variant using `option_1_value/option_2_value` first, with fallback to legacy `size/color`.
- Keep legacy `sizes/colors` derived from mapped variants for existing UI surfaces.

3. Align variant creation payload in `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/mobile-app/src/stores/sellerStore.ts`.
- In `addProduct`, support incoming variants shaped as either:
  - normalized (`variantLabel1Value`, `variantLabel2Value`), or
  - legacy manager (`option1`, `option2`, `size`, `color`).
- Persist with normalized contract:
  - `option_1_value` = first attribute value
  - `option_2_value` = second attribute value
  - duplicate into `size`/`color` fields for compatibility
  - stock/price numeric coercion and safe defaults
- Keep default variant creation when no variants are provided.

4. Add categories loading to add flow in `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/mobile-app/src/components/seller/AddProductScreen.tsx`.
- Replace hardcoded categories-only source with DB categories fetched on mount.
- Keep fallback list if fetch fails or returns empty, matching web behavior.
- Keep UI chips but source from fetched category names.

5. Align add-flow variant payload in `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/mobile-app/src/components/seller/AddProductScreen.tsx`.
- Build `newProduct` using normalized fields instead of ad hoc snake-case casts:
  - `variantLabel1`, `variantLabel2` (fixed defaults: `Variations`, `Colors`)
  - `variantLabel1Values`, `variantLabel2Values` from chips
  - `variants` mapped to `{ variantLabel1Value, variantLabel2Value, stock, price, sku, image }`
- Maintain existing behavior: total stock is sum of variant stock when variants exist, else manual stock.

6. Implement web-style edit variant handling in `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/mobile-app/app/seller/(tabs)/products.tsx`.
- Add `categories` state populated from `productService.getCategories()` with fallback defaults.
- Add `editVariants` state for per-variant price/stock editing.
- In `handleEditProduct`, prefill `editVariants` from `product.variants` when available; fallback to product details fetch if needed.
- Update edit modal:
  - If variants exist, show variant rows with editable `price` and `stock` and computed total stock.
  - If no variants, keep simple stock input.
  - Keep category selection but source chips from loaded categories.
- Update save logic:
  - call `productService.updateVariants([{id, price, stock}, ...])` when variants are present
  - call `updateProduct` for base fields
  - set product stock to sum of variant stocks when variants exist
  - refetch seller products after save for consistency

7. Keep legacy add-modal code in `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/mobile-app/app/seller/(tabs)/products.tsx` but mark deprecated.
- Add clear `@deprecated` comments on unused add-modal state/handlers indicating active add flow is `AddProductScreen`.
- Do not remove this code in this pass (per your choice).

### Test Cases and Validation

1. Static checks:
- Run `npm run type-check` in `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/mobile-app`.
- Run `npm run lint` in `/Users/mackenziecerenio/Developer/React-Native/BAZAARX/mobile-app`.

2. Add flow manual scenarios:
- Add product with existing DB category and variants; verify product is created, category displays correctly after refresh, and variants persist with correct stock/price.
- Add product when category list falls back to defaults; verify category resolution creates/uses a valid `category_id`.

3. Edit flow manual scenarios:
- Edit product with variants and change per-variant price/stock; verify totals update and persist after refetch.
- Edit product without variants and update base stock; verify stock persists.
- Edit category and verify list reflects updated category label after refetch.

4. Regression scenarios:
- Toggle active/inactive status still works.
- Delete still works.
- Bulk upload remains functional and unaffected by new category/variant logic.

### Assumptions and Defaults
1. Variant label name editing (custom attribute names) is out of scope for mobile UI in this pass; defaults are fixed to `Variations`/`Colors`.
2. Existing legacy products remain readable through backward-compatible mapping (`size/color` and option-value fallbacks).
3. Deprecated add-modal logic in `products.tsx` is intentionally retained and annotated, not removed.
