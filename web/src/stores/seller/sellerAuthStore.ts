/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { authService } from '@/services/authService';
import type { Seller } from './sellerTypes';
import { mapDbSellerToSeller } from './sellerHelpers';
import { sellerService } from '@/services/sellerService';
import type { VacationReason } from '@/types/database.types';

interface AuthStore {
    seller: Seller | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    register: (
        sellerData: Partial<Seller> & {
            email: string;
            password: string;
            firstName?: string;
            lastName?: string;
            storeContact?: string;
        },
    ) => Promise<boolean>;
    logout: () => void;
    updateProfile: (updates: Partial<Seller>) => void;
    updateSellerDetails: (details: Partial<Seller>) => void;
    authenticateSeller: () => void;
    createBuyerAccount: () => Promise<boolean>;
    hydrateSellerContext: (userId: string) => Promise<boolean>;
    hydrateSellerFromSession: () => Promise<boolean>;
    setVacationMode: (reason?: VacationReason) => Promise<boolean>;
    disableVacationMode: () => Promise<boolean>;
}

// Auth Store
export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            seller: null,
            isAuthenticated: false,
            login: async (email: string, password: string) => {
                if (!isSupabaseConfigured()) {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    console.warn(
                        "Mock login disabled - please configure Supabase",
                    );
                    return false;
                }

                try {
                    const result = await authService.signIn(email, password);
                    if (!result || !result.user) {
                        console.error(
                            "Supabase login failed: No user returned",
                        );
                        return false;
                    }

                    const { user } = result;
                    return get().hydrateSellerContext(user.id);
                } catch (err) {
                    console.error("Login error:", err);
                    return false;
                }
            },
            register: async (sellerData) => {
                if (!isSupabaseConfigured()) {
                    // Existing mock flow
                    const fullAddress = `${sellerData.businessAddress}, ${sellerData.city}, ${sellerData.province} ${sellerData.postalCode}`;
                    const firstName = sellerData.firstName?.trim() || "";
                    const lastName = sellerData.lastName?.trim() || "";
                    const ownerName =
                        `${firstName} ${lastName}`.trim() ||
                        sellerData.ownerName ||
                        sellerData.email?.split("@")[0] ||
                        "New Seller";
                    const newSeller: Seller = {
                        id: `seller-${Date.now()}`,
                        name: ownerName,
                        ownerName,
                        email: sellerData.email!,
                        phone: sellerData.storeContact || sellerData.phone || "",
                        businessName: sellerData.businessName || "",
                        storeName: sellerData.storeName || "My Store",
                        storeDescription: sellerData.storeDescription || "",
                        storeCategory: sellerData.storeCategory || [],
                        businessType: sellerData.businessType || "",
                        businessRegistrationNumber:
                            sellerData.businessRegistrationNumber || "",
                        taxIdNumber: sellerData.taxIdNumber || "",
                        businessAddress: sellerData.businessAddress || "",
                        city: sellerData.city || "",
                        province: sellerData.province || "",
                        postalCode: sellerData.postalCode || "",
                        storeAddress: fullAddress,
                        bankName: sellerData.bankName || "",
                        accountName: sellerData.accountName || "",
                        accountNumber: sellerData.accountNumber || "",
                        isVerified: false,
                        approvalStatus: "pending",
                        rating: 0,
                        totalSales: 0,
                        joinDate: new Date().toISOString().split("T")[0],
                    };
                    set({ seller: newSeller, isAuthenticated: false });
                    return true;
                }

                try {
                    // First, try to sign in with the provided credentials
                    // This will succeed if the user already exists, fail if they don't
                    let user;
                    let isExistingUser = false;
                    const firstName =
                        sellerData.firstName?.trim() ||
                        sellerData.ownerName?.trim()?.split(" ")[0] ||
                        null;
                    const lastName =
                        sellerData.lastName?.trim() ||
                        sellerData.ownerName?.trim()?.split(" ").slice(1).join(" ") ||
                        null;
                    const ownerName =
                        `${firstName || ""} ${lastName || ""}`.trim() ||
                        sellerData.ownerName ||
                        sellerData.storeName ||
                        sellerData.email?.split("@")[0] ||
                        "Seller";
                    const storeContact =
                        sellerData.storeContact?.trim() || sellerData.phone || "";
                    const normalizedRegisterEmail =
                        sellerData.email?.trim().toLowerCase() || "";
                    const normalizedRegisterPhone = storeContact;

                    try {
                        const signInResult = await authService.signIn(
                            sellerData.email!,
                            sellerData.password!,
                        );
                        if (signInResult && signInResult.user) {
                            // User exists, get their profile to check user type
                            user = signInResult.user;
                            isExistingUser = true;

                            const alreadySeller = await authService.hasRole(
                                user.id,
                                "seller",
                            );

                            if (alreadySeller) {
                                console.error(
                                    "User is already registered as a seller",
                                );
                                return false;
                            }
                        }
                    } catch (signInError) {
                        // Sign in failed, meaning user doesn't exist, so we'll create a new account
                        isExistingUser = false;
                    }

                    // If user doesn't exist, try to sign up
                    if (!isExistingUser) {
                        try {
                            const signUpResult = await authService.signUp(
                                sellerData.email!,
                                sellerData.password!,
                                {
                                    first_name: firstName || undefined,
                                    last_name: lastName || undefined,
                                    phone: storeContact || undefined,
                                    user_type: "seller",
                                    email: sellerData.email!,
                                    password: sellerData.password!,
                                },
                            );

                            if (!signUpResult || !signUpResult.user) {
                                console.error(
                                    "Signup failed: No user returned",
                                );
                                return false;
                            }

                            user = signUpResult.user;
                        } catch (signUpError: any) {
                            // If signup fails because user already exists, try to sign in again
                            if (
                                signUpError?.isAlreadyRegistered ||
                                signUpError?.message?.includes(
                                    "User already registered",
                                ) ||
                                signUpError?.message?.includes(
                                    "already exists",
                                ) ||
                                signUpError?.status === 422
                            ) {
                                // User exists, sign in and continue with upgrade process
                                const signInResult = await authService.signIn(
                                    sellerData.email!,
                                    sellerData.password!,
                                );
                                if (signInResult && signInResult.user) {
                                    user = signInResult.user;
                                    isExistingUser = true;

                                    const alreadySeller =
                                        await authService.hasRole(
                                            user.id,
                                            "seller",
                                        );

                                    if (alreadySeller) {
                                        console.error(
                                            "User is already registered as a seller",
                                        );
                                        return false;
                                    }
                                } else {
                                    console.error(
                                        "Could not sign in existing user after failed signup",
                                    );
                                    return false;
                                }
                            } else {
                                // Some other error occurred
                                console.error("Signup error:", signUpError);
                                throw signUpError;
                            }
                        }
                    }

                    // At this point, we have a user account
                    // If it's an existing user (not a new signup), upgrade their profile to seller
                    if (isExistingUser) {
                        // Use the authService to upgrade the user type
                        await authService.upgradeUserType(user.id, "seller");
                    }

                    const { error: profileUpsertError } = await supabase
                        .from("profiles")
                        .upsert(
                            {
                                id: user.id,
                                email: sellerData.email!,
                                first_name: firstName,
                                last_name: lastName,
                                phone: storeContact || null,
                            },
                            {
                                onConflict: "id",
                                ignoreDuplicates: false,
                            },
                        );

                    if (profileUpsertError) {
                        throw profileUpsertError;
                    }

                    // 2) Create or update seller record (use upsert to handle conflicts)
                    const { sellerService } =
                        await import("@/services/sellerService");

                    const sellerInsertData = {
                        id: user.id,
                        business_name:
                            sellerData.businessName ||
                            sellerData.storeName ||
                            "My Store",
                        store_name: sellerData.storeName || "My Store",
                        store_description: sellerData.storeDescription || "",
                        store_contact_number: storeContact || null,
                        store_category: sellerData.storeCategory || ["General"],
                        business_type:
                            sellerData.businessType || "sole_proprietor",
                        business_registration_number:
                            sellerData.businessRegistrationNumber || "",
                        tax_id_number: sellerData.taxIdNumber || "",
                        business_address:
                            sellerData.businessAddress ||
                            sellerData.storeAddress ||
                            "",
                        city: sellerData.city || "",
                        province: sellerData.province || "",
                        postal_code: sellerData.postalCode || "",
                        bank_name: sellerData.bankName || "",
                        account_name: sellerData.accountName || "",
                        account_number: sellerData.accountNumber || "",
                        business_permit_url: null,
                        valid_id_url: null,
                        proof_of_address_url: null,
                        dti_registration_url: null,
                        tax_id_url: null,
                        is_verified: false,
                        approval_status: "pending" as const,
                        rating: 0,
                        total_sales: 0,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        join_date: new Date().toISOString().split("T")[0],
                    };

                    const savedSeller =
                        await sellerService.upsertSeller(sellerInsertData);

                    if (!savedSeller) {
                        console.error("Seller insert failed");
                        return false;
                    }

                    const mappedSeller = mapDbSellerToSeller(savedSeller);
                    mappedSeller.email =
                        normalizedRegisterEmail || mappedSeller.email;
                    mappedSeller.phone =
                        normalizedRegisterPhone || mappedSeller.phone;

                    // 3) Set local auth state as pending (awaiting approval)
                    set({
                        seller: mappedSeller,
                        isAuthenticated: false,
                    });
                    return true;
                } catch (err) {
                    console.error("Registration error:", err);
                    return false;
                }
            },
            logout: () => {
                set({ seller: null, isAuthenticated: false });
            },
            updateProfile: (updates) => {
                const { seller } = get();
                if (seller) {
                    set({ seller: { ...seller, ...updates } });
                }
            },
            updateSellerDetails: (details) => {
                const { seller } = get();
                if (seller) {
                    set({ seller: { ...seller, ...details } });
                }
            },
            authenticateSeller: () => {
                const { seller } = get();
                if (seller && seller.isVerified) {
                    set({ isAuthenticated: true });
                }
            },

            createBuyerAccount: async () => {
                if (!isSupabaseConfigured()) {
                    console.warn(
                        "Supabase not configured - cannot create buyer account",
                    );
                    return true;
                }

                try {
                    const authStoreState = useAuthStore.getState();
                    let userId = authStoreState.seller?.id;

                    if (!userId) {
                        const {
                            data: { user },
                        } = await supabase.auth.getUser();
                        userId = user?.id;
                    }

                    if (!userId) {
                        console.error(
                            "No seller ID found - cannot create buyer account",
                        );
                        return false;
                    }

                    // Use authService to create buyer account
                    await authService.createBuyerAccount(userId);

                    return true;
                } catch (error) {
                    console.error("Error creating buyer account:", error);
                    return false;
                }
            },
            hydrateSellerContext: async (userId: string) => {
                if (!isSupabaseConfigured()) {
                    return false;
                }

                if (!userId) {
                    return false;
                }

                try {
                    const sellerProfile = await authService.getSellerProfile(userId);
                    if (!sellerProfile) {
                        return false;
                    }

                    const mappedSeller = mapDbSellerToSeller(sellerProfile);
                    const profileContact =
                        await authService.getProfileContact(userId);

                    if (profileContact) {
                        mappedSeller.email =
                            profileContact.email || mappedSeller.email;
                        mappedSeller.phone =
                            profileContact.phone || mappedSeller.phone;
                    }

                    // --- NEW: Fetch Business Profile to persist Checklist ---
                    const { data: businessProfileData } = await supabase
                        .from("seller_business_profiles")
                        .select("*")
                        .eq("seller_id", userId)
                        .maybeSingle();

                    if (businessProfileData) {
                        mappedSeller.businessType = businessProfileData.business_type || "";
                        mappedSeller.businessRegistrationNumber = businessProfileData.business_registration_number || "";
                        mappedSeller.taxIdNumber = businessProfileData.tax_id_number || "";
                        mappedSeller.businessAddress = businessProfileData.address_line_1 || businessProfileData.business_address || "";
                        mappedSeller.city = businessProfileData.city || "";
                        mappedSeller.province = businessProfileData.province || "";
                        mappedSeller.postalCode = businessProfileData.postal_code || "";
                    }

                    // --- NEW: Fetch Categories from Junction Table ---
                    const { data: categoryData } = await supabase
                        .from("seller_categories")
                        .select("categories(name)")
                        .eq("seller_id", userId);

                    if (categoryData && categoryData.length > 0) {
                        mappedSeller.storeCategory = categoryData
                            .map((row: any) => row.categories?.name)
                            .filter(Boolean);
                    } else {
                        mappedSeller.storeCategory = [];
                    }

                    // --- NEW: Fetch Verification Documents for Progress Sync ---
                    const { data: docData } = await supabase
                        .from("seller_verification_documents")
                        .select("*")
                        .eq("seller_id", userId)
                        .maybeSingle();

                    if (docData) {
                        mappedSeller.businessPermitUrl = docData.business_permit_url || undefined;
                        mappedSeller.validIdUrl = docData.valid_id_url || undefined;
                        mappedSeller.proofOfAddressUrl = docData.proof_of_address_url || undefined;
                        mappedSeller.dtiRegistrationUrl = docData.dti_registration_url || undefined;
                        mappedSeller.taxIdUrl = docData.tax_id_url || undefined;
                    }

                    // --- NEW: Fetch Latest Rejection for Global Banner ---
                    const { data: rejectionData } = await supabase
                        .from("seller_rejections")
                        .select("description, items:seller_rejection_items(document_field, reason)")
                        .eq("seller_id", userId)
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (rejectionData) {
                        mappedSeller.latestRejection = {
                            description: rejectionData.description || undefined,
                            items: (rejectionData.items || []).map((item: any) => ({
                                documentField: item.document_field,
                                reason: item.reason || undefined,
                            }))
                        };
                    } else {
                        mappedSeller.latestRejection = null;
                    }

                    set({ seller: mappedSeller, isAuthenticated: true });
                    return true;
                } catch (error) {
                    console.error("Failed to hydrate seller context:", error);
                    return false;
                }
            },
            hydrateSellerFromSession: async () => {
                if (!isSupabaseConfigured()) {
                    return false;
                }

                try {
                    const {
                        data: { user },
                        error,
                    } = await supabase.auth.getUser();

                    if (error || !user?.id) {
                        return false;
                    }

                    return get().hydrateSellerContext(user.id);
                } catch (error) {
                    console.error("Failed to hydrate seller from session:", error);
                    return false;
                }
            },
            setVacationMode: async (reason?: VacationReason) => {
                const { seller } = get();
                if (!seller) return false;

                const result = await sellerService.enableVacationMode(seller.id, reason);
                if (result.success) {
                    set({ seller: { ...seller, isVacationMode: true, vacationReason: reason || null } });
                }
                return result.success;
            },
            disableVacationMode: async () => {
                const { seller } = get();
                if (!seller) return false;

                const result = await sellerService.disableVacationMode(seller.id);
                if (result.success) {
                    set({ seller: { ...seller, isVacationMode: false, vacationReason: null } });
                }
                return result.success;
            },
        }),
        {
            name: "seller-auth-storage",
        },
    ),
);
