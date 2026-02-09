import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, Gift, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useNavigate } from 'react-router-dom';

interface CreateRegistryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, category: string) => void;
}

export const CreateRegistryModal = ({ isOpen, onClose, onCreate }: CreateRegistryModalProps) => {
    const navigate = useNavigate();
    const [registryName, setRegistryName] = useState('');
    const [category, setCategory] = useState('');
    const [shareLink, setShareLink] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [products, setProducts] = useState<string[]>([]); // Placeholder for selected products

    // Generate share link based on registry name
    useEffect(() => {
        if (registryName) {
            const slug = registryName.toLowerCase().replace(/\s+/g, '-');
            setShareLink(`${window.location.origin}/registry/${slug}`);
        } else {
            setShareLink('');
        }
    }, [registryName]);

    const handleCopyLink = () => {
        if (shareLink) {
            navigator.clipboard.writeText(shareLink);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const handleCreate = () => {
        onCreate(registryName, category);
        // Reset form
        setRegistryName('');
        setCategory('');
        setProducts([]);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="w-full max-w-3xl bg-white rounded-2xl shadow-xl relative z-10 overflow-hidden max-h-[90vh] flex flex-col"
                    >
                        <div className="p-6 relative overflow-y-auto max-h-[calc(90vh)]">
                            <button
                                onClick={onClose}
                                className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>

                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Create New Registry</h2>
                                <p className="text-[var(--text-secondary)] text-sm mt-1">Start your wishlist for your special occasion.</p>
                            </div>

                            <div className="space-y-4">
                                {/* Registry Name Input */}
                                <div className="space-y-2">
                                    <Label htmlFor="registryName">Wishlist Name</Label>
                                    <Input
                                        id="registryName"
                                        placeholder="e.g., Sarah's Wedding, Baby Doe 2026"
                                        value={registryName}
                                        onChange={(e) => setRegistryName(e.target.value)}
                                        className="focus-visible:ring-[var(--brand-primary)]"
                                    />
                                </div>

                                {/* Category Dropdown */}
                                <div className="space-y-2">
                                    <Label>Gift Category</Label>
                                    <Select value={category} onValueChange={setCategory}>
                                        <SelectTrigger className="focus:ring-[var(--brand-primary)]">
                                            <SelectValue placeholder="Select an occasion" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="wedding">Wedding</SelectItem>
                                            <SelectItem value="baby">Baby Shower</SelectItem>
                                            <SelectItem value="birthday">Birthday</SelectItem>
                                            <SelectItem value="graduation">Graduation</SelectItem>
                                            <SelectItem value="housewarming">Housewarming</SelectItem>
                                            <SelectItem value="christmas">Christmas</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Products Section */}
                                <div className="space-y-3">
                                    <Label>Wishlist Products</Label>
                                    <div className="border border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-gray-50/50">
                                        <div className="p-4 bg-white rounded-full shadow-sm mb-3">
                                            <Gift className="w-6 h-6 text-[var(--brand-primary)]" />
                                        </div>
                                        {products.length === 0 ? (
                                            <>
                                                <p className="text-sm text-[var(--text-secondary)] font-medium">Your registry is empty</p>
                                                <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">Add products from the shop after creating your registry.</p>
                                                <Button
                                                    onClick={() => navigate('/shop')}
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-[var(--brand-primary)] border-[var(--brand-primary)]/30 hover:bg-[var(--brand-primary)]"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Browse Products
                                                </Button>
                                            </>
                                        ) : (
                                            <div className="w-full text-left">
                                                {/* Product list would go here */}
                                                <p>Length: {products.length}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Share Link Section */}
                                {registryName && (
                                    <div className="space-y-2 pt-2">
                                        <Label>Registry Link Preview</Label>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-gray-100 px-4 py-2 rounded-lg text-sm text-[var(--text-secondary)] font-mono truncate border border-gray-200">
                                                {shareLink || '...'}
                                            </div>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={handleCopyLink}
                                                className="shrink-0 text-[var(--text-muted)] hover:bg-[var(--brand-primary)]"
                                                title="Copy Link"
                                            >
                                                {isCopied ? <Check className="w-4 h-4 text-[var(--color-success)]" /> : <Copy className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end gap-3">
                                <Button variant="ghost" onClick={onClose} className="text-[var(--text-secondary)]">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreate}
                                    className="btn-primary"
                                    disabled={!registryName || !category}
                                >
                                    Create Registry
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
