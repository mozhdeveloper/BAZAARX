import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

// Define strict types based on your sellerStore.ts to match Web logic
interface ExportableOrder {
  id: string;
  orderNumber?: string; // Optional in store, but we use it
  orderId?: string; // Sometimes used as fallback
  orderDate: string;
  status: string;
  type?: string;
  buyerName: string;
  buyerEmail: string;
  total: number;
  paymentStatus: string;
  trackingNumber?: string;
  shippingAddress?: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  items: {
    productName: string;
    quantity: number;
    price: number;
  }[];
}

class OrderExportService {
  // Method 1: Summary (One row per order)
  private flattenOrderSummary(order: ExportableOrder) {
    const addr = order.shippingAddress;
    return {
      "Order Number": order.orderNumber || order.orderId || order.id,
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
  private flattenOrderDetailed(order: ExportableOrder) {
    const addr = order.shippingAddress;
    return (order.items || []).map(item => ({
      "Order Number": order.orderNumber || order.orderId || order.id,
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

  async exportToCSV(
    orders: any[], // Accepts any to align with generic store data, cast internally
    storeName: string, 
    dateLabel: string, 
    mode: 'summary' | 'detailed' = 'summary'
  ) {
    if (!orders || orders.length === 0) {
      Alert.alert("No Data", "There are no orders to export for the selected filters.");
      return;
    }

    // Flatten data based on selection
    const flattened = mode === 'summary' 
      ? orders.map(order => this.flattenOrderSummary(order))
      : orders.flatMap(order => this.flattenOrderDetailed(order));

    if (flattened.length === 0) return;

    const headers = Object.keys(flattened[0]);
    
    // Create CSV Rows
    const csvRows = [
      headers.join(","),
      ...flattened.map(row => 
        headers.map(header => {
          const val = row[header as keyof typeof row] ?? "";
          // Escape quotes and wrap in quotes
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(",")
      )
    ];

    const csvContent = csvRows.join("\n");
    
    // Filename: storename_date_orders_mode.csv
    const cleanStore = storeName.replace(/\s+/g, '_');
    const cleanDate = dateLabel.replace(/\s+/g, '_').replace(/\//g, '-').replace(/,/g, '');
    const fileName = `${cleanStore}_${cleanDate}_Orders_${mode}.csv`;
    
    // Mobile File System Logic
    const fileDir = (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory;
    const filePath = `${fileDir}${fileName}`;

    try {
      await FileSystem.writeAsStringAsync(filePath, csvContent, { 
        encoding: 'utf8' 
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/csv',
          dialogTitle: `Export ${mode === 'summary' ? 'Summary' : 'Detailed'} - ${storeName}`,
          UTI: 'public.comma-separated-values-text'
        });
      } else {
        Alert.alert("Error", "Sharing is not available on this device.");
      }
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Export Failed", "Could not generate or share the CSV file.");
    }
  }
}

export const orderExportService = new OrderExportService();