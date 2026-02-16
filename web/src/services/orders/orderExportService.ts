import { SellerOrder } from "@/stores/sellerStore";

class OrderExportService {
  // Method 1: Summary (One row per order)
  private flattenOrderSummary(order: SellerOrder) {
    const addr = order.shippingAddress;
    return {
      "Order Number": order.orderNumber || order.id,
      "Date": order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "N/A",
      "Status": order.status,
      "Channel": order.type || "ONLINE",
      "Customer": order.buyerName,
      "Email": order.buyerEmail,
      "Total Amount": order.total,
      "Payment Status": order.paymentStatus,
      "Items Summary": (order.items || []).map((i) => `${i.productName} (x${i.quantity})`).join("; "),
      "Shipping Address": addr ? `${addr.street}, ${addr.city}, ${addr.province} ${addr.postalCode}` : "N/A",
      "Tracking Number": order.trackingNumber || "N/A"
    };
  }

  // Method 2: Detailed (One row per product)
  private flattenOrderDetailed(order: SellerOrder) {
    const addr = order.shippingAddress;
    return (order.items || []).map(item => ({
      "Order Number": order.orderNumber || order.id,
      "Date": order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "N/A",
      "Status": order.status,
      "Channel": order.type || "ONLINE",
      "Customer": order.buyerName,
      "Product Name": item.productName,
      "Quantity": item.quantity,
      "Unit Price": item.price,
      "Line Total": item.price * item.quantity,
      "Payment Status": order.paymentStatus,
      "Shipping Address": addr ? `${addr.street}, ${addr.city}` : "N/A"
    }));
  }

  exportToCSV(
    orders: SellerOrder[], 
    storeName: string, 
    dateLabel: string, 
    mode: 'summary' | 'detailed' = 'summary'
  ) {
    if (!orders || orders.length === 0) return;

    // Flatten data based on selection
    const flattened = mode === 'summary' 
      ? orders.map(order => this.flattenOrderSummary(order))
      : orders.flatMap(order => this.flattenOrderDetailed(order));

    const headers = Object.keys(flattened[0]);
    const csvRows = [
      headers.join(","),
      ...flattened.map(row => 
        headers.map(header => {
          const val = row[header as keyof typeof row] ?? "";
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(",")
      )
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    // Filename: storename_date_orders_mode.csv
    const cleanStore = storeName.replace(/\s+/g, '_');
    const cleanDate = dateLabel.replace(/\s+/g, '_');
    const fileName = `${cleanStore}_${cleanDate}_Orders_${mode}.csv`;
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const orderExportService = new OrderExportService();