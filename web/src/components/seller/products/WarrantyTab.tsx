import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Shield, ShieldCheck, Store, HelpCircle, Info } from "lucide-react";

interface WarrantyTabProps {
    formData: {
        hasWarranty: boolean;
        warrantyType: string;
        warrantyDurationMonths: string;
        warrantyProviderName: string;
        warrantyProviderContact: string;
        warrantyProviderEmail: string;
        warrantyTermsUrl: string;
        warrantyPolicy: string;
    };
    errors: Record<string, string | undefined>;
    handleChange: (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
    ) => void;
    setFormData: React.Dispatch<React.SetStateAction<{
        hasWarranty: boolean;
        warrantyType: string;
        warrantyDurationMonths: string;
        warrantyProviderName: string;
        warrantyProviderContact: string;
        warrantyProviderEmail: string;
        warrantyTermsUrl: string;
        warrantyPolicy: string;
    }>>;
}

const WARRANTY_TYPES = [
    { value: "local_manufacturer", label: "Local Manufacturer Warranty", icon: ShieldCheck, description: "Warranty provided by local manufacturer/distributor" },
    { value: "international_manufacturer", label: "International Manufacturer Warranty", icon: Shield, description: "Warranty provided by international manufacturer" },
    { value: "shop_warranty", label: "Shop Warranty", icon: Store, description: "Warranty provided directly by the shop" },
];

export function WarrantyTab({ formData, errors, handleChange, setFormData }: WarrantyTabProps) {
    const selectedType = WARRANTY_TYPES.find(t => t.value === formData.warrantyType);
    const SelectedIcon = selectedType?.icon;

    return (
        <div className="space-y-8">
            {/* Warranty Enable Toggle */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-100">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                            formData.hasWarranty ? "bg-orange-100" : "bg-gray-200"
                        )}>
                            <ShieldCheck className={cn(
                                "w-6 h-6 transition-colors",
                                formData.hasWarranty ? "text-orange-600" : "text-gray-400"
                            )} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900">Product Warranty</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Add warranty information to build trust with buyers and provide after-sales support
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, hasWarranty: !prev.hasWarranty }))}
                        className={cn(
                            "relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2",
                            formData.hasWarranty ? "bg-orange-500" : "bg-gray-300"
                        )}
                    >
                        <span
                            className={cn(
                                "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                                formData.hasWarranty ? "translate-x-6" : "translate-x-1"
                            )}
                        />
                    </button>
                </div>
            </div>

            {formData.hasWarranty && (
                <>
                    {/* Warranty Type Selection */}
                    <div className="space-y-3">
                        <Label className="text-sm font-semibold text-gray-800">
                            Warranty Type *
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {WARRANTY_TYPES.map((type) => {
                                const Icon = type.icon;
                                const isSelected = formData.warrantyType === type.value;
                                return (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, warrantyType: type.value }))}
                                        className={cn(
                                            "relative p-4 rounded-xl border-2 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2",
                                            isSelected
                                                ? "border-orange-500 bg-orange-50 shadow-md"
                                                : "border-gray-200 bg-white hover:border-orange-200 hover:bg-gray-50"
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                                isSelected ? "bg-orange-100" : "bg-gray-100"
                                            )}>
                                                <Icon className={cn(
                                                    "w-5 h-5",
                                                    isSelected ? "text-orange-600" : "text-gray-500"
                                                )} />
                                            </div>
                                            <div>
                                                <p className={cn(
                                                    "text-sm font-bold",
                                                    isSelected ? "text-orange-900" : "text-gray-900"
                                                )}>
                                                    {type.label}
                                                </p>
                                                <p className={cn(
                                                    "text-xs mt-1",
                                                    isSelected ? "text-orange-700" : "text-gray-500"
                                                )}>
                                                    {type.description}
                                                </p>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        {errors.warrantyType && (
                            <p className="text-sm text-red-600">{errors.warrantyType}</p>
                        )}
                    </div>

                    {/* Warranty Duration */}
                    <div className="space-y-2">
                        <Label htmlFor="warrantyDurationMonths" className="text-sm font-semibold text-gray-800">
                            Warranty Duration (months) *
                        </Label>
                        <div className="relative">
                            <Input
                                id="warrantyDurationMonths"
                                name="warrantyDurationMonths"
                                type="number"
                                min="1"
                                max="120"
                                value={formData.warrantyDurationMonths}
                                onChange={handleChange}
                                className={cn(
                                    "w-full rounded-xl border px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-16",
                                    errors.warrantyDurationMonths ? "border-red-500" : "border-gray-200"
                                )}
                                placeholder="12"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                                months
                            </span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {[3, 6, 12, 24, 36].map(months => (
                                <button
                                    key={months}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, warrantyDurationMonths: months.toString() }))}
                                    className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-700 transition-colors border border-gray-200 hover:border-orange-200"
                                >
                                    {months} {months === 12 ? '1 year' : months === 24 ? '2 years' : months === 36 ? '3 years' : 'months'}
                                </button>
                            ))}
                        </div>
                        {errors.warrantyDurationMonths && (
                            <p className="text-sm text-red-600">{errors.warrantyDurationMonths}</p>
                        )}
                    </div>

                    {/* Warranty Provider Information */}
                    <div className="bg-gray-50 rounded-xl p-5 space-y-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Store className="w-4 h-4 text-gray-500" />
                            <h4 className="font-bold text-gray-900">Warranty Provider Information</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="warrantyProviderName" className="text-sm font-medium text-gray-700">
                                    Provider Name *
                                </Label>
                                <Input
                                    id="warrantyProviderName"
                                    name="warrantyProviderName"
                                    value={formData.warrantyProviderName}
                                    onChange={handleChange}
                                    className={cn(
                                        "rounded-xl border px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500",
                                        errors.warrantyProviderName ? "border-red-500" : "border-gray-200"
                                    )}
                                    placeholder="E.g., TechCorp Philippines Inc."
                                />
                                {errors.warrantyProviderName && (
                                    <p className="text-xs text-red-600">{errors.warrantyProviderName}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="warrantyProviderContact" className="text-sm font-medium text-gray-700">
                                    Contact Number
                                </Label>
                                <Input
                                    id="warrantyProviderContact"
                                    name="warrantyProviderContact"
                                    value={formData.warrantyProviderContact}
                                    onChange={handleChange}
                                    className={cn(
                                        "rounded-xl border px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500",
                                        errors.warrantyProviderContact ? "border-red-500" : "border-gray-200"
                                    )}
                                    placeholder="+63-2-8123-4567"
                                />
                                {errors.warrantyProviderContact && (
                                    <p className="text-xs text-red-600">{errors.warrantyProviderContact}</p>
                                )}
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="warrantyProviderEmail" className="text-sm font-medium text-gray-700">
                                    Email Address
                                </Label>
                                <Input
                                    id="warrantyProviderEmail"
                                    name="warrantyProviderEmail"
                                    type="email"
                                    value={formData.warrantyProviderEmail}
                                    onChange={handleChange}
                                    className={cn(
                                        "rounded-xl border px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500",
                                        errors.warrantyProviderEmail ? "border-red-500" : "border-gray-200"
                                    )}
                                    placeholder="support@provider.com"
                                />
                                {errors.warrantyProviderEmail && (
                                    <p className="text-xs text-red-600">{errors.warrantyProviderEmail}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Warranty Terms URL */}
                    <div className="space-y-2">
                        <Label htmlFor="warrantyTermsUrl" className="text-sm font-semibold text-gray-800">
                            Warranty Terms URL
                        </Label>
                        <Input
                            id="warrantyTermsUrl"
                            name="warrantyTermsUrl"
                            type="url"
                            value={formData.warrantyTermsUrl}
                            onChange={handleChange}
                            className={cn(
                                "w-full rounded-xl border px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500",
                                errors.warrantyTermsUrl ? "border-red-500" : "border-gray-200"
                            )}
                            placeholder="https://example.com/warranty-terms"
                        />
                        <p className="text-xs text-gray-500">
                            Link to the full warranty terms and conditions (optional)
                        </p>
                        {errors.warrantyTermsUrl && (
                            <p className="text-sm text-red-600">{errors.warrantyTermsUrl}</p>
                        )}
                    </div>

                    {/* Warranty Policy */}
                    <div className="space-y-2">
                        <Label htmlFor="warrantyPolicy" className="text-sm font-semibold text-gray-800">
                            Warranty Policy / Terms
                        </Label>
                        <Textarea
                            id="warrantyPolicy"
                            name="warrantyPolicy"
                            value={formData.warrantyPolicy}
                            onChange={handleChange}
                            rows={5}
                            className={cn(
                                "w-full rounded-xl border px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500",
                                errors.warrantyPolicy ? "border-red-500" : "border-gray-200"
                            )}
                            placeholder="Describe what is covered under warranty, what is not covered, and the claim process..."
                        />
                        <p className="text-xs text-gray-500">
                            Provide clear information about warranty coverage, exclusions, and how buyers can file claims
                        </p>
                        {errors.warrantyPolicy && (
                            <p className="text-sm text-red-600">{errors.warrantyPolicy}</p>
                        )}
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex gap-3">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-semibold mb-1">Warranty Information</p>
                            <p className="text-blue-700">
                                Warranty information will be displayed on your product page and automatically activated when buyers receive their orders. 
                                Buyers can file warranty claims directly through their order history.
                            </p>
                        </div>
                    </div>
                </>
            )}

            {!formData.hasWarranty && (
                <div className="bg-gray-50 rounded-xl p-8 text-center border border-dashed border-gray-200">
                    <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-600">
                        Warranty is disabled
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Enable warranty above to add warranty information to this product
                    </p>
                </div>
            )}
        </div>
    );
}
