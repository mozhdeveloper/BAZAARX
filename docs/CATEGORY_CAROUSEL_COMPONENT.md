# CategoryCarousel Component Documentation

## Overview

The `CategoryCarousel` component is a modern, visual category selection interface featuring circular category cards with images in a horizontal scrollable carousel. This component replaces traditional text-based category navigation with an engaging, image-driven experience that aligns with contemporary e-commerce design patterns.

## Features

- ✨ **Visual Design**: Circular category cards with high-quality images
- 🎨 **Brand Consistency**: Uses BazaarX brand colors via CSS variables
- 📱 **Responsive**: Adapts seamlessly from mobile to desktop
- ♿ **Accessible**: Full keyboard navigation and ARIA labels
- 🎭 **Animated**: Smooth Framer Motion transitions
- 🖱️ **Interactive**: Hover effects, active states, and scroll navigation
- 🔌 **API-Ready**: Designed for easy Supabase integration

## Component Location

```
web/src/components/CategoryCarousel.tsx
```

## Props API

### CategoryCarouselProps

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `categories` | `CategoryItem[]` | ✅ Yes | - | Array of category objects to display |
| `selectedCategory` | `string` | ✅ Yes | - | Currently selected category name |
| `onCategorySelect` | `(categoryName: string) => void` | ✅ Yes | - | Callback when a category is selected |
| `showProductCount` | `boolean` | ❌ No | `false` | Whether to display product count below category name |
| `className` | `string` | ❌ No | `''` | Additional CSS classes for the container |

### CategoryItem Interface

```typescript
interface CategoryItem {
  id: string;           // Unique identifier (for Supabase integration)
  name: string;         // Display name of the category
  image: string;        // URL or path to category image
  productCount?: number; // Optional: Number of products in category
}
```

## Usage Examples

### Basic Usage

```tsx
import CategoryCarousel from '../components/CategoryCarousel';
import { categories } from '../data/categories';

function ShopPage() {
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  return (
    <CategoryCarousel
      categories={categories}
      selectedCategory={selectedCategory}
      onCategorySelect={setSelectedCategory}
    />
  );
}
```

### With Product Count

```tsx
<CategoryCarousel
  categories={categories}
  selectedCategory={selectedCategory}
  onCategorySelect={setSelectedCategory}
  showProductCount={true}
  className="mb-8"
/>
```

### With Custom Styling

```tsx
<CategoryCarousel
  categories={categories}
  selectedCategory={selectedCategory}
  onCategorySelect={setSelectedCategory}
  className="my-10 shadow-xl"
/>
```

## Brand Consistency Guidelines

The component strictly adheres to the BazaarX brand system defined in `globals.css`:

### Color Usage

| Element | CSS Variable | Hex Value | Usage |
|---------|-------------|-----------|-------|
| Active Ring | `var(--brand-primary)` | `#FF6A00` | Selected category ring |
| Hover Text | `var(--brand-primary)` | `#FF6A00` | Category name on hover |
| Hover Ring | `var(--brand-primary)/50` | `#FF6A00` @ 50% opacity | Ring on hover state |
| Default Ring | - | `#E5E7EB` (gray-200) | Unselected category ring |

### Typography

- **Font Family**: `var(--font-sans)` (Inter)
- **Category Name**: 14px (text-sm), font-semibold
- **Product Count**: 12px (text-xs), regular weight
- **Header**: 24px (text-2xl), font-bold

### Spacing & Layout

- **Category Circle**: 96px × 96px (w-24 h-24)
- **Gap Between Items**: 24px (gap-6)
- **Ring Width**: 4px (ring-4) for active, 2px (ring-2) for default
- **Ring Offset**: 2px (ring-offset-2)

### Border Radius

- **Category Circles**: `rounded-full` (fully circular)
- **Container**: `rounded-2xl` (var(--radius-xl) = 16px)
- **Navigation Buttons**: `rounded-full`

## API Integration Guide

### Supabase Integration

The component is designed to work seamlessly with Supabase. Here's how to integrate it:

#### 1. Database Schema

Create a `categories` table in Supabase:

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image TEXT NOT NULL,
  product_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for faster queries
CREATE INDEX idx_categories_name ON categories(name);
```

#### 2. Zustand Store Setup

Create or update your category store:

```typescript
// stores/categoryStore.ts
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface CategoryState {
  categories: CategoryItem[];
  loading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
  subscribeToCategories: () => () => void;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  loading: false,
  error: null,

  fetchCategories: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      set({ categories: data || [], loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  subscribeToCategories: () => {
    const subscription = supabase
      .channel('categories-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        (payload) => {
          // Handle real-time updates
          set((state) => ({
            categories: [...state.categories], // Update logic here
          }));
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  },
}));
```

#### 3. Component Integration with Supabase

```tsx
import { useEffect } from 'react';
import { useCategoryStore } from '../stores/categoryStore';
import CategoryCarousel from '../components/CategoryCarousel';

function ShopPage() {
  const { categories, fetchCategories, subscribeToCategories } = useCategoryStore();
  const [selectedCategory, setSelectedCategory] = useState('All Categories');

  useEffect(() => {
    // Fetch initial categories
    fetchCategories();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToCategories();

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <CategoryCarousel
      categories={categories}
      selectedCategory={selectedCategory}
      onCategorySelect={setSelectedCategory}
      showProductCount={true}
    />
  );
}
```

### REST API Integration

For non-Supabase backends:

```typescript
// services/categoryService.ts
export const fetchCategories = async (): Promise<CategoryItem[]> => {
  const response = await fetch('/api/categories');
  if (!response.ok) throw new Error('Failed to fetch categories');
  return response.json();
};

// In your component
useEffect(() => {
  fetchCategories()
    .then(setCategories)
    .catch(console.error);
}, []);
```

## Customization Options

### Custom Category Images

Replace category images with custom icons or generated images:

```tsx
// Generate custom category icons
const customCategories = categories.map(cat => ({
  ...cat,
  image: `/icons/categories/${cat.id}.svg`
}));
```

### Custom Scroll Behavior

Adjust scroll amount in the component:

```tsx
// In CategoryCarousel.tsx, modify the scroll function:
const scroll = (direction: 'left' | 'right') => {
  const scrollAmount = 400; // Increase for larger scroll distance
  // ... rest of the code
};
```

### Custom Active State Styling

Override the active state styling:

```tsx
<CategoryCarousel
  categories={categories}
  selectedCategory={selectedCategory}
  onCategorySelect={setSelectedCategory}
  className="[&_.ring-\\[var\\(--brand-primary\\)\\]]:ring-blue-500"
/>
```

## Accessibility Features

The component includes comprehensive accessibility support:

### Keyboard Navigation

- **Tab**: Navigate between category buttons
- **Enter/Space**: Select a category
- **Arrow Keys**: Scroll the carousel (native browser behavior)

### Screen Reader Support

- Each category button has an `aria-label` describing the category
- Navigation buttons have descriptive `aria-label` attributes
- Scroll indicators are marked with `aria-hidden="true"`

### Focus Management

- Visible focus indicators on all interactive elements
- Focus outline uses brand colors for consistency
- Focus is maintained when categories are selected

## Performance Considerations

### Image Optimization

For optimal performance, ensure category images are:

- **Optimized**: Use WebP or AVIF format
- **Sized Appropriately**: 200×200px or 400×400px for retina displays
- **Lazy Loaded**: Browser native lazy loading is applied
- **CDN Hosted**: Use a CDN for faster loading

### Scroll Performance

The component uses:

- **CSS `scroll-behavior: smooth`** for smooth scrolling
- **`scrollbar-hide`** utility to hide scrollbars without affecting performance
- **Passive event listeners** for scroll events

### Animation Performance

- **GPU-accelerated transforms** for scale and translate effects
- **Framer Motion** optimizations for smooth 60fps animations
- **`will-change`** CSS property applied automatically by Framer Motion

## Testing Checklist

### Visual Testing

- [ ] Categories display in circular containers
- [ ] Images load correctly and fill circles
- [ ] Active state shows orange ring (`#FF6A00`)
- [ ] Hover effects work (scale, shadow, ring color change)
- [ ] Product counts display when enabled
- [ ] "View All" button is visible and functional

### Responsive Testing

- [ ] Mobile (< 768px): Horizontal scroll works with touch
- [ ] Tablet (768px - 1024px): Partial grid with scroll
- [ ] Desktop (> 1024px): Full carousel with navigation arrows
- [ ] Navigation arrows appear on hover (desktop only)
- [ ] Scroll indicators appear on mobile

### Interaction Testing

- [ ] Clicking a category updates the selected state
- [ ] Selected category highlights with brand color
- [ ] Callback function (`onCategorySelect`) is called correctly
- [ ] Scroll buttons navigate left/right smoothly
- [ ] "View All" resets to "All Categories"

### Accessibility Testing

- [ ] All buttons are keyboard accessible (Tab navigation)
- [ ] Enter/Space keys activate category selection
- [ ] Screen reader announces category names correctly
- [ ] Focus indicators are visible
- [ ] ARIA labels are present and descriptive

### Brand Consistency Testing

- [ ] Active ring color is `#FF6A00` (brand-primary)
- [ ] Hover text color is `#FF6A00`
- [ ] Font family is Inter (var(--font-sans))
- [ ] No hardcoded colors (all use CSS variables)
- [ ] Border radius matches design system

## Troubleshooting

### Images Not Loading

**Problem**: Category images don't display

**Solutions**:
1. Check image URLs are valid and accessible
2. Verify CORS settings if images are from external sources
3. Ensure images are in the correct format (JPEG, PNG, WebP)
4. Check network tab in DevTools for 404 errors

### Scroll Not Working

**Problem**: Carousel doesn't scroll horizontally

**Solutions**:
1. Verify `overflow-x-auto` is applied to scroll container
2. Check that `scrollbar-hide` utility is imported in globals.css
3. Ensure parent container doesn't have `overflow: hidden`
4. Test on different browsers (Safari sometimes has issues)

### Active State Not Updating

**Problem**: Selected category doesn't highlight

**Solutions**:
1. Verify `selectedCategory` prop matches category name exactly
2. Check that `onCategorySelect` is updating parent state
3. Ensure category names are unique
4. Log the `selectedCategory` value to debug

### Brand Colors Not Applying

**Problem**: Component uses wrong colors

**Solutions**:
1. Verify `globals.css` is imported in your app entry point
2. Check that CSS variables are defined in `:root`
3. Ensure Tailwind config includes CSS variable support
4. Clear browser cache and rebuild

## Future Enhancements

Potential improvements for future iterations:

1. **Infinite Scroll**: Auto-scroll through categories
2. **Search Integration**: Filter categories by search query
3. **Drag to Scroll**: Add drag-to-scroll functionality
4. **Category Icons**: Support for icon-only mode (no images)
5. **Analytics**: Track category selection events
6. **Skeleton Loading**: Add loading states for async data
7. **Virtualization**: For large category lists (100+)
8. **Multi-Select**: Allow selecting multiple categories

## Support & Contribution

For questions or issues with this component:

1. Check this documentation first
2. Review the implementation plan in the brain artifacts
3. Test with the provided examples
4. Verify brand consistency guidelines are followed

## Version History

- **v1.0.0** (2026-02-09): Initial implementation
  - Circular category cards with images
  - Horizontal scroll carousel
  - Brand-consistent styling
  - Accessibility features
  - API-ready architecture
