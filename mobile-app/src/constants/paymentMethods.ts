export const PAYMENT_METHODS = {
  COD: 'cod',
  GCASH: 'gcash',
  CARD: 'card',
  PAYMONGO: 'paymongo',
} as const;

export type PaymentMethodValue = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodValue, string> = {
  [PAYMENT_METHODS.COD]: 'Cash on Delivery',
  [PAYMENT_METHODS.GCASH]: 'GCash',
  [PAYMENT_METHODS.CARD]: 'Credit/Debit Card',
  [PAYMENT_METHODS.PAYMONGO]: 'PayMongo',
};

export const normalizePaymentMethod = (method?: string | Record<string, unknown> | null): string => {
  if (!method) {
    return '';
  }

  if (typeof method === 'string') {
    return method.trim().toLowerCase();
  }

  const rawType = method.type;
  return typeof rawType === 'string' ? rawType.trim().toLowerCase() : '';
};

export const isPayMongoPayment = (method?: string | Record<string, unknown> | null): boolean => {
  return normalizePaymentMethod(method) === PAYMENT_METHODS.PAYMONGO;
};

export const getPaymentMethodLabel = (method?: string | Record<string, unknown> | null): string => {
  const normalized = normalizePaymentMethod(method) as PaymentMethodValue;
  if (PAYMENT_METHOD_LABELS[normalized]) {
    return PAYMENT_METHOD_LABELS[normalized];
  }

  if (typeof method === 'string') {
    return method.trim() || 'Unknown';
  }

  return normalized || 'Unknown';
};