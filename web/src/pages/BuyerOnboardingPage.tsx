
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle2,
    MapPin,
    ShoppingBag,
    ArrowRight,
    ArrowLeft,
    ChevronRight,
    Building,
    Home,
    User,
    Phone
} from "lucide-react";
import { useBuyerStore } from "../stores/buyerStore";
import { Checkbox } from "../components/ui/checkbox";
import { addressService } from "../services/addressService";
import { toast } from "../hooks/use-toast";
import { categories } from "../data/categories";



export default function BuyerOnboardingPage() {
    const navigate = useNavigate();
    const { profile, updateProfile, addAddress } = useBuyerStore();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Step 1: Terms
    const [termsAccepted, setTermsAccepted] = useState(false);

    // Step 2: Categories
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    // Step 3: Address
    const [addressData, setAddressData] = useState({
        firstName: profile?.firstName || "",
        lastName: profile?.lastName || "",
        phone: profile?.phone || "",
        street: "",
        barangay: "",
        city: "",
        province: "",
        region: "",
        postalCode: "",
        label: "Home",
        isDefault: true
    });

    // Load profile data into address form if available
    useEffect(() => {
        if (profile) {
            setAddressData(prev => ({
                ...prev,
                firstName: profile.firstName || prev.firstName,
                lastName: profile.lastName || prev.lastName,
                phone: profile.phone || prev.phone
            }));
        }
    }, [profile]);

    // Scroll to top on step change
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [step]);

    const handleNext = async () => {
        if (step === 1 && !termsAccepted) return;
        if (step === 2 && selectedCategories.length < 3) return;

        if (step === 3) {
            // Create Address
            setIsLoading(true);
            try {
                if (!profile?.id) throw new Error("User not found");

                const newAddress = await addressService.createAddress({
                    user_id: profile.id,
                    first_name: addressData.firstName,
                    last_name: addressData.lastName,
                    phone: addressData.phone,
                    street: addressData.street,
                    barangay: addressData.barangay,
                    city: addressData.city,
                    province: addressData.province,
                    region: addressData.region,
                    zip_code: addressData.postalCode,
                    label: addressData.label,
                    is_default: addressData.isDefault
                });

                addAddress(newAddress);

                // Also save categories to preferences if possible
                if (selectedCategories.length > 0) {
                    await updateProfile({
                        preferences: {
                            ...profile.preferences,
                            interestedCategories: selectedCategories
                        }
                    });
                }

                setStep(4);
            } catch (error) {
                console.error("Address creation failed:", error);
                toast({
                    title: "Error",
                    description: "Failed to save address. Please try again.",
                    variant: "destructive"
                });
                setIsLoading(false);
                return; // Don't advance
            }
            setIsLoading(false);
            return;
        }

        setStep(prev => prev + 1);
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
    };

    const toggleCategory = (id: string) => {
        if (selectedCategories.includes(id)) {
            setSelectedCategories(prev => prev.filter(c => c !== id));
        } else {
            setSelectedCategories(prev => [...prev, id]);
        }
    };

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAddressData({ ...addressData, [e.target.name]: e.target.value });
    };

    const handleFinish = () => {
        navigate("/shop");
    };

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0, x: 50 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
        exit: { opacity: 0, x: -50, transition: { duration: 0.3 } }
    };

    return (
        <div className="min-h-screen relative font-sans bg-slate-50 flex items-start justify-center p-6 pt-12">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-white via-orange-50/30 to-white animate-gradient [background-size:400%_400%]"></div>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{ x: [0, 50, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-orange-200/20 rounded-full mix-blend-multiply filter blur-3xl opacity-40"
                ></motion.div>
                <motion.div
                    animate={{ x: [0, -40, 0], y: [0, 60, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-orange-300/20 rounded-full mix-blend-multiply filter blur-3xl opacity-40"
                ></motion.div>
            </div>

            <div className="relative z-10 w-full max-w-3xl flex flex-col">

                {/* Header Section */}
                <div className="flex flex-col items-center mb-8">
                    {/* Logo */}
                    <div className="mb-6 animate-fade-in-down">
                        <h1 className="font-fondamento text-4xl text-orange-600 drop-shadow-sm">BazaarX</h1>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="w-full max-w-sm mb-6">
                        <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(step / 4) * 100}%` }}
                                transition={{ duration: 0.5, ease: "easeInOut" }}
                                className="h-full bg-orange-500 rounded-full"
                            />
                        </div>
                    </div>

                    {/* Navigation & Step Info */}
                    <div className="w-full max-w-sm flex items-center justify-between relative px-1">
                        {step > 1 ? (
                            <button
                                onClick={handleBack}
                                className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors absolute left-0 -ml-12"
                                aria-label="Go back"
                            >
                                <ArrowLeft size={24} />
                            </button>
                        ) : <div />} {/* Spacer or absolute positioning handles alignment */}

                        <div className="flex flex-col items-center mx-auto text-center">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                {step === 1 && "Terms & Conditions"}
                                {step === 2 && "Choose Interests"}
                                {step === 3 && "Delivery Address"}
                                {step === 4 && ""}
                            </span>
                        </div>

                        <div className="w-8" /> {/* Spacer for balance */}
                    </div>
                </div>

                <div className="flex flex-col w-full">
                    <div className="flex-1 p-8 flex flex-col relative">

                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="h-full flex flex-col"
                                >
                                    <div className="text-center mb-6">
                                        <h2 className="text-2xl font-bold text-gray-800">Terms & Conditions</h2>
                                        <p className="text-gray-500 text-sm">Please review and agree to continue.</p>
                                    </div>

                                    <div className="flex-1 bg-gray-50 rounded-xl p-6 border border-gray-100 overflow-y-auto mb-6 text-sm text-gray-600 leading-relaxed shadow-inner max-h-[300px]">
                                        <h3 className="font-bold text-gray-800 mb-2">1. Introduction</h3>
                                        <p className="mb-4">Welcome to BazaarX. By accessing our platform, you agree to these terms.</p>
                                        <h3 className="font-bold text-gray-800 mb-2">2. User Accounts</h3>
                                        <p className="mb-4">You are responsible for maintaining the confidentiality of your account credentials.</p>
                                        <h3 className="font-bold text-gray-800 mb-2">3. Privacy Policy</h3>
                                        <p className="mb-4">Your privacy is important to us. Please review our Privacy Policy to understand how we collect and use your data.</p>
                                        <h3 className="font-bold text-gray-800 mb-2">4. Acceptable Use</h3>
                                        <p className="mb-4">You agree not to misuse the platform or engage in unlawful activities.</p>
                                        <h3 className="font-bold text-gray-800 mb-2">5. Termination</h3>
                                        <p>We reserve the right to suspend or terminate your account if you violate these terms.</p>
                                    </div>

                                    <div className="flex items-center gap-3 mb-8 p-4 bg-orange-50 rounded-lg border border-orange-100">
                                        <Checkbox
                                            id="terms"
                                            checked={termsAccepted}
                                            onCheckedChange={(c) => setTermsAccepted(!!c)}
                                            className="w-5 h-5 border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:text-white"
                                        />
                                        <label htmlFor="terms" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                                            I have read and agree to the Terms & Conditions
                                        </label>
                                    </div>

                                    <div className="mt-auto flex justify-center">
                                        <button
                                            onClick={handleNext}
                                            disabled={!termsAccepted}
                                            className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-200 disabled:opacity-50 disabled:shadow-none hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                        >
                                            Agree & Continue
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="h-full flex flex-col"
                                >
                                    <div className="text-center mb-6">
                                        <h2 className="text-2xl font-bold text-gray-800">Your Interests</h2>
                                        <p className="text-gray-500 text-sm">Select at least 3 categories.</p>
                                    </div>

                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8 overflow-y-auto pr-1">
                                        {categories.map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => toggleCategory(cat.id)}
                                                className={`relative rounded-2xl border-2 transition-all duration-300 overflow-hidden group aspect-[4/3] ${selectedCategories.includes(cat.id)
                                                    ? "border-orange-500 ring-2 ring-orange-200 ring-offset-2"
                                                    : "border-gray-100 hover:border-orange-200"
                                                    }`}
                                            >
                                                <div className="absolute inset-0">
                                                    <img
                                                        src={cat.image}
                                                        alt={cat.name}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    />
                                                    <div className={`absolute inset-0 transition-colors duration-300 ${selectedCategories.includes(cat.id)
                                                        ? "bg-orange-900/60"
                                                        : "bg-black/40 group-hover:bg-black/30"
                                                        }`}
                                                    ></div>
                                                </div>

                                                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center z-10">
                                                    <span className="font-bold text-white text-sm drop-shadow-md transform transition-transform duration-300 group-hover:-translate-y-1">
                                                        {cat.name}
                                                    </span>
                                                </div>

                                                {selectedCategories.includes(cat.id) && (
                                                    <div className="absolute top-2 right-2 z-20 bg-white rounded-full p-0.5 shadow-sm">
                                                        <CheckCircle2 size={16} className="text-orange-500 fill-current" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-500">
                                            {selectedCategories.length} selected
                                        </span>
                                        <button
                                            onClick={handleNext}
                                            disabled={selectedCategories.length < 3}
                                            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-200 disabled:opacity-50 disabled:shadow-none hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                                        >
                                            Next <ArrowRight size={18} />
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="h-full flex flex-col"
                                >
                                    <div className="text-center mb-6">
                                        <h2 className="text-2xl font-bold text-gray-800">Shipping Details</h2>
                                        <p className="text-gray-500 text-sm">Where should we deliver your orders?</p>
                                    </div>

                                    <div className="space-y-4 overflow-y-auto pr-2 -mr-2 pb-4 flex-1">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">First Name</label>
                                                <input
                                                    name="firstName"
                                                    value={addressData.firstName}
                                                    onChange={handleAddressChange}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all text-sm"
                                                    placeholder="John"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Last Name</label>
                                                <input
                                                    name="lastName"
                                                    value={addressData.lastName}
                                                    onChange={handleAddressChange}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all text-sm"
                                                    placeholder="Doe"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Phone</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                <input
                                                    name="phone"
                                                    value={addressData.phone}
                                                    onChange={handleAddressChange}
                                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all text-sm"
                                                    placeholder="+63 900 000 0000"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Address</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                <input
                                                    name="street"
                                                    value={addressData.street}
                                                    onChange={handleAddressChange}
                                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all text-sm"
                                                    placeholder="Unit, Building, Street"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Barangay</label>
                                                <input
                                                    name="barangay"
                                                    value={addressData.barangay}
                                                    onChange={handleAddressChange}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all text-sm"
                                                    placeholder="Barangay"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">City</label>
                                                <input
                                                    name="city"
                                                    value={addressData.city}
                                                    onChange={handleAddressChange}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all text-sm"
                                                    placeholder="City"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Province</label>
                                                <input
                                                    name="province"
                                                    value={addressData.province}
                                                    onChange={handleAddressChange}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all text-sm"
                                                    placeholder="Province"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Zip Code</label>
                                                <input
                                                    name="postalCode"
                                                    value={addressData.postalCode}
                                                    onChange={handleAddressChange}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all text-sm"
                                                    placeholder="0000"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Region</label>
                                            <input
                                                name="region"
                                                value={addressData.region}
                                                onChange={handleAddressChange}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all text-sm"
                                                placeholder="Region"
                                            />
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            {(["Home", "Work"] as const).map((lbl) => (
                                                <button
                                                    key={lbl}
                                                    type="button"
                                                    onClick={() => setAddressData(prev => ({ ...prev, label: lbl }))}
                                                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${addressData.label === lbl
                                                        ? "bg-orange-50 border-orange-500 text-orange-700"
                                                        : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                                                        }`}
                                                >
                                                    {lbl === "Home" ? <Home size={16} /> : <Building size={16} />}
                                                    {lbl}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <button
                                            onClick={handleNext}
                                            disabled={isLoading || !addressData.street || !addressData.city || !addressData.province || !addressData.region || !addressData.postalCode}
                                            className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-200 disabled:opacity-50 disabled:shadow-none hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                        >
                                            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Save & Finish"}
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 4 && (
                                <motion.div
                                    key="step4"
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    className="h-full flex flex-col items-center justify-center text-center p-6"
                                >
                                    <h2 className="text-3xl font-bold text-gray-800 mb-4 animate-fade-in-up">You're All Set!</h2>
                                    <p className="text-gray-500 mb-12 max-w-sm animate-fade-in-up delay-100">
                                        Your profile is complete. Welcome to the community!
                                    </p>

                                    <button
                                        onClick={handleFinish}
                                        className="w-full max-w-xs py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-200 hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2 text-lg animate-fade-in-up delay-200"
                                    >
                                        Start Shopping <ShoppingBag size={20} />
                                    </button>
                                </motion.div>
                            )}

                        </AnimatePresence>

                    </div>
                </div>
            </div>
        </div>
    );
}
