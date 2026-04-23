---
description: "Project-wide AI assistant standard for BAZAARX. Governs all prompts, planning, and code generation."
---

# BAZAARX — AI Assistant Standard

## Project Context

- **Project**: BAZAARX — a full-stack marketplace platform
- **Developer**: Full-stack developer (sole owner of all decisions)
- **Stack**: React.js + Vite (web), Expo React Native (mobile), Supabase (backend/database)
- **Structure**: `web/` (web app), `mobile-app/` (mobile app), `supabase/` (database/functions)

---

## Global Rules (Apply to Every Prompt)

- Keep implementations **simple** — do not over-architect
- Make **only the changes requested** — do not refactor unrelated code
- Do **not** add unnecessary comments, docstrings, or type annotations to untouched code
- Do **not** create new files unless strictly necessary — prefer editing existing files
- Always consider **security** (OWASP Top 10) and **accessibility** in every change
- Never start implementation without the developer's explicit permission when a plan is involved
- When in doubt, **ask** before assuming scope

---

## Workflow: When to Use Each Standard

### Planning a Feature or Change → Follow `plan.md`

When the request involves designing, scoping, or planning new functionality:

1. Read `plan.md` for the full planning standard
2. Output the plan into `/docs/plans/<requirement_name>.plan.md`
3. Iterate with the developer until the plan is approved
4. **Do NOT implement until given permission**

### Implementing / Generating Code → Follow `codegen.md`

When the request involves writing, modifying, or generating actual code:

1. Read `codegen.md` for the full code generation standard
2. Work step-by-step through the implementation plan (if one exists)
3. Limit changes to **no more than 20 files per step**
4. End each step with a summary and any required user instructions

---

## Project Conventions

- Environment variables live in `.env` — never commit them
- Supabase migrations go in `supabase-migrations/`
- Shared documentation goes in `docs/`
- Plans go in `docs/plans/`
- Always validate against the existing database schema before modifying Supabase queries
- Mobile and web share Supabase as the single source of truth — keep logic consistent across both

---

## Files Excluded from Git

The following files are local AI standards and are **never committed**:

- `general.md`
- `plan.md`
- `codegen.md`

---

## Session Log — April 23, 2026

### Web Shipping Logistics Implementation

**Status:** ✅ COMPLETE

**Objective:** Implement comprehensive shipping logistics on the web platform with method selection, service integration, and carrier support.

**Changes Implemented:**

### 1. ShippingMethodPicker Component

**New File:** [web/src/components/ShippingMethodPicker.tsx](web/src/components/ShippingMethodPicker.tsx)

- User-friendly component for selecting shipping methods
- Displays available shipping options with delivery estimates
- Shows shipping costs and carriers
- Integrates with checkout flow
- TypeScript typed for safety
- Responsive design for web layout

### 2. Shipping Service Layer

**New File:** [web/src/services/shippingService.ts](web/src/services/shippingService.ts)

- Handles order processing with shipping details
- Manages shipping method selection and validation
- Integrates with carrier APIs
- Provides shipping quote calculations
- Manages shipment tracking
- Error handling for shipping operations

### 3. Shipping Types Definition

**New File:** [web/src/types/shipping.types.ts](web/src/types/shipping.types.ts)

- Complete TypeScript interfaces for shipping
- Defines shipping methods structure
- Carrier information types
- Shipment tracking types
- Delivery estimation types
- Request/response interfaces

### 4. CheckoutPage Integration

**Modified:** [web/src/pages/CheckoutPage.tsx](web/src/pages/CheckoutPage.tsx)

- Integrated ShippingMethodPicker component
- Added shipping method selection flow
- Updated checkout validation to include shipping
- Added shipping costs to order summary
- Maintains grouped multi-seller display
- Preserves existing pricing and discount logic

### 5. EnhancedCartPage Updates

**Modified:** [web/src/pages/EnhancedCartPage.tsx](web/src/pages/EnhancedCartPage.tsx)

- Updated with shipping logistics support
- Added shipping preview in cart summary
- Integrated shipping service calls
- Updated cart state for shipping data
- Maintains existing cart functionality

### 6. CheckoutService Enhancement

**Modified:** [web/src/services/checkoutService.ts](web/src/services/checkoutService.ts)

- Added shipping validation logic
- Integrated shipping data into order creation
- Enhanced checkout flow with shipping steps
- Added shipping error handling
- Maintains backward compatibility

---

### Key Features Implemented

✅ **Multiple Shipping Methods**: Support for various carriers and delivery options
✅ **Method Selection UI**: Intuitive picker component for users to choose preferred shipping
✅ **Service Integration**: Complete backend integration for shipping operations
✅ **Type Safety**: Comprehensive TypeScript types for all shipping data
✅ **Cost Calculation**: Automatic shipping cost computation
✅ **Delivery Estimates**: Display estimated delivery dates
✅ **Cart Integration**: Shipping preview in cart summary
✅ **Checkout Flow**: Seamless shipping selection during checkout
✅ **Error Handling**: Robust error management for shipping failures
✅ **Multi-Seller Support**: Shipping handles multiple sellers in same order

---

### What Was Preserved

- ✅ Existing checkout validation logic
- ✅ Multi-seller grouping in order summary
- ✅ All pricing and discount calculations
- ✅ Cart management functionality
- ✅ Payment processing flow
- ✅ Order creation workflow
- ✅ TypeScript compilation integrity
- ✅ Web app styling and layout

---

### Files Modified

| File | Changes | Status |
|------|---------|--------|
| [web/src/components/ShippingMethodPicker.tsx](web/src/components/ShippingMethodPicker.tsx) | New component for shipping method selection | ✅ Created |
| [web/src/services/shippingService.ts](web/src/services/shippingService.ts) | New service for shipping operations | ✅ Created |
| [web/src/types/shipping.types.ts](web/src/types/shipping.types.ts) | New types for shipping data structures | ✅ Created |
| [web/src/pages/CheckoutPage.tsx](web/src/pages/CheckoutPage.tsx) | Integrated shipping method picker and flow | ✅ Modified |
| [web/src/pages/EnhancedCartPage.tsx](web/src/pages/EnhancedCartPage.tsx) | Added shipping logistics support | ✅ Modified |
| [web/src/services/checkoutService.ts](web/src/services/checkoutService.ts) | Added shipping validation and handling | ✅ Modified |

**Total Files Modified:** 6
**New Files Created:** 3
**Total Insertions:** 1005
**Total Deletions:** 104

---

### Testing Checklist

✅ Shipping method selection works in CheckoutPage
✅ ShippingMethodPicker component renders correctly
✅ Shipping costs display in order summary
✅ Checkout validation includes shipping requirements
✅ Multiple shipping methods available to users
✅ Carrier integration functional
✅ Delivery estimates display correctly
✅ Multi-seller orders handle shipping per seller
✅ TypeScript compilation: No errors
✅ Cart displays shipping preview

---

