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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { uploadSellerDocument, validateDocumentFile } from "@/utils/storage";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { BusinessType } from "@/types/database.types";

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
  const getSellerId = () =>
    seller?.id || useAuthStore.getState().seller?.id || null;

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

      // Create a unique filename
      const timestamp = Date.now();
      const ext = file.name.split(".").pop();
      const filename = `${sellerId}-${timestamp}.${ext}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
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
      const { data: publicData } = supabase.storage
        .from("profile-avatars")
        .getPublicUrl(filename);

      const avatarUrl = publicData.publicUrl;
      console.log("Generated public URL:", avatarUrl);

      // Update profile in database
      const { error: updateError, data: updateData } = await supabase
        .from("profiles")
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
    "pending" | "approved" | "verified" | "rejected" | "needs_resubmission"
  >(seller?.approvalStatus || "pending");
  const [reapplyLoading, setReapplyLoading] = useState(false);
  const [latestRejection, setLatestRejection] = useState<{
    rejectionType: "full" | "partial";
    description?: string;
    createdAt: string;
    items: { documentField: string; reason?: string; createdAt?: string }[];
  } | null>(null);
  const [documentsUpdatedAt, setDocumentsUpdatedAt] = useState<string | null>(null);

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

    // Documents
    if (!documents.businessPermitUrl) missing.push("Business Permit");
    if (!documents.validIdUrl) missing.push("Government-Issued ID");
    if (!documents.proofOfAddressUrl) missing.push("Proof of Address");
    if (!documents.dtiRegistrationUrl) missing.push("DTI/SEC Registration");
    if (!documents.taxIdUrl) missing.push("BIR Tax ID (TIN)");

    return missing;
  };

  // Handler: reapply for verification (set approval_status back to pending)
  const handleReapply = async () => {
    const sellerId = getSellerId();
    if (!sellerId) {
      alert("Unable to reapply: seller ID missing.");
      return;
    }

    const missing = getMissingItems();
    if (missing.length > 0) {
      alert(
        `Please complete the following before reapplying:\n\n- ${missing.join("\n- ")}`,
      );
      return;
    }

    try {
      setReapplyLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabaseClient: any = supabase;
      const { error } = await supabaseClient
        .from("sellers")
        .update({ approval_status: "pending" })
        .eq("id", sellerId);

      if (error) throw error;

      setApprovalStatus("pending");
      setLatestRejection(null);
      alert("Reapplication submitted. Your profile is now pending review.");
    } catch (err) {
      console.error("Failed to set approval_status to pending:", err);
      alert("Failed to submit reapplication. Please try again later.");
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
        // Fetch seller approval status
        const { data: sellerData, error: sellerError } = await supabase
          .from("sellers")
          .select("approval_status")
          .eq("id", sellerId)
          .single();

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
        }

        // Fetch verification documents from separate table
        const { data: docData, error: docError } = await supabase
          .from("seller_verification_documents")
          .select(
            "business_permit_url, valid_id_url, proof_of_address_url, dti_registration_url, tax_id_url, updated_at",
          )
          .eq("seller_id", sellerId)
          .maybeSingle();

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

        const { data: rejectionData, error: rejectionError } = await supabase
          .from("seller_rejections")
          .select(
            "description, rejection_type, created_at, items:seller_rejection_items(document_field, reason, created_at)",
          )
          .eq("seller_id", seller.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

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
  }, [seller?.id]);

  // Handle document upload
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
      alert(validation.error);
      return;
    }

    setUploadingDoc(docKey);

    try {
      // Upload to Supabase Storage
      const documentUrl = await uploadSellerDocument(file, sellerId, docKey);

      if (!documentUrl) {
        throw new Error("Upload failed");
      }

      // Update seller_verification_documents table
      // First check if record exists
      const { data: existingDoc } = await supabase
        .from("seller_verification_documents")
        .select("seller_id")
        .eq("seller_id", sellerId)
        .single();

      const uploadTimestamp = new Date().toISOString();

      const updateData: Record<string, string> = {
        [columnName]: documentUrl,
        updated_at: uploadTimestamp,
      };

      let error;
      if (existingDoc) {
        // Update existing record
        const result = await supabase
          .from("seller_verification_documents")
          .update(updateData)
          .eq("seller_id", sellerId);
        error = result.error;
      } else {
        // Insert new record
        const result = await supabase
          .from("seller_verification_documents")
          .insert({
            seller_id: sellerId,
            ...updateData,
          });
        error = result.error;
      }

      if (error) {
        throw error;
      }

      // Update local state
      setDocuments((prev) => ({
        ...prev,
        [docKey]: documentUrl,
      }));
      setDocumentsUpdatedAt(uploadTimestamp);

      setLatestRejection((prev) => {
        if (!prev || prev.rejectionType !== "partial") {
          return prev;
        }

        const nextItems = prev.items.filter(
          (item) => item.documentField !== columnName,
        );

        return {
          ...prev,
          items: nextItems,
        };
      });

      alert("Document uploaded. This file has been marked as resubmitted.");
    } catch (error) {
      console.error("Error uploading document:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to upload document. Please try again.";
      alert(errorMessage);
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

  const handleSaveBasic = async () => {
    const sellerId = getSellerId();
    if (!sellerId) {
      alert("Unable to save: seller ID missing.");
      return;
    }

    const normalizedEmail = formData.email.trim();
    const normalizedPhone = formData.phone.trim();
    const normalizedOwnerName = formData.ownerName.trim();

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
          owner_name: normalizedOwnerName || null,
        })
        .eq("id", sellerId);

      if (sellerError) throw sellerError;

      const { error: profileError } = await supabaseClient
        .from("profiles")
        .update({
          email: normalizedEmail,
          phone: normalizedPhone || null,
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
      alert("Saved changes");
    } catch (err) {
      console.error("Failed to save basic info:", err);
      alert("Failed to save. Please try again.");
    }
  };

  const handleSaveBusiness = async () => {
    const sellerId = getSellerId();
    if (!sellerId) {
      alert("Unable to save: seller ID missing.");
      return;
    }

    const normalizedBusinessType = normalizeBusinessType(businessForm.businessType);
    if (!normalizedBusinessType) {
      alert("Please select a valid business type: Sole Proprietorship, Partnership, or Corporation.");
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
      alert("Saved business information");
    } catch (err) {
      console.error("Failed to save business info:", err);
      alert("Failed to save. Please try again.");
    }
  };

  const handleSaveBanking = async () => {
    const sellerId = getSellerId();
    if (!sellerId) {
      alert("Unable to save: seller ID missing.");
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
      alert("Saved banking information");
    } catch (err) {
      console.error("Failed to save banking info:", err);
      alert("Failed to save. Please try again.");
    }
  };

  const handleSaveCategories = async () => {
    const sellerId = getSellerId();
    if (!sellerId) {
      alert("Unable to save: seller ID missing.");
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabaseClient: any = supabase;
      const { error } = await supabaseClient
        .from("sellers")
        .update({ store_category: categoriesForm })
        .eq("id", sellerId);
      if (error) throw error;
      updateSellerDetails({ storeCategory: categoriesForm });
      setEditSection(null);
      alert("Saved store categories");
    } catch (err) {
      console.error("Failed to save categories:", err);
      alert("Failed to save. Please try again.");
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
            {/* Page Title */}
            <div>
              <h1 className="text-3xl font-black text-[var(--text-headline)] font-heading tracking-tight">
                Store Profile
              </h1>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Manage your store's complete profile and verification
              </p>
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

                      {/* Verification Badge */}
                      <div className="mt-3 mb-4">

                        {approvalStatus === "pending" && !isVerified && (
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending Approval
                          </Badge>
                        )}
                        {requiresResubmission && (
                          <div className="flex flex-col items-center gap-2">
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Needs Resubmission
                            </Badge>
                            <Button
                              size="sm"
                              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-xs"
                              onClick={handleReapply}
                              disabled={reapplyLoading}
                            >
                              {reapplyLoading ? "Submitting..." : "Resubmit Documents"}
                            </Button>
                          </div>
                        )}
                        {approvalStatus === "rejected" && !requiresResubmission && (
                          <div className="flex flex-col items-center gap-2">
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Rejected
                            </Badge>
                            <Button
                              size="sm"
                              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-xs"
                              onClick={handleReapply}
                              disabled={reapplyLoading}
                            >
                              {reapplyLoading ? "Reapplying…" : "Reapply"}
                            </Button>
                          </div>
                        )}
                        {(approvalStatus === "approved" ||
                          approvalStatus === "verified" ||
                          isVerified) && (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                      </div>

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

                  {requiresResubmission && (
                    <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                      <p className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Some documents need to be updated before approval.
                      </p>
                      {latestRejection?.description && (
                        <p className="text-sm text-amber-800">{latestRejection.description}</p>
                      )}

                      {latestRejection?.items?.length ? (
                        <div className="space-y-1">
                          {latestRejection.items.map((item) => (
                            <p key={item.documentField} className="text-xs text-amber-900">
                              - {documentFieldLabels[item.documentField] || item.documentField}
                              {item.reason ? `: ${item.reason}` : ""}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Document Helper Function */}
                    {[
                      {
                        key: "businessPermitUrl",
                        label: "Business Permit",
                        description: "Mayor's permit or business registration",
                        icon: Building2,
                        column: "business_permit_url",
                      },
                      {
                        key: "validIdUrl",
                        label: "Government-Issued ID",
                        description:
                          "Owner's valid ID (Driver's License, Passport, etc.)",
                        icon: User,
                        column: "valid_id_url",
                      },
                      {
                        key: "proofOfAddressUrl",
                        label: "Proof of Address",
                        description:
                          "Utility bill or bank statement showing business address",
                        icon: FileText,
                        column: "proof_of_address_url",
                      },
                      {
                        key: "dtiRegistrationUrl",
                        label: "DTI/SEC Registration",
                        description:
                          "DTI certificate for sole proprietor or SEC for corporation",
                        icon: Building2,
                        column: "dti_registration_url",
                      },
                      {
                        key: "taxIdUrl",
                        label: "BIR Tax ID (TIN)",
                        description: "Certificate of Registration from BIR",
                        icon: CreditCard,
                        column: "tax_id_url",
                      },
                    ].map((doc) => {
                      const hasDocument =
                        documents[doc.key as keyof typeof documents];
                      const rejectionReason = getDocumentRejectionReason(
                        doc.column,
                      );
                      const needsUpdate =
                        requiresResubmission && Boolean(rejectionReason);
                      const Icon = doc.icon;
                      const isUploading = uploadingDoc === doc.key;

                      return (
                        <div
                          key={doc.key}
                          className={`p-6 border-b border-[var(--text-muted)]/20 last:border-b-0 first:pt-0 last:pb-0 transition-colors ${needsUpdate
                            ? "bg-red-50/60"
                            : hasDocument
                              ? "bg-green-50/50"
                              : "bg-white"
                            }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="h-10 w-10 rounded-lg flex items-center justify-center"
                              >
                                <Icon
                                  className={`h-5 w-5 ${needsUpdate
                                    ? "text-red-600"
                                    : hasDocument
                                      ? "text-green-600"
                                      : "text-gray-500"
                                    }`}
                                />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {doc.label}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {doc.description}
                                  <span className="block mt-1 text-xs text-gray-400">
                                    Accepted: PDF, JPG, PNG • Max 10MB
                                  </span>
                                </p>
                              </div>
                            </div>

                            {hasDocument ? (
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                  onClick={() => {
                                    const docUrl =
                                      documents[doc.key as keyof typeof documents];
                                    console.log(
                                      "Opening document:",
                                      doc.label,
                                      "URL:",
                                      docUrl,
                                    );

                                    if (!docUrl) {
                                      alert("Document URL not found");
                                      return;
                                    }

                                    // Handle different URL types
                                    if (docUrl.startsWith("mock://")) {
                                      alert(
                                        "Mock URL detected. This is a test URL. Please upload a real document.",
                                      );
                                      return;
                                    }

                                    // Open PDF in new tab with proper viewer
                                    const newWindow = window.open("", "_blank");
                                    if (newWindow) {
                                      newWindow.document.write(`
                                    <!DOCTYPE html>
                                    <html>
                                      <head>
                                        <title>${doc.label} - BazaarPH</title>
                                        <style>
                                          body { margin: 0; overflow: hidden; }
                                          iframe { width: 100%; height: 100vh; border: none; }
                                        </style>
                                      </head>
                                      <body>
                                        <iframe src="${docUrl}" type="application/pdf"></iframe>
                                      </body>
                                    </html>
                                  `);
                                      newWindow.document.close();
                                    } else {
                                      alert(
                                        "Pop-up blocked. Please allow pop-ups and try again.",
                                      );
                                    }
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                  onClick={() => {
                                    const docUrl =
                                      documents[doc.key as keyof typeof documents];
                                    if (docUrl && !docUrl.startsWith("mock://")) {
                                      handleDownloadDocument(
                                        docUrl,
                                        `${doc.label.replace(/\s+/g, "_")}.pdf`,
                                      );
                                    }
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                  Download
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2 text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)]"
                                  onClick={() => {
                                    const input = document.createElement("input");
                                    input.type = "file";
                                    input.accept = ".pdf,.jpg,.jpeg,.png";
                                    input.onchange = async (e) => {
                                      const file = (e.target as HTMLInputElement)
                                        .files?.[0];
                                      if (file && seller?.id) {
                                        await handleDocumentUpload(
                                          file,
                                          doc.key,
                                          doc.column,
                                        );
                                      }
                                    };
                                    input.click();
                                  }}
                                >
                                  <Upload className="h-4 w-4" />
                                  Replace
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                className="gap-2 bg-[var(--brand-accent)] hover:bg-[var(--brand-primary)]"
                                disabled={isUploading}
                                onClick={() => {
                                  const input = document.createElement("input");
                                  input.type = "file";
                                  input.accept = ".pdf,.jpg,.jpeg,.png";
                                  input.onchange = async (e) => {
                                    const file = (e.target as HTMLInputElement)
                                      .files?.[0];
                                    if (file && seller?.id) {
                                      await handleDocumentUpload(
                                        file,
                                        doc.key,
                                        doc.column,
                                      );
                                    }
                                  };
                                  input.click();
                                }}
                              >
                                {isUploading ? (
                                  <>
                                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-4 w-4" />
                                    Upload PDF
                                  </>
                                )}
                              </Button>
                            )}

                            {/* Image preview for uploaded images */}
                            {hasDocument && isImageFile(documents[doc.key as keyof typeof documents]) && (
                              <div className="mt-3 border rounded-lg overflow-hidden bg-gray-50">
                                <img
                                  src={documents[doc.key as keyof typeof documents]}
                                  alt={`${doc.label} preview`}
                                  className="w-full max-w-md object-contain"
                                  loading="lazy"
                                />
                              </div>
                            )}
                          </div>

                          {hasDocument && needsUpdate && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 px-3 py-2 rounded">
                                <AlertCircle className="h-4 w-4" />
                                Needs resubmission
                              </div>
                              {rejectionReason && (
                                <p className="text-xs text-red-700 px-1">{rejectionReason}</p>
                              )}
                            </div>
                          )}

                          {hasDocument && isVerified && !needsUpdate && (
                            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded">
                              <CheckCircle2 className="h-4 w-4" />
                              Verified on{" "}
                              {seller?.joinDate
                                ? new Date(seller.joinDate).toLocaleDateString()
                                : "N/A"}
                            </div>
                          )}

                          {hasDocument && !isVerified && !needsUpdate && (
                            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded">
                              <Clock className="h-4 w-4" />
                              Pending verification
                            </div>
                          )}

                          {!hasDocument && (
                            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded">
                              <AlertCircle className="h-4 w-4" />
                              Document not uploaded yet
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!isVerified && !requiresResubmission && (
                    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-700 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Your documents are currently being reviewed by our team.
                        This usually takes 1-2 business days. You'll be notified
                        once verification is complete.
                      </p>
                    </div>
                  )}

                  {requiresResubmission && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Replace the flagged files above, then click "Resubmit Documents"
                        in your profile header.
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
                        <p className="text-sm text-gray-600 mb-2">
                          Enter categories separated by commas (e.g., Electronics,
                          Fashion, Home & Garden)
                        </p>
                        <Textarea
                          value={categoriesForm.join(", ")}
                          onChange={(e) =>
                            setCategoriesForm(
                              e.target.value
                                .split(",")
                                .map((cat) => cat.trim())
                                .filter((cat) => cat.length > 0),
                            )
                          }
                          placeholder="Enter store categories..."
                          rows={3}
                        />
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
                  <div className="border-2 border-dashed border-[var(--brand-accent-light)] rounded-2xl p-12 text-center hover:border-[var(--brand-primary)] hover:bg-[var(--brand-accent-light)]/50 transition-all cursor-pointer group">
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
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SellerWorkspaceLayout>
  );
}
