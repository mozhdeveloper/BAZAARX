# Maximum Update Depth Error - Root Causes & Fixes (April 14, 2026)

## Issues Found & Fixed

### Issue 1: OrderConfirmation.tsx - Computed Dependency Array ✅ FIXED
**Problem (Line 31):**
```typescript
// ❌ BAD: Recalculates on every render, creating new reference
}, [(order as any).orderId, order.id]);  
```

When the component re-renders, the expression `(order as any).orderId` is evaluated again, creating a "new" dependency value each time, even if the actual value is the same. This triggers the useEffect infinitely.

**Fix Applied:**
```typescript
// ✅ GOOD: Use stable primitive value
}, [order.id]);
```

Now the dependency is the actual `order.id` string value, not a computed expression.

---

### Issue 2: CheckoutScreen.tsx - Unnecessary State Update After Navigation ✅ FIXED
**Problem (Lines 1913-1916):**
```typescript
if (isMountedRef.current) {
    setSavedPaymongoCard(cardData);
    // ❌ PROBLEM: Reloading payment methods after successful order
    const updatedMethods = await paymentMethodService.getSavedPaymentMethods(user.id);
    setSavedPaymentMethods(updatedMethods);  // Causes re-render while navigating!
}
```

**Why it's problematic:**
1. Order successfully created
2. We save card, then reload ALL payment methods from DB
3. `setSavedPaymentMethods(updatedMethods)` triggers a state update
4. This causes a re-render of CheckoutScreen
5. While this re-render is happening, we show Alert and navigate away
6. The state updates during the navigation transition trigger infinite useEffect loops in multiple components

**Fix Applied:**
```typescript
if (isMountedRef.current) {
    setSavedPaymongoCard(cardData);
    // ✅ FIXED: Don't reload payment methods - we're navigating away anyway
}
```

Since we're navigating to OrderConfirmation immediately after, reloading the payment methods is unnecessary and causes the infinite loop.

---

### Issue 3: PaymentMethodsScreen.tsx - useFocusEffect Loop ✅ FIXED (Earlier)
**Problem (Line 71):**
```typescript
useFocusEffect(
    useCallback(() => {
        if (selectedPaymentMethod === 'paymongo') {
            loadPaymentMethods();
        } else {
            setLoading(false);  // ❌ Unconditional state update in every focus
        }
    }, [selectedPaymentMethod, loadPaymentMethods])  // ❌ loadPaymentMethods in deps
);
```

**Fix Applied:**
```typescript
useFocusEffect(
    useCallback(() => {
        if (selectedPaymentMethod === 'paymongo') {
            loadPaymentMethods();
        }
        // ✅ Removed unnecessary `else setLoading(false)`
    }, [selectedPaymentMethod, user?.id])  // ✅ Use primitive dependency instead of function
);
```

---

## Root Cause Pattern

All three issues follow the same pattern of **"Maximum Update Depth"**:

1. **Computed Dependencies:** Using expressions instead of primitive values in dependency arrays
2. **Unnecessary State Updates:** Calling setState right before/during navigation transitions  
3. **Unconditional State Updates in Hooks:** Calling setState in useEffect without proper guards

---

## How to Prevent This in Future

### ✅ DO:
```typescript
// Use primitive values in dependencies
useEffect(() => {
    doSomething(id);
}, [id]);  // ✅ Stable primitive

// Guard state updates with condition
useEffect(() => {
    if (shouldUpdate) {
        setState(value);  // ✅ Conditional
    }
}, [deps]);

// Use useCallback to memoize callbacks
const loadData = useCallback(() => { ... }, [id]);
```

### ❌ DON'T:
```typescript
// Don't use computed values in dependencies
useEffect(() => {
    doSomething();
}, [(order as any).field]);  // ❌ Recalculates every render

// Don't update state during navigation
function handleSubmit() {
    await saveData();
    setState(value);  // ❌ Updates while navigating
    navigation.navigate('Next');
}

// Don't use entire function objects in dependencies without useLambda
useFocusEffect(
    useCallback(() => {
        loadData();
    }, [loadData])  // ⚠️ Need to memoize loadData first
);
```

---

## Files Modified

| File | Line | Issue | Fix |
|------|------|-------|-----|
| `mobile-app/app/OrderConfirmation.tsx` | 31 | Computed dependency | Use `order.id` primitive |
| `mobile-app/app/CheckoutScreen.tsx` | 1913-1916 | Unnecessary state update | Remove `setSavedPaymentMethods` call |
| `mobile-app/app/PaymentMethodsScreen.tsx` | 71 | useFocusEffect loop | Remove bad else clause, fix dependencies |

---

## Testing the Fix

After placing an order:
1. ✅ Order should be created successfully
2. ✅ Cart should be cleared
3. ✅ No "Maximum update depth exceeded" errors in console
4. ✅ OrderConfirmation screen should display without errors  
5. ✅ All navigation transitions should be smooth

---

## Performance Impact

By removing the unnecessary `setSavedPaymentMethods` reload:
- ✅ One less database query after every PayMongo payment
- ✅ Faster navigation to OrderConfirmation  
- ✅ No unnecessary re-renders during checkout completion
- ✅ Cleaner state management flow

---

## Summary

**Problem:** "Maximum update depth exceeded" errors after successful order creation  
**Root Causes:**
1. Computed values in useEffect dependency arrays
2. Unnecessary state updates before/during navigation
3. Unconditional state updates in focus effects

**Solution:** Fixed dependency arrays, removed unnecessary state updates, added proper guards  
**Result:** ✅ Clean order completion flow without infinite loops
