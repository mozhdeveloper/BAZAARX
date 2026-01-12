# Admin Mobile Design System Update

## Overview
Update all admin mobile pages to match the buyer mobile design for consistency across the app.

## Design Specifications

### Color Palette
```typescript
const COLORS = {
  // Primary
  primary: '#FF5722',      // Orange accent
  primaryLight: '#FFF5F0', // Light orange background
  
  // Backgrounds
  background: '#F5F5F7',   // Main background (light gray)
  surface: '#FFFFFF',      // Card/surface white
  
  // Text
  textPrimary: '#1F2937',  // Dark gray (headings)
  textSecondary: '#6B7280', // Medium gray (body)
  textTertiary: '#9CA3AF', // Light gray (captions)
  
  // Borders
  border: '#E5E7EB',       // Light gray borders
  borderDark: '#D1D5DB',   // Slightly darker borders
  
  // Status Colors
  success: '#10B981',      // Green
  warning: '#F59E0B',      // Amber
  error: '#EF4444',        // Red
  info: '#3B82F6',         // Blue
  purple: '#8B5CF6',       // Purple
};
```

### Typography
```typescript
const TYPOGRAPHY = {
  // Headers
  h1: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  h3: { fontSize: 20, fontWeight: '700', letterSpacing: -0.2 },
  h4: { fontSize: 18, fontWeight: '700' },
  h5: { fontSize: 16, fontWeight: '600' },
  
  // Body
  body: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
  bodySmall: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  caption: { fontSize: 13, fontWeight: '500' },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  
  // Buttons
  button: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  buttonSmall: { fontSize: 14, fontWeight: '600' },
};
```

### Spacing
```typescript
const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};
```

### Border Radius
```typescript
const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};
```

### Shadows
```typescript
const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
};
```

## Component Patterns

### Page Structure
```tsx
<View style={styles.container}>
  {/* Header */}
  <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
    {/* Header content */}
  </View>

  {/* ScrollView Content */}
  <ScrollView 
    style={styles.scrollView}
    contentContainerStyle={styles.scrollContent}
    showsVerticalScrollIndicator={false}
  >
    {/* Page content */}
  </ScrollView>
</View>

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
});
```

### Header Design
```tsx
// Clean, minimal header with white background option
<View style={styles.header}>
  <View style={styles.headerContent}>
    <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
      <ArrowLeft size={24} color="#FFFFFF" />
    </Pressable>
    <View style={styles.headerTitleContainer}>
      <Text style={styles.headerTitle}>Page Title</Text>
      <Text style={styles.headerSubtitle}>Subtitle</Text>
    </View>
    <Pressable style={styles.headerAction}>
      <Bell size={24} color="#FFFFFF" />
    </Pressable>
  </View>
</View>

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  headerAction: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

### Card Design
```tsx
<View style={styles.card}>
  <View style={styles.cardHeader}>
    <Text style={styles.cardTitle}>Card Title</Text>
    <Pressable>
      <Text style={styles.cardAction}>View All</Text>
    </Pressable>
  </View>
  <View style={styles.cardContent}>
    {/* Card content */}
  </View>
</View>

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  cardAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF5722',
  },
  cardContent: {
    gap: 12,
  },
});
```

### Button Styles
```tsx
// Primary Button
<Pressable style={styles.primaryButton}>
  <Text style={styles.primaryButtonText}>Primary Action</Text>
</Pressable>

// Secondary Button  
<Pressable style={styles.secondaryButton}>
  <Text style={styles.secondaryButtonText}>Secondary Action</Text>
</Pressable>

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF5722',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF5722',
    letterSpacing: 0.2,
  },
});
```

### Stat Card (Dashboard)
```tsx
<View style={styles.statCard}>
  <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
    {icon}
  </View>
  <Text style={styles.statLabel}>{label}</Text>
  <Text style={styles.statValue}>{value}</Text>
  <View style={styles.statGrowth}>
    {growth >= 0 ? <TrendingUp size={14} color={growthColor} /> : <TrendingDown size={14} color="#EF4444" />}
    <Text style={[styles.statGrowthText, { color: growth >= 0 ? growthColor : '#EF4444' }]}>
      {Math.abs(growth)}%
    </Text>
  </View>
</View>

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  statGrowth: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statGrowthText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
```

### List Item Design
```tsx
<Pressable style={styles.listItem} onPress={onPress}>
  <View style={styles.listItemLeft}>
    <View style={[styles.listItemIcon, { backgroundColor: iconBg }]}>
      {icon}
    </View>
    <View style={styles.listItemContent}>
      <Text style={styles.listItemTitle}>{title}</Text>
      <Text style={styles.listItemSubtitle}>{subtitle}</Text>
    </View>
  </View>
  <ChevronRight size={20} color="#9CA3AF" />
</Pressable>

const styles = StyleSheet.create({
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  listItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  listItemSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
});
```

### Badge/Status Chip
```tsx
<View style={[styles.badge, { backgroundColor: bgColor }]}>
  <Text style={[styles.badgeText, { color: textColor }]}>{status}</Text>
</View>

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
```

## Pages to Update

### Tab Pages (Priority 1)
1. ✅ **dashboard.tsx** - Admin dashboard with stats
2. ✅ **products.tsx** - Product management
3. ✅ **orders.tsx** - Order management  
4. ✅ **sellers.tsx** - Seller approvals
5. ✅ **product-approvals.tsx** - QA approvals (already has modern design)
6. ✅ **settings.tsx** - Admin settings

### Detail Pages (Priority 2)
7. ✅ **profile.tsx** - Admin profile
8. ✅ **categories.tsx** - Category management
9. ✅ **buyers.tsx** - Buyer management
10. ✅ **vouchers.tsx** - Voucher management
11. ✅ **payouts.tsx** - Payout management
12. ✅ **product-requests.tsx** - Product requests
13. ✅ **analytics.tsx** - Analytics dashboard
14. ✅ **reviews.tsx** - Review management
15. ✅ **flash-sales.tsx** - Flash sales
16. ✅ **/app/admin/(pages)/settings.tsx** - Settings detail page

## Key Changes Required

### 1. Remove Old Orange Header
- **Old**: Full-width orange header with StatusBar
- **New**: Minimal header with proper safe area handling

### 2. Update Background Colors
- **Old**: Various grays (#F9FAFB, #F3F4F6)
- **New**: Consistent #F5F5F7 for main bg, #FFFFFF for cards

### 3. Update Card Styling
- Add proper shadows (subtle, iOS-style)
- Use 16px border radius consistently
- 16px padding for card content

### 4. Typography Consistency
- Use weights: 400, 500, 600, 700, 800 only
- Consistent letter spacing
- Proper line heights

### 5. Button Styles
- Primary: Orange with shadow
- Secondary: White with orange border
- Consistent padding and radius

### 6. Status Colors
- Success: #10B981 (green)
- Warning: #F59E0B (amber)
- Error: #EF4444 (red)
- Info: #3B82F6 (blue)

## Implementation Priority

**Phase 1 (High Priority - User-Facing)**
1. Dashboard - Main entry point
2. Product Approvals - QA workflow (already modern)
3. Orders - Order management
4. Products - Product management

**Phase 2 (Medium Priority - Admin Functions)**
5. Sellers - Seller approvals
6. Categories - Category management
7. Buyers - Buyer management
8. Settings - App settings

**Phase 3 (Lower Priority - Additional Features)**
9. Vouchers - Promotions
10. Payouts - Financial
11. Reviews - Content moderation
12. Analytics - Insights
13. Flash Sales - Marketing
14. Product Requests - Workflow
15. Profile - Account

## Testing Checklist

For each updated page:
- [ ] Safe area handling (top/bottom insets)
- [ ] Scroll behavior (bounce, indicators)
- [ ] Touch targets (minimum 44x44)
- [ ] Loading states
- [ ] Empty states
- [ ] Error states
- [ ] Responsive layout (different screen sizes)
- [ ] Dark mode ready (if applicable)
- [ ] Consistent spacing
- [ ] Proper accessibility labels

## Status
📋 **DOCUMENTED** - Design system defined, ready for implementation

All admin pages need to be systematically updated to match the buyer mobile design for a consistent, professional appearance across the entire app.
