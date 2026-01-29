export interface CheckoutResult {
  success: boolean;
  error?: string;
}

export const processCheckout = async (payload: any): Promise<CheckoutResult> => {
  console.log('Processing checkout:', payload);
  // Simulate network request
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock success
  return { success: true };
};
