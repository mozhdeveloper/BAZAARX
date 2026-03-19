/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { notificationService } from '@/services/notificationService';
import type { Seller, SellerDocument, SellerDocumentField, PartialSellerRejectionInput, SellerRejectionRecord } from './adminTypes';
import { SELLER_DOCUMENT_CONFIG, DOCUMENT_FIELD_LABELS, toUiSellerStatus } from './adminTypes';

export const useAdminSellers = create<SellersState>()(
  persist(
    (set) => ({
      sellers: [],
      selectedSeller: null,
      pendingSellers: [],
      isLoading: false,
      error: null,

      loadSellers: async () => {
        set({ isLoading: true, error: null });

        // Try to load from Supabase if configured
        if (isSupabaseConfigured()) {
          try {
            let sellersData: any[] | null = null;
            let sellersError: any = null;

            const primaryResult = await supabase
              .from('sellers')
              .select(`
                *,
                profiles(*),
                business_profile:seller_business_profiles(*),
                payout_account:seller_payout_accounts(*),
                verification_documents:seller_verification_documents(*),
                tier:seller_tiers(tier_level, bypasses_assessment)
              `)
              .order('created_at', { ascending: false });

            sellersData = primaryResult.data as any[] | null;
            sellersError = primaryResult.error;

            if (sellersError) {
              const fallbackResult = await supabase
                .from('sellers')
                .select(`
                  *,
                  profiles(*)
                `)
                .order('created_at', { ascending: false });

              sellersData = fallbackResult.data as any[] | null;
              sellersError = fallbackResult.error;
            }

            if (sellersError) {
              console.error('Error loading sellers:', sellersError);
              set({ error: 'Failed to load sellers', isLoading: false });
              return;
            }

            const sellerIds = (sellersData || []).map((seller) => seller.id).filter(Boolean);
            const latestRejectionsBySeller = new Map<string, SellerRejectionRecord>();
            const verificationDocsBySeller = new Map<string, any>();

            if (sellerIds.length > 0) {
              const { data: verificationRows, error: verificationError } = await supabase
                .from('seller_verification_documents')
                .select('*')
                .in('seller_id', sellerIds);

              if (verificationError) {
                console.warn('[AdminSellers] Could not load seller verification documents:', verificationError.message);
              } else {
                for (const row of verificationRows || []) {
                  if (!row?.seller_id) continue;
                  verificationDocsBySeller.set(row.seller_id, row);
                }
              }

              const { data: rejectionRows, error: rejectionError } = await supabase
                .from('seller_rejections')
                .select(`
                  id,
                  seller_id,
                  description,
                  rejection_type,
                  created_at,
                  created_by,
                  items:seller_rejection_items(document_field, reason, created_at)
                `)
                .in('seller_id', sellerIds)
                .order('created_at', { ascending: false });

              if (rejectionError) {
                console.warn('[AdminSellers] Could not load rejection details:', rejectionError.message);
              } else {
                for (const row of (rejectionRows || []) as SellerRejectionRecord[]) {
                  if (!row?.seller_id || latestRejectionsBySeller.has(row.seller_id)) {
                    continue;
                  }
                  latestRejectionsBySeller.set(row.seller_id, row);
                }
              }
            }

            const sellers: Seller[] = (sellersData || []).map((seller: any) => {
              const profileRaw = seller.profiles || seller.profile || null;
              const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
              const businessProfile = seller.business_profile || seller.seller_business_profiles || {};
              const payoutAccount = seller.payout_account || seller.seller_payout_accounts || {};
              const embeddedVerificationDocuments =
                seller.verification_documents || seller.seller_verification_documents || null;
              const verificationDocuments = Array.isArray(embeddedVerificationDocuments)
                ? embeddedVerificationDocuments[0]
                : embeddedVerificationDocuments;
              const fallbackVerificationDocuments = verificationDocsBySeller.get(seller.id) || {};
              const latestRejection = latestRejectionsBySeller.get(seller.id);
              const status = toUiSellerStatus(seller.approval_status, latestRejection?.rejection_type);
              const shouldShowDocumentRejectionFeedback =
                status === 'needs_resubmission' && latestRejection?.rejection_type === 'partial';
              const verificationUpdatedAt =
                verificationDocuments?.updated_at ||
                fallbackVerificationDocuments?.updated_at ||
                verificationDocuments?.created_at ||
                fallbackVerificationDocuments?.created_at ||
                null;
              const verificationUpdatedAtMs = verificationUpdatedAt
                ? new Date(verificationUpdatedAt).getTime()
                : null;

              const rejectionItemsMap = new Map<
                SellerDocumentField,
                { reason?: string; createdAt?: string }
              >();
              const resubmittedItems = new Set<SellerDocumentField>();
              if (shouldShowDocumentRejectionFeedback && Array.isArray(latestRejection.items)) {
                for (const item of latestRejection.items) {
                  if (!item?.document_field) continue;

                  const itemCreatedAtMs = item.created_at
                    ? new Date(item.created_at).getTime()
                    : null;

                  const wasUpdatedAfterRejection =
                    Number.isFinite(verificationUpdatedAtMs) &&
                    Number.isFinite(itemCreatedAtMs) &&
                    (verificationUpdatedAtMs as number) > (itemCreatedAtMs as number);

                  if (wasUpdatedAfterRejection) {
                    resubmittedItems.add(item.document_field);
                    continue;
                  }

                  rejectionItemsMap.set(item.document_field, {
                    reason: item.reason || undefined,
                    createdAt: item.created_at || undefined,
                  });
                }
              }

              const businessAddress =
                businessProfile.address_line_1 ||
                seller.business_address ||
                'Not provided';
              const city = businessProfile.city || seller.city || 'Not specified';
              const province = businessProfile.province || seller.province || 'Not specified';
              const postalCode = businessProfile.postal_code || seller.postal_code || 'N/A';

              const addressParts = [businessAddress, city, province, postalCode].filter(Boolean);
              const fullAddress = addressParts.join(', ');

              const profileName =
                profile?.full_name ||
                [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();

              const parsedStoreCategory = Array.isArray(seller.store_category)
                ? seller.store_category
                : typeof seller.store_category === 'string' && seller.store_category.trim().length > 0
                  ? seller.store_category
                    .split(',')
                    .map((entry: string) => entry.trim())
                    .filter(Boolean)
                  : ['General'];

              const documents: SellerDocument[] = SELLER_DOCUMENT_CONFIG.reduce((acc, config) => {
                const url =
                  verificationDocuments?.[config.field] ||
                  fallbackVerificationDocuments?.[config.field] ||
                  seller?.[config.field];
                if (!url) return acc;

                const rejectionInfo = rejectionItemsMap.get(config.field);
                acc.push({
                  id: `doc_${config.field}_${seller.id}`,
                  field: config.field,
                  type: config.type,
                  fileName: config.fileName,
                  url,
                  uploadDate: new Date(
                    verificationDocuments?.created_at ||
                      fallbackVerificationDocuments?.created_at ||
                      seller.created_at ||
                      Date.now(),
                  ),
                  isVerified: status === 'approved',
                  isRejected: Boolean(rejectionInfo),
                  rejectionReason:
                    rejectionInfo?.reason ||
                    (rejectionInfo ? latestRejection?.description || undefined : undefined),
                  wasResubmitted: resubmittedItems.has(config.field),
                });

                return acc;
              }, [] as SellerDocument[]);

              return {
                id: seller.id,
                businessName:
                  seller.business_name ||
                  businessProfile.business_name ||
                  seller.store_name ||
                  'Unknown Business',
                storeName: seller.store_name || 'Unknown Store',
                storeDescription: seller.store_description || '',
                storeCategory: parsedStoreCategory,
                businessType: seller.business_type || businessProfile.business_type || 'sole_proprietor',
                businessRegistrationNumber:
                  seller.business_registration_number ||
                  businessProfile.business_registration_number ||
                  'N/A',
                taxIdNumber:
                  seller.tax_id_number ||
                  businessProfile.tax_id_number ||
                  'N/A',
                description: seller.store_description || '',
                logo:
                  seller.avatar_url ||
                  profile?.avatar_url ||
                  seller.logo_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(seller.store_name || seller.business_name || 'S')}&background=FF6A00&color=fff`,
                ownerName: seller.owner_name || profileName || seller.business_name || seller.store_name || 'Unknown Owner',
                email: profile?.email || seller.email || 'No email',
                phone: profile?.phone || seller.phone || 'No phone',
                businessAddress,
                city,
                province,
                postalCode,
                address: fullAddress || 'Address not provided',
                bankName: seller.bank_name || payoutAccount.bank_name || 'Not provided',
                accountName: seller.account_name || payoutAccount.account_name || 'Not provided',
                accountNumber: seller.account_number || payoutAccount.account_number || 'Not provided',
                status,
                documents,
                metrics: {
                  totalProducts: 0,
                  totalOrders: 0,
                  totalRevenue: Number(seller.total_sales) || 0,
                  rating: Number.parseFloat(seller.rating) || 0,
                  responseRate: 0,
                  fulfillmentRate: 0,
                },
                joinDate: new Date(seller.join_date || seller.created_at || Date.now()),
                approvedAt: seller.approved_at ? new Date(seller.approved_at) : seller.verified_at ? new Date(seller.verified_at) : undefined,
                approvedBy: seller.approved_by || undefined,
                rejectedAt: seller.rejected_at ? new Date(seller.rejected_at) : latestRejection?.created_at ? new Date(latestRejection.created_at) : undefined,
                rejectedBy: seller.rejected_by || latestRejection?.created_by || undefined,
                rejectionReason:
                  seller.rejection_reason ||
                  latestRejection?.description ||
                  (latestRejection?.rejection_type === 'partial'
                    ? 'Some submitted documents require updates before approval.'
                    : undefined),
                suspendedAt: seller.suspended_at ? new Date(seller.suspended_at) : undefined,
                suspendedBy: seller.suspended_by || undefined,
                suspensionReason: seller.suspension_reason || undefined,
                tierLevel: seller.tier?.tier_level || 'standard',
                bypassesAssessment: seller.tier?.bypasses_assessment || false,
                reapplicationAttempts: seller.reapplication_attempts || 0,
                cooldownCount: seller.cooldown_count || 0,
                tempBlacklistCount: seller.temp_blacklist_count || 0,
                blacklistedAt: seller.blacklisted_at ? new Date(seller.blacklisted_at) : undefined,
                coolDownUntil: seller.cool_down_until ? new Date(seller.cool_down_until) : undefined,
                tempBlacklistUntil: seller.temp_blacklist_until ? new Date(seller.temp_blacklist_until) : undefined,
                isPermanentlyBlacklisted: seller.is_permanently_blacklisted || false,
              };
            });

            const pendingSellers = sellers.filter(s => s.status === 'pending');

            console.log('Mapped sellers:', sellers);
            console.log('Pending sellers:', pendingSellers);

            set({
              sellers,
              pendingSellers,
              isLoading: false
            });
            return;
          } catch (error) {
            console.error('Error loading sellers from Supabase:', error);
            set({ error: 'Failed to load sellers', isLoading: false });
            return;
          }
        }

        // Fallback to demo sellers data if Supabase not configured
        const demoSellers: Seller[] = [
          {
            id: 'seller_1',
            businessName: 'TechHub Electronics Corp.',
            storeName: 'TechHub Philippines',
            storeDescription: 'Leading supplier of latest gadgets and technology products',
            storeCategory: ['Electronics', 'Gadgets', 'Computers'],
            businessType: 'corporation',
            businessRegistrationNumber: 'SEC-2024-001234',
            taxIdNumber: '123-456-789-000',
            description: 'Leading supplier of latest gadgets and technology products',
            ownerName: 'Maria Santos',
            email: 'maria@techhub.ph',
            phone: '+63 917 123 4567',
            businessAddress: '123 Ayala Avenue, Brgy. Poblacion',
            city: 'Makati City',
            province: 'Metro Manila',
            postalCode: '1200',
            address: '123 Ayala Avenue, Makati City, Metro Manila 1200',
            bankName: 'BDO',
            accountName: 'TechHub Electronics Corp.',
            accountNumber: '1234567890',
            logo: 'https://ui-avatars.com/api/?name=TechHub&background=FF6A00&color=fff',
            status: 'approved',
            documents: [
              {
                id: 'doc_1',
                field: 'business_permit_url',
                type: 'business_permit',
                fileName: 'business-permit.pdf',
                url: '/documents/business-permit.pdf',
                uploadDate: new Date('2024-01-10'),
                isVerified: true
              },
              {
                id: 'doc_1a',
                field: 'valid_id_url',
                type: 'valid_id',
                fileName: 'owners-id.pdf',
                url: '/documents/owners-id.pdf',
                uploadDate: new Date('2024-01-10'),
                isVerified: true
              },
              {
                id: 'doc_1b',
                field: 'proof_of_address_url',
                type: 'proof_of_address',
                fileName: 'utility-bill.pdf',
                url: '/documents/utility-bill.pdf',
                uploadDate: new Date('2024-01-10'),
                isVerified: true
              }
            ],
            metrics: {
              totalProducts: 156,
              totalOrders: 2340,
              totalRevenue: 1250000,
              rating: 4.8,
              responseRate: 95,
              fulfillmentRate: 98
            },
            joinDate: new Date('2024-01-10'),
            approvedAt: new Date('2024-01-12'),
            approvedBy: 'admin_1'
          },
          {
            id: 'seller_2',
            businessName: 'Fashion Forward Trading',
            storeName: 'Fashion Forward Store',
            storeDescription: 'Trendy fashion items for modern Filipino consumers',
            storeCategory: ['Fashion', 'Accessories', 'Beauty'],
            businessType: 'sole_proprietor',
            businessRegistrationNumber: 'DTI-2024-567890',
            taxIdNumber: '987-654-321-000',
            description: 'Trendy fashion items for modern Filipino consumers',
            ownerName: 'Juan dela Cruz',
            email: 'juan@fashionforward.ph',
            phone: '+63 917 765 4321',
            businessAddress: '456 Commonwealth Avenue, Brgy. Holy Spirit',
            city: 'Quezon City',
            province: 'Metro Manila',
            postalCode: '1127',
            address: '456 Commonwealth Avenue, Quezon City, Metro Manila 1127',
            bankName: 'BPI',
            accountName: 'Juan dela Cruz',
            accountNumber: '9876543210',
            status: 'pending',
            documents: [
              {
                id: 'doc_2',
                field: 'business_permit_url',
                type: 'business_permit',
                fileName: 'permit-fashion.pdf',
                url: '/documents/permit-fashion.pdf',
                uploadDate: new Date('2024-12-10'),
                isVerified: false
              },
              {
                id: 'doc_3',
                field: 'dti_registration_url',
                type: 'dti_registration',
                fileName: 'dti-registration.pdf',
                url: '/documents/dti-registration.pdf',
                uploadDate: new Date('2024-12-10'),
                isVerified: false
              },
              {
                id: 'doc_4',
                field: 'valid_id_url',
                type: 'valid_id',
                fileName: 'valid-id.pdf',
                url: '/documents/valid-id.pdf',
                uploadDate: new Date('2024-12-10'),
                isVerified: false
              },
              {
                id: 'doc_5',
                field: 'proof_of_address_url',
                type: 'proof_of_address',
                fileName: 'proof-address.pdf',
                url: '/documents/proof-address.pdf',
                uploadDate: new Date('2024-12-10'),
                isVerified: false
              }
            ],
            metrics: {
              totalProducts: 0,
              totalOrders: 0,
              totalRevenue: 0,
              rating: 0,
              responseRate: 0,
              fulfillmentRate: 0
            },
            joinDate: new Date('2024-12-10')
          },
          {
            id: 'seller_3',
            businessName: 'FoodHub Manila',
            storeName: 'FoodHub Delights',
            storeDescription: 'Fresh groceries and food products delivered daily',
            storeCategory: ['Food & Beverages', 'Groceries'],
            businessType: 'partnership',
            businessRegistrationNumber: 'DTI-2024-112233',
            taxIdNumber: '111-222-333-000',
            description: 'Quality food products for Filipino families',
            ownerName: 'Ana Reyes',
            email: 'ana@foodhub.ph',
            phone: '+63 918 234 5678',
            businessAddress: '789 Marcos Highway, Brgy. Dela Paz',
            city: 'Pasig City',
            province: 'Metro Manila',
            postalCode: '1600',
            address: '789 Marcos Highway, Pasig City, Metro Manila 1600',
            bankName: 'Metrobank',
            accountName: 'FoodHub Manila Partnership',
            accountNumber: '5555666677',
            status: 'rejected',
            documents: [
              {
                id: 'doc_6',
                field: 'business_permit_url',
                type: 'business_permit',
                fileName: 'food-permit.pdf',
                url: '/documents/food-permit.pdf',
                uploadDate: new Date('2024-12-01'),
                isVerified: false
              }
            ],
            metrics: {
              totalProducts: 0,
              totalOrders: 0,
              totalRevenue: 0,
              rating: 0,
              responseRate: 0,
              fulfillmentRate: 0
            },
            joinDate: new Date('2024-12-01'),
            rejectedAt: new Date('2024-12-05'),
            rejectedBy: 'admin_1',
            rejectionReason: 'Incomplete documentation - missing valid ID and proof of address'
          }
        ];

        await new Promise(resolve => setTimeout(resolve, 1000));

        const pendingSellers = demoSellers.filter(seller => seller.status === 'pending');

        set({
          sellers: demoSellers,
          pendingSellers,
          isLoading: false
        });
      },

      approveSeller: async (id) => {
        set({ isLoading: true, error: null });
        const now = new Date();
        const nowIso = now.toISOString();
        const adminId = useAdminAuth.getState().user?.id || 'admin';

        if (isSupabaseConfigured()) {
          try {
            const statusUpdateCandidates = [
              {
                approval_status: 'verified',
                updated_at: nowIso,
                verified_at: nowIso,
                reapplication_attempts: 0,
                cooldown_count: 0,
                temp_blacklist_count: 0,
                blacklisted_at: null,
                cool_down_until: null,
                temp_blacklist_until: null,
                is_permanently_blacklisted: false,
              },
            ];

            let statusUpdateError: any = null;
            for (const statusUpdate of statusUpdateCandidates) {
              const { error } = await supabase
                .from('sellers')
                .update(statusUpdate)
                .eq('id', id);

              if (!error) {
                statusUpdateError = null;
                break;
              }

              statusUpdateError = error;
            }

            if (statusUpdateError) {
              throw statusUpdateError;
            }

            await notificationService
              .notifySellerVerificationApproved({
                sellerId: id,
              })
              .catch((notificationError) => {
                console.warn('[AdminSellers] Failed to send approval notification:', notificationError);
              });

            // Update local state
            set(state => {
              const updatedSellers = state.sellers.map(seller =>
                seller.id === id
                  ? {
                    ...seller,
                    status: 'approved' as const,
                    approvedAt: now,
                    approvedBy: adminId,
                    rejectedAt: undefined,
                    rejectedBy: undefined,
                    rejectionReason: undefined,
                    reapplicationAttempts: 0,
                    cooldownCount: 0,
                    tempBlacklistCount: 0,
                    blacklistedAt: undefined,
                    coolDownUntil: undefined,
                    tempBlacklistUntil: undefined,
                    isPermanentlyBlacklisted: undefined,
                    documents: seller.documents.map((doc) => ({
                      ...doc,
                      isVerified: true,
                      isRejected: false,
                      rejectionReason: undefined,
                    })),
                  }
                  : seller
              );

              return {
                sellers: updatedSellers,
                pendingSellers: updatedSellers.filter(seller => seller.status === 'pending'),
                isLoading: false
              };
            });
          } catch (error) {
            console.error('Error approving seller:', error);
            set({ error: 'Failed to approve seller', isLoading: false });
          }
          return;
        }

        // Fallback to demo behavior
        await new Promise(resolve => setTimeout(resolve, 1200));

        set(state => {
          const updatedSellers = state.sellers.map(seller =>
            seller.id === id
              ? {
                ...seller,
                status: 'approved' as const,
                approvedAt: now,
                approvedBy: adminId,
                rejectedAt: undefined,
                rejectedBy: undefined,
                rejectionReason: undefined,
                documents: seller.documents.map((doc) => ({
                  ...doc,
                  isVerified: true,
                  isRejected: false,
                  rejectionReason: undefined,
                })),
              }
              : seller
          );

          return {
            sellers: updatedSellers,
            pendingSellers: updatedSellers.filter(seller => seller.status === 'pending'),
            isLoading: false
          };
        });
      },

      rejectSeller: async (id, reason) => {
        set({ isLoading: true, error: null });
        const now = new Date();
        const nowIso = now.toISOString();
        const adminId = useAdminAuth.getState().user?.id || 'admin';
        const normalizedReason = reason?.trim();
        const rejectionDescription = normalizedReason || 'Your seller verification submission was rejected.';

        // Constants
        const MAX_REATTEMPTS = 3;
        const COOLDOWN_DURATION_MS = 60 * 60 * 1000; // 1 hour
        const MAX_COOLDOWNS = 3;
        const TEMP_BLACKLIST_DURATION_MS = 24 * 60 * 60 * 1000; // 1 day
        const MAX_TEMP_BLACKLISTS = 3;

        // Fetch current state from database
        const { data: sellerData } = await supabase
          .from('sellers')
          .select('reapplication_attempts, cooldown_count, temp_blacklist_count, is_permanently_blacklisted, blacklisted_at')
          .eq('id', id)
          .single();

        const currentAttempts = sellerData?.reapplication_attempts || 0;
        const currentCooldownCount = sellerData?.cooldown_count || 0;
        const currentTempBlacklistCount = sellerData?.temp_blacklist_count || 0;
        const alreadyPermanentlyBlacklisted =
          Boolean(sellerData?.is_permanently_blacklisted) || Boolean(sellerData?.blacklisted_at);
        const existingBlacklistedAt = sellerData?.blacklisted_at || null;

        let newAttempts = currentAttempts + 1;
        let newCooldownCount = currentCooldownCount;
        let newTempBlacklistCount = currentTempBlacklistCount;
        let coolDownUntil: string | null = null;
        let tempBlacklistUntil: string | null = null;
        let isBlacklisted = false;
        let newStatus: 'rejected' | 'blacklisted' = 'rejected';

        if (alreadyPermanentlyBlacklisted) {
          // Already permanently blacklisted, just update status
          newStatus = 'blacklisted';
          newAttempts = currentAttempts;
          newCooldownCount = currentCooldownCount;
          newTempBlacklistCount = currentTempBlacklistCount;
          isBlacklisted = true;
        } else if (newAttempts >= MAX_REATTEMPTS) {
          // Reset attempts, increment cooldown count
          newAttempts = 0;
          newCooldownCount = currentCooldownCount + 1;
          
          if (newCooldownCount >= MAX_COOLDOWNS) {
            // Trigger temp blacklist
            newCooldownCount = 0;
            newTempBlacklistCount = currentTempBlacklistCount + 1;
            
            if (newTempBlacklistCount >= MAX_TEMP_BLACKLISTS) {
              // Permanent blacklist!
              isBlacklisted = true;
              newTempBlacklistCount = 0;
              newAttempts = 0;
              newCooldownCount = 0;
            } else {
              // Temp blacklist for 1 day
              tempBlacklistUntil = new Date(Date.now() + TEMP_BLACKLIST_DURATION_MS).toISOString();
              newStatus = 'blacklisted';
            }
          } else {
            // Cooldown for 1 hour
            coolDownUntil = new Date(Date.now() + COOLDOWN_DURATION_MS).toISOString();
          }
        }

        const isTempBlacklisted = Boolean(tempBlacklistUntil);
        const isPermanentlyBlacklisted = alreadyPermanentlyBlacklisted || isBlacklisted;
        const blacklistedAtIso = isPermanentlyBlacklisted ? (existingBlacklistedAt || nowIso) : null;
        const nextApprovalStatus: 'rejected' | 'blacklisted' =
          isPermanentlyBlacklisted || isTempBlacklisted ? 'blacklisted' : newStatus;

        if (isSupabaseConfigured()) {
          try {
            const { error: statusError } = await supabase
              .from('sellers')
              .update({
                approval_status: nextApprovalStatus,
                updated_at: nowIso,
                reapplication_attempts: newAttempts,
                cooldown_count: newCooldownCount,
                temp_blacklist_count: newTempBlacklistCount,
                blacklisted_at: blacklistedAtIso,
                cool_down_until: coolDownUntil,
                temp_blacklist_until: tempBlacklistUntil,
                is_permanently_blacklisted: isPermanentlyBlacklisted,
              })
              .eq('id', id);

            if (statusError) {
              throw statusError;
            }

            const { error: rejectionInsertError } = await supabase
              .from('seller_rejections')
              .insert({
                seller_id: id,
                description: rejectionDescription,
                rejection_type: 'full',
                created_by: adminId,
              });

            if (rejectionInsertError) {
              console.warn('[AdminSellers] Could not record full rejection event:', rejectionInsertError.message);
            }

            await notificationService
              .notifySellerVerificationRejected({
                sellerId: id,
                reason: rejectionDescription,
              })
              .catch((notificationError) => {
                console.warn('[AdminSellers] Failed to send rejection notification:', notificationError);
              });

            // Update local state
            set(state => {
              const updatedSellers = state.sellers.map(seller =>
                seller.id === id
                  ? {
                    ...seller,
                    status: nextApprovalStatus,
                    rejectedAt: now,
                    rejectedBy: adminId,
                    rejectionReason: rejectionDescription,
                    reapplicationAttempts: newAttempts,
                    cooldownCount: newCooldownCount,
                    tempBlacklistCount: newTempBlacklistCount,
                    blacklistedAt: blacklistedAtIso ? new Date(blacklistedAtIso) : undefined,
                    coolDownUntil: coolDownUntil ? new Date(coolDownUntil) : undefined,
                    tempBlacklistUntil: tempBlacklistUntil ? new Date(tempBlacklistUntil) : undefined,
                    isPermanentlyBlacklisted,
                    documents: seller.documents.map((doc) => ({
                      ...doc,
                      isVerified: false,
                    })),
                  }
                  : seller
              );

              return {
                sellers: updatedSellers,
                pendingSellers: updatedSellers.filter(seller => seller.status === 'pending'),
                isLoading: false
              };
            });
          } catch (error) {
            console.error('Error rejecting seller:', error);
            set({ error: 'Failed to reject seller', isLoading: false });
          }
          return;
        }

        // Fallback to demo behavior
        await new Promise(resolve => setTimeout(resolve, 1000));

        set(state => {
          const updatedSellers = state.sellers.map(seller =>
            seller.id === id
              ? {
                  ...seller,
                  status: nextApprovalStatus,
                  rejectedAt: now,
                  rejectedBy: adminId,
                  rejectionReason: rejectionDescription,
                  reapplicationAttempts: newAttempts,
                  cooldownCount: newCooldownCount,
                  tempBlacklistCount: newTempBlacklistCount,
                  blacklistedAt: blacklistedAtIso ? new Date(blacklistedAtIso) : undefined,
                  coolDownUntil: coolDownUntil ? new Date(coolDownUntil) : undefined,
                  tempBlacklistUntil: tempBlacklistUntil ? new Date(tempBlacklistUntil) : undefined,
                  isPermanentlyBlacklisted,
                  documents: seller.documents.map((doc) => ({
                    ...doc,
                    isVerified: false,
                })),
              }
              : seller
          );

          return {
            sellers: updatedSellers,
            pendingSellers: updatedSellers.filter(seller => seller.status === 'pending'),
            isLoading: false,
            error: null
          };
        });
      },

      partiallyRejectSeller: async (id, payload) => {
        set({ isLoading: true, error: null });
        const now = new Date();
        const nowIso = now.toISOString();
        const adminId = useAdminAuth.getState().user?.id || 'admin';
        const selectedItems = payload.items.filter((item) => Boolean(item.documentField));

        if (selectedItems.length === 0) {
          set({
            isLoading: false,
            error: 'Select at least one document for partial rejection.',
          });
          return;
        }

        const normalizedNote = payload.note?.trim();
        const rejectionDescription = normalizedNote || 'Some submitted documents need to be updated before approval.';
        const selectedFields = new Set(selectedItems.map((item) => item.documentField));
        const itemReasons = new Map<SellerDocumentField, string | undefined>();
        selectedItems.forEach((item) => {
          itemReasons.set(item.documentField, item.reason?.trim() || undefined);
        });

        const MAX_REATTEMPTS = 3;
        const COOLDOWN_DURATION_MS = 60 * 60 * 1000; // 1 hour
        const MAX_COOLDOWNS = 3;
        const TEMP_BLACKLIST_DURATION_MS = 24 * 60 * 60 * 1000; // 1 day
        const MAX_TEMP_BLACKLISTS = 3;

        // Fetch current state from database
        const { data: sellerData } = await supabase
          .from('sellers')
          .select('reapplication_attempts, cooldown_count, temp_blacklist_count, is_permanently_blacklisted, blacklisted_at')
          .eq('id', id)
          .single();

        const currentAttempts = sellerData?.reapplication_attempts || 0;
        const currentCooldownCount = sellerData?.cooldown_count || 0;
        const currentTempBlacklistCount = sellerData?.temp_blacklist_count || 0;
        const alreadyPermanentlyBlacklisted =
          Boolean(sellerData?.is_permanently_blacklisted) || Boolean(sellerData?.blacklisted_at);
        const existingBlacklistedAt = sellerData?.blacklisted_at || null;

        let newAttempts = currentAttempts + 1;
        let newCooldownCount = currentCooldownCount;
        let newTempBlacklistCount = currentTempBlacklistCount;
        let coolDownUntil: string | null = null;
        let tempBlacklistUntil: string | null = null;
        let isBlacklisted = false;
        let newStatus: 'needs_resubmission' | 'blacklisted' = 'needs_resubmission';

        if (alreadyPermanentlyBlacklisted) {
          newStatus = 'blacklisted';
          newAttempts = currentAttempts;
          newCooldownCount = currentCooldownCount;
          newTempBlacklistCount = currentTempBlacklistCount;
          isBlacklisted = true;
        } else if (newAttempts >= MAX_REATTEMPTS) {
          // Reset attempts, increment cooldown count
          newAttempts = 0;
          newCooldownCount = currentCooldownCount + 1;
          
          if (newCooldownCount >= MAX_COOLDOWNS) {
            newCooldownCount = 0;
            newTempBlacklistCount = currentTempBlacklistCount + 1;
            
            if (newTempBlacklistCount >= MAX_TEMP_BLACKLISTS) {
              isBlacklisted = true;
              newTempBlacklistCount = 0;
              newAttempts = 0;
              newCooldownCount = 0;
            } else {
              tempBlacklistUntil = new Date(Date.now() + TEMP_BLACKLIST_DURATION_MS).toISOString();
              newStatus = 'blacklisted';
            }
          } else {
            coolDownUntil = new Date(Date.now() + COOLDOWN_DURATION_MS).toISOString();
          }
        }

        const isTempBlacklisted = Boolean(tempBlacklistUntil);
        const isPermanentlyBlacklisted = alreadyPermanentlyBlacklisted || isBlacklisted;
        const blacklistedAtIso = isPermanentlyBlacklisted ? (existingBlacklistedAt || nowIso) : null;
        const nextApprovalStatus: 'needs_resubmission' | 'rejected' | 'blacklisted' =
          isPermanentlyBlacklisted || isTempBlacklisted ? 'blacklisted' : newStatus;

        if (isSupabaseConfigured()) {
          try {
            let rejectionId: string | null = null;

            const { data: rejectionRecord, error: rejectionInsertError } = await supabase
              .from('seller_rejections')
              .insert({
                seller_id: id,
                description: rejectionDescription,
                rejection_type: 'partial',
                created_by: adminId,
              })
              .select('id')
              .single();

            if (rejectionInsertError) {
              console.warn('[AdminSellers] Could not create partial rejection record:', rejectionInsertError.message);
            } else {
              rejectionId = rejectionRecord?.id || null;
            }

            if (rejectionId) {
              const { error: rejectionItemsError } = await supabase
                .from('seller_rejection_items')
                .insert(
                  selectedItems.map((item) => ({
                    rejection_id: rejectionId,
                    document_field: item.documentField,
                    reason: item.reason?.trim() || null,
                  })),
                );

              if (rejectionItemsError) {
                console.warn('[AdminSellers] Could not insert partial rejection items:', rejectionItemsError.message);
              }
            }

            const statusUpdateBase = {
              updated_at: nowIso,
              reapplication_attempts: newAttempts,
              cooldown_count: newCooldownCount,
              temp_blacklist_count: newTempBlacklistCount,
              blacklisted_at: blacklistedAtIso,
              cool_down_until: coolDownUntil,
              temp_blacklist_until: tempBlacklistUntil,
              is_permanently_blacklisted: isPermanentlyBlacklisted,
            };

            const statusCandidates =
              nextApprovalStatus === 'needs_resubmission'
                ? [
                  {
                    approval_status: 'needs_resubmission',
                    ...statusUpdateBase,
                  },
                  {
                    approval_status: 'rejected',
                    ...statusUpdateBase,
                  },
                ]
                : [
                  {
                    approval_status: nextApprovalStatus,
                    ...statusUpdateBase,
                  },
                ];

            let appliedDbStatus: 'needs_resubmission' | 'rejected' | 'blacklisted' =
              nextApprovalStatus;
            let statusUpdateError: any = null;

            for (const statusCandidate of statusCandidates) {
              const { error } = await supabase
                .from('sellers')
                .update(statusCandidate)
                .eq('id', id);

              if (!error) {
                appliedDbStatus = statusCandidate.approval_status as
                  | 'needs_resubmission'
                  | 'rejected'
                  | 'blacklisted';
                statusUpdateError = null;
                break;
              }

              statusUpdateError = error;
            }

            if (statusUpdateError) {
              throw statusUpdateError;
            }

            await notificationService
              .notifySellerVerificationPartiallyRejected({
                sellerId: id,
                rejectedDocuments: selectedItems.map((item) => DOCUMENT_FIELD_LABELS[item.documentField]),
                note: normalizedNote,
              })
              .catch((notificationError) => {
                console.warn('[AdminSellers] Failed to send partial rejection notification:', notificationError);
              });

            const nextUiStatus = toUiSellerStatus(appliedDbStatus, 'partial');

            set(state => {
              const updatedSellers = state.sellers.map((seller) => {
                if (seller.id !== id) return seller;

                return {
                  ...seller,
                  status: nextUiStatus,
                  rejectedAt: now,
                  rejectedBy: adminId,
                  rejectionReason: rejectionDescription,
                  reapplicationAttempts: newAttempts,
                  cooldownCount: newCooldownCount,
                  tempBlacklistCount: newTempBlacklistCount,
                  blacklistedAt: blacklistedAtIso ? new Date(blacklistedAtIso) : undefined,
                  coolDownUntil: coolDownUntil ? new Date(coolDownUntil) : undefined,
                  tempBlacklistUntil: tempBlacklistUntil ? new Date(tempBlacklistUntil) : undefined,
                  isPermanentlyBlacklisted,
                  documents: seller.documents.map((doc) => {
                    const reason = itemReasons.get(doc.field);
                    const isRejected = selectedFields.has(doc.field);

                    return {
                      ...doc,
                      isVerified: false,
                      isRejected,
                      rejectionReason: isRejected ? reason || rejectionDescription : undefined,
                    };
                  }),
                };
              });

              return {
                sellers: updatedSellers,
                pendingSellers: updatedSellers.filter((seller) => seller.status === 'pending'),
                isLoading: false,
                error: null,
              };
            });
          } catch (error) {
            console.error('Error partially rejecting seller:', error);
            set({ error: 'Failed to partially reject seller', isLoading: false });
          }
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        set(state => {
          const updatedSellers = state.sellers.map((seller) => {
            if (seller.id !== id) return seller;

            return {
              ...seller,
              status: nextApprovalStatus === 'blacklisted' ? 'blacklisted' : 'needs_resubmission',
              rejectedAt: now,
              rejectedBy: adminId,
              rejectionReason: rejectionDescription,
              reapplicationAttempts: newAttempts,
              cooldownCount: newCooldownCount,
              tempBlacklistCount: newTempBlacklistCount,
              blacklistedAt: blacklistedAtIso ? new Date(blacklistedAtIso) : undefined,
              coolDownUntil: coolDownUntil ? new Date(coolDownUntil) : undefined,
              tempBlacklistUntil: tempBlacklistUntil ? new Date(tempBlacklistUntil) : undefined,
              isPermanentlyBlacklisted,
              documents: seller.documents.map((doc) => {
                const reason = itemReasons.get(doc.field);
                const isRejected = selectedFields.has(doc.field);

                return {
                  ...doc,
                  isVerified: false,
                  isRejected,
                  rejectionReason: isRejected ? reason || rejectionDescription : undefined,
                };
              }),
            };
          });

          return {
            sellers: updatedSellers,
            pendingSellers: updatedSellers.filter((seller) => seller.status === 'pending'),
            isLoading: false,
            error: null,
          };
        });
      },

      suspendSeller: async (id, reason) => {
        set({ isLoading: true });

        if (isSupabaseConfigured()) {
          try {
            // DB CHECK constraint: 'pending','verified','rejected','needs_resubmission','blacklisted'
            // Suspension maps to 'blacklisted' with a temporary flag
            const { error } = await supabase
              .from('sellers')
              .update({
                approval_status: 'blacklisted',
                blacklisted_at: new Date().toISOString(),
                is_permanently_blacklisted: false,
              } as any)
              .eq('id', id);

            if (error) {
              console.error('Error suspending seller:', error);
              set({ error: 'Failed to suspend seller', isLoading: false });
              return;
            }

            // Update local state
            set(state => ({
              sellers: state.sellers.map(seller =>
                seller.id === id
                  ? {
                    ...seller,
                    status: 'suspended' as const,
                    suspendedAt: new Date(),
                    suspendedBy: 'admin',
                    suspensionReason: reason
                  }
                  : seller
              ),
              isLoading: false
            }));
          } catch (error) {
            console.error('Error suspending seller:', error);
            set({ error: 'Failed to suspend seller', isLoading: false });
          }
          return;
        }

        // Fallback to demo behavior
        await new Promise(resolve => setTimeout(resolve, 1000));

        set(state => ({
          sellers: state.sellers.map(seller =>
            seller.id === id
              ? {
                ...seller,
                status: 'suspended' as const,
                suspendedAt: new Date(),
                suspendedBy: 'admin_1',
                suspensionReason: reason
              }
              : seller
          ),
          isLoading: false
        }));
      },

      selectSeller: (seller) => set({ selectedSeller: seller }),

      addSeller: (seller) => {
        set(state => ({
          sellers: [...state.sellers, seller]
        }));
      },

      clearError: () => set({ error: null }),

      hasCompleteRequirements: (seller: Seller) => {
        // Check if seller has all required documents
        const requiredDocTypes = ['business_permit', 'valid_id', 'proof_of_address', 'dti_registration', 'tax_id'];
        const sellerDocTypes = seller.documents.map(doc => doc.type);

        // Check if all required documents exist
        const hasAllDocs = requiredDocTypes.every(type => sellerDocTypes.includes(type));

        // Also check if business address exists
        const hasBusinessAddress = seller.businessAddress && seller.businessAddress !== 'Not provided';

        return hasAllDocs && hasBusinessAddress;
      },

      updateSellerTier: async (sellerId: string, tierLevel: 'standard' | 'premium_outlet') => {
        set({ isLoading: true, error: null });

        const bypassesAssessment = tierLevel === 'premium_outlet';

        if (isSupabaseConfigured()) {
          try {
            // Upsert seller tier
            const { error: tierError } = await supabase
              .from('seller_tiers')
              .upsert(
                {
                  seller_id: sellerId,
                  tier_level: tierLevel,
                  bypasses_assessment: bypassesAssessment,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'seller_id', ignoreDuplicates: false }
              );

            if (tierError) {
              console.error('[AdminSellers] Error updating seller tier:', tierError);
              throw tierError;
            }

            // Update local state
            set(state => ({
              sellers: state.sellers.map(seller =>
                seller.id === sellerId
                  ? {
                    ...seller,
                    tierLevel,
                    bypassesAssessment,
                  }
                  : seller
              ),
              isLoading: false,
            }));

            console.log(`[AdminSellers] Updated seller ${sellerId} tier to ${tierLevel}`);
          } catch (error) {
            console.error('Error updating seller tier:', error);
            set({ error: 'Failed to update seller tier', isLoading: false });
          }
          return;
        }

        // Fallback to local state
        set(state => ({
          sellers: state.sellers.map(seller =>
            seller.id === sellerId
              ? {
                ...seller,
                tierLevel,
                bypassesAssessment,
              }
              : seller
          ),
          isLoading: false,
        }));
      },

      getSellerTier: async (sellerId: string): Promise<'standard' | 'premium_outlet' | null> => {
        if (!isSupabaseConfigured()) {
          const seller = get().sellers.find(s => s.id === sellerId);
          return seller?.tierLevel || null;
        }

        try {
          const { data, error } = await supabase
            .from('seller_tiers')
            .select('tier_level')
            .eq('seller_id', sellerId)
            .maybeSingle();

          if (error) {
            console.warn('[AdminSellers] Error getting seller tier:', error);
            return null;
          }

          return (data?.tier_level as 'standard' | 'premium_outlet') || null;
        } catch (error) {
          console.warn('[AdminSellers] Exception getting seller tier:', error);
          return null;
        }
      },
    }),
    {
      name: 'admin-sellers-storage',
      partialize: (state) => ({
        // Don't persist sellers data - always fetch fresh from Supabase
        selectedSeller: state.selectedSeller,
      }),
    }
  )
);

// Buyers Management Store
interface BuyersState {
  buyers: Buyer[];
  selectedBuyer: Buyer | null;
  isLoading: boolean;
  error: string | null;
  loadBuyers: () => Promise<void>;
  suspendBuyer: (id: string, reason: string) => Promise<void>;
  activateBuyer: (id: string) => Promise<void>;
  selectBuyer: (buyer: Buyer | null) => void;
  clearError: () => void;
}

