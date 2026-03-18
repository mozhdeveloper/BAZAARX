import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthStore, useProductStore, useOrderStore } from "@/stores/sellerStore";
import { SellerWorkspaceLayout } from "@/components/seller/SellerWorkspaceLayout";
import {
  Camera,
  Globe,
  Clock,
  Award,
  TrendingUp,
  Users,
  Upload,
  Building2,
  FileText,
  CreditCard,
  User,
  CheckCircle2,
  AlertCircle,
  Lock,
  Edit2,
  Eye,
  Download,
  Loader,
  Star,
  Calendar,
  MessageCircle,
  LayoutGrid,
  Image,
  Package,
  Ban,
  AlertTriangle,
} from "lucide-react";
import { toast } from "../hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { uploadSellerDocument, validateDocumentFile, uploadStoreBanner } from "@/utils/storage";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { categoryService } from "@/services/categoryService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { BusinessType } from "@/types/database.types";
import { discountService } from "@/services/discountService";

// Logo components defined outside of render


export function SellerStoreProfile() {
  const SHOW_BANKING_INFO = false;
  const { seller, updateSellerDetails, hydrateSellerFromSession } =
    useAuthStore();
  const { products } = useProductStore();
  const [editSection, setEditSection] = useState<
    "basic" | "business" | "banking" | "categories" | null
  >(null);
  const navigate = useNavigate();
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [documents, setDocuments] = useState<{
    businessPermitUrl?: string;
    validIdUrl?: string;
    proofOfAddressUrl?: string;
    dtiRegistrationUrl?: string;
    taxIdUrl?: string;
  }>({});
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  // Banner upload state
  const [bannerLoading, setBannerLoading] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  
  const getSellerId = () =>
    seller?.id || useAuthStore.getState().seller?.id || null;

  const [pendingUpload, setPendingUpload] = useState<{
    file: File;
    docKey: string;
    columnName: string;
    label: string;
  } | null>(null);

  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const data = await categoryService.getActiveCategories(); //
        setAvailableCategories(data);
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (seller?.id) return;
    void hydrateSellerFromSession();
  }, [seller?.id, hydrateSellerFromSession]);



  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const sellerId = getSellerId();
    if (!file || !sellerId) {
      setAvatarError("No file selected or seller ID missing");
      return;
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setAvatarError(
        "Please upload a valid image file (JPEG, PNG, WebP, or GIF)",
      );
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setAvatarError("File size must be less than 5MB");
      return;
    }

    try {
      setAvatarLoading(true);
      setAvatarError(null);

      console.log("Starting avatar upload...", {
        filename: file.name,
        filesize: file.size,
        fileType: file.type,
        sellerId,
      });

      // Create a unique filename with folder structure
      const timestamp = Date.now();
      const ext = file.name.split(".").pop();
      const filename = `${sellerId}/avatar_${timestamp}.${ext}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await (supabase as any).storage
        .from("profile-avatars")
        .upload(filename, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        const errorDetails = {
          message: uploadError.message,
          name: uploadError.name,
          statusCode: (uploadError as any).statusCode,
          status: (uploadError as any).status,
        };
        console.error("Upload error details:", errorDetails);
        throw new Error(
          `Upload failed: ${uploadError.message} | Bucket: profile-avatars | File: ${filename}`,
        );
      }

      console.log("Upload successful", { data });

      // Get public URL
      const { data: publicData } = (supabase as any).storage
        .from("profile-avatars")
        .getPublicUrl(filename);

      const avatarUrl = publicData.publicUrl;
      console.log("Generated public URL:", avatarUrl);

      // Update seller in database (sellers table, not profiles!)
      const { error: updateError, data: updateData } = await (supabase as any)
        .from("sellers")
        .update({ avatar_url: avatarUrl })
        .eq("id", sellerId);

      if (updateError) {
        const dbErrorDetails = {
          message: updateError.message,
          code: (updateError as any).code,
          details: (updateError as any).details,
        };
        console.error("Database update error:", dbErrorDetails);
        throw new Error(
          `Database update failed: ${updateError.message} | Profile ID: ${sellerId}`,
        );
      }

      console.log("Database update successful", { updateData });

      // Update local state
      updateSellerDetails({ ...seller, avatar: avatarUrl });

      // Reset input
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }

      console.log("Avatar upload completed successfully");
      setAvatarLoading(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to upload avatar";
      console.error("Avatar upload error:", errorMessage, err);
      setAvatarError(errorMessage);
      setAvatarLoading(false);
    }
  };

  // Handle banner upload
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const sellerId = getSellerId();
    if (!file || !sellerId) {
      setBannerError("No file selected or seller ID missing");
      return;
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setBannerError(
        "Please upload a valid image file (JPEG, PNG, WebP, or GIF)"
      );
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setBannerError("File size must be less than 5MB");
      return;
    }

    try {
      setBannerLoading(true);
      setBannerError(null);

      console.log("Starting banner upload...", {
        filename: file.name,
        filesize: file.size,
        fileType: file.type,
        sellerId,
      });

      const bannerUrl = await uploadStoreBanner(file, sellerId);
      if (!bannerUrl) throw new Error("Upload failed - no URL returned");

      console.log("Banner upload successful:", bannerUrl);

      // Update sellers table
      const { error: updateError } = await (supabase as any)
        .from("sellers")
        .update({ store_banner_url: bannerUrl })
        .eq("id", sellerId);

      if (updateError) {
        console.error("Database update error:", updateError);
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      console.log("Banner database update successful");

      // Update local state
      updateSellerDetails({ ...seller, banner: bannerUrl });

      // Reset input
      if (bannerInputRef.current) {
        bannerInputRef.current.value = "";
      }

      console.log("Banner upload completed successfully");
      setBannerLoading(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to upload banner";
      console.error("Banner upload error:", errorMessage, err);
      setBannerError(errorMessage);
      setBannerLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    storeName: seller?.storeName || "",
    storeDescription: seller?.storeDescription || "",
    phone: seller?.phone || "",
    ownerName: seller?.ownerName || "",
    email: seller?.email || "",
  });
  const [businessForm, setBusinessForm] = useState({
    businessName: seller?.businessName || "",
    businessType: seller?.businessType || "",
    businessRegistrationNumber: seller?.businessRegistrationNumber || "",
    taxIdNumber: seller?.taxIdNumber || "",
    businessAddress: seller?.businessAddress || "",
    city: seller?.city || "",
    province: seller?.province || "",
    postalCode: seller?.postalCode || "",
  });
  const [bankingForm, setBankingForm] = useState({
    bankName: seller?.bankName || "",
    accountName: seller?.accountName || "",
    accountNumber: seller?.accountNumber || "",
  });
  const [categoriesForm, setCategoriesForm] = useState<string[]>(
    seller?.storeCategory || [],
  );

  const [isVerified, setIsVerified] = useState(seller?.isVerified || false);
  const [approvalStatus, setApprovalStatus] = useState<
    | "pending"
    | "approved"
    | "verified"
    | "rejected"
    | "needs_resubmission"
    | "blacklisted"
  >(seller?.approvalStatus || "pending");

  const [reapplyLoading, setReapplyLoading] = useState(false);
  const [latestRejection, setLatestRejection] = useState<{
    rejectionType: "full" | "partial";
    description?: string;
    createdAt: string;
    items: { documentField: string; reason?: string; createdAt?: string }[];
  } | null>(null);
  const [documentsUpdatedAt, setDocumentsUpdatedAt] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Draft staging state for partial rejection resubmission
  const [draftDocuments, setDraftDocuments] = useState<{
    businessPermitUrl?: string;
    validIdUrl?: string;
    proofOfAddressUrl?: string;
    dtiRegistrationUrl?: string;
    taxIdUrl?: string;
  }>({});
  const [draftDocumentFieldUpdatedAt, setDraftDocumentFieldUpdatedAt] = useState<Record<string, string | null>>({
    business_permit_url: null,
    valid_id_url: null,
    proof_of_address_url: null,
    dti_registration_url: null,
    tax_id_url: null,
  });

  // Seller restriction state (cooldown, temp blacklist)
  const [sellerRestrictions, setSellerRestrictions] = useState<{
    coolDownUntil: Date | null;
    tempBlacklistUntil: Date | null;
    isPermanentlyBlacklisted: boolean;
    attempts: number;
    cooldownCount: number;
    tempBlacklistCount: number;
  }>({
    coolDownUntil: null,
    tempBlacklistUntil: null,
    isPermanentlyBlacklisted: false,
    attempts: 0,
    cooldownCount: 0,
    tempBlacklistCount: 0,
  });

  const BUSINESS_TYPE_OPTIONS: { value: BusinessType; label: string }[] = [
    { value: "sole_proprietor", label: "Sole Proprietorship" },
    { value: "partnership", label: "Partnership" },
    { value: "corporation", label: "Corporation" },
  ];

  const normalizeBusinessType = (value: string): BusinessType | null => {
    const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");

    if (normalized === "sole_proprietor" || normalized === "sole_proprietorship") {
      return "sole_proprietor";
    }
    if (normalized === "partnership") {
      return "partnership";
    }
    if (normalized === "corporation") {
      return "corporation";
    }

    return null;
  };

  useEffect(() => {
    if (!seller) return;

    setFormData({
      storeName: seller.storeName || "",
      storeDescription: seller.storeDescription || "",
      phone: seller.phone || "",
      ownerName: seller.ownerName || "",
      email: seller.email || "",
    });
    setBusinessForm({
      businessName: seller.businessName || "",
      businessType: seller.businessType || "",
      businessRegistrationNumber: seller.businessRegistrationNumber || "",
      taxIdNumber: seller.taxIdNumber || "",
      businessAddress: seller.businessAddress || "",
      city: seller.city || "",
      province: seller.province || "",
      postalCode: seller.postalCode || "",
    });
    setBankingForm({
      bankName: seller.bankName || "",
      accountName: seller.accountName || "",
      accountNumber: seller.accountNumber || "",
    });
    setCategoriesForm(seller.storeCategory || []);
    setIsVerified(Boolean(seller.isVerified));
    setApprovalStatus(seller.approvalStatus || "pending");
  }, [seller]);

  // Helper: determine if a string field is effectively empty
  const isEmptyField = (value?: string | null) => {
    if (value === null || value === undefined) return true;
    const v = String(value).trim();
    if (v.length === 0) return true;
    // Treat UI placeholders as empty for approval readiness
    const placeholders = ["Not provided", "No description added"];
    return placeholders.includes(v);
  };

  // Determine if we should use draft documents (during partial rejection resubmission)
  const useDraftDocuments =
    approvalStatus === "needs_resubmission" ||
    (approvalStatus === "rejected" && latestRejection?.rejectionType === "partial");

  // Compute displayed documents (drafts during resubmission, live otherwise)
  const displayedDocuments = useDraftDocuments
    ? { ...documents, ...draftDocuments }
    : documents;

  // Compute list of missing required items (fields + documents)
  const getMissingItems = () => {
    const missing: string[] = [];

    // Basic + contact
    if (isEmptyField(seller?.ownerName)) missing.push("Owner Name");
    if (isEmptyField(seller?.email)) missing.push("Email Address");
    if (isEmptyField(seller?.phone)) missing.push("Phone Number");
    if (isEmptyField(seller?.storeName)) missing.push("Store Name");

    // Business info
    if (isEmptyField(seller?.businessName)) missing.push("Business Name");
    if (isEmptyField(seller?.businessType)) missing.push("Business Type");
    if (isEmptyField(seller?.businessRegistrationNumber))
      missing.push("Business Registration Number");
    if (isEmptyField(seller?.taxIdNumber)) missing.push("Tax ID Number (TIN)");
    if (
      isEmptyField(seller?.businessAddress) ||
      isEmptyField(seller?.city) ||
      isEmptyField(seller?.province) ||
      isEmptyField(seller?.postalCode)
    ) {
      missing.push("Business Address (address, city, province, postal code)");
    }

    // Banking info is temporarily hidden from seller profile UI
    if (SHOW_BANKING_INFO) {
      if (isEmptyField(seller?.bankName)) missing.push("Bank Name");
      if (isEmptyField(seller?.accountName)) missing.push("Account Name");
      if (isEmptyField(seller?.accountNumber)) missing.push("Account Number");
    }

    // Documents - during partial rejection, only check rejected documents
    // During normal flow, check all documents
    if (useDraftDocuments && latestRejection?.rejectionType === "partial") {
      // Only require the rejected documents to be updated
      const rejectedDocFields = latestRejection.items.map(item => item.documentField);
      
      if (rejectedDocFields.includes("business_permit_url") && !displayedDocuments.businessPermitUrl) 
        missing.push("Business Permit");
      if (rejectedDocFields.includes("valid_id_url") && !displayedDocuments.validIdUrl) 
        missing.push("Government-Issued ID");
      if (rejectedDocFields.includes("proof_of_address_url") && !displayedDocuments.proofOfAddressUrl) 
        missing.push("Proof of Address");
      if (rejectedDocFields.includes("dti_registration_url") && !displayedDocuments.dtiRegistrationUrl) 
        missing.push("DTI/SEC Registration");
      if (rejectedDocFields.includes("tax_id_url") && !displayedDocuments.taxIdUrl) 
        missing.push("BIR Tax ID (TIN)");
    } else {
      // Normal flow - check all documents
      if (!displayedDocuments.businessPermitUrl) missing.push("Business Permit");
      if (!displayedDocuments.validIdUrl) missing.push("Government-Issued ID");
      if (!displayedDocuments.proofOfAddressUrl) missing.push("Proof of Address");
      if (!displayedDocuments.dtiRegistrationUrl) missing.push("DTI/SEC Registration");
      if (!displayedDocuments.taxIdUrl) missing.push("BIR Tax ID (TIN)");
    }

    return missing;
  };

  const isLocked = isVerified || (approvalStatus === "pending" && getMissingItems().length === 0);

  // Check if there are rejected documents that haven't been re-uploaded
  const getRejectedDocuments = () => {
    if (!latestRejection || latestRejection.rejectionType !== "partial") {
      return [];
    }
    // Check each rejected item against draft uploads
    return latestRejection.items.filter((item) => {
      const draftUpdatedAt = draftDocumentFieldUpdatedAt[item.documentField];
      // If no draft upload timestamp, document hasn't been updated
      if (!draftUpdatedAt || !item.createdAt) return true;
      // Check if draft is newer than rejection
      return new Date(draftUpdatedAt).getTime() <= new Date(item.createdAt).getTime();
    });
  };

  // Check if all rejected documents have been updated
  const hasUpdatedRejectedDocs = () => {
    const rejectedDocs = getRejectedDocuments();
    return rejectedDocs.length === 0;
  };

  // Handler: reapply for verification (set approval_status back to pending)
  const handleReapply = async () => {
    const sellerId = getSellerId();
    if (!sellerId) {
      toast({ variant: "destructive", title: "Error", description: "Unable to reapply: seller ID missing." });
      return;
    }

    const missing = getMissingItems();
    if (missing.length > 0) {
      toast({
        variant: "destructive",
        title: "Incomplete Profile",
        description: `Please complete missing items before reapplying.`,
      });
      return;
    }

    // Check if partially rejected documents have been updated
    const rejectedDocs = getRejectedDocuments();
    if (rejectedDocs.length > 0) {
      const rejectedDocNames = rejectedDocs
        .map(d => documentFieldLabels[d.documentField] || d.documentField.replace(/_/g, ' '))
        .join(', ');
      toast({
        variant: "destructive",
        title: "Documents Need Updates",
        description: `Please re-upload the following rejected documents: ${rejectedDocNames}`,
      });
      return;
    }

    try {
      setReapplyLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabaseClient: any = supabase;

      // If we have draft documents, copy them to live documents before submitting
      if (useDraftDocuments && Object.keys(draftDocuments).length > 0) {
        // First, get or create the live document record
        const { data: existingLiveDoc } = await supabaseClient
          .from("seller_verification_documents")
          .select("seller_id")
          .eq("seller_id", sellerId)
          .maybeSingle();

        const draftToLiveData: Record<string, string> = {};
        if (draftDocuments.businessPermitUrl) draftToLiveData.business_permit_url = draftDocuments.businessPermitUrl;
        if (draftDocuments.validIdUrl) draftToLiveData.valid_id_url = draftDocuments.validIdUrl;
        if (draftDocuments.proofOfAddressUrl) draftToLiveData.proof_of_address_url = draftDocuments.proofOfAddressUrl;
        if (draftDocuments.dtiRegistrationUrl) draftToLiveData.dti_registration_url = draftDocuments.dtiRegistrationUrl;
        if (draftDocuments.taxIdUrl) draftToLiveData.tax_id_url = draftDocuments.taxIdUrl;

        if (Object.keys(draftToLiveData).length > 0) {
          draftToLiveData.updated_at = new Date().toISOString();

          if (existingLiveDoc) {
            await supabaseClient
              .from("seller_verification_documents")
              .update(draftToLiveData)
              .eq("seller_id", sellerId);
          } else {
            await supabaseClient
              .from("seller_verification_documents")
              .insert({
                seller_id: sellerId,
                ...draftToLiveData,
              });
          }
        }

        // Clear the draft documents after copying
        await supabaseClient
          .from("seller_verification_document_drafts")
          .delete()
          .eq("seller_id", sellerId);

        // Update local state
        setDocuments((prev) => ({
          ...prev,
          ...draftDocuments,
        }));
        setDraftDocuments({});
        setDraftDocumentFieldUpdatedAt({
          business_permit_url: null,
          valid_id_url: null,
          proof_of_address_url: null,
          dti_registration_url: null,
          tax_id_url: null,
        });
      }

      const { error } = await supabaseClient
        .from("sellers")
        .update({ approval_status: "pending" })
        .eq("id", sellerId);

      if (error) throw error;

      setApprovalStatus("pending");
      setLatestRejection(null);
      toast({
        title: "Reapplication Submitted",
        description: "Your profile is now pending review.",
      });
    } catch (err) {
      console.error("Failed to set approval_status to pending:", err);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "Failed to submit reapplication. Please try again later.",
      });
    } finally {
      setReapplyLoading(false);
    }
  };

  // Fetch documents and verification status from Supabase on mount
  React.useEffect(() => {
    const fetchSellerData = async () => {
      const sellerId = getSellerId();
      if (!sellerId) return;

      try {
        // Fetch seller approval status and restrictions
        const { data: sellerData, error: sellerError } = await (supabase as any)
          .from("sellers")
          .select("approval_status, reapplication_attempts, cooldown_count, temp_blacklist_count, blacklisted_at, cool_down_until, temp_blacklist_until, is_permanently_blacklisted")
          .eq("id", sellerId)
          .single() as any;

        if (sellerError) {
          console.error("Error fetching seller status:", sellerError);
        } else if (sellerData) {
          const normalizedStatus = (sellerData.approval_status || "pending") as
            | "pending"
            | "approved"
            | "verified"
            | "rejected"
            | "needs_resubmission";

          setApprovalStatus(normalizedStatus);
          setIsVerified(
            normalizedStatus === "verified" || normalizedStatus === "approved",
          );

          // Set seller restrictions
          const now = new Date();
          setSellerRestrictions({
            coolDownUntil: sellerData.cool_down_until ? new Date(sellerData.cool_down_until) : null,
            tempBlacklistUntil: sellerData.temp_blacklist_until ? new Date(sellerData.temp_blacklist_until) : null,
            isPermanentlyBlacklisted: sellerData.is_permanently_blacklisted || false,
            attempts: sellerData.reapplication_attempts || 0,
            cooldownCount: sellerData.cooldown_count || 0,
            tempBlacklistCount: sellerData.temp_blacklist_count || 0,
          });
        }

        // Fetch verification documents from separate table
        const { data: docData, error: docError } = await (supabase as any)
          .from("seller_verification_documents")
          .select(
            "business_permit_url, valid_id_url, proof_of_address_url, dti_registration_url, tax_id_url, updated_at",
          )
          .eq("seller_id", sellerId)
          .maybeSingle() as any;

        if (docError && docError.code !== 'PGRST116') { // PGRST116 = no rows
          console.error("Error fetching seller documents:", docError);
        } else if (docData) {
          setDocumentsUpdatedAt(docData.updated_at || null);
          setDocuments({
            businessPermitUrl: docData.business_permit_url || undefined,
            validIdUrl: docData.valid_id_url || undefined,
            proofOfAddressUrl: docData.proof_of_address_url || undefined,
            dtiRegistrationUrl: docData.dti_registration_url || undefined,
            taxIdUrl: docData.tax_id_url || undefined,
          });
        }

        // Fetch draft documents for resubmission staging
        const { data: draftData, error: draftError } = await (supabase as any)
          .from("seller_verification_document_drafts")
          .select(
            "business_permit_url, valid_id_url, proof_of_address_url, dti_registration_url, tax_id_url, updated_at, business_permit_updated_at, valid_id_updated_at, proof_of_address_updated_at, dti_registration_updated_at, tax_id_updated_at",
          )
          .eq("seller_id", sellerId)
          .maybeSingle() as any;

        if (draftError && draftError.code !== "PGRST116") {
          console.error("Error fetching draft seller documents:", draftError);
        } else if (draftData) {
          setDraftDocuments({
            businessPermitUrl: draftData.business_permit_url || undefined,
            validIdUrl: draftData.valid_id_url || undefined,
            proofOfAddressUrl: draftData.proof_of_address_url || undefined,
            dtiRegistrationUrl: draftData.dti_registration_url || undefined,
            taxIdUrl: draftData.tax_id_url || undefined,
          });
          setDraftDocumentFieldUpdatedAt({
            business_permit_url: draftData.business_permit_updated_at || null,
            valid_id_url: draftData.valid_id_updated_at || null,
            proof_of_address_url: draftData.proof_of_address_updated_at || null,
            dti_registration_url: draftData.dti_registration_updated_at || null,
            tax_id_url: draftData.tax_id_updated_at || null,
          });
        } else {
          setDraftDocuments({});
          setDraftDocumentFieldUpdatedAt({
            business_permit_url: null,
            valid_id_url: null,
            proof_of_address_url: null,
            dti_registration_url: null,
            tax_id_url: null,
          });
        }

        const { data: rejectionData, error: rejectionError } = await (supabase as any)
          .from("seller_rejections")
          .select(
            "description, rejection_type, created_at, items:seller_rejection_items(document_field, reason, created_at)",
          )
          .eq("seller_id", seller.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle() as any;

        if (rejectionError && rejectionError.code !== "PGRST116") {
          console.warn("Unable to load rejection details:", rejectionError.message);
        } else if (rejectionData) {
          setLatestRejection({
            rejectionType: (rejectionData.rejection_type || "full") as
              | "full"
              | "partial",
            description: rejectionData.description || undefined,
            createdAt: rejectionData.created_at,
            items: (rejectionData.items || []).map((item: {
              document_field: string;
              reason: string | null;
              created_at: string | null;
            }) => ({
              documentField: item.document_field,
              reason: item.reason || undefined,
              createdAt: item.created_at || undefined,
            })),
          });
        } else {
          setLatestRejection(null);
        }
      } catch (error) {
        console.error("Error fetching seller data:", error);
      }
    };

    fetchSellerData();
  }, [seller?.id, refreshKey]);

  // Handle document upload - saves to drafts during partial rejection
  const handleDocumentUpload = async (
    file: File,
    docKey: string,
    columnName: string,
  ) => {
    const sellerId = getSellerId();
    if (!sellerId) return;

    // Validate file type and size
    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: validation.error,
      });
      return;
    }

    setUploadingDoc(docKey);

    try {
      // Upload to Supabase Storage
      const documentUrl = await uploadSellerDocument(file, sellerId, docKey);

      if (!documentUrl) {
        throw new Error("Upload failed");
      }

      const uploadTimestamp = new Date().toISOString();

      // During partial rejection, save to draft table instead of live table
      if (useDraftDocuments) {
        // Save to draft staging table
        const { data: existingDraft } = await (supabase as any)
          .from("seller_verification_document_drafts")
          .select("seller_id")
          .eq("seller_id", sellerId)
          .maybeSingle() as any;

        const draftUpdatedAtColumn = {
          business_permit_url: "business_permit_updated_at",
          valid_id_url: "valid_id_updated_at",
          proof_of_address_url: "proof_of_address_updated_at",
          dti_registration_url: "dti_registration_updated_at",
          tax_id_url: "tax_id_updated_at",
        }[columnName];

        const draftUpdateData: Record<string, string> = {
          [columnName]: documentUrl,
          updated_at: uploadTimestamp,
          ...(draftUpdatedAtColumn && { [draftUpdatedAtColumn]: uploadTimestamp }),
        };

        let error;
        if (existingDraft) {
          const result = await (supabase as any)
            .from("seller_verification_document_drafts")
            .update(draftUpdateData as any)
            .eq("seller_id", sellerId) as any;
          error = result.error;
        } else {
          const result = await (supabase as any)
            .from("seller_verification_document_drafts")
            .insert({
              seller_id: sellerId,
              ...draftUpdateData,
            } as any) as any;
          error = result.error;
        }

        if (error) throw error;

        // Update local draft state
        setDraftDocuments((prev) => ({
          ...prev,
          [docKey]: documentUrl,
        }));
        if (draftUpdatedAtColumn) {
          setDraftDocumentFieldUpdatedAt((prev) => ({
            ...prev,
            [columnName]: uploadTimestamp,
          }));
        }

        toast({
          title: "Document Updated",
          description: "Document saved as draft. Click 'Resubmit Application' when all documents are updated.",
        });
      } else {
        // Normal upload - save to live documents table
        const { data: existingDoc } = await (supabase as any)
          .from("seller_verification_documents")
          .select("seller_id")
          .eq("seller_id", sellerId)
          .maybeSingle() as any;

        const updateData: Record<string, string> = {
          [columnName]: documentUrl,
          updated_at: uploadTimestamp,
        };

        let error;
        if (existingDoc) {
          const result = await (supabase as any)
            .from("seller_verification_documents")
            .update(updateData as any)
            .eq("seller_id", sellerId) as any;
          error = result.error;
        } else {
          const result = await (supabase as any)
            .from("seller_verification_documents")
            .insert({
              seller_id: sellerId,
              ...updateData,
            } as any) as any;
          error = result.error;
        }

        if (error) throw error;

        // Update local live documents state
        setDocuments((prev) => ({
          ...prev,
          [docKey]: documentUrl,
        }));
        setDocumentsUpdatedAt(uploadTimestamp);
        updateSellerDetails({ [docKey]: documentUrl });

        toast({
          title: "Document Uploaded",
          description: "Your file has been uploaded and marked for review.",
        });
      }

      // Refresh data to ensure UI is in sync
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Error uploading document:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to upload document. Please try again.";
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: errorMessage,
      });
    } finally {
      setUploadingDoc(null);
    }
  };

  // Helper: Check if URL is an image file
  const isImageFile = (url?: string) => {
    if (!url) return false;
    return /\.(jpg|jpeg|png|webp)$/i.test(url);
  };

  const getDocumentRejectionReason = (columnName: string) => {
    if (latestRejection?.rejectionType !== "partial") return undefined;

    const item = latestRejection.items.find(
      (entry) => entry.documentField === columnName,
    );

    if (!item) return undefined;

    // During partial rejection, check draft upload timestamp
    if (useDraftDocuments) {
      const draftUpdatedAt = draftDocumentFieldUpdatedAt[columnName];
      if (draftUpdatedAt && item.createdAt) {
        const draftTime = new Date(draftUpdatedAt).getTime();
        const rejectionTime = new Date(item.createdAt).getTime();
        if (Number.isFinite(draftTime) && Number.isFinite(rejectionTime) && draftTime > rejectionTime) {
          // Document has been re-uploaded, no longer show rejection
          return undefined;
        }
      }
    } else {
      // Normal flow - check live document timestamp
      if (documentsUpdatedAt && item.createdAt) {
        const docUpdatedAtValue = new Date(documentsUpdatedAt).getTime();
        const itemCreatedAtValue = new Date(item.createdAt).getTime();

        if (
          Number.isFinite(docUpdatedAtValue) &&
          Number.isFinite(itemCreatedAtValue) &&
          docUpdatedAtValue > itemCreatedAtValue
        ) {
          return undefined;
        }
      }
    }

    return item.reason || latestRejection.description;
  };

  const requiresResubmission =
    approvalStatus === "needs_resubmission" ||
    (approvalStatus === "rejected" && latestRejection?.rejectionType === "partial");

  const documentFieldLabels: Record<string, string> = {
    business_permit_url: "Business Permit",
    valid_id_url: "Government-Issued ID",
    proof_of_address_url: "Proof of Address",
    dti_registration_url: "DTI/SEC Registration",
    tax_id_url: "BIR Tax ID (TIN)",
  };

  // Helper: Format remaining time for cooldown/blacklist
  const formatRemainingTime = (targetDate: Date | null): string => {
    if (!targetDate) return "";
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();
    if (diff <= 0) return "";

    const hours = Math.ceil(diff / (1000 * 60 * 60));
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days > 1) return `${days} days`;
    if (hours > 1) return `${hours} hours`;
    return "Less than an hour";
  };

  // Helper: Get restriction status message
  const getRestrictionStatus = () => {
    const now = new Date();

    if (sellerRestrictions.isPermanentlyBlacklisted) {
      return {
        type: "permanent",
        title: "Permanently Blacklisted",
        message: "You have been permanently blacklisted from the platform. Please contact support for assistance.",
        color: "red",
        icon: Ban,
      };
    }

    if (sellerRestrictions.tempBlacklistUntil && sellerRestrictions.tempBlacklistUntil > now) {
      const remaining = formatRemainingTime(sellerRestrictions.tempBlacklistUntil);
      return {
        type: "temp_blacklist",
        title: "Temporarily Blacklisted",
        message: `You can resubmit in ${remaining}. (${sellerRestrictions.tempBlacklistCount}/3 temporary blacklists)`,
        color: "orange",
        icon: AlertTriangle,
      };
    }

    if (sellerRestrictions.coolDownUntil && sellerRestrictions.coolDownUntil > now) {
      const remaining = formatRemainingTime(sellerRestrictions.coolDownUntil);
      return {
        type: "cooldown",
        title: "Cooldown Period",
        message: `You can resubmit in ${remaining}. (${sellerRestrictions.cooldownCount}/3 cooldowns)`,
        color: "yellow",
        icon: Clock,
      };
    }

    return null;
  };

  const handleSaveBasic = async () => {
    const sellerId = getSellerId();
    if (!sellerId) {
      alert("Unable to save: seller ID missing.");
      return;
    }

    const normalizedEmail = formData.email.trim();
    const normalizedPhone = formData.phone.trim();
    const normalizedOwnerName = formData.ownerName.trim();
    const ownerNameParts = normalizedOwnerName.split(/\s+/).filter(Boolean);
    const normalizedFirstName = ownerNameParts[0] || null;
    const normalizedLastName =
      ownerNameParts.length > 1 ? ownerNameParts.slice(1).join(" ") : null;

    if (!normalizedEmail) {
      alert("Email is required.");
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabaseClient: any = supabase;
      const { error: sellerError } = await supabaseClient
        .from("sellers")
        .update({
          store_name: formData.storeName,
          store_description: formData.storeDescription,
        })
        .eq("id", sellerId);

      if (sellerError) throw sellerError;

      const { error: profileError } = await supabaseClient
        .from("profiles")
        .update({
          email: normalizedEmail,
          phone: normalizedPhone || null,
          first_name: normalizedFirstName,
          last_name: normalizedLastName,
        })
        .eq("id", sellerId);

      if (profileError) throw profileError;

      updateSellerDetails({
        storeName: formData.storeName,
        storeDescription: formData.storeDescription,
        phone: normalizedPhone,
        ownerName: normalizedOwnerName,
        email: normalizedEmail,
      });
      setEditSection(null);
      toast({
        title: "Profile Updated",
        description: "Your basic information has been saved successfully.",
      });
    } catch (err) {
      console.error("Failed to save basic info:", err);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to save changes. Please try again.",
      });
    }
  };

  const triggerUploadConfirmation = (e: React.ChangeEvent<HTMLInputElement>, docKey: string, column: string, label: string) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingUpload({ file, docKey, columnName: column, label });
    }
    // Reset input so the same file can be selected again if cancelled
    e.target.value = '';
  };

  const handleSaveBusiness = async () => {
    const sellerId = getSellerId();
    if (!sellerId) {
      toast({ variant: "destructive", title: "Error", description: "Unable to save: seller ID missing." });
      return;
    }

    const normalizedBusinessType = normalizeBusinessType(businessForm.businessType);
    if (!normalizedBusinessType) {
      toast({
        variant: "destructive",
        title: "Invalid Business Type",
        description: "Please select a valid business type: Sole Proprietorship, Partnership, or Corporation.",
      });
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabaseClient: any = supabase;
      const { error } = await supabaseClient
        .from("seller_business_profiles")
        .upsert(
          {
            seller_id: seller.id,
            business_type: normalizedBusinessType,
            business_registration_number: businessForm.businessRegistrationNumber,
            tax_id_number: businessForm.taxIdNumber,
            address_line_1: businessForm.businessAddress,
            address_line_2: null,
            city: businessForm.city,
            province: businessForm.province,
            postal_code: businessForm.postalCode,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "seller_id",
          },
        );
      if (error) throw error;
      updateSellerDetails({
        businessName: businessForm.businessName,
        businessType: normalizedBusinessType,
        businessRegistrationNumber: businessForm.businessRegistrationNumber,
        taxIdNumber: businessForm.taxIdNumber,
        businessAddress: businessForm.businessAddress,
        city: businessForm.city,
        province: businessForm.province,
        postalCode: businessForm.postalCode,
      });
      setEditSection(null);
      toast({
        title: "Business Info Saved",
        description: "Your business information has been updated.",
      });
    } catch (err) {
      console.error("Failed to save business info:", err);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to save business details. Please try again.",
      });
    }
  };

  const handleSaveBanking = async () => {
    const sellerId = getSellerId();
    if (!sellerId) {
      toast({ variant: "destructive", title: "Error", description: "Unable to save: seller ID missing." });
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabaseClient: any = supabase;
      const { error } = await supabaseClient
        .from("seller_payout_accounts")
        .upsert(
          {
            seller_id: seller.id,
            bank_name: bankingForm.bankName,
            account_name: bankingForm.accountName,
            account_number: bankingForm.accountNumber,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "seller_id",
          },
        );
      if (error) throw error;
      updateSellerDetails({
        bankName: bankingForm.bankName,
        accountName: bankingForm.accountName,
        accountNumber: bankingForm.accountNumber,
      });
      setEditSection(null);
      toast({
        title: "Banking Info Saved",
        description: "Your banking information has been updated.",
      });
    } catch (err) {
      console.error("Failed to save banking info:", err);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to save banking details. Please try again.",
      });
    }
  };

  const handleSaveCategories = async () => {
    const sellerId = getSellerId();
    if (!sellerId) {
      toast({ variant: "destructive", title: "Error", description: "Unable to save: seller ID missing." });
      return;
    }

    try {
      // 1. Map the selected category names back to their UUIDs
      const categoryIdsToInsert = categoriesForm
        .map((catName) => availableCategories.find((c) => c.name === catName)?.id)
        .filter(Boolean); // Filters out any undefined values

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabaseClient: any = supabase;

      // 2. Delete all existing category links for this seller
      const { error: deleteError } = await supabaseClient
        .from("seller_categories")
        .delete()
        .eq("seller_id", sellerId);

      if (deleteError) throw deleteError;

      // 3. Insert the newly selected categories
      if (categoryIdsToInsert.length > 0) {
        const insertPayload = categoryIdsToInsert.map((categoryId) => ({
          seller_id: sellerId,
          category_id: categoryId,
        }));

        const { error: insertError } = await supabaseClient
          .from("seller_categories")
          .insert(insertPayload);

        if (insertError) throw insertError;
      }

      updateSellerDetails({ storeCategory: categoriesForm });
      setEditSection(null);

      toast({
        title: "Categories Saved",
        description: "Your store categories have been updated successfully.",
      });
    } catch (err: any) {
      console.error("Failed to save categories:", JSON.stringify(err, null, 2));
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: err?.message || err?.details || "Failed to save categories. Please try again.",
      });
    }
  };

  // Helper function to download document
  const handleDownloadDocument = async (url: string, filename: string) => {
    try {
      console.log("Downloading document:", filename, "from URL:", url);

      // Fetch the document
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch document");
      }

      // Convert to blob
      const blob = await response.blob();

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      console.log("Download complete");
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download document. The file may not be accessible.");
    }
  };

  return (
    <SellerWorkspaceLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-orange-100/40 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-yellow-100/40 rounded-full blur-[100px]" />
        </div>

        <div className="p-2 md:p-8 flex-1 w-full h-full overflow-auto relative z-10 scrollbar-hide">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Page Header & Status Banner */}
            <div className="mb-8 space-y-6">
              <div>
                <h1 className="text-3xl font-black text-[var(--text-headline)] font-heading tracking-tight">
                  Store Profile
                </h1>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Manage your store's complete profile and verification
                </p>
              </div>

              {/* Under Review Banner (Branded) */}
              {approvalStatus === "pending" && getMissingItems().length === 0 && (
                <Card className="p-6 border-2 border-[var(--brand-primary)] bg-[var(--brand-accent-light)]/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm rounded-2xl overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-2 h-full bg-[var(--brand-primary)]" />
                  <div className="flex items-start gap-4 pl-2">
                    <div className="p-3 bg-white rounded-full shadow-sm">
                      <Clock className="h-6 w-6 text-[var(--brand-primary)]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[var(--text-headline)]">
                        Application Under Review
                      </h3>
                      <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                        You have completed all required fields and uploaded all documents. Your application is currently locked and being reviewed by our team. We will notify you once a decision is made.
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Sidebar - Profile Summary */}
              <div className="lg:col-span-4 space-y-6">


                {/* Sticky Profile Card */}
                <div className="lg:sticky lg:top-4">
                  <Card className="p-6 shadow-md border-0 bg-white rounded-xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-orange-50 to-white opacity-50 z-0 pointer-events-none" />
                    <div className="flex flex-col items-start text-left w-full relative z-10">
                      {/* Avatar */}
                      <div className="relative mb-6">
                        {seller?.avatar ? (
                          <img
                            src={seller.avatar}
                            alt={seller.storeName}
                            className="h-28 w-28 rounded-full object-cover shadow-2xl shadow-orange-900/10 ring-4 ring-white"
                          />
                        ) : (
                          <div className="h-28 w-28 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-orange-900/20 ring-4 ring-white">
                            {seller?.storeName?.charAt(0) || "S"}
                          </div>
                        )}
                        <label className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-[var(--brand-primary)] text-white flex items-center justify-center shadow-md hover:bg-[var(--brand-primary-dark)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                          {avatarLoading ? (
                            <Loader className="h-4 w-4 animate-spin" />
                          ) : (
                            <Camera className="h-4 w-4" />
                          )}
                          <input
                            ref={avatarInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            disabled={avatarLoading}
                          />
                        </label>
                      </div>

                      {/* Store Name */}
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-2xl font-bold text-gray-900">
                          {seller?.storeName || "Your Store"}
                        </h2>
                        {isVerified && (
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                        )}
                      </div>

                      {/* Email and Joined Date */}
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-1 flex-wrap">
                        <span>{seller?.email || "Not provided"}</span>
                        <span className="text-gray-300">|</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Joined{" "}
                            {seller?.joinDate
                              ? new Date(seller.joinDate).toLocaleDateString(
                                "en-US",
                                { year: "numeric" },
                              )
                              : "N/A"}
                          </span>
                        </div>
                      </div>

                      {/* Status Section */}
                      <div className="mt-3 mb-4 w-full">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <span className="text-sm text-gray-500 font-medium">Status</span>
                          <Badge
                            className={cn(
                              "px-3 py-1 font-bold rounded-full text-xs",
                              approvalStatus === "verified" || approvalStatus === "approved"
                                ? "bg-green-100 text-green-700 border-green-200"
                                : approvalStatus === "rejected" || approvalStatus === "needs_resubmission"
                                  ? "bg-red-100 text-red-700 border-red-200"
                                  : "bg-amber-100 text-amber-700 border-amber-200"
                            )}
                          >
                            {approvalStatus === "needs_resubmission"
                              ? "Updates Required"
                              : approvalStatus.charAt(0).toUpperCase() + approvalStatus.slice(1)}
                          </Badge>
                        </div>
                      </div>

                      {/* Restriction Status Banner */}
                      {(() => {
                        const restriction = getRestrictionStatus();
                        if (!restriction) return null;
                        
                        const colorClasses = {
                          red: "bg-red-50 border-red-200 text-red-700",
                          orange: "bg-orange-50 border-orange-200 text-orange-700",
                          yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
                        };
                        
                        const IconComponent = restriction.icon;
                        
                        return (
                          <div className={`w-full mb-4 p-4 ${colorClasses[restriction.color as keyof typeof colorClasses]} border rounded-lg`}>
                            <div className="flex items-start gap-3">
                              <IconComponent className="h-5 w-5 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold text-sm">{restriction.title}</p>
                                <p className="text-sm mt-1 opacity-90">{restriction.message}</p>
                                {(sellerRestrictions.attempts > 0 || sellerRestrictions.cooldownCount > 0) && (
                                  <p className="text-xs mt-2 opacity-75">
                                    Failed attempts: {sellerRestrictions.attempts}/3
                                    {sellerRestrictions.cooldownCount > 0 && ` • Cooldowns: ${sellerRestrictions.cooldownCount}/3`}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Avatar Error */}
                      {avatarError && (
                        <div className="w-full mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs font-medium text-red-900 mb-1">
                            Upload Failed
                          </p>
                          <p className="text-xs text-red-700">{avatarError}</p>
                        </div>
                      )}

                      {/* Quick Stats */}
                      <div className="w-full bg-none rounded-2xl divide-y border-0 divide-gray-100/50 mt-6">
                        {/* Followers */}
                        <div className="flex items-center justify-between py-4 pr-4 pl-0 border-b border-gray-100/50 hover:bg-[var(--brand-accent-light)]/40 transition-all rounded-t-2xl group cursor-default">
                          <div className="flex items-center gap-3">
                            <Users className="h-5 w-5 text-[var(--text-muted)]" />
                            <span className="text-sm font-bold text-[var(--text-secondary)]">
                              Followers
                            </span>
                          </div>
                          <span className="font-black text-[var(--text-headline)]">0</span>
                        </div>

                        {/* Rating */}
                        <div className="flex items-center justify-between py-4 pr-4 pl-0 border-b border-gray-100/50 hover:bg-[var(--brand-accent-light)]/40 transition-all group cursor-default">
                          <div className="flex items-center gap-3">
                            <Star className="h-5 w-5 text-[var(--text-muted)]" />
                            <span className="text-sm font-bold text-[var(--text-secondary)]">
                              Rating
                            </span>
                          </div>
                          <span className="font-black text-[var(--text-headline)]">
                            {seller?.rating ? `${seller.rating}/5.0` : "New"}
                          </span>
                        </div>

                        {/* Response Rate */}
                        <div className="flex items-center justify-between py-4 pr-4 pl-0 border-b border-gray-100/50 hover:bg-[var(--brand-accent-light)]/40 transition-all group cursor-default">
                          <div className="flex items-center gap-3">
                            <MessageCircle className="h-5 w-5 text-[var(--text-muted)]" />
                            <span className="text-sm font-bold text-[var(--text-secondary)]">
                              Response Rate
                            </span>
                          </div>
                          <span className="font-black text-[var(--text-headline)]">
                            100%
                          </span>
                        </div>

                        {/* Products */}
                        <div className="flex items-center justify-between py-4 pr-4 pl-0 hover:bg-[var(--brand-accent-light)]/40 transition-all rounded-b-2xl group cursor-default">
                          <div className="flex items-center gap-3">
                            <Package className="h-5 w-5 text-[var(--text-muted)]" />
                            <span className="text-sm font-bold text-[var(--text-secondary)]">
                              Products
                            </span>
                          </div>
                          <span className="font-black text-[var(--text-headline)]">{products.length}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Right Content Area - Scrollable */}
              <div className="lg:col-span-8 space-y-6">


                {/* Owner & Contact Information (Editable) */}
                <Card className="p-8 mb-8 shadow-md border-0 bg-white rounded-xl">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-[var(--text-headline)] flex items-center gap-2">
                        <User className="h-5 w-5 text-[var(--brand-primary)]" />
                        Owner & Contact Information
                      </h3>
                    </div>
                    {editSection !== "basic" && (
                      <Button
                        onClick={() => setEditSection("basic")}
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)] hover:bg-[var(--brand-accent-light)]/50 rounded-full font-bold"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </Button>
                    )}
                  </div>

                  {editSection === "basic" ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Owner Name</Label>
                          <Input
                            value={formData.ownerName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                ownerName: e.target.value,
                              })
                            }
                            placeholder="Full name"
                          />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                              setFormData({ ...formData, email: e.target.value })
                            }
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Phone</Label>
                          <Input
                            value={formData.phone}
                            onChange={(e) =>
                              setFormData({ ...formData, phone: e.target.value })
                            }
                            placeholder="+63 XXX XXX XXXX"
                          />
                        </div>
                        <div>
                          <Label>Store Name</Label>
                          <Input
                            value={formData.storeName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                storeName: e.target.value,
                              })
                            }
                            placeholder="Your store name"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Store Description</Label>
                        <Textarea
                          value={formData.storeDescription}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              storeDescription: e.target.value,
                            })
                          }
                          rows={4}
                          placeholder="Describe your store and what you sell..."
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button
                          onClick={handleSaveBasic}
                          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
                        >
                          Save Changes
                        </Button>
                        <Button
                          onClick={() => setEditSection(null)}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                          Owner Name
                          {isEmptyField(seller?.ownerName) && (
                            <AlertCircle
                              className="h-4 w-4 text-amber-500"
                              aria-label="Required field"
                            />
                          )}
                        </p>
                        <p className="text-gray-900 font-medium">
                          {seller?.ownerName || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                          Email Address
                          {isEmptyField(seller?.email) && (
                            <AlertCircle
                              className="h-4 w-4 text-amber-500"
                              aria-label="Required field"
                            />
                          )}
                        </p>
                        <p className="text-gray-900 font-medium">
                          {seller?.email || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                          Phone Number
                          {isEmptyField(seller?.phone) && (
                            <AlertCircle
                              className="h-4 w-4 text-amber-500"
                              aria-label="Required field"
                            />
                          )}
                        </p>
                        <p className="text-gray-900 font-medium">
                          {seller?.phone || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                          Store Name
                          {isEmptyField(seller?.storeName) && (
                            <AlertCircle
                              className="h-4 w-4 text-amber-500"
                              aria-label="Required field"
                            />
                          )}
                        </p>
                        <p className="text-gray-900 font-medium">
                          {seller?.storeName || "Your Store"}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                          Store Description
                          {isEmptyField(seller?.storeDescription) && (
                            <AlertCircle
                              className="h-4 w-4 text-amber-500"
                              aria-label="Recommended field"
                            />
                          )}
                        </p>
                        <p className="text-gray-900">
                          {seller?.storeDescription || "No description added"}
                        </p>
                      </div>
                    </div>
                  )}
                </Card>

                {/* Business Information (Locked if Verified) */}
                <Card className="p-8 mb-8 shadow-md border-0 bg-white rounded-xl">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-[var(--text-headline)] flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-[var(--brand-primary)]" />
                        Business Information
                      </h3>
                      {isVerified && (
                        <Badge className="bg-green-100 text-green-700 ml-2 border border-green-200 rounded-full px-3">
                          <Lock className="h-3 w-3 mr-1" />
                          Verified & Locked
                        </Badge>
                      )}
                    </div>
                    {!isVerified && (
                      <Button
                        onClick={() => setEditSection("business")}
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)] hover:bg-[var(--brand-accent-light)]/50 rounded-full font-bold"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </Button>
                    )}
                  </div>

                  {editSection === "business" ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Business Name</Label>
                          <Input
                            value={businessForm.businessName}
                            onChange={(e) =>
                              setBusinessForm({
                                ...businessForm,
                                businessName: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>Business Type</Label>
                          <select
                            value={normalizeBusinessType(businessForm.businessType) ?? ""}
                            onChange={(e) =>
                              setBusinessForm({
                                ...businessForm,
                                businessType: e.target.value,
                              })
                            }
                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none"
                          >
                            <option value="">Select business type</option>
                            {BUSINESS_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Business Registration Number</Label>
                          <Input
                            value={businessForm.businessRegistrationNumber}
                            onChange={(e) =>
                              setBusinessForm({
                                ...businessForm,
                                businessRegistrationNumber: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>Tax ID Number (TIN)</Label>
                          <Input
                            value={businessForm.taxIdNumber}
                            onChange={(e) =>
                              setBusinessForm({
                                ...businessForm,
                                taxIdNumber: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <Label>Address</Label>
                          <Input
                            value={businessForm.businessAddress}
                            onChange={(e) =>
                              setBusinessForm({
                                ...businessForm,
                                businessAddress: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>City</Label>
                          <Input
                            value={businessForm.city}
                            onChange={(e) =>
                              setBusinessForm({
                                ...businessForm,
                                city: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>Province</Label>
                          <Input
                            value={businessForm.province}
                            onChange={(e) =>
                              setBusinessForm({
                                ...businessForm,
                                province: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>Postal Code</Label>
                          <Input
                            value={businessForm.postalCode}
                            onChange={(e) =>
                              setBusinessForm({
                                ...businessForm,
                                postalCode: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button
                          onClick={handleSaveBusiness}
                          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
                        >
                          Save Changes
                        </Button>
                        <Button
                          onClick={() => setEditSection(null)}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                          Business Name
                          {isEmptyField(seller?.businessName) && (
                            <AlertCircle
                              className="h-4 w-4 text-amber-500"
                              aria-label="Required field"
                            />
                          )}
                        </p>
                        <p className="text-gray-900 font-medium">
                          {seller?.businessName || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                          Business Type
                          {isEmptyField(seller?.businessType) && (
                            <AlertCircle
                              className="h-4 w-4 text-amber-500"
                              aria-label="Required field"
                            />
                          )}
                        </p>
                        <p className="text-gray-900 font-medium">
                          {seller?.businessType || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                          Business Registration Number
                          {isEmptyField(seller?.businessRegistrationNumber) && (
                            <AlertCircle
                              className="h-4 w-4 text-amber-500"
                              aria-label="Required field"
                            />
                          )}
                        </p>
                        <p className="text-gray-900 font-medium font-mono">
                          {seller?.businessRegistrationNumber || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                          Tax ID Number (TIN)
                          {isEmptyField(seller?.taxIdNumber) && (
                            <AlertCircle
                              className="h-4 w-4 text-amber-500"
                              aria-label="Required field"
                            />
                          )}
                        </p>
                        <p className="text-gray-900 font-medium font-mono">
                          {seller?.taxIdNumber || "Not provided"}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                          Business Address
                          {(isEmptyField(seller?.businessAddress) ||
                            isEmptyField(seller?.city) ||
                            isEmptyField(seller?.province) ||
                            isEmptyField(seller?.postalCode)) && (
                              <AlertCircle
                                className="h-4 w-4 text-amber-500"
                                aria-label="Required field"
                              />
                            )}
                        </p>
                        <p className="text-gray-900">
                          {seller?.businessAddress &&
                            seller?.city &&
                            seller?.province &&
                            seller?.postalCode
                            ? `${seller.businessAddress}, ${seller.city}, ${seller.province} ${seller.postalCode}`
                            : "Not provided"}
                        </p>
                      </div>
                    </div>
                  )}

                  {isVerified && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Your business information has been verified and cannot be
                        edited. Contact support if you need to make changes.
                      </p>
                    </div>
                  )}
                </Card>

                {/* Banking Information (Locked if Verified) */}
                {SHOW_BANKING_INFO && (
                  <Card className="p-8 mb-8 shadow-md border-0 bg-white rounded-xl">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-[var(--text-headline)] flex items-center gap-2">
                          <CreditCard className="h-5 w-5 text-[var(--brand-primary)]" />
                          Banking Information
                        </h3>
                        {isVerified && (
                          <Badge className="bg-green-100 text-green-700 ml-2 border border-green-200 rounded-full px-3">
                            <Lock className="h-3 w-3 mr-1" />
                            Verified & Locked
                          </Badge>
                        )}
                      </div>
                      {!isVerified && (
                        <Button
                          onClick={() => setEditSection("banking")}
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)] hover:bg-[var(--brand-accent-light)]/50 rounded-full font-bold"
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit
                        </Button>
                      )}
                    </div>

                    {editSection === "banking" ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Bank Name</Label>
                            <Input
                              value={bankingForm.bankName}
                              onChange={(e) =>
                                setBankingForm({
                                  ...bankingForm,
                                  bankName: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label>Account Name</Label>
                            <Input
                              value={bankingForm.accountName}
                              onChange={(e) =>
                                setBankingForm({
                                  ...bankingForm,
                                  accountName: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Account Number</Label>
                          <Input
                            value={bankingForm.accountNumber}
                            onChange={(e) =>
                              setBankingForm({
                                ...bankingForm,
                                accountNumber: e.target.value,
                              })
                            }
                            placeholder="Enter your account number"
                          />
                        </div>
                        <div className="flex gap-3 pt-2">
                          <Button
                            onClick={handleSaveBanking}
                            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
                          >
                            Save Changes
                          </Button>
                          <Button
                            onClick={() => setEditSection(null)}
                            variant="outline"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                            Bank Name
                            {isEmptyField(seller?.bankName) && (
                              <AlertCircle
                                className="h-4 w-4 text-amber-500"
                                aria-label="Required field"
                              />
                            )}
                          </p>
                          <p className="text-gray-900 font-medium">
                            {seller?.bankName || "Not provided"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                            Account Name
                            {isEmptyField(seller?.accountName) && (
                              <AlertCircle
                                className="h-4 w-4 text-amber-500"
                                aria-label="Required field"
                              />
                            )}
                          </p>
                          <p className="text-gray-900 font-medium">
                            {seller?.accountName || "Not provided"}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                            Account Number
                            {isEmptyField(seller?.accountNumber) && (
                              <AlertCircle
                                className="h-4 w-4 text-amber-500"
                                aria-label="Required field"
                              />
                            )}
                          </p>
                          <p className="text-gray-900 font-medium font-mono">
                            {seller?.accountNumber
                              ? `****${seller.accountNumber.slice(-4)}`
                              : "Not provided"}
                          </p>
                        </div>
                      </div>
                    )}

                    {isVerified && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Your banking information has been verified and secured.
                          Contact support if you need to update these details.
                        </p>
                      </div>
                    )}
                  </Card>
                )}

                {/* Verification Documents */}
                <Card className="p-8 mb-8 shadow-md border-0 bg-white rounded-xl">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-[var(--text-headline)] flex items-center gap-2">
                        <FileText className="h-5 w-5 text-[var(--brand-primary)]" />
                        Verification Documents
                      </h3>
                    </div>
                    {isVerified ? (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        All Verified
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700">
                        <Clock className="h-4 w-4 mr-1" />
                        Under Review
                      </Badge>
                    )}
                  </div>

                  {/* Document-Level Rejection Banner */}
                  {requiresResubmission && getRejectedDocuments().length > 0 && (
                    <div className="mb-8 p-5 bg-red-50 border-2 border-red-200 rounded-xl space-y-3">
                      <p className="text-base font-bold text-red-900 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Action Required: Update Highlighted Documents
                      </p>
                      {latestRejection?.description && (
                        <p className="text-sm text-red-800">{latestRejection.description}</p>
                      )}
                      <div className="space-y-1 mt-2 p-3 bg-white/50 rounded-lg">
                        {getRejectedDocuments().map((item) => (
                          <p key={item.documentField} className="text-sm text-red-900 font-medium flex items-start gap-2">
                            <span className="text-red-500">•</span>
                            {documentFieldLabels[item.documentField] || item.documentField}
                            {item.reason ? `: ${item.reason}` : ""}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Document Horizontal List */}
                  <div className="grid grid-cols-1 gap-6">
                    {[
                      {
                        key: "businessPermitUrl",
                        label: "Business Permit",
                        description: "Mayor's permit or business registration",
                        column: "business_permit_url",
                      },
                      {
                        key: "validIdUrl",
                        label: "Government-Issued ID",
                        description: "Owner's valid ID (Driver's License, Passport, etc.)",
                        column: "valid_id_url",
                      },
                      {
                        key: "proofOfAddressUrl",
                        label: "Proof of Address",
                        description: "Utility bill or bank statement showing business address",
                        column: "proof_of_address_url",
                      },
                      {
                        key: "dtiRegistrationUrl",
                        label: "DTI/SEC Registration",
                        description: "DTI certificate for sole proprietor or SEC for corporation",
                        column: "dti_registration_url",
                      },
                      {
                        key: "taxIdUrl",
                        label: "BIR Tax ID (TIN)",
                        description: "Certificate of Registration from BIR",
                        column: "tax_id_url",
                      },
                    ].map((doc) => {
                      const documentUrl = documents[doc.key as keyof typeof documents];
                      const rejectionReason = getDocumentRejectionReason(doc.column);
                      const isRejected = requiresResubmission && Boolean(rejectionReason);
                      const isPdf = documentUrl?.toLowerCase().includes(".pdf");
                      const currentIsUploading = uploadingDoc === doc.key;

                      return (
                        <Card
                          key={doc.key}
                          className={cn(
                            "overflow-hidden border-2 transition-all flex flex-col md:flex-row",
                            isRejected ? "border-red-400 shadow-[0_0_15px_rgba(248,113,113,0.15)]" : "border-gray-100"
                          )}
                        >
                          {/* Document Thumbnail Preview (Left Side) */}
                          <div className="h-48 md:h-auto md:w-64 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-100 relative group flex items-center justify-center overflow-hidden shrink-0">
                            {documentUrl ? (
                              isPdf ? (
                                <div className="flex flex-col items-center text-gray-400 py-8">
                                  <FileText className="w-12 h-12 mb-2" />
                                  <span className="text-xs font-bold uppercase tracking-wider">PDF Document</span>
                                </div>
                              ) : (
                                <img src={documentUrl} alt={doc.label} className="object-cover w-full h-full absolute inset-0 opacity-90 group-hover:opacity-100 transition-opacity" />
                              )
                            ) : (
                              <div className="flex flex-col items-center text-gray-300 py-8">
                                <Upload className="w-8 h-8 mb-2" />
                                <span className="text-xs">No file uploaded</span>
                              </div>
                            )}

                            {/* Action Overlay */}
                            {documentUrl && (
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="w-32 shadow-lg"
                                  onClick={() => window.open(documentUrl, "_blank")}
                                >
                                  <Eye className="w-4 h-4 mr-2" /> View Full
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="w-32 shadow-lg"
                                  onClick={() => handleDownloadDocument(documentUrl, `${doc.label.replace(/\s+/g, "_")}${isPdf ? '.pdf' : '.jpg'}`)}
                                >
                                  <Download className="w-4 h-4 mr-2" /> Download
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Document Info & Replace Button (Right Side) */}
                          <div className="p-6 bg-white flex flex-col flex-1 justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-bold text-[var(--text-headline)] text-lg">{doc.label}</h4>
                                  <p className="text-sm text-gray-500 mt-1">{doc.description}</p>
                                </div>
                                <div className="shrink-0 ml-4">
                                  {documentUrl && !isRejected && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                                  {isRejected && <AlertCircle className="w-6 h-6 text-red-500 animate-pulse" />}
                                </div>
                              </div>
                              {isRejected && (
                                <div className="mt-3 p-3 bg-red-50 rounded-lg text-sm text-red-700 font-medium border border-red-100">
                                  <span className="font-bold text-red-900 mr-1">Reason:</span>
                                  {rejectionReason || "Invalid document. Please replace."}
                                </div>
                              )}
                            </div>

                            <div className="mt-6 flex items-center gap-4">
                              <Button
                                variant={isRejected ? "destructive" : "outline"}
                                className={cn(
                                  "font-bold",
                                  !isRejected && documentUrl ? "bg-gray-50 hover:bg-gray-100" : ""
                                )}
                                disabled={currentIsUploading || (isLocked && !isRejected)}
                                onClick={() => {
                                  const input = document.createElement("input");
                                  input.type = "file";
                                  input.accept = ".pdf,.jpg,.jpeg,.png";
                                  input.onchange = (e) => triggerUploadConfirmation(e as any, doc.key, doc.column, doc.label);
                                  input.click();
                                }}
                              >
                                {currentIsUploading ? (
                                  <><Loader className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
                                ) : documentUrl ? (
                                  <><Upload className="h-4 w-4 mr-2" /> Replace File</>
                                ) : (
                                  <><Upload className="h-4 w-4 mr-2" /> Upload File</>
                                )}
                              </Button>

                              {!documentUrl && !currentIsUploading && (
                                <span className="text-xs text-gray-400 font-medium">Required</span>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                  {!isVerified && !requiresResubmission && (
                    <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-700 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        Your documents are currently being reviewed by our team.
                        This usually takes 1-2 business days. You'll be notified
                        once verification is complete.
                      </p>
                    </div>
                  )}
                </Card>

                {/* Store Categories */}
                <Card className="p-8 mb-8 shadow-md border-0 bg-white rounded-xl">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-[var(--text-headline)] flex items-center gap-2">
                      <LayoutGrid className="h-5 w-5 text-[var(--brand-primary)]" />
                      Store Categories
                    </h3>
                    {editSection !== "categories" && (
                      <Button
                        onClick={() => setEditSection("categories")}
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)] hover:bg-[var(--brand-accent-light)]/50 rounded-full font-bold"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </Button>
                    )}
                  </div>

                  {editSection === "categories" ? (
                    <div className="space-y-4">
                      <div>
                        <Label>Store Categories</Label>
                        <p className="text-sm text-gray-600 mb-4">
                          Select the categories that best describe your store.
                        </p>

                        {isLoadingCategories ? (
                          <div className="flex items-center gap-2 py-4">
                            <Loader className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-gray-500">Loading categories...</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1 scrollbar-hide">
                            {availableCategories.map((cat) => (
                              <label
                                key={cat.id}
                                className={cn(
                                  "flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all",
                                  categoriesForm.includes(cat.name)
                                    ? "bg-[var(--brand-accent-light)] border-[var(--brand-primary)] text-[var(--brand-primary)] font-bold"
                                    : "bg-white border-gray-200 text-gray-600 hover:border-orange-200"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={categoriesForm.includes(cat.name)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setCategoriesForm([...categoriesForm, cat.name]);
                                    } else {
                                      setCategoriesForm(categoriesForm.filter((name) => name !== cat.name));
                                    }
                                  }}
                                />
                                {cat.name}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button
                          onClick={handleSaveCategories}
                          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)]"
                        >
                          Save Changes
                        </Button>
                        <Button
                          onClick={() => setEditSection(null)}
                          variant="outline"
                          className="bg-base hover:bg-[var(--brand-primary-dark)]"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {seller?.storeCategory && seller.storeCategory.length > 0 ? (
                        seller.storeCategory.map((category, index) => (
                          <span
                            key={index}
                            className="px-4 py-2 bg-[var(--brand-accent-light)] text-[var(--brand-primary)] rounded-full text-sm font-medium"
                          >
                            {category}
                          </span>
                        ))
                      ) : (
                        <p className="text-gray-500">No categories selected</p>
                      )}
                    </div>
                  )}
                </Card>

                {/* Store Banner */}
                <Card className="p-8 shadow-md border-0 bg-white rounded-xl">
                  <h3 className="text-xl font-bold text-[var(--text-headline)] mb-6 flex items-center gap-2">
                    <Image className="h-5 w-5 text-[var(--brand-primary)]" />
                    Store Banner
                  </h3>
                  
                  {/* Banner Preview */}
                  {seller?.banner ? (
                    <div className="mb-6 relative group">
                      <img 
                        src={seller.banner} 
                        alt="Store Banner" 
                        className="w-full h-48 object-cover rounded-xl"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                        <button 
                          onClick={() => bannerInputRef.current?.click()}
                          disabled={bannerLoading}
                          className="px-4 py-2 bg-white rounded-lg font-medium text-gray-800"
                        >
                          {bannerLoading ? "Uploading..." : "Change Banner"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="border-2 border-dashed border-[var(--brand-accent-light)] rounded-2xl p-12 text-center hover:border-[var(--brand-primary)] hover:bg-[var(--brand-accent-light)]/50 transition-all cursor-pointer group"
                      onClick={() => bannerInputRef.current?.click()}
                    >
                      <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 transition-transform">
                        <Upload className="h-8 w-8 text-[var(--brand-primary)]" />
                      </div>
                      <p className="text-[var(--text-secondary)] font-bold mb-2">
                        Click to upload store banner
                      </p>
                      <p className="text-sm text-[var(--text-muted)]">
                        Recommended size: 1200x400px (Max 5MB)
                      </p>
                    </div>
                  )}

                  {/* Hidden file input */}
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerUpload}
                    disabled={bannerLoading}
                  />

                  {/* Error message */}
                  {bannerError && (
                    <p className="text-sm text-red-600 mt-2">{bannerError}</p>
                  )}
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar (Contained naturally within the layout) */}
        {(approvalStatus === "rejected" || approvalStatus === "needs_resubmission") && (
          <div className="shrink-0 w-full bg-white border-t border-gray-200 py-4 px-6 lg:px-8 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50 flex items-center justify-between transition-all">
            <div>
              <h4 className="font-bold text-[var(--text-headline)]">Ready to resubmit?</h4>
              <p className="text-sm text-[var(--text-muted)]">
                {getMissingItems().length > 0
                  ? `${getMissingItems().length} required items left to update`
                  : "All documents updated. You can now resubmit your application."}
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleReapply}
              disabled={reapplyLoading || getMissingItems().length > 0}
              className={cn(
                "px-8 font-bold shadow-md transition-all",
                getMissingItems().length === 0
                  ? "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white"
                  : "bg-gray-200 text-gray-500"
              )}
            >
              {reapplyLoading ? (
                <><Loader className="w-5 h-5 mr-2 animate-spin" /> Submitting...</>
              ) : (
                "Resubmit Application"
              )}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={!!pendingUpload} onOpenChange={(open) => !open && setPendingUpload(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Document Upload</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">
              You are about to upload <span className="font-bold text-gray-900">{pendingUpload?.file.name}</span> for your <span className="font-bold text-gray-900">{pendingUpload?.label}</span>.
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Please ensure the document is clear and readable.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingUpload(null)}>
              Cancel
            </Button>
            <Button
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
              onClick={async () => {
                if (pendingUpload) {
                  await handleDocumentUpload(pendingUpload.file, pendingUpload.docKey, pendingUpload.columnName);
                  setPendingUpload(null);
                }
              }}
            >
              Confirm Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SellerWorkspaceLayout>
  );
}
