import React, { useState, useCallback } from "react";
import { X, FileText, Upload, Info, AlertCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (products: BulkProductData[]) => void;
}

export interface BulkProductData {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  stock: number;
  category: string;
  imageUrl: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

const VALID_CATEGORIES = [
  "Electronics",
  "Fashion",
  "Beauty",
  "Food",
  "Home & Living",
  "Sports",
  "Books",
  "Toys",
  "Accessories",
  "Others",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PRODUCTS = 100;

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [previewProducts, setPreviewProducts] = useState<BulkProductData[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const downloadTemplate = useCallback(() => {
    const csvContent = `name,description,price,originalPrice,stock,category,imageUrl
iPhone 15 Pro Max,Latest flagship smartphone with A17 Pro chip and titanium design,59999,65999,50,Electronics,https://images.unsplash.com/photo-1592286927505-2ad2049c4c26
Wireless Earbuds,Premium audio quality with active noise cancellation,2999,3499,100,Electronics,https://images.unsplash.com/photo-1590658268037-6bf12165a8df
Summer Floral Dress,Lightweight cotton dress perfect for warm weather,1299,,75,Fashion,https://images.unsplash.com/photo-1595777457583-95e059d581b8`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "product-upload-template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Template Downloaded",
      description: "CSV template has been downloaded successfully.",
    });
  }, [toast]);

  const isValidURL = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  };

  const validateCSV = useCallback(
    (
      data: Record<string, string>[]
    ): {
      valid: boolean;
      products: BulkProductData[];
      errors: ValidationError[];
    } => {
      const errors: ValidationError[] = [];
      const validProducts: BulkProductData[] = [];

      if (data.length === 0) {
        errors.push({ row: 0, field: "file", message: "CSV file is empty" });
        return { valid: false, products: [], errors };
      }

      if (data.length > MAX_PRODUCTS) {
        errors.push({
          row: 0,
          field: "file",
          message: `Maximum ${MAX_PRODUCTS} products allowed per upload`,
        });
        return { valid: false, products: [], errors };
      }

      const headers = Object.keys(data[0]);
      const requiredColumns = [
        "name",
        "description",
        "price",
        "stock",
        "category",
        "imageUrl",
      ];
      const missingColumns = requiredColumns.filter(
        (col) => !headers.includes(col)
      );

      if (missingColumns.length > 0) {
        errors.push({
          row: 0,
          field: "headers",
          message: `Missing required columns: ${missingColumns.join(", ")}`,
        });
        return { valid: false, products: [], errors };
      }

      data.forEach((row, index) => {
        const rowNumber = index + 2; // +2 for header row and 0-index

        // Validate name
        if (!row.name?.trim()) {
          errors.push({
            row: rowNumber,
            field: "name",
            message: "Product name is required",
          });
          return;
        }

        if (row.name.length > 100) {
          errors.push({
            row: rowNumber,
            field: "name",
            message: "Product name must be 100 characters or less",
          });
          return;
        }

        // Validate description
        if (!row.description?.trim()) {
          errors.push({
            row: rowNumber,
            field: "description",
            message: "Description is required",
          });
          return;
        }

        if (row.description.length > 500) {
          errors.push({
            row: rowNumber,
            field: "description",
            message: "Description must be 500 characters or less",
          });
          return;
        }

        // Validate price
        if (!row.price || isNaN(Number(row.price))) {
          errors.push({
            row: rowNumber,
            field: "price",
            message: "Invalid or missing price (must be a number)",
          });
          return;
        }

        const price = Number(row.price);
        if (price <= 0) {
          errors.push({
            row: rowNumber,
            field: "price",
            message: "Price must be greater than 0",
          });
          return;
        }

        // Validate original price (optional)
        let originalPrice: number | undefined;
        if (row.originalPrice && row.originalPrice.trim()) {
          if (isNaN(Number(row.originalPrice))) {
            errors.push({
              row: rowNumber,
              field: "originalPrice",
              message: "Original price must be a number",
            });
            return;
          }
          originalPrice = Number(row.originalPrice);
          if (originalPrice < price) {
            errors.push({
              row: rowNumber,
              field: "originalPrice",
              message: "Original price must be greater than or equal to price",
            });
            return;
          }
        }

        // Validate stock
        if (!row.stock || isNaN(Number(row.stock))) {
          errors.push({
            row: rowNumber,
            field: "stock",
            message: "Invalid or missing stock (must be a number)",
          });
          return;
        }

        const stock = Number(row.stock);
        if (stock < 0 || !Number.isInteger(stock)) {
          errors.push({
            row: rowNumber,
            field: "stock",
            message: "Stock must be a non-negative whole number",
          });
          return;
        }

        // Validate category
        if (!VALID_CATEGORIES.includes(row.category)) {
          errors.push({
            row: rowNumber,
            field: "category",
            message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(
              ", "
            )}`,
          });
          return;
        }

        // Validate image URL
        if (!row.imageUrl?.trim() || !isValidURL(row.imageUrl.trim())) {
          errors.push({
            row: rowNumber,
            field: "imageUrl",
            message:
              "Invalid or missing image URL (must start with http:// or https://)",
          });
          return;
        }

        // Valid product
        validProducts.push({
          name: row.name.trim(),
          description: row.description.trim(),
          price,
          originalPrice,
          stock,
          category: row.category,
          imageUrl: row.imageUrl.trim(),
        });
      });

      return {
        valid: errors.length === 0,
        products: validProducts,
        errors,
      };
    },
    []
  );

  const handleCSVUpload = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (!file) return;

      // Validate file type
      if (!file.name.endsWith(".csv")) {
        toast({
          title: "Invalid File",
          description: "Please upload a valid CSV file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File Too Large",
          description: "File size exceeds 5MB limit",
          variant: "destructive",
        });
        return;
      }

      setIsUploading(true);
      setUploadProgress(10);
      setErrors([]);

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setUploadProgress(50);

          const validation = validateCSV(
            results.data as Record<string, string>[]
          );

          setUploadProgress(75);

          if (!validation.valid) {
            setErrors(validation.errors);
            setIsUploading(false);
            setUploadProgress(0);
            toast({
              title: "Validation Failed",
              description: `Found ${validation.errors.length} error(s) in CSV file`,
              variant: "destructive",
            });
            return;
          }

          setUploadProgress(100);

          // Show preview instead of immediate upload
          setPreviewProducts(validation.products);
          setShowPreview(true);
          setIsUploading(false);
          setUploadProgress(0);

          toast({
            title: "Validation Successful!",
            description: `Ready to upload ${validation.products.length} product(s). Please review before confirming.`,
          });
        },
        error: (error) => {
          setIsUploading(false);
          setUploadProgress(0);
          toast({
            title: "Parse Error",
            description: `Failed to parse CSV file: ${error.message}`,
            variant: "destructive",
          });
        },
      });
    },
    [onUpload, onClose, toast, validateCSV]
  );

  const handleConfirmUpload = useCallback(() => {
    setIsUploading(true);
    setUploadProgress(25);

    setTimeout(() => {
      setUploadProgress(75);

      onUpload(previewProducts);

      setTimeout(() => {
        setUploadProgress(100);
        setIsUploading(false);
        setUploadProgress(0);
        setShowPreview(false);
        setPreviewProducts([]);

        toast({
          title: "Success!",
          description: `${previewProducts.length} product(s) uploaded to Quality Assurance`,
        });
        onClose();
      }, 300);
    }, 300);
  }, [previewProducts, onUpload, onClose, toast]);

  const handleBackToUpload = useCallback(() => {
    setShowPreview(false);
    setPreviewProducts([]);
    setErrors([]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
    onDrop: handleCSVUpload,
    disabled: isUploading || showPreview,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">
              Bulk Upload Products
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isUploading}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Preview Mode */}
          {showPreview ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={20} className="text-orange-600" />
                <h3 className="text-lg font-semibold">
                  Review Products ({previewProducts.length})
                </h3>
              </div>

              {/* Product Preview Table */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {previewProducts.map((product, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 hover:bg-orange-50 transition-colors"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Product Image */}
                      <div className="md:col-span-1">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-24 object-cover rounded-lg bg-gray-100"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://placehold.co/100?text=No+Image";
                          }}
                        />
                      </div>

                      {/* Product Details */}
                      <div className="md:col-span-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">
                              Name
                            </p>
                            <p className="text-sm font-medium text-gray-900 line-clamp-2">
                              {product.name}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">
                              Category
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                              {product.category}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">
                              Price
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-orange-600">
                                ₱{product.price.toLocaleString()}
                              </span>
                              {product.originalPrice && (
                                <>
                                  <span className="text-sm text-gray-400 line-through">
                                    ₱{product.originalPrice.toLocaleString()}
                                  </span>
                                  <span className="text-xs font-bold text-green-600">
                                    {Math.round(
                                      ((product.originalPrice - product.price) /
                                        product.originalPrice) *
                                        100
                                    )}
                                    % OFF
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">
                              Stock
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                              {product.stock} unit
                              {product.stock !== 1 ? "s" : ""}
                            </p>
                          </div>

                          <div className="sm:col-span-2">
                            <p className="text-xs text-gray-500 font-semibold uppercase">
                              Description
                            </p>
                            <p className="text-sm text-gray-700 line-clamp-2">
                              {product.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={handleBackToUpload}
                  variant="outline"
                  className="flex-1 rounded-xl"
                  disabled={isUploading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfirmUpload}
                  disabled={isUploading}
                  className="flex-1 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Confirm & Upload
                    </>
                  )}
                </Button>
              </div>

              {/* Progress Bar */}
              {isUploading && (
                <div className="mt-4">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-sm text-gray-600 text-center mt-2">
                    {uploadProgress}% - Processing upload...
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* CSV Format Instructions */}
              {showHelp && (
                <div className="bg-gray-50 border border-orange-200 rounded-xl p-5 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={20} className="text-orange-600" />
                    <h3 className="text-lg font-semibold">
                      CSV Format Requirements
                    </h3>
                  </div>
                  <div className="space-y-3 text-sm text-gray-700">
                    <div>
                      <p className="font-semibold mb-1">
                        Required Columns (in order):
                      </p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>
                          <strong>name</strong> - Product name (max 100 chars)
                        </li>
                        <li>
                          <strong>description</strong> - Product description
                          (max 500 chars)
                        </li>
                        <li>
                          <strong>price</strong> - Selling price (number only,
                          no ₱ symbol)
                        </li>
                        <li>
                          <strong>originalPrice</strong> - Original price
                          (optional, for discounts)
                        </li>
                        <li>
                          <strong>stock</strong> - Available quantity (whole
                          number)
                        </li>
                        <li>
                          <strong>category</strong> - One of:{" "}
                          {VALID_CATEGORIES.join(", ")}
                        </li>
                        <li>
                          <strong>imageUrl</strong> - Full HTTP/HTTPS image URL
                        </li>
                      </ol>
                    </div>
                    <div className="bg-gray-100 p-3 rounded font-mono text-xs overflow-x-auto">
                      <div>
                        name,description,price,originalPrice,stock,category,imageUrl
                      </div>
                      <div>
                        iPhone 15,Latest
                        flagship,59999,65999,50,Electronics,https://...
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">
                      <p>• Maximum {MAX_PRODUCTS} products per upload</p>
                      <p>• Maximum file size: 5MB</p>
                      <p>
                        • All products will go to Quality Assurance for review
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Help Toggle Button */}
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 mb-3 bg-gray-100 text-orange-600 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                <Info size={16} />
                <span>{showHelp ? "Hide" : "Show"} CSV Format Help</span>
              </button>

              {/* Download Template Button */}
              <Button
                onClick={downloadTemplate}
                variant="outline"
                className="w-full flex items-center justify-center gap-3 px-6 py-4 h-auto border-2 border-orange-600 text-orange-600 font-bold rounded-xl hover:bg-orange-50 mb-3"
                disabled={isUploading}
              >
                <FileText size={20} />
                <span>Download CSV Template</span>
              </Button>

              {/* Upload Button / Dropzone */}
              <div
                {...getRootProps()}
                className={`w-full flex flex-col items-center justify-center gap-3 px-6 py-8 bg-orange-600 text-white font-bold rounded-xl cursor-pointer hover:bg-orange-700 transition-colors mb-3 ${
                  isDragActive ? "bg-orange-500 ring-4 ring-orange-300" : ""
                } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <input {...getInputProps()} />
                <Upload size={32} />
                <span className="text-center">
                  {isDragActive
                    ? "Drop CSV file here"
                    : isUploading
                    ? "Uploading..."
                    : "Select CSV File or Drag & Drop"}
                </span>
                {!isUploading && (
                  <span className="text-sm font-normal opacity-90">
                    CSV files only, max 5MB
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              {isUploading && (
                <div className="mb-4">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-sm text-gray-600 text-center mt-2">
                    {uploadProgress}% - Processing your file...
                  </p>
                </div>
              )}

              {/* Errors Display */}
              {errors.length > 0 && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-2">
                      Found {errors.length} error(s):
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                      {errors.slice(0, 10).map((error, index) => (
                        <div key={index}>
                          <strong>Row {error.row}</strong> ({error.field}):{" "}
                          {error.message}
                        </div>
                      ))}
                      {errors.length > 10 && (
                        <div className="text-xs italic mt-2">
                          ... and {errors.length - 10} more error(s)
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Info Alert */}
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-gray-700">
                  All uploaded products will be sent to{" "}
                  <strong>Quality Assurance</strong> for admin review before
                  going live. You'll be notified once reviewed.
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
