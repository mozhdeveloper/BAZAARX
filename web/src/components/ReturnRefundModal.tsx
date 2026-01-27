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
            <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-8 sm:pt-12 md:pt-16">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-4xl bg-gray-50 rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col md:flex-row"
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

                    {/* Scrollable Content Container */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar md:grid md:grid-cols-12">

                        {/* Left Column (Desktop) - Reason */}
                        <div className="p-4 sm:p-6 md:col-span-5 md:bg-white md:border-r border-gray-100 space-y-6">
                            <div className="hidden md:flex flex-col items-start gap-4 mb-6">
                                <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 -ml-2">
                                    <ChevronLeft className="w-5 h-5 mr-1" />
                                    Back
                                </Button>
                                <h2 className="text-2xl font-bold text-[#FF6a00] tracking-wide">Return / Refund</h2>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Reason for Return</h3>
                                <div className="space-y-2 md:space-y-4">
                                    {reasons.map((r) => (
                                        <label key={r.id} className={cn(
                                            "flex items-start gap-3 cursor-pointer group p-3 rounded-xl transition-all border",
                                            reason === r.id ? "bg-orange-50 border-[#FF6a00]/30" : "bg-white border-transparent hover:bg-gray-50"
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
                                                <div className="w-5 h-5 border-2 border-gray-300 rounded-full peer-checked:border-[#FF6a00] peer-checked:border-4 transition-all"></div>
                                            </div>
                                            <div>
                                                <span className={cn("block text-sm font-medium transition-colors", reason === r.id ? "text-[#FF6a00]" : "text-gray-700")}>
                                                    {r.label}
                                                </span>
                                                <span className="block text-xs text-gray-500 mt-0.5">{r.description}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Column (Desktop) - Details */}
                        <div className="p-4 sm:p-6 md:col-span-7 space-y-6 bg-gray-50/50">
                            {/* Preferred Solution Section */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Preferred Solution</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {solutions.map((s) => (
                                        <label key={s.id} className={cn(
                                            "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all bg-white shadow-sm",
                                            solution === s.id ? "ring-1 ring-[#FF6a00] border-[#FF6a00]" : "border-gray-100 hover:border-gray-200"
                                        )}>
                                            <div>
                                                <span className={cn("block text-sm font-semibold", solution === s.id ? "text-[#FF6a00]" : "text-gray-800")}>
                                                    {s.label}
                                                </span>
                                                <span className="block text-xs text-gray-500">{s.description}</span>
                                            </div>
                                            <div className="relative flex items-center ml-4">
                                                <input
                                                    type="radio"
                                                    name="solution"
                                                    value={s.id}
                                                    checked={solution === s.id}
                                                    onChange={(e) => setSolution(e.target.value)}
                                                    className="peer sr-only"
                                                />
                                                <div className="w-5 h-5 border-2 border-gray-300 rounded-full peer-checked:border-[#FF6a00] peer-checked:border-[5px] transition-all"></div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Additional Comments */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wider">Additional Comments</h3>
                                <textarea
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                    placeholder="Please describe the defect or issue in detail..."
                                    className="w-full text-sm p-2 rounded-xl border-gray-200 bg-white shadow-sm focus:border-[#FF6a00] focus:ring-[#FF6a00] resize-none h-12"
                                />
                            </div>

                            {/* Evidence */}
                            {/* Evidence */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-3 -mt-2 uppercase tracking-wider">Evidence (Photos/Videos)</h3>
                                <div className="flex flex-wrap gap-3">
                                    {files.map((file, index) => (
                                        <div key={index} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt={`evidence-${index}`}
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                onClick={() => removeFile(index)}
                                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-[#FF6a00] hover:text-[#FF6a00] hover:bg-orange-50 transition-all bg-white cursor-pointer">
                                        <Upload className="w-6 h-6 mb-1" />
                                        <span className="text-xs font-medium">Add Photo</span>
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

                            {/* Footer for Desktop (inside scrollable area to ensure it's always accessible or sticky) */}
                            <div className="pt-4 border-t border-gray-200 mt-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-gray-600 font-medium">Refund Amount:</span>
                                    <span className="text-[#FF6a00] font-bold text-lg">
                                        {solution === 'replacement' ? formatCurrency(0) : formatCurrency(order?.total || 0)}
                                    </span>
                                </div>
                                <Button onClick={handleSubmit} className="w-full bg-[#FF6a00] hover:bg-[#e65100] text-white py-6 rounded-xl font-bold text-lg shadow-orange-200 shadow-lg">
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
