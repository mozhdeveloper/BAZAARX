import { supabase } from '../lib/supabase';
import type { Voucher as DbVoucher, VoucherType } from '../types/database.types';

export type VoucherValidationErrorCode =
    | 'NOT_FOUND'
    | 'INACTIVE'
    | 'NOT_STARTED'
    | 'EXPIRED'
    | 'MIN_ORDER_NOT_MET'
    | 'ALREADY_USED'
    | 'SELLER_MISMATCH'
    | 'UNKNOWN';

export interface VoucherValidationResult {
    voucher: Voucher | null;
    errorCode: VoucherValidationErrorCode | null;
}

export interface Voucher {
    id: string;
    code: string;
    title: string;
    description: string;
    type: VoucherType;
    value: number;
    minOrderValue: number;
    maxDiscount?: number;
    sellerId?: string;
    validFrom: Date;
    validTo: Date;
    usageLimit: number | null;
    claimLimit: number | null;
    isActive: boolean;
}

const mapDbVoucherToVoucher = (dbVoucher: DbVoucher): Voucher => ({
    id: dbVoucher.id,
    code: dbVoucher.code,
    title: dbVoucher.title,
    description: dbVoucher.description || '',
    type: dbVoucher.voucher_type,
    value: dbVoucher.value,
    minOrderValue: dbVoucher.min_order_value,
    maxDiscount: dbVoucher.max_discount ?? undefined,
    sellerId: dbVoucher.seller_id ?? undefined,
    validFrom: new Date(dbVoucher.claimable_from),
    validTo: new Date(dbVoucher.claimable_until),
    usageLimit: dbVoucher.usage_limit,
    claimLimit: dbVoucher.claim_limit,
    isActive: dbVoucher.is_active,
});

export const getVoucherByCode = async (code: string): Promise<Voucher | null> => {
    const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        console.error('Error fetching voucher by code:', error);
        return null;
    }

    return mapDbVoucherToVoucher(data);
};

export const validateVoucherDetailed = async (
    code: string,
    orderTotal: number,
    buyerId?: string | null
): Promise<VoucherValidationResult> => {
    const voucher = await getVoucherByCode(code);

    if (!voucher) {
        return { voucher: null, errorCode: 'NOT_FOUND' };
    }

    if (!voucher.isActive) {
        return { voucher: null, errorCode: 'INACTIVE' };
    }

    const now = new Date();

    if (now < voucher.validFrom) {
        return { voucher: null, errorCode: 'NOT_STARTED' };
    }

    if (now > voucher.validTo) {
        return { voucher: null, errorCode: 'EXPIRED' };
    }

    if (orderTotal < voucher.minOrderValue) {
        return { voucher: null, errorCode: 'MIN_ORDER_NOT_MET' };
    }

    if (voucher.claimLimit != null && buyerId) {
        const { count, error } = await supabase
            .from('order_vouchers')
            .select('*', { count: 'exact', head: true })
            .eq('voucher_id', voucher.id)
            .eq('buyer_id', buyerId);

        if (error) {
            console.error('Error checking voucher usage:', error);
        } else if (count != null && count >= voucher.claimLimit) {
            return { voucher: null, errorCode: 'ALREADY_USED' };
        }
    }

    return { voucher, errorCode: null };
};

export const validateVoucher = async (
    code: string,
    orderTotal: number,
    buyerId?: string | null
): Promise<Voucher | null> => {
    const result = await validateVoucherDetailed(code, orderTotal, buyerId);
    return result.voucher;
};

export const calculateVoucherDiscount = (
    voucher: Voucher,
    orderTotal: number,
    shippingFee: number = 0
): number => {
    let discount = 0;

    switch (voucher.type) {
        case 'percentage':
            discount = orderTotal * (voucher.value / 100);
            if (voucher.maxDiscount && discount > voucher.maxDiscount) {
                discount = voucher.maxDiscount;
            }
            break;

        case 'fixed':
            discount = Math.min(voucher.value, orderTotal);
            break;

        case 'shipping':
            discount = shippingFee;
            break;

        default:
            discount = 0;
    }

    return Math.round(discount);
};

export const getVoucherErrorMessage = (errorCode: VoucherValidationErrorCode): string => {
    switch (errorCode) {
        case 'NOT_FOUND':
            return 'Voucher code not found';
        case 'INACTIVE':
            return 'This voucher is no longer active';
        case 'NOT_STARTED':
            return 'This voucher is not yet available';
        case 'EXPIRED':
            return 'This voucher has expired';
        case 'MIN_ORDER_NOT_MET':
            return 'Minimum order requirement not met';
        case 'ALREADY_USED':
            return 'You have already used this voucher';
        case 'SELLER_MISMATCH':
            return 'This voucher is not valid for this seller';
        default:
            return 'Unable to apply voucher';
    }
};

export const voucherService = {
    getVoucherByCode,
    validateVoucherDetailed,
    validateVoucher,
    calculateVoucherDiscount,
    getVoucherErrorMessage,
};
