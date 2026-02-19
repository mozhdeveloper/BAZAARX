# BazaarrX Rebranding Guide: Pastel Gold & Soft UI

## 1. Core Theme Identity

- **Name:** Pastel Gold / Warm Radiance
- **Concept:** A warm, inviting, and premium aesthetic using soft gold gradients, warm oranges, and rich browns. The interface should feel "glowing" rather than flat.
- **Key Characteristics:**
  - **Soft Gradients:** No flat backgrounds; gentle flows from creamy yellow to warm gold.
  - **Gold Aura:** Elements should have golden shadows/glows, not black/gray shadows.
  - **Warm Typography:** Text should be warm brown or golden orange, never pure black.

---

## 2. Color Palette

### Primary Backgrounds

- **Main Screen Gradient:**
  - Start: `#FFF6E5` (Light Creamy Yellow)
  - Middle: `#FFE0A3` (Warm Pastel Gold)
  - End: `#FFD89A` (Soft Beige-Gold)
- **Flash Sale Band (Separation Gradient):**
  - Flow: `#FFF6E5` -> `#FFE0A3` -> `#FFF6E5` (Light Cream -> Gold -> Light Cream) to create a distinct "gold band".

### Interaction & Accents

- **Primary Action (Buttons/Active State):** `#FB8C00` (Warm Orange) - _Replaces sharp Yellow/Amber_.
- **Secondary Accent (Icons/Highlights):** `#F59E0B` (Bright Golden Amber).
- **Tertiary Accent (Inactive/Subtle):** `#FFE0B2` (Pale Gold).

### Typography Colors

- **Headlines (Dark):** `#7C2D12` (Rich Warm Brown).
- **Headlines (Accent):** `#EA580C` / `#D97706` (Vibrant Dark Orange/Golden Orange).
- **Body Text:** `#78350F` (Soft Warm Brown).
- **Subtext/Meta:** `#A8A29E` (Warm Gray).
- **Price (Standard):** `#EA580C` (Vibrant Orange).
- **Price (Flash Sale):** `#DC2626` (Urgent Red).

---

## 3. Component Styles

### A. Product Cards (Standard)

- **Background:** `#FFFBF0` (Warm Ivory) - _Not pure white_.
- **Image Placeholder:** `#FFF6E5` (Pale Cream).
- **Border:** None (Clean floating look).
- **Radius:** `12px` (Tighter look).
- **Shadow:** **Golden Glow**
  - Color: `#F59E0B`
  - Opacity: `0.2`
  - Radius: `12`
  - Elevation: `6`
- **Typography:**
  - Title: `#7C2D12` (Rich Warm Brown)
  - Price: `#EA580C` (Vibrant Orange)

### B. Product Cards (Flash Sale Variant)

- **Distinction:** Emphasizes Urgency.
- **Price & Badge:** `#DC2626` (Bright Red).
- **Progress Bar:**
  - Track: `#FEE2E2` (Pale Red)
  - Fill: `#EF4444` (Red)
- **Icon:** Includes **Flame Icon** (`#DC2626`).
- **Border:** None (Removed to maintain clean look).

### C. Carousel & Promotions ("Gold Aura")

- **Card Style:**
  - Border: `#FDE68A` (Light Gold)
  - Shadow: `#FFB703` (Strong Gold Glow)
  - Offset: `0px 10px` (Dropdown Effect).
  - Opacity: `0.4`.
- **Navigation:** Dynamic routing to `Shop` or `FlashSale` screens.
- **Buttons:** `#FB8C00` (Warm Orange) with soft shadow.

### D. Category Icons ("Glowing Icons")

- **Container:**
  - Fill: `#FFF8E1` (Amber 50 - Warm Base).
  - Border: `#FDE68A` (Amber 200 - Gold Rim).
  - Shadow: `#F59E0B` (Amber 500) - Strong Glow.
- **Icon:** `#F59E0B` (Bright Amber).

---

## 4. UI Layout Principles

- **Floating Layers:** Sections (like Flash Sale) should use gradients or transparency to "float" on the background rather than being boxed in white containers.
- **Spacing:**
  - Headers should have comfortable top padding (`paddingTop: 20`) to breathe.
  - Lists should generally be edge-to-edge or wide-padded (`marginHorizontal: 20`).
- **Roundedness:**
  - Cards: `borderRadius: 20-24`
  - Buttons: `borderRadius: 20` (Pill shape)

---

## 5. Iconography

- **Set:** `MaterialCommunityIcons` / `Lucide React Native`.
- **Style:** Filled/Solid for primary actions, thicker strokes for UI elements.
- **Color:** Consistently **Amber/Gold** (`#F59E0B`) or **Warm Brown** (`#92400E`).
