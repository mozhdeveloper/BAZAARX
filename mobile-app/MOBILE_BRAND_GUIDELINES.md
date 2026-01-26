# BazaarX Mobile Brand Guidelines

This document serves as the single source of truth for the visual design of the BazaarX mobile application.

## 1. Color Palette

The app uses a vibrant orange primary color to convey energy and shopping excitement, supported by a neutral gray scale.

### Primary Colors

| Name                | Hex Code  | Usage                                                    |
| :------------------ | :-------- | :------------------------------------------------------- |
| **Primary (Brand)** | `#FF6A00` | Main headers, primary buttons, active states, key icons. |
| **Primary Hover**   | `#E65F00` | Pressed states for buttons.                              |
| **Primary Active**  | `#CC5500` | Deep interaction states.                                 |

### Neutral Colors

| Name               | Hex Code  | Usage                                |
| :----------------- | :-------- | :----------------------------------- |
| **Background**     | `#F9FAFB` | Main screen background (Gray 50).    |
| **Surface**        | `#FFFFFF` | Cards, modals, bottom sheets.        |
| **Text Primary**   | `#111827` | Main headings, body text (Gray 900). |
| **Text Secondary** | `#6B7280` | Subtitles, captions (Gray 500).      |
| **Border**         | `#E5E7EB` | Dividers, card borders (Gray 200).   |

### Semantic Colors

- **Success**: `#10B981` (Green) - Delivered orders, success toasts.
- **Error**: `#EF4444` (Red) - Validation errors, alerts, active notifications (bells).
- **Warning**: `#F59E0B` (Yellow) - Rating stars.
- **Info**: `#3B82F6` (Blue) - Order shipped status.

---

## 2. Header Styles

BazaarX features a signature "branded header" that is consistent across main screens (Home, Cart, Profile).

### Standard Branded Header

- **Background**: Solid Primary Color (`#FF6A00`).
- **Shape**: Rounded bottom corners (`borderBottomLeftRadius: 20`, `borderBottomRightRadius: 20`).
- **Content Layout**:
  - **Top Row**:
    - Left: Avatar (Home) or Back Button (Inner Screens).
    - Center: Screen Title (White, FontWeight 700/800).
    - Right: Action Icons (Search, Bell, Clear Cart).
  - **Padding**: Active `paddingTop` based on device Safe Area Insets + 10px buffer.

```tsx
// Example Header Structure
<View
  style={{
    paddingTop: insets.top + 10,
    backgroundColor: "#FF6A00",
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  }}
>
  {/* Content */}
</View>
```

### Inner Screen Headers (White)

For secondary screens (e.g., Order Details, Notifications), a clean white header is sometimes used.

- **Background**: White.
- **Title Color**: Gray 900 (`#111827`).
- **Back Button**: Dark Gray.

---

## 3. Typography

The app relies on system fonts (San Francisco on iOS, Roboto on Android) with specific weights to create hierarchy.

- **Headings**: FontWeight `800` or `700`. Used for "My Cart", "Products", and Promo banners.
- **Subheadings**: FontWeight `600`. Used for tab labels and card titles.
- **Body**: FontWeight `400` (Regular). Standard descriptions.
- **Text Sizes**:
  - **XL**: 24px (Modal Titles).
  - **L**: 18px (Section Headers).
  - **M**: 16px (Standard Titles).
  - **S**: 14px (Secondary Text).
  - **XS**: 11-12px (Badges, Timers).

---

## 4. UI Components

### Product Cards

- **Background**: White.
- **Border Radius**: 16px or 18px.
- **Shadows**: Soft elevation.
  - `shadowColor: '#000'`, `shadowOpacity: 0.1`, `elevation: 4`.
- **Badges**: Small rounded tags for "Free Ship" or Discounts (`backgroundColor`: Primary).

### Buttons

- **Primary Button**:
  - Background: `#FF6A00`.
  - Text: White, Bold (`700`).
  - Radius: 25px (Pill shape) or 12px (Rounded Rect).
- **Secondary/Outline Button**:
  - Border: 1px solid Primary or Gray 300.
  - Background: Transparent.

### Modals

- **Overlay**: `rgba(0,0,0,0.5)` (Dark dim).
- **Content**: White background, top-rounded corners (`24px`).
- **Guest Modal**: Uses absolute positioning with high z-index, centered content.

---

## 5. Iconography

- **Library**: `lucide-react-native`.
- **Stroke Width**: Standard is `2` or `2.5` for thicker headers.
- **Color**: White on branded headers, Gray 900 on white backgrounds.
