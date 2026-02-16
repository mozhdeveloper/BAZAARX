import { supabase } from '../lib/supabase';

export interface FlashSaleProduct {
  id: string;
  name: string;
  image: string;
  originalPrice: number;
  flashPrice: number;
  stock: number;
  sold: number;
}

export interface FlashSale {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'scheduled' | 'active' | 'ended';
  products: FlashSaleProduct[];
}

// Mock Data
let MOCK_FLASH_SALES: FlashSale[] = [
  {
    id: '1',
    name: 'Weekend Special',
    startDate: new Date('2024-12-20T00:00:00').toISOString(),
    endDate: new Date('2024-12-22T23:59:59').toISOString(),
    status: 'active',
    products: [
      {
        id: 'p1',
        name: 'Wireless Earbuds',
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=100&h=100&fit=crop',
        originalPrice: 2999,
        flashPrice: 1499,
        stock: 50,
        sold: 12,
      },
    ],
  },
  {
    id: '2',
    name: 'New Year Blast',
    startDate: new Date('2025-01-01T00:00:00').toISOString(),
    endDate: new Date('2025-01-01T23:59:59').toISOString(),
    status: 'scheduled',
    products: [],
  },
];

class FlashSaleService {
  async getFlashSales(sellerId: string): Promise<FlashSale[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    return [...MOCK_FLASH_SALES];
  }

  async addProductToSale(saleId: string, product: FlashSaleProduct): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const sale = MOCK_FLASH_SALES.find(s => s.id === saleId);
    if (sale) {
      // Check if product already exists
      const existingIndex = sale.products.findIndex(p => p.id === product.id);
      if (existingIndex >= 0) {
        sale.products[existingIndex] = product; // Update
      } else {
        sale.products.push(product); // Add
      }
    } else {
      throw new Error('Sale not found');
    }
  }

  async removeProductFromSale(saleId: string, productId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const sale = MOCK_FLASH_SALES.find(s => s.id === saleId);
    if (sale) {
      sale.products = sale.products.filter(p => p.id !== productId);
    } else {
      throw new Error('Sale not found');
    }
  }

  async joinFlashSale(sale: Omit<FlashSale, 'id' | 'products'>): Promise<FlashSale> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newSale: FlashSale = {
      ...sale,
      id: Date.now().toString(),
      products: [],
    };
    
    MOCK_FLASH_SALES.unshift(newSale);
    return newSale;
  }

  async withdrawFlashSale(saleId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 800));
    MOCK_FLASH_SALES = MOCK_FLASH_SALES.filter(s => s.id !== saleId);
  }
}

export const flashSaleService = new FlashSaleService();
