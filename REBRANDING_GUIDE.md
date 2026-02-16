# BazaarX Rebranding Guide

This document defines the exact visual style for the BazaarX rebranding, based on the approved "Warm & Vibrant" design mockup.

## 1. Core Visual Theme

The new theme abandons the "Solid Orange Header" approach for a **cleaner, softer aesthetic**.

- **Backgrounds**: Warm, continuous gradients (Cream/Peach) instead of flat grays.
- **Headers**: Transparent/blended with the background.
- **Shadows**: Soft, diffused, warm-tinted shadows.

## 2. Color Palette

### Backgrounds & Gradients

- **App Background (Global)**:
  - _Web/Mobile Body_: `linear-gradient(180deg, #FFF8F0 0%, #FFF5EC 100%)`
  - _Description_: A very subtle warm cream gradient. It is NOT white.
- **Hero Banner / Accent Gradient**:
  - _Gradient_: `linear-gradient(135deg, #FFCBA4 0%, #FF8A00 100%)` (Soft Peach to Vibrant Orange)
  - _Used for_: "Super Deals" banner background, Primary Buttons.

### Primary Colors

- **Brand Primary**: `#FF8A00` (Vibrant Orange - slightly softer than pure neon orange)
- **Accents**: `#FFB800` (Golden Yellow - used for stars/secondary highlights)

### Typography & Text Colors

The text is **not** pure black. It uses deep warm browns to maintain harmony with the orange theme.

- **Headings (Primary)**: `#431407` (Deep Brown)
  - _Usage_: Section titles ("Popular Picks"), Price tags.
- **Subheadings (Secondary)**: `#EA580C` (Dark Orange)
  - _Usage_: "Super Deals" title, "Trending Products" header, "See All" links.
- **Body Text**: `#78350F` (Medium Brown)
  - _Usage_: Product descriptions, secondary info.
- **Input Placeholders**: `#9CA3AF` (Warm Gray).

## 3. UI Components

### 3.1. Header & Navigation

- **Header Style**: **Transparent**. No solid background color.
- **Header Icons**: Outlined, stroke color `#FF8A00` (Orange).
- **Search Bar**:
  - Background: `#FFFFFF` (White).
  - Border: `#FED7AA` (Very light orange) or None with Shadow.
  - Shadow: `0px 4px 15px rgba(255, 138, 0, 0.1)` (Soft orange glow).
  - Shape: Fully rounded (Pill).

### 3.2. Categories & Icons

- **Icon Container**:
  - Shape: Rounded Square (Squircle) - `borderRadius: 16px` (Mobile) / `1.5rem` (Web).
  - Background: `#FFEDD5` (Pale Orange/Peach).
- **Icon Graphic**:
  - Style: **Filled** or **Duotone**.
  - Color: `#EA580C` (Dark Orange) or `#FF8A00`.
  - _Note_: The icons in the mockup are minimal and vector-based.

### 3.3. Product Cards

- **Shape**: `borderRadius: 20px`.
- **Background**: `#FFFFFF` (White).
- **Shadow**: `0px 8px 20px rgba(0, 0, 0, 0.05)` (Very soft elevation).
- **Layout**: Image takes distinct top half; Text details in bottom half.
- **Price Tag**: Bold, `#431407` (Deep Brown).

### 3.4. Buttons (Primary)

- **Background**: Gradient (`linear-gradient(to right, #FF9900, #FF6A00)`).
- **Text**: White, Rounded Sans-serif (`700` weight).
- **Shadow**: `0px 4px 12px rgba(255, 106, 0, 0.4)`.
- **Shape**: Pill (`borderRadius: 9999px`).

## 4. Implementation Rules

### Mobile (`app/`)

1.  **Status Bar**: Dark content (since background is light).
2.  **SafeArea**: Apply `backgroundColor: #FFF8F0` to matches the gradient start.
3.  **Icons**: Use `Lucide-React-Native` with `color="#FF8A00"` for header icons.

### Web (`tailwind.config.js`)

1.  **Extend Colors**:
    ```js
    colors: {
        brand: {
            bg: '#FFF8F0',
            primary: '#FF8A00',
            dark: '#EA580C',
            text: '#431407',
            muted: '#78350F',
            surface: '#FFEDD5' // Check usage
        }
    }
    ```
2.  **Font**: Ensure `Poppins` or `Nunito` is loaded for that rounded, friendly look.
