/**
 * PayMongo Test Card Numbers & Scenarios
 * Reference: https://developers.paymongo.com/docs/testing
 */

export interface TestCard {
  number: string;
  brand: string;
  type: string;
  scenario: string;
  cvc: string;
  expiry: string;
  expectedResult: 'success' | 'decline' | '3ds-required' | '3ds-optional';
  errorCode?: string;
  errorReason?: string;
}

export const BASIC_TEST_CARDS: TestCard[] = [
  {
    number: '4343434343434345',
    brand: 'Visa',
    type: 'credit',
    scenario: 'Basic - Visa (International)',
    cvc: '123',
    expiry: '12/25',
    expectedResult: 'success',
  },
  {
    number: '4571736000000075',
    brand: 'Visa',
    type: 'debit',
    scenario: 'Basic - Visa (Debit International)',
    cvc: '123',
    expiry: '12/25',
    expectedResult: 'success',
  },
  {
    number: '4009930000001421',
    brand: 'Visa',
    type: 'credit-ph',
    scenario: 'Basic - Visa (Credit PH)',
    cvc: '123',
    expiry: '12/25',
    expectedResult: 'success',
  },
  {
    number: '4404520000001439',
    brand: 'Visa',
    type: 'debit-ph',
    scenario: 'Basic - Visa (Debit PH)',
    cvc: '123',
    expiry: '12/25',
    expectedResult: 'success',
  },
  {
    number: '5555444444444457',
    brand: 'Mastercard',
    type: 'credit',
    scenario: 'Basic - Mastercard (International)',
    cvc: '123',
    expiry: '12/25',
    expectedResult: 'success',
  },
  {
    number: '5455590000000009',
    brand: 'Mastercard',
    type: 'debit',
    scenario: 'Basic - Mastercard (Debit International)',
    cvc: '123',
    expiry: '12/25',
    expectedResult: 'success',
  },
  {
    number: '5339080000000003',
    brand: 'Mastercard',
    type: 'prepaid',
    scenario: 'Basic - Mastercard (Prepaid)',
    cvc: '123',
    expiry: '12/25',
    expectedResult: 'success',
  },
  {
    number: '5240050000001440',
    brand: 'Mastercard',
    type: 'credit-ph',
    scenario: 'Basic - Mastercard (Credit PH)',
    cvc: '123',
    expiry: '12/25',
    expectedResult: 'success',
  },
  {
    number: '5577510000001446',
    brand: 'Mastercard',
    type: 'debit-ph',
    scenario: 'Basic - Mastercard (Debit PH)',
    cvc: '123',
    expiry: '12/25',
    expectedResult: 'success',
  },
];

export const THREE_DS_TEST_CARDS: TestCard[] = [
  {
    number: '4120000000000007',
    brand: 'Visa',
    type: 'credit-3ds',
    scenario: '3DS - Authentication Required',
    cvc: '123',
    expiry: '12/25',
    expectedResult: '3ds-required',
    errorReason: '3DS authentication must be completed for the payment to be marked as paid.',
  },
  {
    number: '4230000000000004',
    brand: 'Visa',
    type: 'credit-3ds',
    scenario: '3DS - Declined Before Auth',
    cvc: '123',
    expiry: '12/25',
    expectedResult: 'decline',
    errorCode: 'generic_decline',
    errorReason: 'Card will be declined with generic_decline before authentication.',
  },
  {
    number: '5234000000000106',
    brand: 'Mastercard',
    type: 'credit-3ds',
    scenario: '3DS - Declined After Auth',
    cvc: '123',
    expiry: '12/25',
    expectedResult: 'decline',
    errorCode: 'generic_decline',
    errorReason: 'Card will be declined with generic_decline after successful authentication.',
  },
  {
    number: '5123000000000001',
    brand: 'Mastercard',
    type: 'credit-3ds',
    scenario: '3DS - Optional (Will Pass)',
    cvc: '123',
    expiry: '12/25',
    expectedResult: '3ds-optional',
    errorReason: '3DS is supported but not required. Payment will be marked as paid.',
  },
];

export const SCENARIO_TEST_CARDS: TestCard[] = [
  {
    number: '4200000000000018',
    brand: 'Visa',
    type: 'credit',
    scenario: 'Card Expired',
    cvc: '123',
    expiry: '01/20', // MUST use past expiry (01/20 = Jan 2020)
    expectedResult: 'decline',
    errorCode: 'card_expired',
    errorReason: 'The card used has already expired. IMPORTANT: Use a past expiry date (e.g., 01/20).',
  },
  {
    number: '4300000000000017',
    brand: 'Visa',
    type: 'credit',
    scenario: 'Invalid CVC',
    cvc: '000', // Use invalid CVC
    expiry: '12/25',
    expectedResult: 'decline',
    errorCode: 'cvc_invalid',
    errorReason: 'The inputted CVC/CVN is incorrect for the card number passed.',
  },
  {
    number: '4400000000000016',
    brand: 'Visa',
    type: 'credit',
    scenario: 'Generic Decline',
    cvc: '123',
    expiry: '12/25',
    expectedResult: 'decline',
    errorCode: 'generic_decline',
    errorReason: 'The payment failed to be processed due to unknown reasons.',
  },
  {
    number: '4500000000000015',
    brand: 'Visa',
    type: 'credit',
    scenario: 'Fraudulent',
    cvc: '123',
    expiry: '12/25',
    expectedResult: 'decline',
    errorCode: 'fraudulent',
    errorReason: 'The payment was blocked by the processor as suspect fraud.',
  },
  {
    number: '5100000000000198',
    brand: 'Mastercard',
    type: 'credit',
    scenario: 'Insufficient Funds',
    cvc: '123',
    expiry: '12/25',
    expectedResult: 'decline',
    errorCode: 'insufficient_funds',
    errorReason: 'The card does not have sufficient funds to complete the transaction.',
  },
  {
    number: '5200000000000197',
    brand: 'Mastercard',
    type: 'credit',
    scenario: 'Processor Blocked',
    cvc: '123',
    expiry: '12/25',
    expectedResult: 'decline',
    errorCode: 'processor_blocked',
    errorReason: 'The transaction was blocked by the processor as suspect fraud.',
  },
  {
    number: '5300000000000196',
    brand: 'Mastercard',
    type: 'credit',
    scenario: 'Lost Card',
    cvc: '123',
    expiry: '12/25',
    expectedResult: 'decline',
    errorCode: 'lost_card',
    errorReason: 'The card used is reported lost.',
  },
  {
    number: '5400000000000195',
    brand: 'Mastercard',
    type: 'credit',
    scenario: 'Stolen Card',
    cvc: '123',
    expiry: '12/25',
    expectedResult: 'decline',
    errorCode: 'stolen_card',
    errorReason: 'The card used is reported stolen.',
  },
  {
    number: '5500000000000194',
    brand: 'Mastercard',
    type: 'credit',
    scenario: 'Processor Unavailable',
    cvc: '123',
    expiry: '12/25',
    expectedResult: 'decline',
    errorCode: 'processor_unavailable',
    errorReason: 'The processing of the card failed due to unknown reason.',
  },
  {
    number: '4600000000000014',
    brand: 'Visa',
    type: 'credit',
    scenario: 'PayMongo Fraud Block',
    cvc: '123',
    expiry: '12/25',
    expectedResult: 'decline',
    errorCode: 'blocked',
    errorReason: 'The transaction is blocked by PayMongo\'s fraud detection engine.',
  },
];

export const ALL_TEST_CARDS: TestCard[] = [
  ...BASIC_TEST_CARDS,
  ...THREE_DS_TEST_CARDS,
  ...SCENARIO_TEST_CARDS,
];

/**
 * Get test card by number
 */
export function getTestCardByNumber(cardNumber: string): TestCard | undefined {
  return ALL_TEST_CARDS.find(card => card.number === cardNumber);
}

/**
 * Get all test cards grouped by category
 */
export function getTestCardsByCategory() {
  return {
    basic: BASIC_TEST_CARDS,
    threeDS: THREE_DS_TEST_CARDS,
    scenarios: SCENARIO_TEST_CARDS,
  };
}
