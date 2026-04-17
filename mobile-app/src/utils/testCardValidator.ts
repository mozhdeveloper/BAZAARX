/**
 * Test Card Validator (Mobile)
 * Validates test cards and simulates decline responses
 * Use this in your payment service to handle test scenarios
 * 
 * Supports ALL 23 test cards:
 * - 9 Basic cards (success)
 * - 4 3DS cards (3ds-required, 3ds-optional, decline)
 * - 10 Scenario cards (various decline reasons, expired, invalid CVC)
 */

import { getTestCardByNumber, ALL_TEST_CARDS } from '../constants/testCards';

export interface TestCardValidationResult {
  isTestCard: boolean;
  shouldDecline: boolean;
  errorCode?: string;
  errorMessage?: string;
  scenario?: string;
  requiresAuth?: boolean; // for 3DS cards
}

/**
 * Parse expiry date in MM/YY format and return end-of-month date
 * This ensures we check if expiry month/year has passed
 */
function parseExpiryDate(expiryDate: string): Date {
  const [month, year] = expiryDate.split('/');
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  const fullYear = yearNum < 100 ? 2000 + yearNum : yearNum;
  
  // Set to last day of the expiry month to properly check expiration
  // Card is valid until the last moment of the expiry month
  const nextMonth = monthNum === 12 ? 0 : monthNum;
  const nextYear = monthNum === 12 ? fullYear + 1 : fullYear;
  const endOfMonth = new Date(nextYear, nextMonth, 0, 23, 59, 59);
  
  return endOfMonth;
}

/**
 * Compare dates ignoring time component (checking only year and month)
 */
function isDateInPast(date: Date): boolean {
  const today = new Date();
  // Set today to end of today to be consistent
  today.setHours(23, 59, 59, 999);
  return date < today;
}

/**
 * Validates a test card and determines if it should be declined
 * Call this BEFORE sending to PayMongo API
 * 
 * Comprehensive validation for all 23 test cards
 */
export function validateTestCard(
  cardNumber: string,
  expiryDate: string,
  cvv: string
): TestCardValidationResult {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🔍 [MOBILE] TEST CARD VALIDATION`);
  console.log(`Card: ${cardNumber} | Expiry: ${expiryDate} | CVC: ${cvv}`);
  console.log(`${'═'.repeat(80)}`);
  
  // Log available test cards for debugging
  console.log(`📊 Total test cards in database: ${ALL_TEST_CARDS?.length || 0}`);
  
  const testCard = getTestCardByNumber(cardNumber);
  
  if (!testCard) {
    console.log(`⚠️  CARD NOT FOUND: ${cardNumber}`);
    console.log(`    This is not a test card. Will proceed with real PayMongo processing.`);
    return { isTestCard: false, shouldDecline: false };
  }
  
  console.log(`✅ TEST CARD FOUND: ${testCard.scenario}`);
  console.log(`   Brand: ${testCard.brand} | Type: ${testCard.type}`);
  console.log(`   Expected Result: ${testCard.expectedResult}`);

  // Base result from test card definition
  let result: TestCardValidationResult = {
    isTestCard: true,
    scenario: testCard.scenario,
    shouldDecline: testCard.expectedResult === 'decline',
    errorCode: testCard.errorCode,
    errorMessage: testCard.errorReason,
    requiresAuth: testCard.expectedResult === '3ds-required',
  };

  console.log(`\n📋 SCENARIO-SPECIFIC VALIDATION:`);

  // ============================================
  // CARD EXPIRED - Scenario #1
  // ============================================
  if (testCard.number === '4200000000000018') {
    console.log(`\n🕐 Card Expired (4200000000000018)`);
    console.log(`   Input expiry: ${expiryDate}`);
    
    const expiryDateObj = parseExpiryDate(expiryDate);
    const isExpired = isDateInPast(expiryDateObj);
    
    console.log(`   Parsed date: ${expiryDateObj.toISOString().split('T')[0]} (end of month)`);
    console.log(`   Today: ${new Date().toISOString().split('T')[0]}`);
    console.log(`   Is expired? ${isExpired}`);
    
    result.shouldDecline = isExpired;
    if (isExpired) {
      result.errorCode = 'card_expired';
      result.errorMessage = 'The card used has already expired.';
      console.log(`   ✓ WILL DECLINE with code: card_expired`);
    } else {
      result.shouldDecline = false;
      result.errorMessage = 'Card is valid (not expired yet).';
      console.log(`   ✓ WILL SUCCEED - expiry date is still valid`);
    }
  }

  // ============================================
  // INVALID CVC - Scenario #2
  // ============================================
  if (testCard.number === '4300000000000017') {
    console.log(`\n🔐 Invalid CVC (4300000000000017)`);
    console.log(`   Input CVC: ${cvv}`);
    console.log(`   Expected CVC for decline: 000`);
    
    const isInvalidCvc = cvv === '000';
    result.shouldDecline = isInvalidCvc;
    
    if (isInvalidCvc) {
      result.errorCode = 'cvc_invalid';
      result.errorMessage = 'The inputted CVC/CVN is incorrect for the card number passed.';
      console.log(`   ✓ WILL DECLINE - CVC is 000 (invalid)`);
    } else {
      result.shouldDecline = false;
      result.errorMessage = 'CVC is valid.';
      console.log(`   ✓ WILL SUCCEED - CVC is valid (not 000)`);
    }
  }

  // ============================================
  // GENERIC DECLINE - Scenario #3
  // ============================================
  if (testCard.number === '4400000000000016') {
    console.log(`\n❌ Generic Decline (4400000000000016)`);
    console.log(`   This card always declines with generic_decline error`);
    result.shouldDecline = true;
    result.errorCode = 'generic_decline';
    result.errorMessage = 'The payment failed to be processed due to unknown reasons.';
    console.log(`   ✓ WILL DECLINE with code: generic_decline`);
  }

  // ============================================
  // FRAUDULENT - Scenario #4
  // ============================================
  if (testCard.number === '4500000000000015') {
    console.log(`\n🚨 Fraudulent (4500000000000015)`);
    console.log(`   This card is blocked as suspected fraud`);
    result.shouldDecline = true;
    result.errorCode = 'fraudulent';
    result.errorMessage = 'The payment was blocked by the processor as suspect fraud.';
    console.log(`   ✓ WILL DECLINE with code: fraudulent`);
  }

  // ============================================
  // INSUFFICIENT FUNDS - Scenario #5
  // ============================================
  if (testCard.number === '5100000000000198') {
    console.log(`\n💰 Insufficient Funds (5100000000000198)`);
    console.log(`   This card does not have sufficient funds`);
    result.shouldDecline = true;
    result.errorCode = 'insufficient_funds';
    result.errorMessage = 'The card does not have sufficient funds to complete the transaction.';
    console.log(`   ✓ WILL DECLINE with code: insufficient_funds`);
  }

  // ============================================
  // PROCESSOR BLOCKED - Scenario #6
  // ============================================
  if (testCard.number === '5200000000000197') {
    console.log(`\n🚫 Processor Blocked (5200000000000197)`);
    console.log(`   This card is blocked by the processor as suspected fraud`);
    result.shouldDecline = true;
    result.errorCode = 'processor_blocked';
    result.errorMessage = 'The transaction was blocked by the processor as suspect fraud.';
    console.log(`   ✓ WILL DECLINE with code: processor_blocked`);
  }

  // ============================================
  // LOST CARD - Scenario #7
  // ============================================
  if (testCard.number === '5300000000000196') {
    console.log(`\n🔒 Lost Card (5300000000000196)`);
    console.log(`   This card is reported as lost`);
    result.shouldDecline = true;
    result.errorCode = 'lost_card';
    result.errorMessage = 'The card used is reported lost.';
    console.log(`   ✓ WILL DECLINE with code: lost_card`);
  }

  // ============================================
  // STOLEN CARD - Scenario #8
  // ============================================
  if (testCard.number === '5400000000000195') {
    console.log(`\n🚨 Stolen Card (5400000000000195)`);
    console.log(`   This card is reported as stolen`);
    result.shouldDecline = true;
    result.errorCode = 'stolen_card';
    result.errorMessage = 'The card used is reported stolen.';
    console.log(`   ✓ WILL DECLINE with code: stolen_card`);
  }

  // ============================================
  // PROCESSOR UNAVAILABLE - Scenario #9
  // ============================================
  if (testCard.number === '5500000000000194') {
    console.log(`\n⚠️  Processor Unavailable (5500000000000194)`);
    console.log(`   Processor service is not available`);
    result.shouldDecline = true;
    result.errorCode = 'processor_unavailable';
    result.errorMessage = 'The processing of the card failed due to unknown reason.';
    console.log(`   ✓ WILL DECLINE with code: processor_unavailable`);
  }

  // ============================================
  // PAYMONGO FRAUD BLOCK - Scenario #10
  // ============================================
  if (testCard.number === '4600000000000014') {
    console.log(`\n🛡️  PayMongo Fraud Block (4600000000000014)`);
    console.log(`   Transaction blocked by PayMongo fraud detection`);
    result.shouldDecline = true;
    result.errorCode = 'blocked';
    result.errorMessage = 'The transaction is blocked by PayMongo\'s fraud detection engine.';
    console.log(`   ✓ WILL DECLINE with code: blocked`);
  }

  // ============================================
  // 3DS CARDS - Authentication Cards
  // ============================================
  if (testCard.number === '4120000000000007') {
    console.log(`\n🔐 3DS - Authentication Required (4120000000000007)`);
    console.log(`   This card requires 3DS authentication`);
    result.shouldDecline = false;
    result.requiresAuth = true;
    result.errorMessage = '3DS authentication must be completed for the payment to be marked as paid.';
    console.log(`   ✓ REQUIRES 3DS AUTHENTICATION`);
  }

  if (testCard.number === '4230000000000004') {
    console.log(`\n🔐 3DS - Declined Before Auth (4230000000000004)`);
    console.log(`   This card will be declined BEFORE 3DS authentication`);
    result.shouldDecline = true;
    result.requiresAuth = false;
    result.errorCode = 'generic_decline';
    result.errorMessage = 'Card will be declined with generic_decline before authentication.';
    console.log(`   ✓ WILL DECLINE with code: generic_decline (before 3DS)`);
  }

  if (testCard.number === '5234000000000106') {
    console.log(`\n🔐 3DS - Declined After Auth (5234000000000106)`);
    console.log(`   This card will be declined AFTER successful 3DS authentication`);
    result.shouldDecline = true;
    result.requiresAuth = true;
    result.errorCode = 'generic_decline';
    result.errorMessage = 'Card will be declined with generic_decline after successful authentication.';
    console.log(`   ✓ WILL DECLINE with code: generic_decline (after 3DS)`);
  }

  if (testCard.number === '5123000000000001') {
    console.log(`\n🔐 3DS - Optional (Will Pass) (5123000000000001)`);
    console.log(`   This card supports 3DS but does not require it`);
    result.shouldDecline = false;
    result.requiresAuth = false;
    result.errorMessage = '3DS is supported but not required. Payment will be marked as paid.';
    console.log(`   ✓ WILL SUCCEED - 3DS optional`);
  }

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`📊 FINAL VALIDATION RESULT:`);
  console.log(`   isTestCard: ${result.isTestCard}`);
  console.log(`   shouldDecline: ${result.shouldDecline}`);
  console.log(`   errorCode: ${result.errorCode || 'none'}`);
  console.log(`   errorMessage: ${result.errorMessage}`);
  console.log(`   requiresAuth: ${result.requiresAuth || false}`);
  console.log(`${'═'.repeat(80)}\n`);

  return result;
}

/**
 * Get current date in MM/YY format
 */
export function getCurrentExpiryDate(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = String(today.getFullYear()).slice(-2);
  return `${month}/${year}`;
}

/**
 * Get past date (N months ago) in MM/YY format
 */
export function getPastExpiryDate(monthsAgo: number = 6): string {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${year}`;
}

/**
 * Get future date (N months ahead) in MM/YY format
 */
export function getFutureExpiryDate(monthsAhead: number = 12): string {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsAhead);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${year}`;
}

/**
 * Check if an expiry date is in the past
 */
export function isExpiryInPast(expiryDate: string): boolean {
  const [month, year] = expiryDate.split('/');
  const fullYear = parseInt(year, 10) < 100 ? 2000 + parseInt(year, 10) : parseInt(year, 10);
  const expiry = new Date(fullYear, parseInt(month, 10) - 1, 1);
  const today = new Date();
  return expiry < today;
}
