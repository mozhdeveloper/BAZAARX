import React, { useState, useRef } from 'react';
import {
    X, Calendar, Camera, Video, Upload, Plus,
    ChevronLeft, ChevronRight, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue
} from './ui/select';
import { Checkbox } from './ui/checkbox';
import { useToast } from '../hooks/use-toast';
import { qaTeamService, type QAAssessmentItem } from '../services/qaTeamService';

interface QAFormProps {
    selectedProduct: QAAssessmentItem;
    onCloseForm: () => void;
    onCloseModal: () => void;
    onSubmitSuccess: () => void;
}

const QAForm: React.FC<QAFormProps> = ({
    selectedProduct,
    onCloseForm,
    onCloseModal,
    onSubmitSuccess
}) => {
    const { toast } = useToast();

    // Form States
    const [batchId, setBatchId] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [productTier, setProductTier] = useState('');
    const [assessmentStatus, setAssessmentStatus] = useState<'approved' | 'revision' | 'rejected' | null>(null);
    const [qcMethod, setQcMethod] = useState('');
    const [qcAgentName, setQcAgentName] = useState('');
    const [qcDate] = useState(new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }));
    const [packagingCondition, setPackagingCondition] = useState('');
    const [productAppearance, setProductAppearance] = useState('');
    const [labelAccuracyVerified, setLabelAccuracyVerified] = useState(false);
    const [powerTest, setPowerTest] = useState('');
    const [functionalTest, setFunctionalTest] = useState('');
    const [stressTest, setStressTest] = useState('');
    const [photoEvidence, setPhotoEvidence] = useState<File[]>([]);
    const [videoEvidence, setVideoEvidence] = useState<File | null>(null);
    const [generalNotes, setGeneralNotes] = useState('');
    const [defectsIdentified, setDefectsIdentified] = useState('');
    const [recommendations, setRecommendations] = useState('');
    const [revisionReason, setRevisionReason] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');

    const photoInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setPhotoEvidence(prev => [...prev, ...filesArray]);
        }
    };

    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setVideoEvidence(e.target.files[0]);
        }
    };

    const removePhoto = (index: number) => {
        setPhotoEvidence(prev => prev.filter((_, i) => i !== index));
    };

    const removeVideo = () => {
        setVideoEvidence(null);
    };

    const handleSubmit = async () => {
        if (!selectedProduct) return;

        try {
            if (assessmentStatus === 'approved') {
                await qaTeamService.passDigitalReview(selectedProduct.product_id, 'qa-user');
                toast({ title: 'Success', description: 'Product approved and verified!' });
            } else if (assessmentStatus === 'revision') {
                if (!revisionReason.trim()) return;
                await qaTeamService.requestRevision(selectedProduct.product_id, 'qa-user', revisionReason, 'digital');
                toast({ title: 'Revision Requested', description: 'Seller has been notified.' });
            } else if (assessmentStatus === 'rejected') {
                if (!rejectionReason.trim()) return;
                await qaTeamService.rejectProduct(selectedProduct.product_id, 'qa-user', rejectionReason, 'digital');
                toast({ title: 'Product Rejected', description: 'Seller has been notified.' });
            }

            onSubmitSuccess();
        } catch (error) {
            console.error('Error submitting QA report:', error);
            toast({
                title: 'Error',
                description: 'Failed to submit QA report',
                variant: 'destructive'
            });
        }
    };

    const isSubmitDisabled = !assessmentStatus || !batchId || !productTier || !qcMethod || !qcAgentName || !packagingCondition || !productAppearance || !labelAccuracyVerified || !powerTest || (productTier === 'Standard' && (!functionalTest || !stressTest)) || (productTier === 'Premium' && !functionalTest) || (assessmentStatus === 'revision' && !revisionReason.trim()) || (assessmentStatus === 'rejected' && !rejectionReason.trim());

    return (
        <div className="w-1/2 flex flex-col h-[95vh] bg-white border-l border-gray-100 animate-in slide-in-from-right duration-500 overflow-hidden">
            {/* Right Header */}
            <div className="sticky top-0 z-40 px-8 py-6 bg-white flex flex-col gap-1 border-b border-gray-50">
                <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-bold text-gray-900">Quality Assurance Form</h2>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full absolute right-4 top-4 hover:bg-base" onClick={onCloseModal}>
                        <X className="w-4 h-4 text-gray-400 hover:text-gray-700" />
                    </Button>
                </div>
                <p className="text-gray-500 text-sm">Complete inspection and testing documentation.</p>
            </div>

            {/* Right Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-8 space-y-6 pb-10">
                {/* Product Information Section */}
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-[var(--text-headline)] -mb-4">Product Information</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[12px] text-[var(--text-headline)]">Product ID <span className="text-red-500">*</span></Label>
                            <Input value={selectedProduct?.product_id} disabled className="bg-white border-gray-300 text-gray-500 h-8 text-xs rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[12px] text-[var(--text-headline)]">Batch ID <span className="text-red-500">*</span></Label>
                            <Input value={batchId} onChange={(e) => setBatchId(e.target.value)} placeholder="Enter batch ID" className="bg-white border-gray-200 h-8 text-xs rounded-xl focus:border-[var(--brand-accent)] focus:ring-[var(--brand-accent)]/20 transition-all" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[12px] text-[var(--text-headline)]">Serial Number</Label>
                            <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="Enter serial number" className="bg-white border-gray-200 h-8 text-xs rounded-xl focus:border-[var(--brand-accent)] focus:ring-[var(--brand-accent)]/20 transition-all" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[12px] text-[var(--text-headline)]">Product Tier <span className="text-red-500">*</span></Label>
                            <Select value={productTier} onValueChange={setProductTier}>
                                <SelectTrigger className="bg-white border-gray-200 h-8 text-xs rounded-xl focus:ring-0 transition-all">
                                    <SelectValue placeholder="Select tier" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Standard" className="text-xs">Tier A - High Risk</SelectItem>
                                    <SelectItem value="Premium" className="text-xs">Tier B - Medium Risk</SelectItem>
                                    <SelectItem value="Luxury" className="text-xs">Tier C - Low Risk</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* QC Information Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-[var(--text-headline)] -mb-4">QC Information</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        <div className="space-y-2 col-span-1">
                            <Label className="text-[12px] text-[var(--text-headline)]">QC Method <span className="text-red-500">*</span></Label>
                            <Select value={qcMethod} onValueChange={setQcMethod}>
                                <SelectTrigger className="bg-gray-50/50 border-gray-200 h-8 text-xs rounded-xl focus:ring-0 transition-all">
                                    <SelectValue placeholder="Select method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Physical Inspection" className="text-xs">Physical Inspection</SelectItem>
                                    <SelectItem value="Digital Review" className="text-xs">Digital Review</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 col-span-1">
                            <Label className="text-[12px] text-[var(--text-headline)]">QC Agent Name <span className="text-red-500">*</span></Label>
                            <Input
                                value={qcAgentName}
                                onChange={(e) => setQcAgentName(e.target.value)}
                                placeholder="Enter your name"
                                className="bg-gray-50/50 border-gray-200 h-8 text-xs rounded-xl focus:border-[var(--brand-accent)] focus:ring-[var(--brand-accent)]/20 transition-all"
                            />
                        </div>
                        <div className="space-y-2 col-span-1">
                            <Label className="text-[12px] text-[var(--text-headline)]">QC Date</Label>
                            <div className="relative">
                                <Input
                                    value={qcDate}
                                    disabled
                                    className="bg-gray-50/50 border-gray-100 text-gray-500 h-8 text-xs rounded-xl pr-10"
                                />
                                <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 opacity-50" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Visual Inspection Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-[var(--text-headline)] -mb-4">Visual Inspection</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        <div className="space-y-2 col-span-1">
                            <Label className="text-[12px] text-[var(--text-headline)]">Packaging Condition <span className="text-red-500">*</span></Label>
                            <Select value={packagingCondition} onValueChange={setPackagingCondition}>
                                <SelectTrigger className="bg-gray-50/50 border-gray-200 h-8 text-xs rounded-xl focus:ring-0 transition-all">
                                    <SelectValue placeholder="Select condition" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Excellent" className="text-xs">Excellent</SelectItem>
                                    <SelectItem value="Good" className="text-xs">Good</SelectItem>
                                    <SelectItem value="Fair" className="text-xs">Fair</SelectItem>
                                    <SelectItem value="Poor" className="text-xs">Poor</SelectItem>
                                    <SelectItem value="N/A" className="text-xs">N/A</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 col-span-1">
                            <Label className="text-[12px] text-[var(--text-headline)]">Product Appearance <span className="text-red-500">*</span></Label>
                            <Select value={productAppearance} onValueChange={setProductAppearance}>
                                <SelectTrigger className="bg-gray-50/50 border-gray-200 h-8 text-xs rounded-xl focus:ring-0 transition-all">
                                    <SelectValue placeholder="Select appearance" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Excellent" className="text-xs">Excellent</SelectItem>
                                    <SelectItem value="Good" className="text-xs">Good</SelectItem>
                                    <SelectItem value="Fair" className="text-xs">Fair</SelectItem>
                                    <SelectItem value="Poor" className="text-xs">Poor</SelectItem>
                                    <SelectItem value="N/A" className="text-xs">N/A</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-2 mt-2">
                            <div className="flex items-center space-x-2 bg-gray-50/50 border border-gray-200 p-4 rounded-xl transition-all hover:border-[var(--brand-accent)]/30">
                                <Checkbox
                                    id="label-accuracy"
                                    checked={labelAccuracyVerified}
                                    onCheckedChange={(checked) => setLabelAccuracyVerified(checked as boolean)}
                                    className="border-gray-300 data-[state=checked]:bg-[var(--brand-primary)] data-[state=checked]:border-[var(--brand-primary)]"
                                />
                                <label
                                    htmlFor="label-accuracy"
                                    className="text-xs text-[var(--text-headline)] font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                    Label accuracy verified (matches product specifications)
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Functional Testing Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-[var(--text-headline)] -mb-4">Functional Testing</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-x-4 gap-y-4">
                        <div className="space-y-2 col-span-1">
                            <Label className="text-[12px] text-[var(--text-headline)]">Power Test <span className="text-red-500">*</span></Label>
                            <Select value={powerTest} onValueChange={setPowerTest}>
                                <SelectTrigger className="bg-gray-50/50 border-gray-200 h-8 text-xs rounded-xl focus:ring-0 transition-all">
                                    <SelectValue placeholder="Select result" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pass" className="text-xs">Pass</SelectItem>
                                    <SelectItem value="Fail" className="text-xs">Fail</SelectItem>
                                    <SelectItem value="N/A" className="text-xs">N/A</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 col-span-1">
                            <Label className="text-[12px] text-[var(--text-headline)]">
                                Functional Test {(productTier === 'Standard' || productTier === 'Premium') && <span className="text-red-500">*</span>}
                            </Label>
                            <Select value={functionalTest} onValueChange={setFunctionalTest}>
                                <SelectTrigger className="bg-gray-50/50 border-gray-200 h-8 text-xs rounded-xl focus:ring-0 transition-all">
                                    <SelectValue placeholder="Select result" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pass" className="text-xs">Pass</SelectItem>
                                    <SelectItem value="Fail" className="text-xs">Fail</SelectItem>
                                    <SelectItem value="N/A" className="text-xs">N/A</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 col-span-1">
                            <Label className="text-[12px] text-[var(--text-headline)]">
                                Stress Test {productTier === 'Standard' && <span className="text-red-500">*</span>}
                            </Label>
                            <Select value={stressTest} onValueChange={setStressTest}>
                                <SelectTrigger className="bg-gray-50/50 border-gray-200 h-8 text-xs rounded-xl focus:ring-0 transition-all">
                                    <SelectValue placeholder="Select result" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pass" className="text-xs">Pass</SelectItem>
                                    <SelectItem value="Fail" className="text-xs">Fail</SelectItem>
                                    <SelectItem value="N/A" className="text-xs">N/A</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl">
                        <p className="text-[11px] text-blue-900 leading-relaxed font-semibold">
                            Note: <span className="font-normal text-blue-800">Tier A products require all tests. Tier B requires Power & Functional tests. Tier C requires Power test only.</span>
                        </p>
                    </div>
                </div>

                {/* Evidence Collection Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-[var(--text-headline)] -mb-4">Evidence Collection</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <Label className="text-[12px] text-[var(--text-headline)]">Photo Evidence</Label>
                            <input
                                type="file"
                                ref={photoInputRef}
                                onChange={handlePhotoUpload}
                                multiple
                                accept="image/*"
                                className="hidden"
                            />
                            {photoEvidence.length === 0 ? (
                                <div
                                    onClick={() => photoInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50/30 transition-all hover:bg-gray-50/50 hover:border-[var(--brand-accent)]/30 group cursor-pointer"
                                >
                                    <Camera className="w-10 h-10 text-gray-400 mb-3 group-hover:text-[var(--brand-accent)] transition-colors" />
                                    <p className="text-xs font-semibold text-[var(--text-headline)]">Click to upload photos</p>
                                    <p className="text-[10px] text-gray-500 mt-1">Multiple images supported</p>
                                    <Button variant="outline" size="sm" className="mt-4 h-8 text-[11px] border-[var(--btn-border)] bg-white text-[var(--text-muted)] hover:bg-gray-50 group-hover:text-gray-600 rounded-lg group-hover:border-gray-600 font-bold">
                                        <Upload className="w-3.5 h-3.5 mr-2" />
                                        Upload Photos
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {photoEvidence.map((file, index) => (
                                        <div key={index} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-gray-100">
                                            <img loading="lazy" 
                                                src={URL.createObjectURL(file)}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removePhoto(index); }}
                                                className="absolute top-0 right-0 p-1 bg-white/40 text-white rounded-bl-xl opacity-0 group-hover:opacity-100 hover:bg-white hover:text-gray-600 transition-opacity"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => photoInputRef.current?.click()}
                                        className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center hover:border-[var(--brand-accent)]/30 hover:bg-gray-50 transition-all group"
                                    >
                                        <Plus className="w-5 h-5 text-[var(--text-muted)] group-hover:text-gray-600" />
                                        <span className="text-[9px] text-[var(--text-muted)] group-hover:text-gray-600 mt-1">Add Photo</span>
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[12px] text-[var(--text-headline)]">Video Evidence</Label>
                            <input
                                type="file"
                                ref={videoInputRef}
                                onChange={handleVideoUpload}
                                accept="video/*"
                                className="hidden"
                            />
                            {videoEvidence === null ? (
                                <div
                                    onClick={() => videoInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50/30 transition-all hover:bg-gray-50/50 hover:border-[var(--brand-accent)]/30 group cursor-pointer"
                                >
                                    <Video className="w-10 h-10 text-gray-400 mb-3 group-hover:text-[var(--brand-accent)] transition-colors" />
                                    <p className="text-xs font-semibold text-[var(--text-headline)]">Click to upload video</p>
                                    <p className="text-[10px] text-gray-500 mt-1">Watermarked with QC date & serial</p>
                                    <Button variant="outline" size="sm" className="mt-4 h-8 text-[11px] border-[var(--btn-border)] bg-white text-[var(--text-muted)] hover:bg-gray-50 group-hover:text-gray-600 rounded-lg group-hover:border-gray-600 font-bold">
                                        <Upload className="w-3.5 h-3.5 mr-2" />
                                        Upload Video
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 p-2 bg-gray-50/50 border border-gray-200 rounded-lg">
                                        <Video className="w-4 h-4 text-gray-600" />
                                        <span className="text-[10px] text-gray-600 font-medium truncate max-w-[150px]">{videoEvidence.name}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeVideo(); }}
                                            className="ml-auto p-1 text-gray-400 hover:bg-base hover:text-gray-600 rounded-md transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => videoInputRef.current?.click()}
                                        className="h-7 text-[10px] text-[var(--text-muted)] hover:text-gray-600 hover:bg-base"
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Add Video
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Documentation Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-[var(--text-headline)] -mb-4">Documentation</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[12px] text-[var(--text-headline)]">General Notes</Label>
                            <Textarea
                                value={generalNotes}
                                onChange={(e) => setGeneralNotes(e.target.value)}
                                placeholder="Enter any observations or additional notes..."
                                className="bg-white border-gray-200 rounded-xl min-h-[50px] text-xs"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[12px] text-[var(--text-headline)]">Defects Identified</Label>
                            <Textarea
                                value={defectsIdentified}
                                onChange={(e) => setDefectsIdentified(e.target.value)}
                                placeholder="List any defects or issues found..."
                                className="bg-white border-gray-200 rounded-xl min-h-[50px] text-xs"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[12px] text-[var(--text-headline)]">Recommendations</Label>
                            <Textarea
                                value={recommendations}
                                onChange={(e) => setRecommendations(e.target.value)}
                                placeholder="Provide recommendations for improvement or next steps..."
                                className="bg-white border-gray-200 rounded-xl min-h-[50px] text-xs"
                            />
                        </div>
                    </div>
                </div>

                {/* Overall Assessment Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-[var(--text-headline)] -mb-4">Overall Assessment</h3>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <Label className="text-xs text-[var(--text-headline)] mb-4 block">Final Decision <span className="text-red-500">*</span></Label>
                            <div className="space-y-3">
                                {/* Approved Option */}
                                <div
                                    className={cn(
                                        "p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all duration-200 group relative",
                                        assessmentStatus === 'approved' ? "border-gray-300 bg-white shadow-sm" : "border-gray-100 bg-white hover:border-gray-200"
                                    )}
                                    onClick={() => setAssessmentStatus('approved')}
                                >
                                    <div className={cn(
                                        "w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all",
                                        assessmentStatus === 'approved' ? "border-green-500 bg-green-500" : "border-gray-200 bg-gray-50/10"
                                    )}>
                                        {assessmentStatus === 'approved' && <div className="w-3 h-3 rounded-full bg-green-500" />}
                                    </div>
                                    <div className="flex items-center gap-2 flex-1">
                                        <div>
                                            <p className="font-bold text-[var(--text-headline)] text-[13px] leading-tight">Approved</p>
                                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Product passes all quality checks</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Conditional Approval Option */}
                                <div className="space-y-4">
                                    <div
                                        className={cn(
                                            "p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all duration-200 group relative",
                                            assessmentStatus === 'revision' ? "border-gray-300 bg-white shadow-sm" : "border-gray-100 bg-white hover:border-gray-200"
                                        )}
                                        onClick={() => setAssessmentStatus('revision')}
                                    >
                                        <div className={cn(
                                            "w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all",
                                            assessmentStatus === 'revision' ? "border-orange-400 bg-orange-400" : "border-gray-200 bg-gray-50/10"
                                        )}>
                                            {assessmentStatus === 'revision' && <div className="w-3 h-3 rounded-full bg-orange-400" />}
                                        </div>
                                        <div className="flex items-center gap-2 flex-1">
                                            <div>
                                                <p className="font-bold text-[var(--text-headline)] text-[13px] leading-tight">Conditional Approval</p>
                                                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Minor issues identified, requires seller action</p>
                                            </div>
                                        </div>
                                    </div>

                                    {assessmentStatus === 'revision' && (
                                        <div className="pl-6 space-y-2 animate-in slide-in-from-top-2 duration-200">
                                            <p className="text-[11px] text-[var(--text-muted)] italic">Tell the seller what needs to be revised.</p>
                                            <div className="space-y-1.5">
                                                <Label className="text-[12px] text-[var(--text-headline)] font-semibold">Revision Notes <span className="text-red-500">*</span></Label>
                                                <Textarea
                                                    value={revisionReason}
                                                    onChange={(e) => setRevisionReason(e.target.value)}
                                                    placeholder="Enter revision notes..."
                                                    className="bg-white border-gray-200 rounded-xl min-h-[60px] text-xs shadow-sm focus:border-[#d97706] transition-colors"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Rejected Option */}
                                <div className="space-y-4">
                                    <div
                                        className={cn(
                                            "p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all duration-200 group relative",
                                            assessmentStatus === 'rejected' ? "border-gray-300 bg-white shadow-sm" : "border-gray-100 bg-white hover:border-gray-200"
                                        )}
                                        onClick={() => setAssessmentStatus('rejected')}
                                    >
                                        <div className={cn(
                                            "w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all",
                                            assessmentStatus === 'rejected' ? "border-red-600 bg-red-600" : "border-gray-200 bg-gray-50/10"
                                        )}>
                                            {assessmentStatus === 'rejected' && <div className="w-3 h-3 rounded-full bg-red-600" />}
                                        </div>
                                        <div className="flex items-center gap-2 flex-1">
                                            <div>
                                                <p className="font-bold text-[var(--text-headline)] text-[13px] leading-tight">Rejected</p>
                                                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Product fails quality standards</p>
                                            </div>
                                        </div>
                                    </div>

                                    {assessmentStatus === 'rejected' && (
                                        <div className="pl-6 space-y-2 animate-in slide-in-from-top-2 duration-200">
                                            <p className="text-[11px] text-[var(--text-muted)] italic">Explain why the product is being rejected.</p>
                                            <div className="space-y-1.5">
                                                <Label className="text-[12px] text-[var(--text-headline)] font-semibold">Rejection Reason <span className="text-red-500">*</span></Label>
                                                <Textarea
                                                    value={rejectionReason}
                                                    onChange={(e) => setRejectionReason(e.target.value)}
                                                    placeholder="Enter rejection reason..."
                                                    className="bg-white border-gray-200 rounded-xl min-h-[60px] text-xs shadow-sm focus:border-[#dc2626] transition-colors"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 z-40 px-8 py-4 bg-white/95 backdrop-blur-md border-t border-gray-200 flex justify-between items-center">
                <Button
                    variant="outline"
                    className="h-10 border-0 bg-base hover:bg-base hover:text-[var(--brand-primary)] text-sm text-gray-600 transition-all"
                    onClick={onCloseForm}
                >
                    <ChevronLeft className='h-4 w-4 -ml-8'></ChevronLeft> Close QA Form
                </Button>
                <Button
                    className={cn(
                        "h-10 rounded-md text-sm text-white transition-all w-auto min-w-[120px]",
                        isSubmitDisabled ? "bg-gray-200 cursor-not-allowed text-gray-400" : "bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)]"
                    )}
                    disabled={isSubmitDisabled}
                    onClick={handleSubmit}
                >
                    Submit Report
                </Button>
            </div>
        </div>
    );
};

export default QAForm;
