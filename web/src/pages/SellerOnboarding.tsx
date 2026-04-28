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
  CheckCircle,
  Check,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";


import { supabase } from "@/lib/supabase";
import { authService } from "@/services/authService";

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
  { label: "Sole Proprietorship", value: "sole_proprietor" },
  { label: "Partnership", value: "partnership" },
  { label: "Corporation", value: "corporation" },
  { label: "Cooperative", value: "partnership" }, // Map to closest DB type if 'cooperative' doesn't exist
  { label: "Others", value: "sole_proprietor" },
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

  const checkStoreNameUnique = async (name: string) => {
    if (!name) return true;
    const { data, error } = await supabase
      .from('sellers')
      .select('id')
      .eq('store_name', name)
      .single();

    // If we find a record with a different ID, it's a duplicate
    if (data && data.id !== seller?.id) {
      return false;
    }
    return true;
  };

  const validateStep = async (step: number): Promise<boolean> => {
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
      else {
        const isUnique = await checkStoreNameUnique(formData.storeName);
        if (!isUnique) newErrors.storeName = "This store name is already taken";
      }
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleNext = async () => {
    if (await validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const fillTestData = () => {
    setFormData({
      ownerName: "Maria Santos",
      phone: "09171234567",
      businessName: "Aesthetic Home PH",
      storeName: "Aesthetic Home",
      storeDescription: "Discover beautiful, curated home decor and lifestyle essentials for your modern sanctuary.",
      storeCategory: ["Home & Living", "Beauty & Personal Care"],
      businessType: "sole_proprietor",
      businessRegistrationNumber: "DTI-2024-888888",
      taxIdNumber: "123-456-789-000",
      businessAddress: "BGC High Street, 7th Avenue",
      city: "Taguig",
      province: "Metro Manila",
      postalCode: "1634",
    } as any);
    setCurrentStep(1);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If not on the last step, just go to the next step
    if (currentStep < steps.length) {
      await handleNext();
      return;
    }

    if (!(await validateStep(currentStep))) return;

    setIsSubmitting(true);


    try {
      let sellerId = seller?.id;
      let pendingSeller: any = null;

      if (!sellerId) {
        try {
          const storedPending = sessionStorage.getItem("pendingSellerSignup");
          pendingSeller = JSON.parse(storedPending || "null");

          // If we have pending seller data with email/password, create auth account
          if (pendingSeller?.email && pendingSeller?.password) {
            const result = await authService.initiateSignUp(
              pendingSeller.email,
              pendingSeller.password,
              {
                first_name: formData.ownerName.split(' ')[0],
                last_name: formData.ownerName.split(' ').slice(1).join(' ') || formData.businessName,
                phone: formData.phone.trim(),
                user_type: "seller",
              }
            );

            if (!result) {
              throw new Error('Failed to create seller account');
            }

            sellerId = result.userId;
          } else if (pendingSeller?.userId) {
            // Fallback for stored userId
            sellerId = pendingSeller.userId;
          }
        } catch (e: any) {
          console.error("Auth signup error:", e);
          throw e;
        }
      }

      if (!sellerId) throw new Error('No seller ID available. Please restart the registration process.');

      // 1. Upsert the sellers row (only columns that exist on the sellers table)
      const { error: sellerError } = await supabase
        .from('sellers')
        .upsert({
          id: sellerId,
          store_name: formData.storeName,
          store_description: formData.storeDescription,
          owner_name: formData.businessName,
          approval_status: 'pending',
        } as any);

      if (sellerError) throw sellerError;

      // 2. Upsert business profile (seller_business_profiles)
      const { error: bpError } = await supabase
        .from('seller_business_profiles')
        .upsert({
          seller_id: sellerId,
          business_type: formData.businessType,
          business_registration_number: formData.businessRegistrationNumber,
          tax_id_number: formData.taxIdNumber,
          address_line_1: formData.businessAddress,
          city: formData.city,
          province: formData.province,
          postal_code: formData.postalCode,
        } as any);

      if (bpError) throw bpError;

      if (bpError) throw bpError;
 
       // 3. Save store categories via junction table (seller_categories)
       if (formData.storeCategory && Array.isArray(formData.storeCategory) && formData.storeCategory.length > 0) {

        // Look up category IDs by name
        const { data: categories } = await supabase
          .from('categories')
          .select('id, name')
          .in('name', formData.storeCategory);

        if (categories && categories.length > 0) {
          // Remove old categories
          await supabase.from('seller_categories').delete().eq('seller_id', sellerId);
          // Insert new ones
          const categoryRows = categories.map((cat: any) => ({
            seller_id: sellerId,
            category_id: cat.id,
          }));
          await supabase.from('seller_categories').insert(categoryRows as any);
        }
      }

      // 4. Update local state and proceed to success screens
      updateSellerDetails({ ...formData, approvalStatus: "pending" } as any);

      setIsSubmitting(false);
      setIsVerifying(true);

      setTimeout(() => {
        setIsVerifying(false);
        setVerificationComplete(true);
        sessionStorage.removeItem("pendingSellerSignup");
        setTimeout(() => navigate("/seller"), 2000);
      }, 5000); // Increased to 5s as requested

    } catch (error: any) {
      console.error("Submission error:", error.message);
      alert(`Registration failed: ${error.message}`);
      setIsSubmitting(false);
      setIsVerifying(false); // Ensure loading is removed on error
    }

  };

  const steps = [
    { number: 1, title: "Personal Info", icon: User },
    { number: 2, title: "Business Info", icon: Building },
    { number: 3, title: "Address", icon: MapPin },
  ];


  // Show verification loading
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[var(--brand-wash)] flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-[var(--brand-wash)] flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-[var(--brand-wash)] py-12 px-4 font-sans flex items-center justify-center">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-[var(--text-headline)] mb-3 font-heading tracking-tight">
            Complete Your Store Profile
          </h1>
          <p className="text-[var(--text-secondary)] font-medium text-lg">
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
        <div className="flex items-center justify-center gap-2 mb-12 max-w-xl mx-auto px-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center relative min-w-[80px]">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-md z-10 ${currentStep >= step.number ? "bg-[var(--brand-primary)] text-white shadow-orange-500/20" : "bg-white text-gray-400 border border-gray-100"}`}>
                    {currentStep > step.number ? <Check size={18} /> : <Icon size={18} />}
                  </div>
                  <span className={`absolute -bottom-7 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${currentStep >= step.number ? "text-[var(--brand-primary)]" : "text-gray-400"}`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden mt-[-1.75rem]">
                    <motion.div 
                      initial={{ width: "0%" }} 
                      animate={{ width: currentStep > step.number ? "100%" : "0%" }} 
                      className="h-full bg-[var(--brand-primary)]" 
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>



        {/* Form */}
        <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-8 lg:p-10 border border-transparent">
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
                    <h3 className="text-2xl font-black text-[var(--text-headline)] mb-8 font-heading">
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
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${formData.storeCategory.includes(category)
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
                          <option key={type.value} value={type.value}>
                            {type.label}
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
