import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Minus, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { RegistryProduct } from '../stores/buyerStore';

interface EditRegistryItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: RegistryProduct | null;
    onUpdate: (productId: string, updates: Partial<RegistryProduct>) => void;
    onRemove: (productId: string) => void;
}

export const EditRegistryItemModal = ({ isOpen, onClose, item, onUpdate, onRemove }: EditRegistryItemModalProps) => {
    const [requestedQty, setRequestedQty] = useState(1);
    const [note, setNote] = useState('');
    const [isMostWanted, setIsMostWanted] = useState(false);

    useEffect(() => {
        if (item) {
            setRequestedQty(item.requestedQty || 1);
            setNote(item.note || '');
            setIsMostWanted(item.isMostWanted || false);
        }
    }, [item]);

    if (!item) return null;

    const handleSave = () => {
        onUpdate(item.id, {
            requestedQty,
            note,
            isMostWanted
        });
        onClose();
    };

    const handleRemove = () => {
        onRemove(item.id);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="w-full max-w-4xl bg-white rounded-xl shadow-xl relative z-10 overflow-hidden max-h-[90vh] flex flex-col"
                    >
                        <button
                            onClick={onClose}
                            className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-20"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>

                        <div className="flex flex-col md:flex-row h-full overflow-y-auto">
                            {/* Product Image Section */}
                            <div className="w-full md:w-1/2 bg-white p-8 flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-100">
                                <div className="aspect-square w-full max-w-sm flex items-center justify-center">
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="max-h-full max-w-full object-contain"
                                    />
                                </div>
                            </div>

                            {/* Details & Form Section */}
                            <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col">
                                <div className="mb-6">
                                    <div className="text-sm text-gray-500 mb-1">
                                        {item.receivedQty || 0} of {requestedQty} purchased
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
                                        {item.name}
                                    </h2>
                                    <div className="flex items-center gap-2 mb-4">
                                        {/* Rating placeholder could go here */}
                                        <span className="text-yellow-500">★★★★☆</span>
                                        <span className="text-xs text-gray-400">(10273)</span>
                                    </div>
                                    <div className="text-2xl font-bold text-[var(--brand-primary)]">
                                        ₱{item.price}
                                        {item.originalPrice && (
                                            <span className="text-sm text-gray-400 line-through ml-2 font-normal">
                                                ₱{item.originalPrice}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Form Fields */}
                                <div className="space-y-6 flex-1">

                                    {/* Requested Qty */}
                                    <div className="space-y-2">
                                        <Label className="text-base font-semibold">Requested</Label>
                                        <div className="flex items-center border border-gray-300 rounded-md w-fit">
                                            <button
                                                onClick={() => setRequestedQty(Math.max(1, requestedQty - 1))}
                                                className="p-2 hover:bg-gray-100 text-gray-600"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <div className="w-12 text-center font-medium">{requestedQty}</div>
                                            <button
                                                onClick={() => setRequestedQty(requestedQty + 1)}
                                                className="p-2 hover:bg-gray-100 text-gray-600"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Comments */}
                                    <div className="space-y-2">
                                        <Label className="text-base font-semibold">Add comment</Label>
                                        <Textarea
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            placeholder="Leave a message for your guests to know why you want this gift!"
                                            className="resize-none h-24"
                                        />
                                    </div>

                                    {/* Options */}
                                    <div className="space-y-2">
                                        <Label className="text-base font-semibold">Gift options</Label>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="mostWanted"
                                                checked={isMostWanted}
                                                onCheckedChange={(checked) => setIsMostWanted(checked === true)}
                                            />
                                            <label
                                                htmlFor="mostWanted"
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                Prioritize as "Most Wanted"
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="mt-8 flex items-center justify-between pt-4 border-t border-gray-100">
                                    <Button
                                        variant="outline"
                                        onClick={handleRemove}
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 border-gray-200"
                                    >
                                        Remove from registry
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white font-semibold rounded-full px-8"
                                    >
                                        Save changes
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
