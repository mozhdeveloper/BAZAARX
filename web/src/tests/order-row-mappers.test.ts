import { describe, it, expect } from "vitest";
import {
  mapOrderRowToBuyerSnapshot,
  mapOrderRowToSellerSnapshot,
} from "@/utils/orders/mappers";

describe("order row mappers", () => {
  it("maps buyer row with normalized joins and legacy note fallback", () => {
    const row = {
      id: "order-uuid-1",
      order_number: "ORD-1001",
      created_at: "2026-02-11T00:00:00.000Z",
      payment_status: "paid",
      shipment_status: "processing",
      notes:
        'SHIPPING_ADDRESS:{"fullName":"John Doe","street":"Street 1","city":"QC","province":"NCR","postalCode":"1100","phone":"0917"}|memo',
      recipient: {
        first_name: "John",
        last_name: "Doe",
        phone: "0917",
      },
      shipping_address: {
        address_line_1: "Street 1",
        city: "QC",
        province: "NCR",
        postal_code: "1100",
      },
      order_items: [
        {
          id: "oi-1",
          product_id: "prod-1",
          product_name: "Sample Product",
          quantity: 2,
          price: 150,
          primary_image_url: "https://example.com/p.jpg",
          seller_name: "Seller A",
          seller_id: "seller-a",
          personalized_options: { variantLabel1: "M", variantLabel2: "Black" },
          variant: { id: "v-1", variant_name: "Classic", size: "M", color: "Black", price: 150 },
        },
      ],
      total_amount: 300,
      tracking_number: "TRK-001",
    };

    const snapshot = mapOrderRowToBuyerSnapshot(row);
    expect(snapshot.dbId).toBe("order-uuid-1");
    expect(snapshot.status).toBe("confirmed");
    expect(snapshot.total).toBe(300);
    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.items[0].variantDisplay).toContain("Size: M");
    expect(snapshot.shippingAddress.fullName).toBe("John Doe");
    expect(snapshot.shippingAddress.city).toBe("QC");
  });

  it("maps seller row with shipment/payment compatibility fields", () => {
    const row = {
      id: "order-uuid-2",
      order_number: "ORD-2001",
      created_at: "2026-02-11T00:00:00.000Z",
      payment_status: "paid",
      shipment_status: "shipped",
      buyer_id: "buyer-1",
      recipient: {
        first_name: "Jane",
        last_name: "Doe",
        email: "jane@example.com",
        phone: "0999",
      },
      order_items: [
        {
          product_id: "prod-2",
          product_name: "Another Product",
          quantity: 1,
          price: 99,
          price_discount: 0,
          shipping_price: 0,
          shipping_discount: 0,
          primary_image_url: "https://example.com/a.jpg",
        },
      ],
      shipments: [
        {
          id: "ship-1",
          tracking_number: "TRK-SELLER",
          shipped_at: "2026-02-11T01:00:00.000Z",
          delivered_at: null,
          created_at: "2026-02-11T01:00:00.000Z",
        },
      ],
    };

    const snapshot = mapOrderRowToSellerSnapshot(row);
    expect(snapshot.status).toBe("shipped");
    expect(snapshot.paymentStatus).toBe("paid");
    expect(snapshot.buyerName).toBe("Jane Doe");
    expect(snapshot.trackingNumber).toBe("TRK-SELLER");
    expect(snapshot.items).toHaveLength(1);
  });
});
