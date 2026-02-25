"use client"

import * as React from "react"
import { ChevronLeft, Store, Mail, Lock, Phone, MapPin, FileText, User, Building, Eye, EyeOff, Upload, ImagePlus } from "lucide-react"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"

interface SellerFormData {
  // Account credentials
  email: string
  password: string
  confirmPassword: string
  
  // Personal Information
  ownerName: string
  phone: string
  
  // Business Information
  businessName: string
  businessType: 'sole_proprietor' | 'partnership' | 'corporation' | ''
  businessRegistrationNumber: string
  taxIdNumber: string
  
  // Store Information
  storeName: string
  storeDescription: string
  storeCategory: string[]
  
  // Address Information
  businessAddress: string
  city: string
  province: string
  postalCode: string
  
  // Banking Information
  bankName: string
  accountName: string
  accountNumber: string
  
  // Documents
  businessPermit: File | null
  validId: File | null
  proofOfAddress: File | null
  
  // Terms
  agreeToTerms: boolean
}

interface SellerAuthFormProps {
  mode: 'login' | 'register'
  onSubmit: (data: SellerFormData | { email: string; password: string }) => void
  isLoading?: boolean
  error?: string
}

const SellerAuthForm: React.FC<SellerAuthFormProps> = ({ mode, onSubmit, isLoading = false, error }) => {
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [currentStep, setCurrentStep] = React.useState(1)
  const [formData, setFormData] = React.useState<SellerFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    ownerName: '',
    phone: '',
    businessName: '',
    businessType: '',
    businessRegistrationNumber: '',
    taxIdNumber: '',
    storeName: '',
    storeDescription: '',
    storeCategory: [],
    businessAddress: '',
    city: '',
    province: '',
    postalCode: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    businessPermit: null,
    validId: null,
    proofOfAddress: null,
    agreeToTerms: false
  })

  const totalSteps = mode === 'register' ? 5 : 1

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof SellerFormData) => {
    const file = e.target.files?.[0] || null
    setFormData(prev => ({ ...prev, [fieldName]: file }))
  }

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      storeCategory: prev.storeCategory.includes(category)
        ? prev.storeCategory.filter(c => c !== category)
        : [...prev.storeCategory, category]
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'login') {
      onSubmit({ email: formData.email, password: formData.password })
    } else {
      onSubmit(formData)
    }
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  if (mode === 'login') {
    return (
      <div className="bg-gradient-to-br from-orange-50 to-orange-100 min-h-screen py-20 text-zinc-800 selection:bg-orange-300">
        <BackButton />
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 mx-auto w-full max-w-md p-4"
        >
          <Logo />
          <Header mode="login" />
          
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
            >
              {error}
            </motion.div>
          )}

          <DemoCredentials />
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              id="email"
              name="email"
              type="email"
              label="Email Address"
              placeholder="your.email@provider.com"
              value={formData.email}
              onChange={handleChange}
              icon={<Mail size={20} />}
              required
            />
            
            <FormField
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              label="Password"
              placeholder="••••••••••••"
              value={formData.password}
              onChange={handleChange}
              icon={<Lock size={20} />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              }
              required
            />

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? <Loader /> : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-zinc-600">
              Don't have an account?{" "}
              <Link to="/seller/register" className="text-orange-600 font-medium hover:underline">
                Register as Seller
              </Link>
            </p>
          </div>
          
          <TermsAndConditions />
        </motion.div>
        <BackgroundDecoration />
      </div>
    )
  }

  // Register mode with multi-step form
  return (
    <div className="bg-gradient-to-br from-orange-50 to-orange-100 min-h-screen py-10 text-zinc-800 selection:bg-orange-300">
      <BackButton />
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 mx-auto w-full max-w-2xl p-4"
      >
        <Logo />
        <Header mode="register" />

        {/* Progress Steps */}
        <ProgressSteps currentStep={currentStep} totalSteps={totalSteps} />

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={currentStep === totalSteps ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 1 && <Step1AccountInfo formData={formData} onChange={handleChange} showPassword={showPassword} showConfirmPassword={showConfirmPassword} setShowPassword={setShowPassword} setShowConfirmPassword={setShowConfirmPassword} />}
            {currentStep === 2 && <Step2PersonalInfo formData={formData} onChange={handleChange} />}
            {currentStep === 3 && <Step3BusinessInfo formData={formData} onChange={handleChange} handleCategoryToggle={handleCategoryToggle} />}
            {currentStep === 4 && <Step4BankingInfo formData={formData} onChange={handleChange} />}
            {currentStep === 5 && <Step5Documents formData={formData} handleFileChange={handleFileChange} handleChange={handleChange} />}
          </motion.div>

          <div className="mt-6 flex gap-3">
            {currentStep > 1 && (
              <Button type="button" onClick={handleBack} variant="outline" className="flex-1">
                Back
              </Button>
            )}
            <Button 
              type={currentStep === totalSteps ? 'submit' : 'button'}
              onClick={currentStep < totalSteps ? handleNext : undefined}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? <Loader /> : currentStep === totalSteps ? 'Submit Application' : 'Next Step'}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-zinc-600">
            Already have an account?{" "}
            <Link to="/seller/login" className="text-orange-600 font-medium hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
      <BackgroundDecoration />
    </div>
  )
}

// Step Components
const Step1AccountInfo: React.FC<any> = ({ formData, onChange, showPassword, showConfirmPassword, setShowPassword, setShowConfirmPassword }) => (
  <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm">
    <h3 className="text-lg font-semibold text-zinc-800 mb-4">Account Credentials</h3>
    <FormField
      id="email"
      name="email"
      type="email"
      label="Email Address"
      placeholder="your.email@provider.com"
      value={formData.email}
      onChange={onChange}
      icon={<Mail size={20} />}
      required
    />
    <FormField
      id="password"
      name="password"
      type={showPassword ? 'text' : 'password'}
      label="Password"
      placeholder="Create a strong password"
      value={formData.password}
      onChange={onChange}
      icon={<Lock size={20} />}
      rightIcon={
        <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1">
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      }
      required
    />
    <FormField
      id="confirmPassword"
      name="confirmPassword"
      type={showConfirmPassword ? 'text' : 'password'}
      label="Confirm Password"
      placeholder="Re-enter your password"
      value={formData.confirmPassword}
      onChange={onChange}
      icon={<Lock size={20} />}
      rightIcon={
        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="p-1">
          {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      }
      required
    />
  </div>
)

const Step2PersonalInfo: React.FC<any> = ({ formData, onChange }) => (
  <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm">
    <h3 className="text-lg font-semibold text-zinc-800 mb-4">Personal Information</h3>
    <FormField
      id="ownerName"
      name="ownerName"
      type="text"
      label="Owner Full Name"
      placeholder="Juan Dela Cruz"
      value={formData.ownerName}
      onChange={onChange}
      icon={<User size={20} />}
      required
    />
    <FormField
      id="phone"
      name="phone"
      type="tel"
      label="Phone Number"
      placeholder="+63 912 345 6789"
      value={formData.phone}
      onChange={onChange}
      icon={<Phone size={20} />}
      required
    />
  </div>
)

const Step3BusinessInfo: React.FC<any> = ({ formData, onChange, handleCategoryToggle }) => {
  const categories = ['Electronics', 'Fashion', 'Food & Beverages', 'Beauty', 'Home & Living', 'Sports', 'Books', 'Toys', 'Automotive', 'Health']
  
  return (
    <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-zinc-800 mb-4">Business Information</h3>
      <FormField
        id="businessName"
        name="businessName"
        type="text"
        label="Business Name"
        placeholder="ABC Trading Inc."
        value={formData.businessName}
        onChange={onChange}
        icon={<Building size={20} />}
        required
      />
      <FormField
        id="storeName"
        name="storeName"
        type="text"
        label="Store Name"
        placeholder="Your Store Name"
        value={formData.storeName}
        onChange={onChange}
        icon={<Store size={20} />}
        required
      />
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">Business Type</label>
        <select
          name="businessType"
          value={formData.businessType}
          onChange={onChange}
          className="w-full px-4 py-3 border border-zinc-300 bg-white rounded-lg text-zinc-800 
          ring-1 ring-transparent transition-shadow focus:outline-none focus:ring-orange-500"
          required
        >
          <option value="">Select Business Type</option>
          <option value="sole_proprietor">Sole Proprietor</option>
          <option value="partnership">Partnership</option>
          <option value="corporation">Corporation</option>
        </select>
      </div>
      <FormField
        id="businessRegistrationNumber"
        name="businessRegistrationNumber"
        type="text"
        label="Business Registration Number (DTI/SEC)"
        placeholder="DTI-123456789"
        value={formData.businessRegistrationNumber}
        onChange={onChange}
        icon={<FileText size={20} />}
        required
      />
      <FormField
        id="taxIdNumber"
        name="taxIdNumber"
        type="text"
        label="Tax ID Number (TIN)"
        placeholder="123-456-789-000"
        value={formData.taxIdNumber}
        onChange={onChange}
        icon={<FileText size={20} />}
        required
      />
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">Store Description</label>
        <textarea
          name="storeDescription"
          value={formData.storeDescription}
          onChange={onChange}
          className="w-full px-4 py-3 border border-zinc-300 bg-white rounded-lg text-zinc-800 
          ring-1 ring-transparent transition-shadow focus:outline-none focus:ring-orange-500"
          placeholder="Describe your store and products..."
          rows={3}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-2">Store Categories (Select all that apply)</label>
        <div className="grid grid-cols-2 gap-2">
          {categories.map(category => (
            <button
              key={category}
              type="button"
              onClick={() => handleCategoryToggle(category)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                formData.storeCategory.includes(category)
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'bg-white border-zinc-300 text-zinc-700 hover:border-orange-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          id="businessAddress"
          name="businessAddress"
          type="text"
          label="Business Address"
          placeholder="123 Main St, Brgy. Sample"
          value={formData.businessAddress}
          onChange={onChange}
          icon={<MapPin size={20} />}
          required
        />
        <FormField
          id="city"
          name="city"
          type="text"
          label="City"
          placeholder="Manila"
          value={formData.city}
          onChange={onChange}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          id="province"
          name="province"
          type="text"
          label="Province"
          placeholder="Metro Manila"
          value={formData.province}
          onChange={onChange}
          required
        />
        <FormField
          id="postalCode"
          name="postalCode"
          type="text"
          label="Postal Code"
          placeholder="1000"
          value={formData.postalCode}
          onChange={onChange}
          required
        />
      </div>
    </div>
  )
}

const Step4BankingInfo: React.FC<any> = ({ formData, onChange }) => (
  <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm">
    <h3 className="text-lg font-semibold text-zinc-800 mb-4">Banking Information</h3>
    <p className="text-sm text-zinc-600 mb-4">For receiving payments from your sales</p>
    <FormField
      id="bankName"
      name="bankName"
      type="text"
      label="Bank Name"
      placeholder="BDO, BPI, Metrobank, etc."
      value={formData.bankName}
      onChange={onChange}
      required
    />
    <FormField
      id="accountName"
      name="accountName"
      type="text"
      label="Account Name"
      placeholder="Name as shown on bank account"
      value={formData.accountName}
      onChange={onChange}
      required
    />
    <FormField
      id="accountNumber"
      name="accountNumber"
      type="text"
      label="Account Number"
      placeholder="1234567890"
      value={formData.accountNumber}
      onChange={onChange}
      required
    />
  </div>
)

const Step5Documents: React.FC<any> = ({ formData, handleFileChange, handleChange }) => (
  <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm">
    <h3 className="text-lg font-semibold text-zinc-800 mb-4">Required Documents</h3>
    <p className="text-sm text-zinc-600 mb-4">Please upload clear copies of the following documents</p>
    
    <FileUploadField
      id="businessPermit"
      name="businessPermit"
      label="Business Permit / DTI Registration"
      file={formData.businessPermit}
      onChange={(e) => handleFileChange(e, 'businessPermit')}
      required
    />
    <FileUploadField
      id="validId"
      name="validId"
      label="Valid Government ID (Owner)"
      file={formData.validId}
      onChange={(e) => handleFileChange(e, 'validId')}
      required
    />
    <FileUploadField
      id="proofOfAddress"
      name="proofOfAddress"
      label="Proof of Address (Utility Bill)"
      file={formData.proofOfAddress}
      onChange={(e) => handleFileChange(e, 'proofOfAddress')}
      required
    />

    <div className="mt-6 pt-6 border-t border-zinc-200">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="agreeToTerms"
          checked={formData.agreeToTerms}
          onChange={handleChange}
          className="mt-1 h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-500"
          required
        />
        <span className="text-sm text-zinc-700">
          I agree to the{" "}
          <a href="#" className="text-orange-600 hover:underline">
            Terms & Conditions
          </a>{" "}
          and{" "}
          <a href="#" className="text-orange-600 hover:underline">
            Seller Agreement
          </a>
          . I confirm that all information provided is accurate and complete.
        </span>
      </label>
    </div>
  </div>
)

// Helper Components
const BackButton: React.FC = () => (
  <div className="absolute top-4 left-4">
    <Link 
      to="/"
      className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm 
      hover:shadow-md transition-all text-zinc-700 hover:text-zinc-900"
    >
      <ChevronLeft size={16} />
      <span className="text-sm font-medium">Go back</span>
    </Link>
  </div>
)

const Logo: React.FC = () => (
  <div className="mb-6 flex justify-center items-center gap-3">
    <div className="h-12 w-12 bg-orange-500 rounded-xl flex items-center justify-center">
      <Store className="h-7 w-7 text-white" />
    </div>
    <span className="text-2xl font-bold text-zinc-900">BazaarPH Seller</span>
  </div>
)

const Header: React.FC<{ mode: 'login' | 'register' }> = ({ mode }) => (
  <div className="mb-8 text-center">
    <h1 className="text-3xl font-bold text-zinc-900">
      {mode === 'login' ? 'Sign in to your account' : 'Become a BazaarPH Seller'}
    </h1>
    <p className="mt-2 text-zinc-600">
      {mode === 'login' 
        ? 'Access your seller dashboard'
        : 'Fill out the application form to start selling'
      }
    </p>
  </div>
)

const DemoCredentials: React.FC = () => (
  <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
    <h3 className="font-medium text-orange-800 mb-2 text-sm">Demo Credentials:</h3>
    <p className="text-sm text-orange-700">Email: seller@bazaarph.com</p>
    <p className="text-sm text-orange-700">Password: password123</p>
  </div>
)

const ProgressSteps: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep }) => {
  const steps = [
    'Account',
    'Personal',
    'Business',
    'Banking',
    'Documents'
  ]

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  index + 1 <= currentStep
                    ? 'bg-orange-500 text-white'
                    : 'bg-zinc-200 text-zinc-500'
                }`}
              >
                {index + 1}
              </div>
              <span className={`text-xs mt-2 ${index + 1 === currentStep ? 'text-orange-600 font-medium' : 'text-zinc-500'}`}>
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-2 rounded ${index + 1 < currentStep ? 'bg-orange-500' : 'bg-zinc-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

interface FormFieldProps {
  id: string
  name: string
  type: string
  label: string
  placeholder: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  icon?: React.ReactNode
  rightIcon?: React.ReactNode
  required?: boolean
}

const FormField: React.FC<FormFieldProps> = ({
  id,
  name,
  type,
  label,
  placeholder,
  value,
  onChange,
  icon,
  rightIcon,
  required
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-zinc-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
          {icon}
        </div>
      )}
      <input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full ${icon ? 'pl-11' : 'pl-4'} ${rightIcon ? 'pr-11' : 'pr-4'} py-3 border border-zinc-300 
        bg-white rounded-lg text-zinc-800 placeholder-zinc-400
        ring-1 ring-transparent transition-shadow focus:outline-none focus:ring-orange-500`}
        required={required}
      />
      {rightIcon && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
          {rightIcon}
        </div>
      )}
    </div>
  </div>
)

const FileUploadField: React.FC<{
  id: string
  name: string
  label: string
  file: File | null
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  required?: boolean
}> = ({ id, name, label, file, onChange, required }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-zinc-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <label 
      htmlFor={id}
      className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-zinc-300 
      rounded-lg cursor-pointer hover:border-orange-400 transition-colors bg-white"
    >
      <Upload size={20} className="text-zinc-400" />
      <div className="flex-1">
        <p className="text-sm text-zinc-700">
          {file ? file.name : 'Click to upload or drag and drop'}
        </p>
        <p className="text-xs text-zinc-500">PDF, JPG, PNG up to 10MB</p>
      </div>
      <ImagePlus size={20} className="text-zinc-400" />
    </label>
    <input
      id={id}
      name={name}
      type="file"
      onChange={onChange}
      accept=".pdf,.jpg,.jpeg,.png"
      className="hidden"
      required={required}
    />
  </div>
)

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline'
}

const Button: React.FC<ButtonProps> = ({ children, className = '', variant = 'default', ...props }) => {
  const baseStyles = "px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
  const variantStyles = variant === 'outline'
    ? "border-2 border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 active:scale-[0.98]"
    : "bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 active:scale-[0.98] shadow-md hover:shadow-lg"

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

const Loader: React.FC = () => (
  <div className="flex items-center justify-center gap-2">
    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
    <span>Processing...</span>
  </div>
)

const TermsAndConditions: React.FC = () => (
  <p className="mt-9 text-xs text-center text-zinc-500">
    By signing in, you agree to our{" "}
    <a href="#" className="text-orange-600 hover:underline">
      Terms & Conditions
    </a>{" "}
    and{" "}
    <a href="#" className="text-orange-600 hover:underline">
      Privacy Policy
    </a>
  </p>
)

const BackgroundDecoration: React.FC = () => (
  <div
    className="fixed right-0 top-0 z-0 w-[50vw] h-[50vw] pointer-events-none"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke-width='2' stroke='rgb(249 115 22 / 0.3)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e")`,
    }}
  >
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: "radial-gradient(100% 100% at 100% 0%, rgba(254,243,232,0), rgba(254,243,232,1))",
      }}
    />
  </div>
)

export default SellerAuthForm
