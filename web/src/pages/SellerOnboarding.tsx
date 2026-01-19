import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/stores/sellerStore";
import {
  useAdminSellers,
  type Seller as AdminSeller,
} from "@/stores/adminStore";
import {
  User,
  Building,
  MapPin,
  CreditCard,
  FileText,
  CheckCircle,
  Upload,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

const CATEGORIES = [
  "Electronics",
  "Fashion",
  "Home & Living",
  "Beauty & Personal Care",
  "Sports & Outdoors",
  "Toys & Hobbies",
  "Books & Media",
  "Food & Beverages",
  "Automotive",
  "Health & Wellness",
  "Pet Supplies",
  "Baby & Kids",
];

const BUSINESS_TYPES = [
  "Sole Proprietorship",
  "Partnership",
  "Corporation",
  "Cooperative",
  "Others",
];

const BANKS = [
  "BDO",
  "BPI",
  "Metrobank",
  "Landbank",
  "PNB",
  "Security Bank",
  "RCBC",
  "Unionbank",
  "Chinabank",
  "Others",
];

export function SellerOnboarding() {
  const navigate = useNavigate();
  const { seller, updateSellerDetails } = useAuthStore();
  const { addSeller } = useAdminSellers();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Personal Info
    ownerName: "",
    phone: "",

    // Business Info
    businessName: "",
    storeName: "",
    storeDescription: "",
    storeCategory: [] as string[],
    businessType: "",
    businessRegistrationNumber: "",
    taxIdNumber: "",

    // Address
    businessAddress: "",
    city: "",
    province: "",
    postalCode: "",

    // Banking
    bankName: "",
    accountName: "",
    accountNumber: "",

    // Document URLs
    businessPermitUrl: "",
    validIdUrl: "",
    proofOfAddressUrl: "",
    dtiRegistrationUrl: "",
    taxIdUrl: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleCategoryToggle = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      storeCategory: prev.storeCategory.includes(category)
        ? prev.storeCategory.filter((c) => c !== category)
        : [...prev.storeCategory, category],
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.ownerName.trim())
        newErrors.ownerName = "Owner name is required";
      if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
      if (formData.phone && !/^09\d{9}$/.test(formData.phone)) {
        newErrors.phone = "Please enter a valid PH phone number (09xxxxxxxxx)";
      }
    }

    if (step === 2) {
      if (!formData.businessName.trim())
        newErrors.businessName = "Business name is required";
      if (!formData.storeName.trim())
        newErrors.storeName = "Store name is required";
      if (!formData.storeDescription.trim())
        newErrors.storeDescription = "Store description is required";
      if (formData.storeCategory.length === 0)
        newErrors.storeCategory = "Select at least one category";
      if (!formData.businessType)
        newErrors.businessType = "Business type is required";
    }

    if (step === 3) {
      if (!formData.businessAddress.trim())
        newErrors.businessAddress = "Business address is required";
      if (!formData.city.trim()) newErrors.city = "City is required";
      if (!formData.province.trim())
        newErrors.province = "Province is required";
      if (!formData.postalCode.trim())
        newErrors.postalCode = "Postal code is required";
    }

    if (step === 4) {
      if (!formData.bankName) newErrors.bankName = "Bank name is required";
      if (!formData.accountName.trim())
        newErrors.accountName = "Account name is required";
      if (!formData.accountNumber.trim())
        newErrors.accountNumber = "Account number is required";
    }

    if (step === 5) {
      // Documents are now optional for initial submission
      // They can be uploaded later from seller profile
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const fillTestData = () => {
    setFormData({
      ownerName: "Juan Dela Cruz",
      phone: "09123456789",
      businessName: "Test Store PH",
      storeName: "Test Store PH",
      storeDescription: "Premium quality products at affordable prices",
      storeCategory: ["Electronics", "Fashion"],
      businessType: "Sole Proprietorship",
      businessRegistrationNumber: "DTI-2024-001234",
      taxIdNumber: "123-456-789-012",
      businessAddress: "123 Main Street, Barangay San Antonio",
      city: "Quezon City",
      province: "Metro Manila",
      postalCode: "1100",
      bankName: "BDO",
      accountName: "Juan Dela Cruz",
      accountNumber: "0123456789012345",
      businessPermitUrl: "https://example.com/permit.pdf",
      validIdUrl: "https://example.com/id.pdf",
      proofOfAddressUrl: "https://example.com/proof.pdf",
      dtiRegistrationUrl: "https://example.com/dti.pdf",
      taxIdUrl: "https://example.com/tax.pdf",
    });
    setCurrentStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const fullAddress = `${formData.businessAddress}, ${formData.city}, ${formData.province} ${formData.postalCode}`;

    // Update seller details in seller store
    updateSellerDetails({
      ownerName: formData.ownerName,
      phone: formData.phone,
      businessName: formData.businessName,
      storeName: formData.storeName,
      storeDescription: formData.storeDescription,
      storeCategory: formData.storeCategory,
      businessType: formData.businessType,
      businessRegistrationNumber: formData.businessRegistrationNumber,
      taxIdNumber: formData.taxIdNumber,
      businessAddress: formData.businessAddress,
      city: formData.city,
      province: formData.province,
      postalCode: formData.postalCode,
      storeAddress: fullAddress,
      bankName: formData.bankName,
      accountName: formData.accountName,
      accountNumber: formData.accountNumber,
      businessPermitUrl: formData.businessPermitUrl,
      validIdUrl: formData.validIdUrl,
      proofOfAddressUrl: formData.proofOfAddressUrl,
      dtiRegistrationUrl: formData.dtiRegistrationUrl,
      taxIdUrl: formData.taxIdUrl,
      isVerified: false, // Not verified yet, waiting for admin
      approvalStatus: "pending", // Set to pending
    });

    // Also add seller to admin store so admin can see them
    if (seller) {
      const adminSellerData: AdminSeller = {
        id: seller.id,
        businessName: formData.businessName,
        storeName: formData.storeName,
        storeDescription: formData.storeDescription,
        storeCategory: formData.storeCategory,
        businessType: formData.businessType,
        businessRegistrationNumber: formData.businessRegistrationNumber,
        taxIdNumber: formData.taxIdNumber,
        description: formData.storeDescription,
        logo: `https://ui-avatars.io/api/?name=${encodeURIComponent(formData.storeName)}&background=FF6A00&color=fff`,
        ownerName: formData.ownerName,
        email: seller.email,
        phone: formData.phone,
        businessAddress: formData.businessAddress,
        city: formData.city,
        province: formData.province,
        postalCode: formData.postalCode,
        address: fullAddress,
        bankName: formData.bankName,
        accountName: formData.accountName,
        accountNumber: formData.accountNumber,
        status: "pending", // Status is pending approval
        documents: [
          ...(formData.businessPermitUrl
            ? [
                {
                  id: `doc_${seller.id}_1`,
                  type: "business_permit",
                  fileName: "business-permit",
                  url: formData.businessPermitUrl,
                  uploadDate: new Date(),
                  isVerified: false,
                },
              ]
            : []),
          ...(formData.validIdUrl
            ? [
                {
                  id: `doc_${seller.id}_2`,
                  type: "valid_id",
                  fileName: "valid-id",
                  url: formData.validIdUrl,
                  uploadDate: new Date(),
                  isVerified: false,
                },
              ]
            : []),
          ...(formData.proofOfAddressUrl
            ? [
                {
                  id: `doc_${seller.id}_3`,
                  type: "proof_of_address",
                  fileName: "proof-of-address",
                  url: formData.proofOfAddressUrl,
                  uploadDate: new Date(),
                  isVerified: false,
                },
              ]
            : []),
        ],
        metrics: {
          totalProducts: 0,
          totalOrders: 0,
          totalRevenue: 0,
          rating: 0,
          responseRate: 100,
          fulfillmentRate: 100,
        },
        joinDate: new Date(),
      };

      addSeller(adminSellerData);
    }

    // Show verification animation
    setIsSubmitting(false);
    setIsVerifying(true);

    // Simulate verification process (3 seconds)
    setTimeout(() => {
      setIsVerifying(false);
      setVerificationComplete(true);

      // Redirect to approval pending page after 2 seconds
      setTimeout(() => {
        navigate("/seller/pending-approval");
      }, 2000);
    }, 3000);
  };

  const steps = [
    { number: 1, title: "Personal Info", icon: User },
    { number: 2, title: "Business Info", icon: Building },
    { number: 3, title: "Address", icon: MapPin },
    { number: 4, title: "Banking", icon: CreditCard },
    { number: 5, title: "Documents", icon: FileText },
  ];

  // Show verification loading
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl p-8 text-center"
          >
            <div className="relative mb-6">
              <div className="h-20 w-20 mx-auto">
                <svg
                  className="animate-spin h-20 w-20 text-orange-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Processing Your Application...
            </h2>
            <p className="text-gray-600 mb-4">
              Please wait while we process your seller application
            </p>
            <div className="flex items-center justify-center gap-1">
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                className="h-2 w-2 bg-orange-500 rounded-full"
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                className="h-2 w-2 bg-orange-500 rounded-full"
              />
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                className="h-2 w-2 bg-orange-500 rounded-full"
              />
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Show verification complete - application submitted
  if (verificationComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="h-20 w-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle className="h-10 w-10 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Application Submitted!
            </h2>
            <p className="text-gray-600 mb-4">
              Your application has been submitted for admin review
            </p>
            <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
              <span>Taking you to status page</span>
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="flex gap-1"
              >
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Complete Your Store Profile
          </h1>
          <p className="text-gray-600">
            Tell us more about your business to start selling
          </p>
        </div>

        {/* Test Data Button - For Development */}
        <div className="mb-6 flex justify-center">
          <button
            type="button"
            onClick={fillTestData}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            🧪 Fill Test Data
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between items-center mb-12 relative">
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10">
            <div
              className="h-full bg-[#FF6A00] transition-all duration-500"
              style={{
                width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
              }}
            />
          </div>
          {steps.map((step) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.number;
            const isCurrent = currentStep === step.number;

            return (
              <div key={step.number} className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? "bg-[#FF6A00] text-white"
                      : isCurrent
                        ? "bg-[#FF6A00] text-white ring-4 ring-orange-100"
                        : "bg-white border-2 border-gray-300 text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <p
                  className={`mt-2 text-xs font-medium ${isCurrent ? "text-[#FF6A00]" : "text-gray-500"}`}
                >
                  {step.title}
                </p>
              </div>
            );
          })}
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {/* Step 1: Personal Info */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">
                      Personal Information
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name (Owner) *
                        </label>
                        <input
                          type="text"
                          value={formData.ownerName}
                          onChange={(e) =>
                            handleInputChange("ownerName", e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Juan Dela Cruz"
                        />
                        {errors.ownerName && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.ownerName}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) =>
                            handleInputChange("phone", e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="09171234567"
                        />
                        {errors.phone && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.phone}
                          </p>
                        )}
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                          <strong>Email:</strong>{" "}
                          {seller?.email || "Not available"}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          This is the email you registered with
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Business Info */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    Business Information
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Name *
                      </label>
                      <input
                        type="text"
                        value={formData.businessName}
                        onChange={(e) =>
                          handleInputChange("businessName", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="ABC Trading Co."
                      />
                      {errors.businessName && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.businessName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Store Name *
                      </label>
                      <input
                        type="text"
                        value={formData.storeName}
                        onChange={(e) =>
                          handleInputChange("storeName", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="ABC Store"
                      />
                      {errors.storeName && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.storeName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Store Description *
                      </label>
                      <textarea
                        value={formData.storeDescription}
                        onChange={(e) =>
                          handleInputChange("storeDescription", e.target.value)
                        }
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Describe your store and what you sell..."
                      />
                      {errors.storeDescription && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.storeDescription}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Store Categories * (Select all that apply)
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {CATEGORIES.map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => handleCategoryToggle(category)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              formData.storeCategory.includes(category)
                                ? "bg-[#FF6A00] text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                      {errors.storeCategory && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.storeCategory}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Type *
                      </label>
                      <select
                        value={formData.businessType}
                        onChange={(e) =>
                          handleInputChange("businessType", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="">Select business type</option>
                        {BUSINESS_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      {errors.businessType && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.businessType}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Business Registration Number (Optional)
                        </label>
                        <input
                          type="text"
                          value={formData.businessRegistrationNumber}
                          onChange={(e) =>
                            handleInputChange(
                              "businessRegistrationNumber",
                              e.target.value,
                            )
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="DTI/SEC Number"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tax ID Number (TIN) (Optional)
                        </label>
                        <input
                          type="text"
                          value={formData.taxIdNumber}
                          onChange={(e) =>
                            handleInputChange("taxIdNumber", e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="000-000-000-000"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Address */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    Business Address
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        value={formData.businessAddress}
                        onChange={(e) =>
                          handleInputChange("businessAddress", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="123 Main St, Brgy. San Antonio"
                      />
                      {errors.businessAddress && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.businessAddress}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City/Municipality *
                        </label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) =>
                            handleInputChange("city", e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Quezon City"
                        />
                        {errors.city && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.city}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Province *
                        </label>
                        <input
                          type="text"
                          value={formData.province}
                          onChange={(e) =>
                            handleInputChange("province", e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Metro Manila"
                        />
                        {errors.province && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.province}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Postal Code *
                      </label>
                      <input
                        type="text"
                        value={formData.postalCode}
                        onChange={(e) =>
                          handleInputChange("postalCode", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="1100"
                      />
                      {errors.postalCode && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.postalCode}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Banking */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    Banking Information
                  </h3>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-800">
                      <strong>🔒 Secure Information:</strong> Your banking
                      details are encrypted and will only be used for payouts.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bank Name *
                      </label>
                      <select
                        value={formData.bankName}
                        onChange={(e) =>
                          handleInputChange("bankName", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="">Select bank</option>
                        {BANKS.map((bank) => (
                          <option key={bank} value={bank}>
                            {bank}
                          </option>
                        ))}
                      </select>
                      {errors.bankName && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.bankName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Name *
                      </label>
                      <input
                        type="text"
                        value={formData.accountName}
                        onChange={(e) =>
                          handleInputChange("accountName", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Juan Dela Cruz"
                      />
                      {errors.accountName && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.accountName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Number *
                      </label>
                      <input
                        type="text"
                        value={formData.accountNumber}
                        onChange={(e) =>
                          handleInputChange("accountNumber", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="1234567890"
                      />
                      {errors.accountNumber && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.accountNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 5: Document URLs */}
              {currentStep === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    Document URLs
                  </h3>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-800">
                      <strong>📋 Optional for now:</strong> You can provide
                      document URLs or upload them later from your seller
                      profile.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        key: "businessPermitUrl",
                        label: "Business Permit URL",
                      },
                      { key: "validIdUrl", label: "Valid ID (Owner) URL" },
                      {
                        key: "proofOfAddressUrl",
                        label: "Proof of Address URL",
                      },
                      {
                        key: "dtiRegistrationUrl",
                        label: "DTI/SEC Registration URL",
                      },
                      {
                        key: "taxIdUrl",
                        label: "BIR Certificate of Registration (TIN) URL",
                      },
                    ].map((doc) => (
                      <div key={doc.key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {doc.label}
                        </label>
                        <input
                          type="text"
                          value={
                            formData[doc.key as keyof typeof formData] as string
                          }
                          onChange={(e) =>
                            handleInputChange(doc.key, e.target.value)
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="https://example.com/document.pdf"
                        />
                        {errors[doc.key] && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors[doc.key]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-2 px-6 py-3 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Back
                </button>
              )}

              {currentStep < steps.length ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="ml-auto flex items-center gap-2 px-8 py-3 bg-[#FF6A00] text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Next
                  <ChevronRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="ml-auto flex items-center gap-2 px-8 py-3 bg-[#FF6A00] text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Complete Setup
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
