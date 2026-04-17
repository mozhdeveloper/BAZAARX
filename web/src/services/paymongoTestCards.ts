/**
 * PayMongo Test Card Detection Utility
 * Based on PayMongo documentation: https://developers.paymongo.com/docs/testing
 * 
 * This utility detects PayMongo test card numbers and their associated scenarios
 * for testing different payment failure and success cases.
 */

export interface PayMongoTestCardResult {
  isTestCard: boolean;
  scenario: string | null;
  type: 'success' | 'error' | 'auth';
  errorCode?: string;
  description: string;
}

// Test card numbers with specific scenarios from PayMongo
const TEST_CARD_SCENARIOS = {
  // Successful payments
  '4343434343434345': {
    scenario: 'successful_visa',
    type: 'success' as const,
    description: 'Visa - Successful payment',
  },
  '4571736000000075': {
    scenario: 'successful_visa_debit',
    type: 'success' as const,
    description: 'Visa (Debit) - Successful payment',
  },
  '4009930000001421': {
    scenario: 'successful_visa_credit_ph',
    type: 'success' as const,
    description: 'Visa (Credit - PH) - Successful payment',
  },
  '4404520000001439': {
    scenario: 'successful_visa_debit_ph',
    type: 'success' as const,
    description: 'Visa (Debit - PH) - Successful payment',
  },
  '5555444444444457': {
    scenario: 'successful_mastercard',
    type: 'success' as const,
    description: 'Mastercard - Successful payment',
  },
  '5455590000000009': {
    scenario: 'successful_mastercard_debit',
    type: 'success' as const,
    description: 'Mastercard (Debit) - Successful payment',
  },
  '5339080000000003': {
    scenario: 'successful_mastercard_prepaid',
    type: 'success' as const,
    description: 'Mastercard (Prepaid) - Successful payment',
  },
  '5240050000001440': {
    scenario: 'successful_mastercard_credit_ph',
    type: 'success' as const,
    description: 'Mastercard (Credit - PH) - Successful payment',
  },
  '5577510000001446': {
    scenario: 'successful_mastercard_debit_ph',
    type: 'success' as const,
    description: 'Mastercard (Debit - PH) - Successful payment',
  },

  // 3D Secure Test Cards
  '4120000000000007': {
    scenario: '3ds_authentication_required',
    type: 'auth' as const,
    description: '3DS authentication must be completed for payment to be marked as paid',
  },
  '4230000000000004': {
    scenario: '3ds_declined_before_auth',
    type: 'error' as const,
    errorCode: 'generic_decline',
    description: '3DS declined with generic_decline before authentication',
  },
  '5234000000000106': {
    scenario: '3ds_declined_after_auth',
    type: 'error' as const,
    errorCode: 'generic_decline',
    description: '3DS declined with generic_decline after successful authentication',
  },
  '5123000000000001': {
    scenario: '3ds_optional',
    type: 'success' as const,
    description: '3DS is supported but not required - payment marked as paid',
  },

  // Error scenarios
  '4200000000000018': {
    scenario: 'card_expired',
    type: 'error' as const,
    errorCode: 'card_expired',
    description: 'Card has already expired',
  },
  '4300000000000017': {
    scenario: 'cvc_invalid',
    type: 'error' as const,
    errorCode: 'cvc_invalid',
    description: 'Invalid CVC/CVN for the card',
  },
  '4400000000000016': {
    scenario: 'generic_decline',
    type: 'error' as const,
    errorCode: 'generic_decline',
    description: 'Generic decline - unknown reason',
  },
  '4028220000001457': {
    scenario: 'generic_decline_ph',
    type: 'error' as const,
    errorCode: 'generic_decline',
    description: 'Generic decline - Credit PH',
  },
  '4500000000000015': {
    scenario: 'fraudulent',
    type: 'error' as const,
    errorCode: 'fraudulent',
    description: 'Transaction blocked as fraudulent',
  },
  '5100000000000198': {
    scenario: 'insufficient_funds',
    type: 'error' as const,
    errorCode: 'insufficient_funds',
    description: 'Card does not have sufficient funds',
  },
  '5240460000001466': {
    scenario: 'insufficient_funds_ph',
    type: 'error' as const,
    errorCode: 'insufficient_funds',
    description: 'Insufficient funds - Credit PH',
  },
  '5200000000000197': {
    scenario: 'processor_blocked',
    type: 'error' as const,
    errorCode: 'processor_blocked',
    description: 'Transaction blocked by processor as fraudulent',
  },
  '5300000000000196': {
    scenario: 'lost_card',
    type: 'error' as const,
    errorCode: 'lost_card',
    description: 'Card is reported as lost',
  },
  '5483530000001462': {
    scenario: 'lost_card_ph',
    type: 'error' as const,
    errorCode: 'lost_card',
    description: 'Lost card - Credit PH',
  },
  '5400000000000195': {
    scenario: 'stolen_card',
    type: 'error' as const,
    errorCode: 'stolen_card',
    description: 'Card is reported as stolen',
  },
  '5500000000000194': {
    scenario: 'processor_unavailable',
    type: 'error' as const,
    errorCode: 'processor_unavailable',
    description: 'Payment processor temporarily unavailable',
  },
  '4600000000000014': {
    scenario: 'blocked',
    type: 'error' as const,
    errorCode: 'blocked',
    description: 'Transaction blocked by PayMongo fraud detection',
  },
  '5417881844647288': {
    scenario: 'resource_failed_state_non3ds',
    type: 'error' as const,
    errorCode: 'resource_failed_state',
    description: 'Cancelling payment intent failed - awaiting_capture state (non-3DS)',
  },
  '5417886761138807': {
    scenario: 'resource_failed_state_3ds',
    type: 'error' as const,
    errorCode: 'resource_failed_state',
    description: 'Cancelling payment intent failed - awaiting_capture state (3DS)',
  },
};

/**
 * Detect if a card number is a PayMongo test card and return its scenario
 */
export function detectTestCard(cardNumber: string): PayMongoTestCardResult {
  const cleanCardNumber = cardNumber.replace(/\s/g, '');

  const cardInfo = TEST_CARD_SCENARIOS[cleanCardNumber as keyof typeof TEST_CARD_SCENARIOS];

  if (!cardInfo) {
    return {
      isTestCard: false,
      scenario: null,
      type: 'success',
      description: 'Not a PayMongo test card',
    };
  }

  return {
    isTestCard: true,
    scenario: cardInfo.scenario,
    type: cardInfo.type,
    errorCode: cardInfo.errorCode,
    description: cardInfo.description,
  };
}

/**
 * Get human-readable error message for a given error code
 */
export function getErrorMessage(errorCode: string): {
  title: string;
  recommendation: string;
  details: string;
} {
  const errorMessages: Record<string, {
    title: string;
    recommendation: string;
    details: string;
  }> = {
    card_expired: {
      title: 'Card Expired',
      recommendation: 'Please use a different card or request a new one from your bank.',
      details: 'Your card expiration date has passed. Payment cannot be processed with an expired card.',
    },
    cvc_invalid: {
      title: 'Invalid CVC/CVN',
      recommendation: 'Please check your card and verify the CVC/CVN (3-4 digits on the back) and try again.',
      details: 'The security code you entered does not match the card number provided.',
    },
    generic_decline: {
      title: 'Payment Declined',
      recommendation: 'Please contact your card issuing bank for more information about why your payment was declined.',
      details: 'Your bank has declined this transaction. Contact them directly to resolve the issue.',
    },
    fraudulent: {
      title: 'Transaction Blocked',
      recommendation: 'Please verify your identity with your bank or contact our support team for assistance.',
      details: 'Your payment was blocked as we detected suspicious activity. For security reasons, we blocked this transaction.',
    },
    insufficient_funds: {
      title: 'Insufficient Funds',
      recommendation: 'Please use a different payment method or add funds to your card and try again.',
      details: 'Your card does not have sufficient funds to complete this transaction.',
    },
    processor_blocked: {
      title: 'Payment Blocked by Processor',
      recommendation: 'Please wait a few minutes and try again, or use a different payment method.',
      details: 'The payment processor blocked this transaction. This is a temporary block.',
    },
    lost_card: {
      title: 'Card Reported as Lost',
      recommendation: 'Please request a replacement card from your bank or use a different payment method.',
      details: 'This card has been reported as lost. You need to contact your bank immediately.',
    },
    stolen_card: {
      title: 'Card Reported as Stolen',
      recommendation: 'Please contact your bank immediately and request a replacement card.',
      details: 'Your card issuer has reported this card as stolen for security reasons.',
    },
    processor_unavailable: {
      title: 'Processor Temporarily Down',
      recommendation: 'Please wait a few minutes and try again.',
      details: 'The payment processor is temporarily unavailable. Please retry after some time.',
    },
    blocked: {
      title: 'Payment Blocked by Security',
      recommendation: 'Please contact our support team or verify your account details.',
      details: 'Your payment was blocked by our fraud detection system.',
    },
    resource_failed_state: {
      title: 'Payment Operation Failed',
      recommendation: 'Please wait a few minutes and retry the operation.',
      details: 'The payment operation failed due to an invalid state. Please try again.',
    },
  };

  return errorMessages[errorCode] || {
    title: 'Payment Failed',
    recommendation: 'Please try again or contact our support team.',
    details: 'An unexpected error occurred during payment processing.',
  };
}

/**
 * Get redirect URL for payment error page
 */
export function getPaymentErrorRedirectUrl(
  errorCode: string,
  amount: number,
  orderNumber: string,
  email: string
): string {
  const data = {
    type: errorCode,
    amount,
    orderNumber,
    email,
  };

  const encodedData = btoa(JSON.stringify(data));
  return `/payment-failure?data=${encodeURIComponent(encodedData)}`;
}

/**
 * Validate test card based on PayMongo requirements
 * - Must have valid expiration date (future date)
 * - Must have valid CVC (3-4 digits)
 */
export function validateTestCardRequirements(
  cardNumber: string,
  expiryDate: string,
  cvc: string
): { valid: boolean; message?: string } {
  // Expiry format should be MM/YY
  const expiryRegex = /^\d{2}\/\d{2}$/;
  if (!expiryRegex.test(expiryDate)) {
    return { valid: false, message: 'Expiry date must be in MM/YY format' };
  }

  // Parse expiry
  const [month, yearStr] = expiryDate.split('/');
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(yearStr, 10);

  if (monthNum < 1 || monthNum > 12) {
    return { valid: false, message: 'Invalid month in expiry date' };
  }

  // Check if date is in future
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;

  const cardYear = yearNum + (yearNum < 50 ? 2000 : 1900); // Two-digit to four-digit conversion
  const cardMonth = monthNum;

  if (cardYear < now.getFullYear() || (cardYear === now.getFullYear() && cardMonth < currentMonth)) {
    return { valid: false, message: 'Card expiry date must be in the future' };
  }

  // CVC must be 3-4 digits
  const cvcRegex = /^\d{3,4}$/;
  if (!cvcRegex.test(cvc)) {
    return { valid: false, message: 'CVC must be 3 or 4 digits' };
  }

  return { valid: true };
}
