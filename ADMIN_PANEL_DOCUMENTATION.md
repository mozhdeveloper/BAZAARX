# BazaarPH Admin Panel Documentation

## Overview

A comprehensive admin panel system for BazaarPH e-commerce platform built with React, TypeScript, and modern UI components. The admin panel provides complete management capabilities for categories, sellers, buyers, and marketplace operations.

## Features

### 🛡️ Authentication System
- Secure admin login with role-based access
- Session persistence using Zustand
- Protected routes with automatic redirects
- Demo credentials: `admin@bazaarph.com` / `admin123`

### 📊 Dashboard Analytics
- Revenue overview with interactive charts
- Real-time statistics (orders, sellers, buyers, revenue)
- Recent activity monitoring
- Top performing categories analysis
- Responsive design with mobile support

### 🏷️ Category Management (CRUD)
- **Create**: Add new product categories with images and descriptions
- **Read**: View all categories with search and filtering
- **Update**: Edit category details, status, and sort order
- **Delete**: Remove categories with confirmation dialogs
- Bulk operations and status management
- Image support and URL slug generation

### 👥 Seller Management & Approval
- **Pending Applications**: Review new seller registrations
- **Document Verification**: View and verify business documents
- **Approval Workflow**: Approve, reject, or suspend sellers
- **Performance Metrics**: Track seller statistics and ratings
- **Status Management**: Active, suspended, rejected status handling
- Search and filtering capabilities

### 🛒 Buyer Management
- **User Overview**: Comprehensive buyer profiles
- **Shopping Activity**: Order history, spending patterns, loyalty points
- **Account Management**: Suspend or activate buyer accounts
- **Address Management**: View delivery addresses and preferences
- **Verification Status**: Email and phone verification tracking
- **Support Tools**: Customer service and account resolution

### 🎨 UI/UX Features
- **Modern Design**: Orange-themed branding with professional aesthetics
- **Responsive Layout**: Works on desktop, tablet, and mobile devices
- **Sidebar Navigation**: Collapsible sidebar with animated transitions
- **Interactive Elements**: Framer Motion animations and smooth transitions
- **Data Visualization**: Recharts for analytics and reporting
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

## Technical Architecture

### Frontend Stack
```
React 19 + TypeScript + Vite
├── State Management: Zustand with persistence
├── Styling: Tailwind CSS + shadcn/ui components
├── Routing: React Router DOM v6
├── Animations: Framer Motion + smooth transitions
├── Charts: Recharts for data visualization
└── Icons: Lucide React
```

### File Structure
```
src/
├── components/
│   ├── AdminSidebar.tsx          # Collapsible navigation sidebar
│   └── ui/                       # Reusable UI components
├── pages/
│   ├── AdminAuth.tsx             # Login/authentication page
│   ├── AdminDashboard.tsx        # Main dashboard with analytics
│   ├── AdminCategories.tsx       # Category CRUD management
│   ├── AdminSellers.tsx          # Seller approval system
│   └── AdminBuyers.tsx           # Buyer management system
├── stores/
│   └── adminStore.ts             # Zustand state management
└── types/
    └── orderSchema.ts            # Shared type definitions
```

### State Management (Zustand Stores)

#### 1. Authentication Store (`useAdminAuth`)
```typescript
interface AdminAuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}
```

#### 2. Categories Store (`useAdminCategories`)
```typescript
interface CategoriesState {
  categories: Category[];
  selectedCategory: Category | null;
  isLoading: boolean;
  loadCategories: () => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}
```

#### 3. Sellers Store (`useAdminSellers`)
```typescript
interface SellersState {
  sellers: Seller[];
  pendingSellers: Seller[];
  selectedSeller: Seller | null;
  isLoading: boolean;
  approveSeller: (id: string) => Promise<void>;
  rejectSeller: (id: string, reason: string) => Promise<void>;
  suspendSeller: (id: string, reason: string) => Promise<void>;
}
```

#### 4. Buyers Store (`useAdminBuyers`)
```typescript
interface BuyersState {
  buyers: Buyer[];
  selectedBuyer: Buyer | null;
  isLoading: boolean;
  suspendBuyer: (id: string, reason: string) => Promise<void>;
  activateBuyer: (id: string) => Promise<void>;
}
```

#### 5. Dashboard Stats Store (`useAdminStats`)
```typescript
interface AdminStatsState {
  stats: AdminStatistics;
  recentActivity: ActivityLog[];
  revenueChart: ChartData[];
  topCategories: CategoryStats[];
  loadDashboardData: () => Promise<void>;
}
```

## Routes and Navigation

### Public Routes
- `/admin/login` - Admin authentication page

### Protected Admin Routes
- `/admin` - Main dashboard with analytics
- `/admin/categories` - Category management (CRUD)
- `/admin/sellers` - Seller approval and management
- `/admin/buyers` - Buyer account management

### Route Protection
All admin routes except login are protected and require authentication. Unauthorized users are automatically redirected to the login page.

## Data Models

### Category Model
```typescript
interface Category {
  id: string;
  name: string;
  description: string;
  image: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  productsCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Seller Model
```typescript
interface Seller {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  documents: SellerDocument[];
  metrics: SellerMetrics;
  joinDate: Date;
}
```

### Buyer Model
```typescript
interface Buyer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: 'active' | 'suspended' | 'banned';
  addresses: BuyerAddress[];
  metrics: BuyerMetrics;
  joinDate: Date;
}
```

## Key Features Deep Dive

### 1. Category Management
- **Visual Grid Layout**: Categories displayed in responsive card grid
- **Image Support**: Upload and display category images
- **Search & Filter**: Real-time search and status filtering
- **Bulk Operations**: Select multiple categories for batch operations
- **Validation**: Form validation with error handling
- **Confirmation Dialogs**: Safe delete operations with warnings

### 2. Seller Approval Workflow
- **Application Review**: Detailed seller application forms
- **Document Verification**: View uploaded business documents
- **Multi-tab Interface**: Organized by status (pending, approved, rejected, suspended)
- **Performance Metrics**: Track seller KPIs and ratings
- **Communication Tools**: Email notifications and reason tracking

### 3. Buyer Management
- **Profile Overview**: Complete customer profiles with shopping history
- **Activity Tracking**: Order patterns, spending behavior, loyalty points
- **Account Actions**: Suspend, activate, or ban user accounts
- **Address Management**: Delivery addresses and preferences
- **Support Integration**: Customer service tools and account resolution

### 4. Analytics Dashboard
- **Revenue Charts**: Interactive area charts showing revenue trends
- **KPI Cards**: Key metrics with growth indicators
- **Recent Activity**: Real-time activity feed with status indicators
- **Category Performance**: Pie charts showing top performing categories
- **Responsive Design**: Adapts to different screen sizes

## Demo Data

The system includes comprehensive demo data for testing:

### Demo Admin Credentials
```
Email: admin@bazaarph.com
Password: admin123
Role: Super Admin with full permissions
```

### Sample Categories
- Electronics (1,250 products)
- Fashion & Apparel (2,340 products)
- Home & Garden (890 products)
- Health & Beauty (670 products)
- Sports & Outdoors (445 products)

### Sample Sellers
- **TechHub Philippines** (Approved) - Electronics retailer
- **Fashion Forward Store** (Pending) - Fashion retailer

### Sample Buyers
- **Anna Reyes** - Active customer with 47 orders, ₱89,750 total spent
- **Miguel Cruz** - Active customer with 23 orders, ₱34,500 total spent

## Development Guidelines

### Code Organization
- **Component Structure**: Functional components with TypeScript
- **State Management**: Centralized Zustand stores with persistence
- **Styling**: Tailwind CSS with consistent design system
- **Type Safety**: Comprehensive TypeScript interfaces and types

### Performance Optimizations
- **Code Splitting**: Automatic route-based code splitting
- **Lazy Loading**: Components loaded on demand
- **Memoization**: React.memo for expensive components
- **Optimistic Updates**: Immediate UI updates with backend sync

### Error Handling
- **Form Validation**: Client-side validation with error messages
- **API Error Handling**: Graceful error states and retry mechanisms
- **Loading States**: Skeleton screens and loading indicators
- **User Feedback**: Toast notifications and confirmation dialogs

## Integration Points

### Cross-System Compatibility
- **Shared Types**: Common interfaces between web and mobile apps
- **API Compatibility**: RESTful endpoints following standard conventions
- **Data Synchronization**: Real-time updates across platforms
- **Authentication**: JWT token-based auth with role-based access

### Mobile App Integration
- **Shared Cart Schema**: Common cart and order data structures
- **Seller Dashboard**: Mobile-responsive seller management
- **Buyer Experience**: Consistent user experience across platforms
- **Real-time Updates**: WebSocket connections for live data

## Security Features

### Authentication & Authorization
- **Role-Based Access Control**: Admin, super admin, and moderator roles
- **Session Management**: Secure session handling with automatic expiry
- **Route Protection**: Protected routes with authentication checks
- **Permission System**: Granular permissions for different resources

### Data Protection
- **Input Sanitization**: XSS protection and input validation
- **CSRF Protection**: Cross-site request forgery prevention
- **Audit Logging**: Admin action tracking and logging
- **Secure Storage**: Encrypted local storage for sensitive data

## Deployment

### Build Process
```bash
npm run build
# Creates optimized production build in dist/ folder
# Bundle size: ~1.8MB (473KB gzipped)
# Code splitting: Automatic route-based chunks
```

### Environment Configuration
```env
VITE_API_BASE_URL=https://api.bazaarph.com
VITE_APP_ENV=production
VITE_ENABLE_LOGGING=false
```

## Future Enhancements

### Phase 1 (Next Release)
- [ ] Order management system
- [ ] Analytics export functionality
- [ ] Advanced filtering and search
- [ ] Bulk operations for all entities

### Phase 2 (Future)
- [ ] Real-time notifications system
- [ ] Advanced reporting dashboard
- [ ] Multi-language support
- [ ] API rate limiting and monitoring

### Phase 3 (Advanced)
- [ ] Machine learning insights
- [ ] Automated fraud detection
- [ ] Advanced analytics and forecasting
- [ ] Integration with external services

## Support & Maintenance

### Monitoring
- **Error Tracking**: Comprehensive error logging and monitoring
- **Performance Monitoring**: Bundle size and load time tracking
- **User Analytics**: Usage patterns and feature adoption

### Updates
- **Dependency Management**: Regular updates to React and dependencies
- **Security Patches**: Timely security updates and vulnerability fixes
- **Feature Releases**: Quarterly feature releases with user feedback

---

**Built with ❤️ for BazaarPH** - A modern, scalable, and user-friendly admin panel for marketplace management.