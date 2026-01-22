# Quick Start: Integrating Discounts into Product Display

## Overview

This guide shows how to display active discounts on product cards, product detail pages, and throughout the buyer experience.

---

## 1. Update Product Card Component

### Before:

```tsx
<div className="product-price">₱{product.price.toLocaleString()}</div>
```

### After:

```tsx
import { useEffect, useState } from "react";
import { discountService } from "@/services/discountService";
import { Badge } from "@/components/ui/badge";

const ProductCard = ({ product }) => {
  const [activeDiscount, setActiveDiscount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDiscount = async () => {
      try {
        const discount = await discountService.getActiveProductDiscount(
          product.id,
        );
        setActiveDiscount(discount);
      } catch (error) {
        console.error("Failed to fetch discount:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDiscount();
  }, [product.id]);

  return (
    <div className="product-card relative">
      {/* Discount Badge */}
      {activeDiscount && (
        <Badge
          className="absolute top-2 left-2 z-10"
          style={{ backgroundColor: activeDiscount.badgeColor }}
        >
          {activeDiscount.badgeText || `${activeDiscount.discountValue}% OFF`}
        </Badge>
      )}

      {/* Product Image */}
      <img src={product.primaryImage} alt={product.name} />

      {/* Product Info */}
      <div className="product-info">
        <h3>{product.name}</h3>

        {/* Price Display */}
        <div className="product-price">
          {activeDiscount ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-orange-600">
                ₱{activeDiscount.discountedPrice.toLocaleString()}
              </span>
              <span className="text-sm text-gray-500 line-through">
                ₱{activeDiscount.originalPrice.toLocaleString()}
              </span>
              <span className="text-sm text-green-600 font-medium">
                Save{" "}
                {Math.round(
                  ((activeDiscount.originalPrice -
                    activeDiscount.discountedPrice) /
                    activeDiscount.originalPrice) *
                    100,
                )}
                %
              </span>
            </div>
          ) : (
            <span className="text-2xl font-bold">
              ₱{product.price.toLocaleString()}
            </span>
          )}
        </div>

        {/* Countdown Timer (if discount exists) */}
        {activeDiscount && <CountdownTimer endDate={activeDiscount.endsAt} />}
      </div>
    </div>
  );
};
```

---

## 2. Create Countdown Timer Component

```tsx
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  endDate: Date;
}

export const CountdownTimer = ({ endDate }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const diff = endDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Ended");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <div className="flex items-center gap-1 text-sm text-orange-600 font-medium">
      <Clock className="h-4 w-4" />
      <span>{timeLeft} left</span>
    </div>
  );
};
```

---

## 3. Update Product Detail Page

```tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { discountService } from "@/services/discountService";
import { Badge } from "@/components/ui/badge";
import { CountdownTimer } from "@/components/CountdownTimer";

export const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [activeDiscount, setActiveDiscount] = useState(null);

  useEffect(() => {
    // Fetch product and discount
    const fetchData = async () => {
      // ... fetch product logic

      // Fetch active discount
      const discount = await discountService.getActiveProductDiscount(id);
      setActiveDiscount(discount);
    };

    fetchData();
  }, [id]);

  const displayPrice = activeDiscount?.discountedPrice || product?.price;
  const hasDiscount = !!activeDiscount;

  return (
    <div className="product-detail">
      {/* Discount Banner (if active) */}
      {activeDiscount && (
        <div
          className="discount-banner p-4 mb-4 rounded-lg"
          style={{ backgroundColor: `${activeDiscount.badgeColor}20` }}
        >
          <div className="flex items-center justify-between">
            <div>
              <Badge style={{ backgroundColor: activeDiscount.badgeColor }}>
                {activeDiscount.badgeText}
              </Badge>
              <p className="mt-2 text-lg font-semibold">
                {activeDiscount.campaignName}
              </p>
            </div>
            <CountdownTimer endDate={activeDiscount.endsAt} />
          </div>
        </div>
      )}

      {/* Product Info */}
      <div className="product-info">
        <h1>{product?.name}</h1>

        {/* Price Section */}
        <div className="price-section mt-4">
          {hasDiscount ? (
            <>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-orange-600">
                  ₱{displayPrice.toLocaleString()}
                </span>
                <span className="text-2xl text-gray-500 line-through">
                  ₱{activeDiscount.originalPrice.toLocaleString()}
                </span>
              </div>
              <div className="mt-2">
                <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  You save ₱
                  {(
                    activeDiscount.originalPrice -
                    activeDiscount.discountedPrice
                  ).toLocaleString()}
                  (
                  {Math.round(
                    ((activeDiscount.originalPrice -
                      activeDiscount.discountedPrice) /
                      activeDiscount.originalPrice) *
                      100,
                  )}
                  %)
                </span>
              </div>
            </>
          ) : (
            <span className="text-4xl font-bold">
              ₱{product?.price.toLocaleString()}
            </span>
          )}
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={() =>
            addToCart(product.id, displayPrice, activeDiscount?.campaignId)
          }
          className="mt-6 w-full"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
};
```

---

## 4. Update Cart Logic

```tsx
// When adding to cart, include discount information
const addToCart = async (productId, price, campaignId) => {
  const cartItem = {
    productId,
    quantity: 1,
    price, // Use discounted price
    campaignId, // Track which campaign was used
    timestamp: new Date(),
  };

  // Add to cart state/localStorage
  // ...
};

// During checkout, record discount usage
const recordDiscountUsage = async (order) => {
  for (const item of order.items) {
    if (item.campaignId) {
      await discountService.recordUsage({
        campaignId: item.campaignId,
        buyerId: currentUser.id,
        orderId: order.id,
        productId: item.productId,
        discountAmount: item.originalPrice - item.price,
        originalPrice: item.originalPrice,
        discountedPrice: item.price,
        quantity: item.quantity,
      });
    }
  }
};
```

---

## 5. Add Discount Validation (Before Checkout)

```tsx
const validateDiscounts = async (cartItems) => {
  const validatedItems = [];

  for (const item of cartItems) {
    if (item.campaignId) {
      // Check if discount is still active
      const activeDiscount = await discountService.getActiveProductDiscount(
        item.productId,
      );

      if (activeDiscount && activeDiscount.campaignId === item.campaignId) {
        // Discount still valid - use current price
        validatedItems.push({
          ...item,
          price: activeDiscount.discountedPrice,
          isValid: true,
        });
      } else {
        // Discount expired - use regular price
        const product = await getProduct(item.productId);
        validatedItems.push({
          ...item,
          price: product.price,
          campaignId: null,
          isValid: false,
          message: "Discount has expired",
        });
      }
    } else {
      validatedItems.push(item);
    }
  }

  return validatedItems;
};
```

---

## 6. Performance Optimization

### Cache Active Discounts

```tsx
// Use React Query or SWR for caching
import { useQuery } from "@tanstack/react-query";

const useProductDiscount = (productId) => {
  return useQuery({
    queryKey: ["product-discount", productId],
    queryFn: () => discountService.getActiveProductDiscount(productId),
    staleTime: 60000, // Cache for 1 minute
    cacheTime: 300000, // Keep in cache for 5 minutes
  });
};

// Usage in component
const ProductCard = ({ product }) => {
  const { data: activeDiscount, isLoading } = useProductDiscount(product.id);

  // ...
};
```

### Batch Discount Fetching

```tsx
// For product lists, fetch all discounts at once
const useProductDiscounts = (productIds) => {
  return useQuery({
    queryKey: ["product-discounts", ...productIds],
    queryFn: async () => {
      const promises = productIds.map((id) =>
        discountService.getActiveProductDiscount(id),
      );
      return Promise.all(promises);
    },
    staleTime: 60000,
  });
};
```

---

## 7. Mobile App Integration

Update `mobile-app/app/components/ProductCard.tsx`:

```tsx
import { useState, useEffect } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { discountService } from "@/services/discountService";

export const ProductCard = ({ product }) => {
  const [activeDiscount, setActiveDiscount] = useState(null);

  useEffect(() => {
    discountService
      .getActiveProductDiscount(product.id)
      .then(setActiveDiscount)
      .catch(console.error);
  }, [product.id]);

  return (
    <View style={styles.card}>
      {activeDiscount && (
        <View
          style={[styles.badge, { backgroundColor: activeDiscount.badgeColor }]}
        >
          <Text style={styles.badgeText}>{activeDiscount.badgeText}</Text>
        </View>
      )}

      <Image source={{ uri: product.primaryImage }} style={styles.image} />

      <View style={styles.info}>
        <Text style={styles.name}>{product.name}</Text>

        {activeDiscount ? (
          <View style={styles.priceContainer}>
            <Text style={styles.discountedPrice}>
              ₱{activeDiscount.discountedPrice.toLocaleString()}
            </Text>
            <Text style={styles.originalPrice}>
              ₱{activeDiscount.originalPrice.toLocaleString()}
            </Text>
          </View>
        ) : (
          <Text style={styles.price}>₱{product.price.toLocaleString()}</Text>
        )}
      </View>
    </View>
  );
};
```

---

## 8. Testing Checklist

- [ ] Product card shows discount badge
- [ ] Discounted price displays correctly
- [ ] Original price shows strikethrough
- [ ] Countdown timer updates in real-time
- [ ] Discount expires and price reverts
- [ ] Cart maintains discount until checkout
- [ ] Discount validation works before payment
- [ ] Usage is recorded after order completion
- [ ] Multiple products with different discounts work
- [ ] Product without discount displays normally

---

## Quick Commands

```bash
# Navigate to web directory
cd web

# Install dependencies (if needed)
npm install @tanstack/react-query

# Start development server
npm run dev

# Test discount service
npm run test -- discountService.test.ts
```

---

## Need Help?

- **Database Issues**: Check [DISCOUNT_SYSTEM_COMPLETE.md](./DISCOUNT_SYSTEM_COMPLETE.md)
- **API Errors**: Review [discountService.ts](./web/src/services/discountService.ts)
- **UI Questions**: See [SellerDiscounts.tsx](./web/src/pages/SellerDiscounts.tsx)

---

**Last Updated:** January 22, 2026
