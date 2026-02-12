import { supabase } from '../lib/supabase';
import { Voucher } from '../types/database.types';

export type VoucherValidationErrorCode =
    | 'NOT_FOUND'
    | 'INACTIVE'
    | 'NOT_STARTED'
    | 'EXPIRED'
    | 'MIN_ORDER_NOT_MET';

export interface VoucherValidationResult {
    voucher: Voucher | null;
    errorCode: VoucherValidationErrorCode | null;
}

/**
 * Fetch all active vouchers
 * Returns vouchers that are currently active and within their claimable period
 */
export const getAllVouchers = async (): Promise<Voucher[]> => {
    const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching vouchers:', error);
        throw error;
    }

    return data || [];
};

/**
 * Find a specific voucher by code
 * @param code - Voucher code (e.g., "WELCOME10")
 */
export const getVoucherByCode = async (code: string): Promise<Voucher | null> => {
    const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // No rows returned - voucher not found
            return null;
        }
        console.error('Error fetching voucher by code:', error);
        throw error;
    }

    return data;
};

/**
 * Admin creates a new voucher
 * @param voucherData - Voucher details
 */
export const createVoucher = async (
    voucherData: Omit<Voucher, 'id' | 'created_at' | 'updated_at'>
): Promise<Voucher> => {
    const { data, error } = await supabase
        .from('vouchers')
        .insert([voucherData])
        .select()
        .single();

    if (error) {
        console.error('Error creating voucher:', error);
        throw error;
    }

    return data;
};

/**
 * Admin updates an existing voucher
 * @param id - Voucher ID
 * @param updates - Fields to update
 */
export const updateVoucher = async (
    id: string,
    updates: Partial<Omit<Voucher, 'id' | 'created_at' | 'updated_at'>>
): Promise<Voucher> => {
    const { data, error } = await supabase
        .from('vouchers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating voucher:', error);
        throw error;
    }

    return data;
};

/**
 * Admin deletes a voucher
 * @param id - Voucher ID
 */
export const deleteVoucher = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('vouchers')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting voucher:', error);
        throw error;
    }
};

/**
 * Validate if a voucher can be used
 * @param code - Voucher code
 * @param orderTotal - Total order amount
 * @returns Detailed voucher validation result
 */
export const validateVoucherDetailed = async (
    code: string,
    orderTotal: number
): Promise<VoucherValidationResult> => {
    const voucher = await getVoucherByCode(code);

    if (!voucher) {
        return { voucher: null, errorCode: 'NOT_FOUND' };
    }

    // Check if voucher is active
    if (!voucher.is_active) {
        return { voucher: null, errorCode: 'INACTIVE' };
    }

    // Check date validity
    const now = new Date();
    const claimableFrom = new Date(voucher.claimable_from);
    const claimableUntil = new Date(voucher.claimable_until);

    if (now < claimableFrom) {
        return { voucher: null, errorCode: 'NOT_STARTED' };
    }

    if (now > claimableUntil) {
        return { voucher: null, errorCode: 'EXPIRED' };
    }

    // Check minimum order value
    if (orderTotal < voucher.min_order_value) {
        return { voucher: null, errorCode: 'MIN_ORDER_NOT_MET' };
    }

    // All checks passed
    return { voucher, errorCode: null };
};

/**
 * Validate if a voucher can be used
 * @param code - Voucher code
 * @param orderTotal - Total order amount
 * @returns Voucher if valid, null if invalid
 */
export const validateVoucher = async (
    code: string,
    orderTotal: number
): Promise<Voucher | null> => {
    const result = await validateVoucherDetailed(code, orderTotal);
    return result.voucher;
};

/**
 * Calculate discount amount based on voucher
 * @param voucher - Voucher object
 * @param orderTotal - Total order amount
 * @returns Discount amount in pesos
 */
export const calculateVoucherDiscount = (
    voucher: Voucher,
    orderTotal: number
): number => {
    let discount = 0;

    switch (voucher.voucher_type) {
        case 'percentage':
            discount = orderTotal * (voucher.value / 100);
            // Apply max discount cap if exists
            if (voucher.max_discount && discount > voucher.max_discount) {
                discount = voucher.max_discount;
            }
            break;

        case 'fixed':
            discount = Math.min(voucher.value, orderTotal);
            break;

        case 'shipping':
            // Shipping vouchers return the shipping fee value
            discount = voucher.value;
            break;

        default:
            discount = 0;
    }

    return Math.round(discount);
};

export const voucherService = {
    getAllVouchers,
    getVoucherByCode,
    createVoucher,
    updateVoucher,
    deleteVoucher,
    validateVoucherDetailed,
    validateVoucher,
    calculateVoucherDiscount,
};
