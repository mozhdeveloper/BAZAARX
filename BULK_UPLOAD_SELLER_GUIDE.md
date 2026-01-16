![alt text](image.png)# Bulk Product Upload Guide for Sellers

## Overview
The bulk upload feature allows sellers to add multiple products at once using a CSV (Comma-Separated Values) file, saving time and effort compared to adding products one by one.

## CSV Format Requirements

### Required Columns
Your CSV file **must** include these columns in the exact order:
1. `name` - Product name
2. `description` - Product description
3. `price` - Selling price in pesos (₱)
4. `originalPrice` - Original price before discount (optional)
5. `stock` - Available quantity
6. `category` - Product category
7. `imageUrl` - Product image URL

### Column Details

#### 1. Name (Required)
- **Format**: Plain text
- **Max Length**: 100 characters
- **Example**: `iPhone 15 Pro Max`
- **Tips**: Use clear, descriptive names that buyers will search for

#### 2. Description (Required)
- **Format**: Plain text
- **Max Length**: 500 characters
- **Example**: `Latest flagship smartphone with A17 Pro chip and titanium design`
- **Tips**: Include key features, specifications, and benefits

#### 3. Price (Required)
- **Format**: Number only (no ₱ symbol or commas)
- **Example**: `59999` (for ₱59,999)
- **Tips**: Use whole numbers for pesos

#### 4. Original Price (Optional)
- **Format**: Number only (no ₱ symbol or commas)
- **Example**: `65999` (for ₱65,999)
- **Tips**: Leave empty if no discount, otherwise shows discount percentage
- **Empty Example**: `iPhone 15,Smartphone,59999,,50,Electronics,https://...`

#### 5. Stock (Required)
- **Format**: Whole number
- **Example**: `50`
- **Tips**: Ensure accurate stock counts to avoid overselling

#### 6. Category (Required)
- **Format**: Must be exactly one of these categories (case-sensitive):
  - `Electronics`
  - `Fashion`
  - `Beauty`
  - `Food`
  - `Home & Living`
  - `Sports`
  - `Books`
  - `Toys`
  - `Accessories`
  - `Others`
- **Example**: `Electronics`
- **Tips**: Choose the most relevant category for better product discovery

#### 7. Image URL (Required)
- **Format**: Full HTTP/HTTPS URL
- **Example**: `https://example.com/product-image.jpg`
- **Supported Formats**: JPG, JPEG, PNG, WEBP
- **Tips**: 
  - Use high-quality images (minimum 800x800px recommended)
  - Ensure URLs are publicly accessible
  - Use image hosting services like Imgur, Cloudinary, or your own server
  - Test the URL in a browser before uploading

## How to Create Your CSV File

### Option 1: Microsoft Excel or Google Sheets
1. Open Excel or Google Sheets
2. Create columns with these exact headers: `name,description,price,originalPrice,stock,category,imageUrl`
3. Fill in your product data row by row
4. Save as CSV:
   - **Excel**: File > Save As > Choose "CSV (Comma delimited)"
   - **Google Sheets**: File > Download > Comma-separated values (.csv)

### Option 2: Use the Template
1. Download `product-upload-template.csv` from the seller portal
2. Open in Excel or Google Sheets
3. Replace the sample data with your products
4. Keep the header row unchanged
5. Save as CSV

## CSV File Example

```csv
name,description,price,originalPrice,stock,category,imageUrl
iPhone 15 Pro Max,Latest flagship smartphone,59999,65999,50,Electronics,https://example.com/iphone.jpg
Wireless Earbuds,Premium audio quality,2999,3499,100,Electronics,https://example.com/earbuds.jpg
Summer Dress,Floral print casual dress,1299,,75,Fashion,https://example.com/dress.jpg
```

## Important Rules

### Formatting
- ✅ Use commas (`,`) to separate columns
- ✅ Keep the header row exactly as specified
- ✅ No extra spaces before or after values
- ❌ Don't use commas within descriptions (causes parsing errors)
- ❌ Don't include currency symbols (₱, $)
- ❌ Don't use thousand separators (59,999 should be 59999)

### Special Characters
- If your description contains commas, wrap it in quotes:
  ```csv
  "Premium phone, latest model, 5G enabled"
  ```
- Avoid using quotation marks if possible

### File Size
- Maximum file size: 5MB
- Maximum products per upload: 100
- For larger catalogs, split into multiple files

## How to Upload

1. **Prepare Your CSV File**
   - Create your CSV following the format above
   - Double-check all required fields are filled
   - Verify category names match exactly

2. **Access Bulk Upload**
   - Open the BazaarX Seller App
   - Go to Products tab
   - Tap the Upload icon (📤) in the header
   - Or tap "Bulk Upload" button

3. **Select Your File**
   - Tap "Select CSV File"
   - Choose your prepared CSV file from your device
   - The app will validate the format

4. **Review and Confirm**
   - Check the preview of products to be uploaded
   - Verify all data looks correct
   - Tap "Upload Products"

5. **Wait for Processing**
   - Products will be uploaded to Quality Assurance
   - You'll receive a confirmation notification
   - Check QA Products tab to track approval status

## Common Errors and Solutions

### Error: "Invalid CSV Format"
- **Cause**: Missing required columns or incorrect column order
- **Solution**: Ensure header row matches exactly: `name,description,price,originalPrice,stock,category,imageUrl`

### Error: "Invalid Category"
- **Cause**: Category name doesn't match allowed categories
- **Solution**: Use one of: Electronics, Fashion, Beauty, Food, Home & Living, Sports, Books, Toys, Accessories, Others

### Error: "Invalid Price Format"
- **Cause**: Price contains non-numeric characters
- **Solution**: Remove ₱ symbols, commas, or decimals (use whole numbers)

### Error: "Missing Required Field"
- **Cause**: Empty value in required column (name, description, price, stock, category, imageUrl)
- **Solution**: Fill in all required fields for each product

### Error: "Image URL Not Accessible"
- **Cause**: Image URL is broken or requires authentication
- **Solution**: Test URL in browser, ensure it's publicly accessible

## Quality Assurance Process

After bulk upload:
1. All products enter **Quality Assurance** review
2. Admin team reviews:
   - Product authenticity
   - Image quality
   - Description accuracy
   - Pricing reasonableness
   - Category appropriateness
3. You'll be notified via:
   - In-app notification
   - Email (if enabled)
4. Track status in **QA Products** tab:
   - 🟡 Pending Review
   - ✅ Approved (goes live)
   - ❌ Rejected (with reason)

## Tips for Faster Approval

✅ **High-Quality Images**
- Use clear, well-lit product photos
- Minimum 800x800px resolution
- Show product from multiple angles
- Avoid watermarks

✅ **Accurate Descriptions**
- Be honest about product condition
- Include dimensions, materials, specs
- Highlight key features
- Avoid exaggerated claims

✅ **Fair Pricing**
- Research competitor prices
- Ensure prices match market rates
- If using originalPrice, make discount realistic

✅ **Proper Categorization**
- Choose the most specific category
- Don't use "Others" unless necessary
- Helps buyers find your products

## Need Help?

### Resources
- **CSV Template**: Download from seller portal
- **Video Tutorial**: [Link to video guide]
- **Help Center**: Access from app settings

### Contact Support
- **Email**: seller-support@bazaarx.com
- **Live Chat**: Available in app (Mon-Fri 9AM-6PM)
- **Phone**: +63 xxx-xxxx (Business hours)

### FAQ
**Q: Can I update products via bulk upload?**
A: Currently, bulk upload only adds new products. Use the Edit button for existing products.

**Q: What happens if some rows have errors?**
A: Valid products will be uploaded, errors will be reported with row numbers.

**Q: Can I upload the same product multiple times?**
A: Yes, but they'll be treated as separate listings. Check existing products first.

**Q: How long does QA approval take?**
A: Typically 24-48 hours. Complex products may take up to 5 business days.

**Q: Can I edit products while in QA?**
A: No, wait for approval. If rejected, you can resubmit with corrections.

---

**Last Updated**: January 2025
**Version**: 1.0

---

## For Developers: Web Implementation Guide

This section provides implementation details for creating the web version of the Bulk Upload feature.

### Technology Stack (Recommended)

**Frontend:**
- React with TypeScript
- TailwindCSS for styling (matching mobile design)
- React Hook Form for form handling
- Papa Parse for CSV parsing
- React Dropzone for file upload UI

**Backend:**
- Node.js/Express API endpoint
- Multer for file upload handling
- CSV parsing library
- Database: PostgreSQL/MongoDB for product storage

### UI Components Needed

#### 1. Bulk Upload Modal
```typescript
// Modal Structure
<Modal>
  <ModalHeader>
    <h2>Bulk Upload Products</h2>
    <CloseButton />
  </ModalHeader>
  
  <ModalBody>
    <CSVInstructionsCard />
    <DownloadTemplateButton />
    <FileUploadDropzone />
    <UploadButton />
    <HelpButton />
  </ModalBody>
</Modal>
```

#### 2. CSV Instructions Card
Display the format requirements with:
- Icon: FileText (lucide-react)
- Background: Light gray (#F9FAFB)
- Border: Orange accent (#FF5722)
- List all 7 required columns
- Show example row
- Display valid categories

#### 3. Download Template Button
```typescript
const downloadCSVTemplate = () => {
  const csvContent = `name,description,price,originalPrice,stock,category,imageUrl
Sample Product,This is a sample product description,999,1299,100,Electronics,https://example.com/image.jpg
`;
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', 'product-upload-template.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
```

**Button Styling:**
- Background: White (#FFFFFF)
- Border: 2px solid #FF5722
- Text Color: #FF5722
- Icon: FileText from lucide-react
- Padding: 16px vertical, 24px horizontal
- Border Radius: 14px
- Font Weight: 700 (bold)
- Margin Bottom: 12px

#### 4. File Upload Dropzone
Use `react-dropzone` for drag-and-drop functionality:

```typescript
import { useDropzone } from 'react-dropzone';

const { getRootProps, getInputProps, isDragActive } = useDropzone({
  accept: {
    'text/csv': ['.csv'],
  },
  maxFiles: 1,
  onDrop: (acceptedFiles) => {
    handleCSVUpload(acceptedFiles[0]);
  },
});
```

**Dropzone Styling:**
- Background: Orange (#FF5722)
- Text: White (#FFFFFF)
- Icon: Upload from lucide-react
- Padding: 16px vertical
- Border Radius: 14px
- Font Weight: 700
- Margin Bottom: 12px
- Hover: Slightly darker orange
- Drag Active: Light orange overlay

#### 5. CSV Parsing Implementation

```typescript
import Papa from 'papaparse';

const handleCSVUpload = (file: File) => {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      validateAndProcessCSV(results.data);
    },
    error: (error) => {
      showError('Failed to parse CSV file: ' + error.message);
    },
  });
};

const validateAndProcessCSV = (data: any[]) => {
  const requiredColumns = ['name', 'description', 'price', 'stock', 'category', 'imageUrl'];
  const validCategories = ['Electronics', 'Fashion', 'Beauty', 'Food', 'Home & Living', 'Sports', 'Books', 'Toys', 'Accessories', 'Others'];
  
  // Validate headers
  if (data.length === 0) {
    showError('CSV file is empty');
    return;
  }
  
  const headers = Object.keys(data[0]);
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));
  
  if (missingColumns.length > 0) {
    showError(`Missing required columns: ${missingColumns.join(', ')}`);
    return;
  }
  
  // Validate each row
  const errors: string[] = [];
  const validProducts: any[] = [];
  
  data.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because of header row and 0-index
    
    // Check required fields
    if (!row.name?.trim()) {
      errors.push(`Row ${rowNumber}: Missing product name`);
      return;
    }
    
    if (!row.description?.trim()) {
      errors.push(`Row ${rowNumber}: Missing description`);
      return;
    }
    
    if (!row.price || isNaN(Number(row.price))) {
      errors.push(`Row ${rowNumber}: Invalid or missing price`);
      return;
    }
    
    if (!row.stock || isNaN(Number(row.stock))) {
      errors.push(`Row ${rowNumber}: Invalid or missing stock`);
      return;
    }
    
    if (!validCategories.includes(row.category)) {
      errors.push(`Row ${rowNumber}: Invalid category "${row.category}"`);
      return;
    }
    
    if (!row.imageUrl?.trim() || !isValidURL(row.imageUrl)) {
      errors.push(`Row ${rowNumber}: Invalid or missing image URL`);
      return;
    }
    
    // Valid product
    validProducts.push({
      name: row.name.trim(),
      description: row.description.trim(),
      price: Number(row.price),
      originalPrice: row.originalPrice ? Number(row.originalPrice) : null,
      stock: Number(row.stock),
      category: row.category,
      imageUrl: row.imageUrl.trim(),
    });
  });
  
  if (errors.length > 0) {
    showError(`Found ${errors.length} errors:\n${errors.slice(0, 5).join('\n')}`);
    return;
  }
  
  // Send to API
  uploadProducts(validProducts);
};

const isValidURL = (url: string): boolean => {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
};
```

### API Endpoint Structure

#### POST /api/seller/products/bulk-upload

**Request:**
```typescript
{
  sellerId: string;
  products: Array<{
    name: string;
    description: string;
    price: number;
    originalPrice?: number;
    stock: number;
    category: string;
    imageUrl: string;
  }>;
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  data: {
    uploaded: number;
    total: number;
    productIds: string[];
  };
  errors?: Array<{
    row: number;
    message: string;
  }>;
}
```

### Design Specifications

**Colors:**
- Primary Orange: #FF5722
- Light Orange: #FFF7ED
- Dark Orange: #EA580C
- Gray Background: #F9FAFB
- Border Gray: #E5E7EB
- Text Dark: #111827
- Text Gray: #6B7280

**Typography:**
- Modal Title: 24px, Bold (font-weight: 700)
- Section Headers: 16px, Semi-bold (font-weight: 600)
- Body Text: 14px, Regular (font-weight: 400)
- Button Text: 15px, Bold (font-weight: 700)
- Code/Example: Monospace font, 12px

**Spacing:**
- Modal Padding: 24px
- Button Margin: 12px bottom
- Card Padding: 20px
- Gap between sections: 16px

**Responsive Design:**
- Mobile (<640px): Full-screen modal, single column
- Tablet (640px-1024px): 90% width modal
- Desktop (>1024px): Max 600px width modal, centered

### Testing Checklist

- [ ] Download template generates correct CSV format
- [ ] File upload accepts only .csv files
- [ ] Drag and drop functionality works
- [ ] CSV parsing handles commas in descriptions (quoted fields)
- [ ] All validation errors display with row numbers
- [ ] Progress indicator shows during upload
- [ ] Success message displays uploaded count
- [ ] Products appear in QA queue after upload
- [ ] Error handling for network failures
- [ ] Maximum file size validation (5MB)
- [ ] Maximum product count validation (100 products)
- [ ] Image URL validation (must be accessible)
- [ ] Category validation (exact match)
- [ ] Price format validation (numbers only)
- [ ] Stock validation (whole numbers)

### Error Messages

**User-Friendly Error Messages:**
```typescript
const ERROR_MESSAGES = {
  INVALID_FILE: 'Please upload a valid CSV file',
  FILE_TOO_LARGE: 'File size exceeds 5MB limit',
  TOO_MANY_PRODUCTS: 'Maximum 100 products per upload',
  MISSING_COLUMNS: 'CSV file is missing required columns: {columns}',
  INVALID_CATEGORY: 'Invalid category in row {row}. Must be one of: Electronics, Fashion, Beauty, Food, Home & Living, Sports, Books, Toys, Accessories, Others',
  INVALID_PRICE: 'Invalid price in row {row}. Must be a number without symbols',
  MISSING_REQUIRED: 'Missing required field in row {row}: {field}',
  INVALID_URL: 'Invalid image URL in row {row}. Must start with http:// or https://',
  NETWORK_ERROR: 'Failed to upload products. Please check your connection and try again',
  SERVER_ERROR: 'Server error occurred. Please try again later',
};
```

### Sample React Component

```typescript
import React, { useState } from 'react';
import { FileText, Upload, Info, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  sellerId,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
    onDrop: handleCSVUpload,
  });
  
  const downloadTemplate = () => {
    const csv = `name,description,price,originalPrice,stock,category,imageUrl
Sample Product,This is a sample product description,999,1299,100,Electronics,https://example.com/image.jpg
`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'product-upload-template.csv';
    link.click();
  };
  
  function handleCSVUpload(files: File[]) {
    // Implementation here
  }
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Bulk Upload Products</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        {/* Body */}
        <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* CSV Format Card */}
          <div className="bg-gray-50 border border-orange-200 rounded-xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={20} className="text-orange-600" />
              <h3 className="text-lg font-semibold">CSV Format Requirements</h3>
            </div>
            {/* Requirements content... */}
          </div>
          
          {/* Download Template Button */}
          <button
            onClick={downloadTemplate}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-orange-600 text-orange-600 font-bold rounded-xl hover:bg-orange-50 transition-colors mb-3"
          >
            <FileText size={20} />
            <span>Download CSV Template</span>
          </button>
          
          {/* Upload Button */}
          <div
            {...getRootProps()}
            className={`w-full flex items-center justify-center gap-3 px-6 py-4 bg-orange-600 text-white font-bold rounded-xl cursor-pointer hover:bg-orange-700 transition-colors mb-3 ${
              isDragActive ? 'bg-orange-500' : ''
            }`}
          >
            <input {...getInputProps()} />
            <Upload size={20} />
            <span>{isDragActive ? 'Drop CSV file here' : 'Select CSV File'}</span>
          </div>
          
          {/* Help Button */}
          <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-orange-600 font-semibold rounded-xl hover:bg-gray-200 transition-colors">
            <Info size={16} />
            <span>Show CSV Format Help</span>
          </button>
        </div>
      </div>
    </div>
  );
};
```

### Additional Features to Consider

1. **Progress Tracking**: Show upload progress with percentage
2. **Preview Table**: Display parsed CSV data before confirming upload
3. **Batch Processing**: Upload in batches if > 100 products
4. **Error Export**: Download a CSV of failed rows for correction
5. **Auto-Save Draft**: Save parsed data locally before upload
6. **Image Validation**: Check if image URLs are accessible before upload
7. **Duplicate Detection**: Warn if product names already exist
8. **Category Autocomplete**: Suggest categories as user types

### Performance Optimization

- Use `React.memo` for modal components
- Implement virtual scrolling for large CSV previews
- Debounce file validation
- Show loading states during parsing/upload
- Optimize re-renders with `useCallback` and `useMemo`

### Accessibility (a11y)

- Modal should trap focus
- Keyboard navigation (Tab, Escape to close)
- Screen reader announcements for upload status
- ARIA labels on all interactive elements
- Color contrast ratio compliance (WCAG AA)
- Focus indicators on buttons

---

**For Questions or Clarifications:**
Contact the mobile development team or refer to the mobile implementation at:
`mobile-app/app/seller/(tabs)/products.tsx` (lines 1045-1135)
