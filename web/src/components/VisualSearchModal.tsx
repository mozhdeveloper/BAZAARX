import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ImagePlus, Search, Package, Tag, Link as LinkIcon, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { productService } from "@/services/productService";

interface VisualSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestProduct: () => void;
}

export default function VisualSearchModal({ isOpen, onClose, onRequestProduct }: VisualSearchModalProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState<any[]>([]);
  const [activeObjectIndex, setActiveObjectIndex] = useState<number | null>(null);

  const [hasSearched, setHasSearched] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [inputMode, setInputMode] = useState<'upload' | 'url'>('upload');
  const [imageUrlInput, setImageUrlInput] = useState("");

  // --- 1. PASTE LISTENER (Ctrl+V) ---
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isOpen || (e.target as HTMLElement).tagName === 'INPUT') return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setPreviewUrl(event.target?.result as string);
            reader.readAsDataURL(file);

            setInputMode('upload');
            handleVisualSearch(file);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  // --- 2. FILE UPLOAD HANDLER (Any Image Type) ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => setPreviewUrl(event.target?.result as string);
      reader.readAsDataURL(file);
      await handleVisualSearch(file);
    }
  };

  const handleVisualSearch = async (imageFile: File) => {
    setIsSearching(true);
    setHasSearched(false);
    setSearchError(null);
    setActiveObjectIndex(null); // Clear previous selection while loading

    try {
      const result = await productService.visualSearch(imageFile);
      setDetectedObjects(result.objects || []);
      setHasSearched(true);

      // AUTO-SELECT THE FIRST ITEM
      if (result.objects && result.objects.length > 0) {
        setActiveObjectIndex(0);
      }
    } catch (error) {
      setSearchError("Visual search failed. Please try again or use a different image.");
      setDetectedObjects([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  // --- 3. URL SEARCH HANDLER ---
  const handleUrlSearch = async () => {
    if (!imageUrlInput.trim()) {
      setSearchError("Please enter a valid image URL");
      return;
    }

    setIsSearching(true);
    setHasSearched(false);
    setSearchError(null);
    setActiveObjectIndex(null); // Clear previous selection while loading
    setPreviewUrl(imageUrlInput);

    try {
      const result = await productService.visualSearchByUrl(imageUrlInput);
      setDetectedObjects(result.objects || []);
      setHasSearched(true);

      // AUTO-SELECT THE FIRST ITEM
      if (result.objects && result.objects.length > 0) {
        setActiveObjectIndex(0);
      }
    } catch (error) {
      setSearchError("Visual search failed. Ensure the URL links directly to an image (.jpg/.png).");
      setDetectedObjects([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = () => {
    setPreviewUrl(null);
    setDetectedObjects([]);
    setHasSearched(false);
    setActiveObjectIndex(null);
    setSearchError(null);
    setImageUrlInput("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!isOpen) return null;

  const activeObject = activeObjectIndex !== null ? detectedObjects[activeObjectIndex] : null;
  const hasMatches = activeObject && activeObject.matches && activeObject.matches.length > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-bold">Visual Search</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {!previewUrl ? (
              // --- UPLOAD STATE ---
              <div className="max-w-2xl mx-auto mt-8">
                <div className="flex gap-2 mb-4 justify-center">
                  <Button variant={inputMode === 'upload' ? 'default' : 'outline'} onClick={() => setInputMode('upload')} className={inputMode === 'upload' ? 'bg-orange-500 hover:bg-orange-600' : ''}>
                    <ImagePlus className="w-4 h-4 mr-2" /> Upload Image
                  </Button>
                  <Button variant={inputMode === 'url' ? 'default' : 'outline'} onClick={() => setInputMode('url')} className={inputMode === 'url' ? 'bg-orange-500 hover:bg-orange-600' : ''}>
                    <LinkIcon className="w-4 h-4 mr-2" /> Paste URL
                  </Button>
                </div>

                {searchError && (
                  <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium border border-red-200">
                    {searchError}
                  </div>
                )}

                <Input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />

                {inputMode === 'upload' ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-64 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-orange-400 transition-all"
                  >
                    <div className="rounded-full bg-white p-4 shadow-sm"><ImagePlus className="h-8 w-8 text-gray-500" /></div>
                    <div className="text-center">
                      <p className="text-lg font-medium text-gray-700">Upload Product Image</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Click to browse, drag & drop, or <span className="font-bold text-orange-500">Ctrl+V</span> to paste
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-10">
                    <Input
                      type="url"
                      placeholder="Paste image URL here..."
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUrlSearch()}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleUrlSearch}
                      disabled={isSearching || !imageUrlInput.trim()}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search URL"}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              // --- RESULTS STATE ---
              <div className="flex flex-col md:flex-row gap-8">

                {/* LEFT SIDE: Image & Detected Item Tabs */}
                <div className="w-full md:w-1/2 flex flex-col items-center">
                  <div className="relative inline-block rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-50 max-w-full w-full">
                    {/* The Base Image (NO BOUNDING BOXES) */}
                    <img
                      src={previewUrl}
                      alt="Search preview"
                      className="w-full h-auto max-h-[400px] object-contain block mx-auto"
                    />

                    {/* Loading Overlay */}
                    {isSearching && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm z-50">
                        <div className="bg-white px-6 py-4 rounded-xl flex items-center gap-3">
                          <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                          <span className="font-semibold text-gray-800">Analyzing image...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* NEW: Clickable Tabs for Detected Objects instead of boxes */}
                  {!isSearching && hasSearched && detectedObjects.length > 0 && (
                    <div className="w-full mt-4">
                      <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider text-center">
                        Detected Items
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {detectedObjects.map((obj, index) => {
                          const isActive = activeObjectIndex === index;
                          return (
                            <button
                              key={index}
                              onClick={() => setActiveObjectIndex(index)}
                              className={cn(
                                "px-4 py-2 rounded-full text-sm font-bold transition-all capitalize",
                                isActive
                                  ? "bg-orange-500 text-white shadow-md"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              )}
                            >
                              {obj.object_label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <Button onClick={handleReset} variant="outline" className="mt-6 w-full max-w-[200px]">
                    <Search className="w-4 h-4 mr-2" /> Scan New Image
                  </Button>
                </div>

                {/* RIGHT SIDE: Dynamic Results */}
                <div className="w-full md:w-1/2">
                  {!hasSearched || isSearching ? null : activeObjectIndex === null ? (
                    // State: Nothing Selected (Failsafe)
                    <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                        <Tag className="w-8 h-8 text-orange-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">Select an Item</h3>
                      <p className="text-gray-500">Select one of the detected item tabs below the image to view similar products from our catalog.</p>
                    </div>
                  ) : hasMatches ? (
                    // State: Item Selected, Show Matches
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 capitalize">
                        <Package className="w-5 h-5 text-orange-500" /> Similar {activeObject.object_label}s
                      </h3>

                      <div className="grid grid-cols-2 gap-4 overflow-y-auto pr-2 max-h-[500px]">
                        {activeObject.matches.map((product: any) => (
                          <div
                            key={product.id}
                            onClick={() => { onClose(); navigate(`/product/${product.id}`); }}
                            className="bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-orange-400 hover:shadow-md transition-all"
                          >
                            <img src={product.primary_image_url || 'https://via.placeholder.com/200'} alt={product.name} className="w-full aspect-square object-cover bg-gray-100" />
                            <div className="p-3">
                              <h4 className="font-medium text-sm text-gray-900 line-clamp-2 mb-2">{product.name}</h4>
                              <p className="text-orange-600 font-bold">₱{(product.price || 0).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    // State: Item Selected, No Matches
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-gray-50 rounded-xl">
                      <Package className="w-12 h-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-bold text-gray-900 mb-2">No exact match</h3>
                      <p className="text-gray-500 mb-6">We couldn't find this {activeObject.object_label} in our catalog.</p>
                      <Button onClick={() => { onClose(); onRequestProduct(); }} className="bg-orange-500">
                        Request This Product
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}