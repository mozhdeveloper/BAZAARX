import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { X, Upload, Camera, ChevronLeft, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';

interface ReturnRefundModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    order: any;
}

export default function ReturnRefundModal({ isOpen, onClose, onSubmit, order }: ReturnRefundModalProps) {
    const [reason, setReason] = useState('other');
    const [solution, setSolution] = useState('return_refund');
    const [comments, setComments] = useState('');
    const [files, setFiles] = useState<File[]>([]);

    const reasons = [
        { id: 'damaged', label: 'Damaged Item', description: 'Item arrived damaged or broken' },
        { id: 'wrong_item', label: 'Wrong Item Received', description: 'Received item different from what was ordered' },
        { id: 'missing_parts', label: 'Missing Accessories', description: 'Package is missing parts or accessories' },
        { id: 'not_as_described', label: 'Doesn\'t match description', description: 'Item does not match the product description' },
        { id: 'other', label: 'Other', description: 'Any other reason not listed above' },
    ];

    const solutions = [
        { id: 'return_refund', label: 'Return & Refund', description: 'Return item(s) and get money back' },
        { id: 'replacement', label: 'Replacement', description: 'Receive a new item as replacement' },
        { id: 'refund_only', label: 'Refund Only', description: 'Keep item(s) and get money back' },
    ];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setFiles((prev) => [...prev, ...newFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = () => {
        const data = {
            orderId: order?.id,
            reason,
            solution,
            comments,
            files,
            refundAmount: solution === 'replacement' ? 0 : order?.total
        };
        onSubmit(data);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-24 md:pt-32">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-5xl bg-gray-50 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[85vh]"
                >
                    {/* Header - Full width on mobile, hidden on desktop */}
                    <div className="md:hidden bg-[#FF6a00] px-4 py-3 sm:px-6 flex items-center justify-between shadow-md shrink-0">
                        <div className="flex items-center text-white gap-2">
                            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 h-8 w-8 -ml-2 rounded-full">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <h2 className="text-lg font-bold text-white tracking-wide">Return / Refund</h2>
                        </div>
                    </div>

                    {/* Left Column (Desktop) - Reason */}
                    <div className="hidden md:flex md:w-4/12 flex-col bg-white border-r border-gray-100 overflow-y-auto custom-scrollbar">
                        <div className="p-5 pb-0">
                            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 -ml-2 mb-4">
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Back
                            </Button>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Return Request</h2>
                                <p className="text-xs text-gray-500 mt-1">Select a reason and provide details.</p>
                            </div>
                        </div>

                        <div className="p-5 pt-4">
                            <h3 className="text-xs font-bold text-gray-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-[#FF6a00] text-[10px]">1</span>
                                Reason for Return
                            </h3>
                            <div className="space-y-2">
                                {reasons.map((r) => (
                                    <div key={r.id} className="group">
                                        <label className={cn(
                                            "flex items-start gap-3 cursor-pointer p-2 rounded-lg transition-all border shadow-sm",
                                            reason === r.id ? "bg-orange-50 border-[#FF6a00] ring-1 ring-[#FF6a00]/20" : "bg-white border-gray-200 hover:border-orange-200 hover:shadow-md"
                                        )}>
                                            <div className="relative flex items-center mt-0.5">
                                                <input
                                                    type="radio"
                                                    name="reason"
                                                    value={r.id}
                                                    checked={reason === r.id}
                                                    onChange={(e) => setReason(e.target.value)}
                                                    className="peer sr-only"
                                                />
                                                <div className="w-4 h-4 border-2 border-gray-300 rounded-full peer-checked:border-[#FF6a00] peer-checked:border-[3px] transition-all"></div>
                                            </div>
                                            <div className="flex-1">
                                                <span className={cn("block text-sm font-semibold transition-colors leading-tight", reason === r.id ? "text-[#FF6a00]" : "text-gray-900")}>
                                                    {r.label}
                                                </span>
                                                <span className="block text-[10px] text-gray-500 mt-0.5 leading-tight">{r.description}</span>
                                            </div>
                                        </label>
                                        
                                        {/* Show input if this is 'other' and it's selected */}
                                        {r.id === 'other' && reason === 'other' && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                                                className="pl-8 pr-2 pb-2"
                                            >
                                                <div className="relative">
                                                     <textarea 
                                                        placeholder="Please describe the reason..."
                                                        className="w-full text-xs p-3 rounded-xl border-orange-200 bg-white focus:border-[#FF6a00] focus:ring-1 focus:ring-[#FF6a00] transition-all min-h-[60px] resize-none shadow-sm text-gray-700"
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column (Desktop) - Details */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50">
                        {/* Scrollable Form Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                            
                            {/* Mobile Reason Section (visible only on mobile) */}
                            <div className="md:hidden">
                                <h3 className="text-xs font-bold text-gray-900 mb-2 uppercase tracking-wider flex items-center gap-2">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-[#FF6a00] text-[10px]">1</span>
                                    Reason for Return
                                </h3>
                                <div className="space-y-2">
                                    {reasons.map((r) => (
                                        <label key={r.id} className={cn(
                                            "flex items-start gap-3 cursor-pointer group p-2 rounded-lg transition-all border shadow-sm",
                                            reason === r.id ? "bg-orange-50 border-[#FF6a00] ring-1 ring-[#FF6a00]/20" : "bg-white border-gray-200 hover:border-orange-200 hover:shadow-md"
                                        )}>
                                            <div className="relative flex items-center mt-0.5">
                                                <input
                                                    type="radio"
                                                    name="reason"
                                                    value={r.id}
                                                    checked={reason === r.id}
                                                    onChange={(e) => setReason(e.target.value)}
                                                    className="peer sr-only"
                                                />
                                                <div className="w-4 h-4 border-2 border-gray-300 rounded-full peer-checked:border-[#FF6a00] peer-checked:border-[3px] transition-all"></div>
                                            </div>
                                            <div>
                                                <span className={cn("block text-sm font-semibold transition-colors", reason === r.id ? "text-[#FF6a00]" : "text-gray-900")}>
                                                    {r.label}
                                                </span>
                                                <span className="block text-[10px] text-gray-500 mt-0.5 leading-tight">{r.description}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        
                            {/* Section 2: Solution */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="text-xs font-bold text-gray-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-[#FF6a00] text-[10px]">2</span>
                                    Preferred Solution
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {solutions.map((s) => (
                                        <label key={s.id} className={cn(
                                            "flex flex-col p-3 rounded-lg border cursor-pointer transition-all bg-white relative overflow-hidden",
                                            solution === s.id ? "border-[#FF6a00] bg-orange-50/30" : "border-gray-200 hover:border-gray-300"
                                        )}>
                                            <div className="flex justify-between items-start mb-1.5">
                                                <div className={cn("w-4 h-4 border-2 border-gray-300 rounded-full transition-all flex items-center justify-center", solution === s.id && "border-[#FF6a00]")}>
                                                     {solution === s.id && <div className="w-2 h-2 bg-[#FF6a00] rounded-full" />}
                                                </div>
                                                <input
                                                    type="radio"
                                                    name="solution"
                                                    value={s.id}
                                                    checked={solution === s.id}
                                                    onChange={(e) => setSolution(e.target.value)}
                                                    className="peer sr-only"
                                                />
                                            </div>
                                            <div>
                                                <span className={cn("block text-sm font-bold mb-0.5", solution === s.id ? "text-[#FF6a00]" : "text-gray-900")}>
                                                    {s.label}
                                                </span>
                                                <span className="block text-[10px] text-gray-500 leading-tight">{s.description}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Section 3: Evidence & Comments */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
                                <div>
                                    <h3 className="text-xs font-bold text-gray-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-[#FF6a00] text-[10px]">3</span>
                                        Additional Details
                                    </h3>
                                    
                                    <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Description / Comments</label>
                                    <textarea
                                        value={comments}
                                        onChange={(e) => setComments(e.target.value)}
                                        placeholder="Describe the issue..."
                                        className="w-full text-sm p-2.5 rounded-lg border-gray-200 bg-gray-50 focus:bg-white focus:border-[#FF6a00] focus:ring-[#FF6a00] min-h-[60px] resize-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">Evidence (Photos/Videos)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {files.map((file, index) => (
                                            <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 shadow-sm group">
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt={`evidence-${index}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    onClick={() => removeFile(index)}
                                                    className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <label className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-[#FF6a00] hover:text-[#FF6a00] hover:bg-orange-50 transition-all bg-gray-50 cursor-pointer">
                                            <Camera className="w-4 h-4 mb-0.5" />
                                            <span className="text-[9px] font-medium">Add</span>
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleFileChange}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sticky Footer */}
                        <div className="p-4 bg-white border-t border-gray-200 shrink-0">
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <span className="text-gray-600 text-[10px] font-medium uppercase tracking-wide">Refund Amount</span>
                                </div>
                                <span className="text-[#FF6a00] font-bold text-xl">
                                    {solution === 'replacement' ? formatCurrency(0) : formatCurrency(order?.total || 0)}
                                </span>
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={onClose} className="flex-1 py-4 h-auto rounded-xl border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-sm">
                                    Cancel
                                </Button>
                                <Button onClick={handleSubmit} className="flex-[2] bg-[#FF6a00] hover:bg-[#e65100] text-white py-4 h-auto rounded-xl font-bold text-base shadow-orange-200 shadow-lg transition-all hover:scale-[1.01]">
                                    Submit Request
                                </Button>
                            </div>
                        </div>
                    </div>

                </motion.div>
            </div>
        </AnimatePresence>
    );
}
