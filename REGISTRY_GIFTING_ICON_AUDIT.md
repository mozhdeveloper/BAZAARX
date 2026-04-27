# 🎁 Registry & Gifting Icon Audit Report

**Date**: April 27, 2026  
**Scope**: Both Web and Mobile implementations  
**Status**: Audit Complete - Ready for Implementation

---

## Executive Summary

The Registry & Gifting feature has **inconsistent icon usage** and **inconsistent naming** across the web and mobile platforms. The primary issues are:

1. **Web: Add to Registry button uses Heart icon ❌** (should use Gift icon ✓)
2. **Web Header: Title says "Registry"** (should say "Registry & Gifting")
3. **Mobile: No Registry/Gifting in bottom navigation** (inaccessible from main nav)
4. **Icon mismatch between header and product detail page**

---

## 📊 Detailed Findings

### WEB PLATFORM

#### 1️⃣ Header Navigation (Header.tsx)
```
Location: web/src/components/Header.tsx, ~Line 280
Status: ✓ CORRECT ICON, ⚠️ WRONG LABEL
```

| Property | Current | Expected | Issue |
|----------|---------|----------|-------|
| **Icon** | Gift (lucide-react) | Gift | ✅ Correct |
| **Title** | "Registry" | "Registry & Gifting" | ❌ Needs update |
| **Route** | `/registry` | Same | ✅ Correct |
| **Color** | Primary brand color | Same | ✅ Correct |

**Screenshot Reference**: The Gift icon in the top navigation bar is highlighted in red in the provided image.

---

#### 2️⃣ Product Detail Page "Add to Registry" Button (ProductDetailPage.tsx)
```
Location: web/src/pages/ProductDetailPage.tsx, Lines 1127-1134
Status: ❌ WRONG ICON, ✓ CORRECT BEHAVIOR
```

| Property | Current | Expected | Issue |
|----------|---------|----------|-------|
| **Icon** | Heart (❤️) | Gift (🎁) | ❌ **CRITICAL** - Inconsistent with header & modals |
| **Title** | "Add to Registry" | Same | ✅ Correct |
| **State (In Registry)** | Heart (filled) | Gift (filled) | ❌ Should be Gift |
| **Location** | Top action buttons | Same | ✅ Correct |
| **Functionality** | Works correctly | Same | ✅ Correct |

**Code Snippet:**
```tsx
<Heart
    className={cn(
        "w-8 h-8 transition-colors duration-300",
        isInRegistry ? "fill-[var(--brand-primary)] text-[var(--brand-primary)]" : "text-[var(--brand-primary)]"
    )}
/>
```

**Should be:**
```tsx
<Gift
    className={cn(
        "w-8 h-8 transition-colors duration-300",
        isInRegistry ? "fill-[var(--brand-primary)] text-[var(--brand-primary)]" : "text-[var(--brand-primary)]"
    )}
/>
```

---

#### 3️⃣ Registry & Gifting Page (RegistryAndGiftingPage.tsx)
```
Location: web/src/pages/RegistryAndGiftingPage.tsx
Status: ✓ CORRECT OVERALL
```

| Property | Current | Expected | Issue |
|----------|---------|----------|-------|
| **Page Title** | "Registry & Gifting" | Same | ✅ Correct |
| **Page Route** | `/registry` | Same | ✅ Correct |
| **Modals Icon** | Gift | Same | ✅ Correct |
| **Category Filters** | Displayed as buttons | ✓ Could show as tabs | ℹ️ Design choice |

**Category Filters Present:**
- All Registries
- Wedding
- Baby Shower
- Birthday
- Graduation
- Housewarming
- Christmas
- Other

---

#### 4️⃣ Modal Components
```
Locations:
- CreateRegistryModal.tsx
- RegistryDetailModal.tsx
- EditRegistryItemModal.tsx
```

| Component | Icon | Status |
|-----------|------|--------|
| CreateRegistryModal | Gift ✓ | ✅ Correct |
| RegistryDetailModal | Gift ✓ | ✅ Correct |
| EditRegistryItemModal | Gift ✓ | ✅ Correct |

---

### MOBILE PLATFORM

#### 1️⃣ Bottom Navigation (BuyerBottomNav.tsx)
```
Location: mobile-app/src/components/BuyerBottomNav.tsx
Status: ❌ MISSING REGISTRY/GIFTING
```

| Navigation Item | Current Status |
|-----------------|---|
| Home | ✅ Present |
| Shop | ✅ Present |
| Cart | ✅ Present |
| Messages | ✅ Present |
| Profile | ✅ Present |
| **Registry/Gifting** | ❌ **MISSING** |

**Issue**: Users cannot directly access Registry/Gifting from the main bottom navigation. It's only accessible through the Profile menu via Wishlist.

---

#### 2️⃣ Wishlist Screen (WishlistScreen.tsx)
```
Location: mobile-app/app/WishlistScreen.tsx
Status: ⚠️ PARTIAL - Uses Wishlist terminology instead of Registry
```

| Property | Current | Note |
|----------|---------|------|
| **Icon** | FolderHeart | Acceptable for wishlist, but different from Gift |
| **Occasions** | 7 categories (Wedding, Baby Shower, Birthday, etc.) | ✅ Matches web |
| **Functionality** | Create, manage, delete wishlists | ✅ Works |
| **Terminology** | "Wishlist" vs "Registry" | ⚠️ Inconsistent naming |

---

#### 3️⃣ Product Detail Screen (ProductDetailScreen.tsx)
```
Location: mobile-app/app/ProductDetailScreen.tsx
Status: ⚠️ PARTIAL - Uses FolderHeart icon
```

| Feature | Icon | Status |
|---------|------|--------|
| Add to Wishlist Modal | FolderHeart | ⚠️ Inconsistent with web Gift icon |
| Modal Title | "Add to Wishlist" | ⚠️ Should align with "Registry & Gifting" |
| Occasions Available | 7 categories | ✅ Matches web |

---

#### 4️⃣ Shared Wishlist (SharedWishlistScreen.tsx)
```
Location: mobile-app/app/SharedWishlistScreen.tsx
Status: ✅ MOSTLY CORRECT
```

| Property | Current | Status |
|----------|---------|--------|
| **"Buy as Gift" Button Icon** | Gift ✓ | ✅ Correct |
| **Gift Icon Size** | 24px (header), 16px (button) | ✅ Correct |
| **Functionality** | Allows buying from shared registry | ✅ Correct |
| **Address Handling** | Shows registry location info | ✅ Correct |

---

## 🎯 Icon Consistency Mapping

### Current State
```
WEB:
├── Header.tsx ...................... Gift ✓
├── ProductDetailPage.tsx ........... Heart ❌
├── RegistryAndGiftingPage.tsx ...... Gift ✓
└── Modals .......................... Gift ✓

MOBILE:
├── BuyerBottomNav.tsx ............. ❌ Missing
├── WishlistScreen.tsx ............. FolderHeart ⚠️
├── ProductDetailScreen.tsx ........ FolderHeart ⚠️
└── SharedWishlistScreen.tsx ....... Gift ✓
```

### Expected State
```
WEB:
├── Header.tsx ...................... Gift ✓
├── ProductDetailPage.tsx ........... Gift ✓ (CHANGE NEEDED)
├── RegistryAndGiftingPage.tsx ...... Gift ✓
└── Modals .......................... Gift ✓

MOBILE:
├── BuyerBottomNav.tsx ............. Gift ✓ (CHANGE NEEDED)
├── WishlistScreen.tsx ............. Gift ✓ (CHANGE NEEDED)
├── ProductDetailScreen.tsx ........ Gift ✓ (CHANGE NEEDED)
└── SharedWishlistScreen.tsx ....... Gift ✓
```

---

## 🔄 Label/Tab Consistency

### Current Naming
| Platform | Navigation | Product Detail | Page Title | Issue |
|----------|-----------|---|---|---|
| **Web** | "Registry" | "Add to Registry" | "Registry & Gifting" | ⚠️ Inconsistent |
| **Mobile** | None (Missing) | "Add to Wishlist" | N/A | ❌ Missing + Different term |

### Expected Naming
| Platform | Navigation | Product Detail | Page Title |
|----------|-----------|---|---|
| **Web** | "Registry & Gifting" | "Add to Registry" | "Registry & Gifting" |
| **Mobile** | "Registry" | "Add to Registry" | "Registry & Gifting" |

---

## 📋 Files Requiring Changes

### WEB FILES

1. **[web/src/pages/ProductDetailPage.tsx](web/src/pages/ProductDetailPage.tsx)**
   - **Line 1127-1134**: Change Heart icon to Gift icon
   - **Impact**: Add to Registry button will match the header icon
   - **Scope**: Icon import and usage
   - **Change Type**: Icon substitution

2. **[web/src/components/Header.tsx](web/src/components/Header.tsx)**
   - **Line ~280**: Update title attribute from "Registry" to "Registry & Gifting"
   - **Impact**: Better UX clarity in tooltip
   - **Scope**: Text content only
   - **Change Type**: Label update

### MOBILE FILES

1. **[mobile-app/src/components/BuyerBottomNav.tsx](mobile-app/src/components/BuyerBottomNav.tsx)**
   - **Add new tab**: Registry/Gifting with Gift icon
   - **Impact**: Makes Registry accessible from main navigation
   - **Scope**: Navigation structure
   - **Change Type**: Add new navigation item

2. **[mobile-app/app/WishlistScreen.tsx](mobile-app/app/WishlistScreen.tsx)**
   - **Line 6**: Change FolderHeart to Gift icon (if going pure registry naming)
   - **Scope**: Optional - depends on terminology decision
   - **Change Type**: Icon substitution

3. **[mobile-app/app/ProductDetailScreen.tsx](mobile-app/app/ProductDetailScreen.tsx)**
   - **Review**: AddToWishlistModal usage
   - **Scope**: Check if modal should be renamed to AddToRegistryModal
   - **Change Type**: Potentially rename component or update icon

---

## 🎨 Visual Summary

### Web Platform Icon Status
```
Header Navigation:
┌─────────────────────────────┐
│ [🎁 Registry]   ← Current   │ ✅ Gift Icon
└─────────────────────────────┘

Product Detail (Add to Registry):
┌─────────────────────────────┐
│ [❤️  Add to Registry]        │ ❌ Heart Icon (WRONG)
│ (Should be 🎁)              │
└─────────────────────────────┘

Comparison:
┌─────────┐    ┌─────────┐
│ Header: 🎁  ≠ │ Product: ❤️ │ MISMATCH
└─────────┘    └─────────┘
```

### Mobile Platform Navigation Status
```
Bottom Navigation (Current):
┌────────────────────────────────┐
│ [🏠] [🏪] [🛒] [💬] [👤]      │
│ Home Shop Cart Messages Profile │
│                          ❌ No Registry
└────────────────────────────────┘

Expected:
┌────────────────────────────────┐
│ [🏠] [🏪] [🛒] [💬] [👤] [🎁] │
│ Home Shop Cart Messages Profile Registry
└────────────────────────────────┘
```

---

## 💡 Recommendations

### Priority 1 - CRITICAL (Consistency)
1. ✏️ Change ProductDetailPage Heart icon → Gift icon
2. 📝 Update Header tooltip: "Registry" → "Registry & Gifting"

### Priority 2 - IMPORTANT (Mobile UX)
3. ➕ Add Registry/Gifting tab to mobile bottom navigation
4. 🎨 Ensure all Gift icons match in style and size

### Priority 3 - NICE TO HAVE (Terminology)
5. Consider renaming "Wishlist" to "Registry" in mobile for consistency
6. Update related documentation

---

## ✅ Testing Checklist (After Changes)

- [ ] Web: Heart icon changed to Gift in ProductDetailPage
- [ ] Web: Tooltip shows "Registry & Gifting" in header
- [ ] Web: Icon state toggles correctly (filled/outline)
- [ ] Mobile: Gift icon appears in bottom navigation
- [ ] Mobile: Clicking Registry/Gifting navigates correctly
- [ ] Mobile: Icon styling matches other navigation items
- [ ] Mobile: Add to Registry modal uses consistent terminology
- [ ] All platforms: Icons render at correct sizes
- [ ] All platforms: Icons have correct color states (active/inactive)

---

## 📸 Image Analysis (Provided Screenshot)

In the provided BazaarX homepage screenshot, the highlighted red box indicates the Gift icon location in the top-right navigation bar. This confirms:
- ✅ The header uses the correct Gift icon
- ✅ The icon is visible and accessible
- ❌ But Product Detail page uses Heart instead
- ❌ Mobile doesn't have this in bottom nav

---

## 🔗 Related Documentation

- **Registry Implementation**: [documentation/Registry_and_Gifting/](documentation/Registry_and_Gifting/)
- **Mobile Navigation**: [mobile-app/src/components/BuyerBottomNav.tsx](mobile-app/src/components/BuyerBottomNav.tsx)
- **Icon Library**: lucide-react, lucide-react-native

---

**Prepared by**: Code Audit System  
**Last Updated**: April 27, 2026  
**Status**: Ready for Development
