import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/sellerStore";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { sellerLinks } from "@/config/sellerLinks";
import {
  Package,
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
  LogOut,
  Download,
  Loader,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { uploadSellerDocument, validateDocumentFile } from "@/utils/storage";
import { supabase } from "@/lib/supabase";

// Logo components defined outside of render
const Logo = () => (
  <Link
    to="/seller"
    className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
  >
    <img
      src="/Logo.png"
      alt="BazaarPH Logo"
      className="h-5 w-6 flex-shrink-0"
    />
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="font-medium text-black whitespace-pre"
    >
      BazaarPH Seller
    </motion.span>
  </Link>
);

const LogoIcon = () => (
  <Link
    to="/seller"
    className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
  >
    <img
      src="/Logo.png"
      alt="BazaarPH Logo"
      className="h-8 w-8 object-contain flex-shrink-0"
    />
  </Link>
);

export function SellerStoreProfile() {
  const { seller, updateSellerDetails, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
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

  const handleLogout = () => {
    logout();
    navigate("/seller/auth");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !seller?.id) {
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
        sellerId: seller.id,
      });

      // Create a unique filename
      const timestamp = Date.now();
      const ext = file.name.split(".").pop();
      const filename = `${seller.id}-${timestamp}.${ext}`;

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
        .eq("id", seller.id);

      if (updateError) {
        const dbErrorDetails = {
          message: updateError.message,
          code: (updateError as any).code,
          details: (updateError as any).details,
        };
        console.error("Database update error:", dbErrorDetails);
        throw new Error(
          `Database update failed: ${updateError.message} | Profile ID: ${seller.id}`,
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
    "pending" | "approved" | "rejected"
  >(seller?.approvalStatus || "pending");
  const [reapplyLoading, setReapplyLoading] = useState(false);

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

    // Banking info
    if (isEmptyField(seller?.bankName)) missing.push("Bank Name");
    if (isEmptyField(seller?.accountName)) missing.push("Account Name");
    if (isEmptyField(seller?.accountNumber)) missing.push("Account Number");

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
    if (!seller?.id) {
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
        .eq("id", seller.id);

      if (error) throw error;

      setApprovalStatus("pending");
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
      if (!seller?.id) return;

      try {
        const { data, error } = await supabase
          .from("sellers")
          .select(
            "business_permit_url, valid_id_url, proof_of_address_url, dti_registration_url, tax_id_url, is_verified, approval_status",
          )
          .eq("id", seller.id)
          .single();

        if (error) {
          console.error("Error fetching seller data:", error);
          return;
        }

        if (data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const docData: any = data;

          // Update verification status
          setIsVerified(docData.is_verified || false);
          setApprovalStatus(docData.approval_status || "pending");

          // Update documents
          setDocuments({
            businessPermitUrl: docData.business_permit_url || undefined,
            validIdUrl: docData.valid_id_url || undefined,
            proofOfAddressUrl: docData.proof_of_address_url || undefined,
            dtiRegistrationUrl: docData.dti_registration_url || undefined,
            taxIdUrl: docData.tax_id_url || undefined,
          });
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
    if (!seller?.id) return;

    // Validate file type and size
    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setUploadingDoc(docKey);

    try {
      // Upload to Supabase Storage
      const documentUrl = await uploadSellerDocument(file, seller.id, docKey);

      if (!documentUrl) {
        throw new Error("Upload failed");
      }

      // Update Supabase database based on document type
      // Using type casting due to Supabase typed client limitations with dynamic column updates
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabaseClient: any = supabase;
      let updateQuery;
      switch (columnName) {
        case "business_permit_url":
          updateQuery = supabaseClient
            .from("sellers")
            .update({ business_permit_url: documentUrl })
            .eq("id", seller.id);
          break;
        case "valid_id_url":
          updateQuery = supabaseClient
            .from("sellers")
            .update({ valid_id_url: documentUrl })
            .eq("id", seller.id);
          break;
        case "proof_of_address_url":
          updateQuery = supabaseClient
            .from("sellers")
            .update({ proof_of_address_url: documentUrl })
            .eq("id", seller.id);
          break;
        case "dti_registration_url":
          updateQuery = supabaseClient
            .from("sellers")
            .update({ dti_registration_url: documentUrl })
            .eq("id", seller.id);
          break;
        case "tax_id_url":
          updateQuery = supabaseClient
            .from("sellers")
            .update({ tax_id_url: documentUrl })
            .eq("id", seller.id);
          break;
        default:
          throw new Error("Invalid document type");
      }

      const { error } = await updateQuery;

      if (error) {
        throw error;
      }

      // Update local state
      setDocuments((prev) => ({
        ...prev,
        [docKey]: documentUrl,
      }));

      alert("Document uploaded successfully!");
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

  const handleSaveBasic = async () => {
    if (!seller?.id) {
      alert("Unable to save: seller ID missing.");
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabaseClient: any = supabase;
      const { error } = await supabaseClient
        .from("sellers")
        .update({
          store_name: formData.storeName,
          store_description: formData.storeDescription,
        })
        .eq("id", seller.id);
      if (error) throw error;
      updateSellerDetails({
        storeName: formData.storeName,
        storeDescription: formData.storeDescription,
        phone: formData.phone,
        ownerName: formData.ownerName,
        email: formData.email,
      });
      setEditSection(null);
      alert("Saved changes");
    } catch (err) {
      console.error("Failed to save basic info:", err);
      alert("Failed to save. Please try again.");
    }
  };

  const handleSaveBusiness = async () => {
    if (!seller?.id) {
      alert("Unable to save: seller ID missing.");
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabaseClient: any = supabase;
      const { error } = await supabaseClient
        .from("sellers")
        .update({
          business_name: businessForm.businessName,
          business_type: businessForm.businessType,
          business_registration_number: businessForm.businessRegistrationNumber,
          tax_id_number: businessForm.taxIdNumber,
          business_address: businessForm.businessAddress,
          city: businessForm.city,
          province: businessForm.province,
          postal_code: businessForm.postalCode,
        })
        .eq("id", seller.id);
      if (error) throw error;
      updateSellerDetails({
        businessName: businessForm.businessName,
        businessType: businessForm.businessType,
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
    if (!seller?.id) {
      alert("Unable to save: seller ID missing.");
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabaseClient: any = supabase;
      const { error } = await supabaseClient
        .from("sellers")
        .update({
          bank_name: bankingForm.bankName,
          account_name: bankingForm.accountName,
          account_number: bankingForm.accountNumber,
        })
        .eq("id", seller.id);
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
    if (!seller?.id) {
      alert("Unable to save: seller ID missing.");
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabaseClient: any = supabase;
      const { error } = await supabaseClient
        .from("sellers")
        .update({ store_category: categoriesForm })
        .eq("id", seller.id);
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
    <div className="h-screen w-full flex flex-col md:flex-row bg-gray-50 overflow-hidden">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {sellerLinks.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <SidebarLink
              link={{
                label: seller?.storeName || "Store",
                href: "/seller/store-profile",
                icon: (
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {seller?.storeName?.charAt(0) || "S"}
                    </span>
                  </div>
                ),
              }}
            />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-2 py-2 text-sm text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {open && <span>Logout</span>}
            </button>
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-8">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Store Profile
                </h1>
                <p className="text-gray-600 mt-2">
                  Manage your store's complete profile and verification
                </p>
              </div>
              <div className="flex gap-3">
                {isVerified && (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 px-4 py-2">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Verified Seller
                  </Badge>
                )}
                {approvalStatus === "pending" && !isVerified && (
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 px-4 py-2">
                    <Clock className="h-4 w-4 mr-2" />
                    Pending Approval
                  </Badge>
                )}
                {approvalStatus === "rejected" && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 px-4 py-2">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Rejected
                    </Badge>
                    <Button
                      size="sm"
                      className="bg-[#FF6A00] hover:bg-orange-600"
                      onClick={handleReapply}
                      disabled={reapplyLoading}
                    >
                      {reapplyLoading ? "Reapplying…" : "Reapply"}
                    </Button>
                  </div>
                )}
                {approvalStatus === "approved" && !isVerified && (
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 px-4 py-2">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approved
                  </Badge>
                )}
              </div>
            </div>

            {/* Store Header Card */}
            <Card className="p-6 mb-6">
              <div className="flex items-start gap-6">
                {/* Store Logo */}
                <div className="relative">
                  {seller?.avatar ? (
                    <img
                      src={seller.avatar}
                      alt={seller.storeName}
                      className="h-24 w-24 rounded-xl object-cover shadow-lg"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                      {seller?.storeName?.charAt(0) || "S"}
                    </div>
                  )}
                  <label className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-[#FF6A00] text-white flex items-center justify-center shadow-lg hover:bg-orange-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
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

                {/* Store Info */}
                <div className="flex-1">
                  {avatarError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-900">
                          Upload Failed
                        </p>
                        <p className="text-sm text-red-700 mt-1">
                          {avatarError}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {seller?.storeName || "Your Store"}
                      </h2>
                      <p className="text-gray-600 mt-1 flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        bazaarph.com/store/{seller?.id || "your-store"}
                      </p>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                        <Award className="h-4 w-4" />
                        Rating
                      </div>
                      <div className="text-xl font-bold text-gray-900">
                        {seller?.rating ? `${seller.rating}/5.0` : "New"}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                        <Package className="h-4 w-4" />
                        Products
                      </div>
                      <div className="text-xl font-bold text-gray-900">0</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                        <TrendingUp className="h-4 w-4" />
                        Sales
                      </div>
                      <div className="text-xl font-bold text-gray-900">
                        {seller?.totalSales || 0}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                        <Users className="h-4 w-4" />
                        Followers
                      </div>
                      <div className="text-xl font-bold text-gray-900">0</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Owner & Contact Information (Editable) */}
            <Card className="p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-[#FF6A00]" />
                  <h3 className="text-xl font-bold text-gray-900">
                    Owner & Contact Information
                  </h3>
                </div>
                {editSection !== "basic" && (
                  <Button
                    onClick={() => setEditSection("basic")}
                    variant="outline"
                    size="sm"
                    className="gap-2"
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
                      className="bg-[#FF6A00] hover:bg-orange-600"
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
            <Card className="p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#FF6A00]" />
                  <h3 className="text-xl font-bold text-gray-900">
                    Business Information
                  </h3>
                  {isVerified && (
                    <Badge className="bg-green-100 text-green-700 ml-2">
                      <Lock className="h-3 w-3 mr-1" />
                      Verified & Locked
                    </Badge>
                  )}
                </div>
                {!isVerified && (
                  <Button
                    onClick={() => setEditSection("business")}
                    variant="outline"
                    size="sm"
                    className="gap-2"
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
                      <Input
                        value={businessForm.businessType}
                        onChange={(e) =>
                          setBusinessForm({
                            ...businessForm,
                            businessType: e.target.value,
                          })
                        }
                      />
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
                      className="bg-[#FF6A00] hover:bg-orange-600"
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
            <Card className="p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-[#FF6A00]" />
                  <h3 className="text-xl font-bold text-gray-900">
                    Banking Information
                  </h3>
                  {isVerified && (
                    <Badge className="bg-green-100 text-green-700 ml-2">
                      <Lock className="h-3 w-3 mr-1" />
                      Verified & Locked
                    </Badge>
                  )}
                </div>
                {!isVerified && (
                  <Button
                    onClick={() => setEditSection("banking")}
                    variant="outline"
                    size="sm"
                    className="gap-2"
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
                      className="bg-[#FF6A00] hover:bg-orange-600"
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

            {/* Verification Documents */}
            <Card className="p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#FF6A00]" />
                  <h3 className="text-xl font-bold text-gray-900">
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
                  const Icon = doc.icon;
                  const isUploading = uploadingDoc === doc.key;

                  return (
                    <div
                      key={doc.key}
                      className={`p-4 border rounded-lg transition-colors ${hasDocument
                          ? "border-green-200 bg-green-50/50 hover:border-green-300"
                          : "border-gray-200 hover:border-orange-300"
                        }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-10 w-10 rounded-lg flex items-center justify-center ${hasDocument ? "bg-green-100" : "bg-gray-100"
                              }`}
                          >
                            <Icon
                              className={`h-5 w-5 ${hasDocument ? "text-green-600" : "text-gray-500"
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
                              className="gap-2 text-orange-600 hover:text-orange-700"
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
                            className="gap-2 bg-[#FF6A00] hover:bg-orange-600"
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

                      {hasDocument && isVerified && (
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded">
                          <CheckCircle2 className="h-4 w-4" />
                          Verified on{" "}
                          {seller?.joinDate
                            ? new Date(seller.joinDate).toLocaleDateString()
                            : "N/A"}
                        </div>
                      )}

                      {hasDocument && !isVerified && (
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

              {!isVerified && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Your documents are currently being reviewed by our team.
                    This usually takes 1-2 business days. You'll be notified
                    once verification is complete.
                  </p>
                </div>
              )}
            </Card>

            {/* Store Categories */}
            <Card className="p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Store Categories
                </h3>
                {editSection !== "categories" && (
                  <Button
                    onClick={() => setEditSection("categories")}
                    variant="outline"
                    size="sm"
                    className="gap-2"
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
                      className="bg-[#FF6A00] hover:bg-orange-600"
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
                <div className="flex flex-wrap gap-2">
                  {seller?.storeCategory && seller.storeCategory.length > 0 ? (
                    seller.storeCategory.map((category, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium"
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
            <Card className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Store Banner
              </h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-orange-500 transition-colors cursor-pointer">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  Click to upload store banner
                </p>
                <p className="text-sm text-gray-500">
                  Recommended size: 1200x400px (Max 5MB)
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
