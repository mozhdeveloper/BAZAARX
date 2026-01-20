import React, { useState } from "react";
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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { uploadSellerDocument } from "@/utils/storage";
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
  const [editSection, setEditSection] = useState<"basic" | "contact" | null>(
    null,
  );
  const navigate = useNavigate();
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [documents, setDocuments] = useState<{
    businessPermitUrl?: string;
    validIdUrl?: string;
    proofOfAddressUrl?: string;
    dtiRegistrationUrl?: string;
    taxIdUrl?: string;
  }>({});

  const handleLogout = () => {
    logout();
    navigate("/seller/auth");
  };

  const [formData, setFormData] = useState({
    storeName: seller?.storeName || "",
    storeDescription: seller?.storeDescription || "",
    phone: seller?.phone || "",
    ownerName: seller?.ownerName || "",
    email: seller?.email || "",
  });

  const isVerified = seller?.isVerified || false;

  // Fetch documents from Supabase on mount
  React.useEffect(() => {
    const fetchDocuments = async () => {
      if (!seller?.id) return;

      try {
        const { data, error } = await supabase
          .from("sellers")
          .select(
            "business_permit_url, valid_id_url, proof_of_address_url, dti_registration_url, tax_id_url",
          )
          .eq("id", seller.id)
          .single();

        if (error) {
          console.error("Error fetching documents:", error);
          return;
        }

        if (data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const docData: any = data;

          setDocuments({
            businessPermitUrl: docData.business_permit_url || undefined,
            validIdUrl: docData.valid_id_url || undefined,
            proofOfAddressUrl: docData.proof_of_address_url || undefined,
            dtiRegistrationUrl: docData.dti_registration_url || undefined,
            taxIdUrl: docData.tax_id_url || undefined,
          });
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
      }
    };

    fetchDocuments();
  }, [seller?.id]);

  // Handle document upload
  const handleDocumentUpload = async (
    file: File,
    docKey: string,
    columnName: string,
  ) => {
    if (!seller?.id) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file only");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
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
      alert("Failed to upload document. Please try again.");
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleSave = () => {
    updateSellerDetails(formData);
    setEditSection(null);
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
              {isVerified && (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 px-4 py-2">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Verified Seller
                </Badge>
              )}
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
                  <label className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-[#FF6A00] text-white flex items-center justify-center shadow-lg hover:bg-orange-600 transition-colors cursor-pointer">
                    <Camera className="h-4 w-4" />
                    <input type="file" className="hidden" accept="image/*" />
                  </label>
                </div>

                {/* Store Info */}
                <div className="flex-1">
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
                      onClick={handleSave}
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
                    <p className="text-sm text-gray-600 mb-1">Owner Name</p>
                    <p className="text-gray-900 font-medium">
                      {seller?.ownerName || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Email Address</p>
                    <p className="text-gray-900 font-medium">
                      {seller?.email || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Phone Number</p>
                    <p className="text-gray-900 font-medium">
                      {seller?.phone || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Store Name</p>
                    <p className="text-gray-900 font-medium">
                      {seller?.storeName || "Your Store"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600 mb-1">
                      Store Description
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
                  <Badge className="bg-amber-100 text-amber-700">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Pending Verification
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Business Name</p>
                  <p className="text-gray-900 font-medium">
                    {seller?.businessName || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Business Type</p>
                  <p className="text-gray-900 font-medium">
                    {seller?.businessType || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    Business Registration Number
                  </p>
                  <p className="text-gray-900 font-medium font-mono">
                    {seller?.businessRegistrationNumber || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    Tax ID Number (TIN)
                  </p>
                  <p className="text-gray-900 font-medium font-mono">
                    {seller?.taxIdNumber || "Not provided"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600 mb-1">Business Address</p>
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
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Bank Name</p>
                  <p className="text-gray-900 font-medium">
                    {seller?.bankName || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Account Name</p>
                  <p className="text-gray-900 font-medium">
                    {seller?.accountName || "Not provided"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600 mb-1">Account Number</p>
                  <p className="text-gray-900 font-medium font-mono">
                    {seller?.accountNumber
                      ? `****${seller.accountNumber.slice(-4)}`
                      : "Not provided"}
                  </p>
                </div>
              </div>

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
                      className={`p-4 border rounded-lg transition-colors ${
                        hasDocument
                          ? "border-green-200 bg-green-50/50 hover:border-green-300"
                          : "border-gray-200 hover:border-orange-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                              hasDocument ? "bg-green-100" : "bg-gray-100"
                            }`}
                          >
                            <Icon
                              className={`h-5 w-5 ${
                                hasDocument ? "text-green-600" : "text-gray-500"
                              }`}
                            />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {doc.label}
                            </p>
                            <p className="text-sm text-gray-500">
                              {doc.description}
                            </p>
                          </div>
                        </div>

                        {hasDocument ? (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() =>
                                window.open(
                                  documents[doc.key as keyof typeof documents],
                                  "_blank",
                                )
                              }
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 text-orange-600 hover:text-orange-700"
                              onClick={() => {
                                const input = document.createElement("input");
                                input.type = "file";
                                input.accept = "application/pdf";
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
                              input.accept = "application/pdf";
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
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Store Categories
              </h3>
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
