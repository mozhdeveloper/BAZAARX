# BuyerProfilePage Refactoring Plan

## Current Issues

The `BuyerProfilePage.tsx` component violates multiple SOLID principles:

1. **Single Responsibility Principle (SRP)**: The component handles too many concerns including profile management, address management, payment methods, shop following, and UI rendering.
2. **Open/Closed Principle (OCP)**: Difficult to extend without modifying existing code.
3. **Dependency Inversion Principle (DIP)**: Direct dependencies on low-level modules without abstractions.

## Refactoring Strategy

### Phase 1: Component Decomposition

#### 1.1 Extract Child Components
- `ProfileInfoSection` - Handles basic profile information display and editing
- `ProfileSummarySection` - Displays shopping summary, ratings, and stats
- `AddressManagementSection` - Manages addresses with its own state and logic
- `PaymentMethodsSection` - Handles payment methods with its own state and logic
- `FollowingSection` - Manages followed shops display
- `NotificationSettingsSection` - Handles notification preferences
- `AvatarUploadModal` - Dedicated modal for avatar uploads
- `AddressModal` - Dedicated modal for address management
- `PaymentMethodModal` - Dedicated modal for payment method management

#### 1.2 Extract Business Logic Hooks
- `useProfileManager` - Handles profile data fetching, updating, and state
- `useAddressManager` - Handles address operations (CRUD, default selection)
- `usePaymentMethodManager` - Handles payment method operations
- `usePhilippineAddress` - Handles the Philippine address cascading logic
- `useSellerCheck` - Checks if the buyer is also a seller

### Phase 2: Service Layer Integration

#### 2.1 Leverage Existing Services
The application already has well-defined service patterns. We'll integrate with these existing services:

- **`addressService`**: Already handles address operations (CRUD, default management)
- **`authService`**: Handles profile updates and user data
- **`supabase`**: Direct database operations for payment methods and other data

#### 2.2 Create Missing Service Functions
We'll enhance the existing services to cover all functionality needed by the BuyerProfilePage:

```typescript
// In addressService.ts (already exists, but may need enhancements)
export class AddressService {
  // All needed methods already exist
}

// In authService.ts (already exists, but may need enhancements)
export class AuthService {
  // Profile update methods already exist
}

// Create new paymentService.ts to handle payment methods
export class PaymentService {
  async addPaymentMethod(userId: string, method: PaymentMethod): Promise<PaymentMethod>;
  async deletePaymentMethod(methodId: string): Promise<void>;
  async setDefaultPaymentMethod(userId: string, methodId: string): Promise<void>;
  async getUserPaymentMethods(userId: string): Promise<PaymentMethod[]>;
}
```

### Phase 3: State Management Optimization

#### 3.1 Refine Zustand Store
The existing `buyerStore` already has most of the required functionality:
- `addCard`, `deleteCard`, `setDefaultPaymentMethod` methods already exist
- `addresses` state and related methods already exist
- Profile management methods already exist

We'll enhance the existing store to properly integrate with the new service layer:

```typescript
// In buyerStore.ts
interface BuyerStore {
  // Existing functionality remains
  // Add methods to sync with services
  syncAddressesWithService: () => Promise<void>;
  syncPaymentMethodsWithService: () => Promise<void>;
}
```

### Phase 4: Implementation Steps

#### Step 1: Create Payment Service (if not already existing)
```typescript
// src/services/paymentService.ts
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { PaymentMethod } from '@/stores/buyerStore';

export class PaymentService {
  async getUserPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot fetch payment methods');
      return [];
    }

    try {
      // Assuming payment methods are stored in the buyers table or a separate table
      const { data: buyer, error } = await supabase
        .from('buyers')
        .select('payment_methods')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      return buyer?.payment_methods || [];
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return []; // Return empty array instead of throwing
    }
  }

  async addPaymentMethod(userId: string, method: PaymentMethod): Promise<PaymentMethod> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot add payment method');
    }

    try {
      // Add to the buyer's payment methods array
      const { data, error } = await supabase.rpc('add_payment_method', {
        user_id: userId,
        payment_method_data: method
      });

      if (error) throw error;
      return method;
    } catch (error: any) {
      console.error('Error adding payment method:', error);
      throw new Error(error.message || 'Failed to add payment method.');
    }
  }

  async deletePaymentMethod(methodId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot delete payment method');
    }

    try {
      const { error } = await supabase.rpc('delete_payment_method', {
        method_id: methodId
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting payment method:', error);
      throw new Error('Failed to delete payment method.');
    }
  }

  async setDefaultPaymentMethod(userId: string, methodId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    try {
      const { error } = await supabase.rpc('set_default_payment_method', {
        user_id: userId,
        method_id: methodId
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error setting default payment method:', error);
      throw new Error('Failed to set default payment method.');
    }
  }
}

export const paymentService = PaymentService.getInstance();
```

#### Step 2: Update Buyer Store to Integrate with Services
```typescript
// Updates to src/stores/buyerStore.ts
// The store will use the services instead of directly calling supabase
// This creates a clean separation of concerns
```

#### Step 3: Create Custom Hooks
```typescript
// src/hooks/useProfileManager.ts
import { useState, useEffect } from 'react';
import { useBuyerStore } from '@/stores/buyerStore';
import { authService } from '@/services/authService';

export const useProfileManager = (userId: string) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile, updateProfile } = useBuyerStore();
  
  const handleUpdateProfile = async (updates: Partial<BuyerProfile>) => {
    try {
      setLoading(true);
      // Use authService to update profile
      await authService.updateProfile(userId, updates);
      // Update local store
      updateProfile(updates);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return { 
    profile, 
    loading, 
    error, 
    updateProfile: handleUpdateProfile 
  };
};
```

#### Step 4: Create Child Components
```typescript
// src/components/ProfileInfoSection.tsx
interface ProfileInfoSectionProps {
  profile: BuyerProfile;
  onEdit: () => void;
}

export const ProfileInfoSection: React.FC<ProfileInfoSectionProps> = ({ 
  profile, 
  onEdit 
}) => {
  // Implementation focusing only on displaying and initiating profile edits
};
```

#### Step 5: Refactor Main Component
After extracting all child components and hooks, the main component becomes a orchestrator:

```typescript
// src/pages/BuyerProfilePage.tsx (refactored)
const BuyerProfilePage = () => {
  const navigate = useNavigate();
  const { profile } = useBuyerStore(state => state.profile);
  const userId = profile?.id;
  
  const { addresses, loading: addressesLoading } = useAddressManager(userId);
  const { paymentMethods, loading: paymentsLoading } = usePaymentMethodManager(userId);
  const followedShops = useBuyerStore(state => state.followedShops);
  const [activeTab, setActiveTab] = useState('personal');
  
  if (!profile) return <div>Loading...</div>;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {/* Profile header section */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="payments">Payment Methods</TabsTrigger>
          <TabsTrigger value="following">Following</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="personal">
          <ProfileInfoSection profile={profile} onEdit={openEditModal} />
          <ProfileSummarySection profile={profile} />
        </TabsContent>
        
        <TabsContent value="addresses">
          <AddressManagementSection 
            addresses={addresses} 
            userId={userId}
            loading={addressesLoading}
          />
        </TabsContent>
        
        {/* Other tabs... */}
      </Tabs>
      
      {/* Modals handled by respective components */}
    </div>
  );
};
```

### Phase 5: Testing Strategy

#### 5.1 Unit Tests
- Test each extracted component in isolation
- Test custom hooks with @testing-library/react-hooks
- Test service layer functions independently

#### 5.2 Integration Tests
- Test component interactions
- Test data flow between components and services

#### 5.3 End-to-End Tests
- Test complete user workflows
- Verify data persistence and UI updates

### Benefits of Refactoring

1. **Improved Maintainability**: Each component has a single responsibility
2. **Better Testability**: Smaller components are easier to unit test
3. **Enhanced Reusability**: Components can be reused in other parts of the application
4. **Clearer Data Flow**: Separation of concerns makes it easier to trace data flow
5. **Scalability**: Adding new features becomes easier without modifying existing code
6. **Team Development**: Different team members can work on different components simultaneously
7. **Consistency**: Aligns with existing service patterns in the codebase

### Alignment with Existing Architecture

This refactoring plan:
- Leverages existing service patterns (`addressService`, `authService`)
- Integrates with the existing `buyerStore` state management
- Follows the same architectural patterns already established in the codebase
- Maintains consistency with the existing Supabase integration approach
- Uses the same TypeScript interfaces and types already defined

### Timeline Estimate

- Phase 1 (Component Decomposition): 3-4 days
- Phase 2 (Service Integration): 2-3 days
- Phase 3 (State Management): 1-2 days
- Phase 4 (Integration): 2-3 days
- Phase 5 (Testing): 2-3 days

**Total Estimated Time: 10-15 days**

### Risk Mitigation

- Implement behind feature flag initially
- Maintain backward compatibility during transition
- Thorough testing at each phase
- Code reviews at each major step
- Gradual rollout to production