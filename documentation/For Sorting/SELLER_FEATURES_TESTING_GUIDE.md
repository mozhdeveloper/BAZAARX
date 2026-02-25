# Testing Guide: Seller Product Management Enhancements

## Overview
This guide will help you test the new bulk CSV upload and edit product features in the mobile seller app.

## Prerequisites
- ✅ expo-document-picker installed
- ✅ React Native app running on device/simulator
- ✅ Logged in as a seller
- ✅ Sample CSV file ready for testing

## Test 1: Bulk Upload Button Visibility

### Steps:
1. Open the BazaarX mobile app
2. Log in as a seller
3. Navigate to **Products** tab

### Expected Results:
- ✅ Orange header with "Inventory" title
- ✅ Upload button (📤 icon) visible in header next to Add button
- ✅ Upload button has white icon on semi-transparent background

## Test 2: Bulk Upload Modal

### Steps:
1. From Products screen, tap the **Upload button (📤)**

### Expected Results:
- ✅ Bottom sheet modal slides up
- ✅ Modal title: "Bulk Upload Products"
- ✅ CSV format instructions visible
- ✅ Lists all required columns:
  - name (required)
  - description (required)
  - price (required)
  - originalPrice (optional)
  - stock (required)
  - category (required)
  - imageUrl (required)
- ✅ Example CSV row shown
- ✅ Valid categories listed
- ✅ "Select CSV File" button (orange, with upload icon)
- ✅ "Show CSV Format Help" button (gray, with info icon)

## Test 3: CSV Format Help

### Steps:
1. Open Bulk Upload modal
2. Tap **"Show CSV Format Help"** button

### Expected Results:
- ✅ Alert dialog appears
- ✅ Shows CSV format specification
- ✅ Includes example row
- ✅ Lists valid categories
- ✅ Has OK button to dismiss

## Test 4: CSV File Selection

### Steps:
1. Open Bulk Upload modal
2. Tap **"Select CSV File"** button

### Expected Results:
- ✅ Device file picker opens
- ✅ Filters to show CSV files (.csv, text/csv)
- ✅ Can browse device storage
- ✅ Can select a CSV file
- ⏳ (Future) File is validated and uploaded

## Test 5: Edit Product Button

### Steps:
1. From Products screen, scroll to any product
2. Tap the **Edit button (✏️ pencil icon)** on any product card

### Expected Results:
- ✅ Edit Product modal opens (bottom sheet)
- ✅ Modal title: "Edit Product"
- ✅ Form is pre-filled with current product data:
  - Product images (all images shown)
  - Product name
  - Description
  - Price
  - Original price (if set)
  - Stock quantity
  - Category (pill selected)

## Test 6: Edit Product Images

### Steps:
1. Open Edit Product modal for any product
2. Test **Upload Mode**:
   - Tap existing image → Opens image picker
   - Select new image from gallery
   - Verify image updates in preview
3. Test **URL Mode**:
   - Tap "URL" toggle button
   - Existing URL should appear in text field
   - Change URL to a different image
   - Verify preview updates

### Expected Results:
- ✅ Upload mode toggle works (Upload/URL buttons)
- ✅ Can pick new image from device
- ✅ Image preview updates immediately
- ✅ Can switch to URL mode
- ✅ URL text input editable
- ✅ URL image preview shows when valid URL entered

## Test 7: Add Additional Images in Edit Mode

### Steps:
1. Open Edit Product modal
2. Scroll to images section
3. Tap **"+ Add Another Image"** button
4. Upload or enter URL for additional image

### Expected Results:
- ✅ New image field appears
- ✅ Can upload multiple images (same as add product)
- ✅ Can remove additional images (X button)
- ✅ Cannot remove last image (minimum 1 required)
- ✅ All images save when updating product

## Test 8: Edit Other Product Fields

### Steps:
1. Open Edit Product modal
2. Modify each field:
   - Change product name
   - Update description
   - Change price
   - Update original price
   - Modify stock quantity
   - Select different category

### Expected Results:
- ✅ All fields are editable
- ✅ Category pills work (can select new category)
- ✅ Numeric keyboards for price/stock
- ✅ Multi-line text area for description
- ✅ Character count updates if implemented

## Test 9: Update Product

### Steps:
1. Open Edit Product modal
2. Make some changes (e.g., change name, price)
3. Tap **"Update Product"** button

### Expected Results:
- ✅ Modal closes
- ✅ Product updates in inventory list
- ✅ Changes are visible immediately
- ✅ Success feedback (toast/alert) appears
- ✅ Updated product shows new data

## Test 10: Cancel Edit

### Steps:
1. Open Edit Product modal
2. Make some changes
3. Tap **"Cancel"** button or tap outside modal

### Expected Results:
- ✅ Modal closes
- ✅ Changes are NOT saved
- ✅ Product remains unchanged in list
- ✅ No errors occur

## Test 11: Modal Interactions

### Steps:
1. Test both modals (Edit and Bulk Upload):
   - Tap outside modal (on overlay)
   - Tap X button in header
   - Tap Cancel button (Edit modal)
   - Swipe down handle bar

### Expected Results:
- ✅ Modal closes on overlay tap
- ✅ Modal closes on X button tap
- ✅ Modal closes on Cancel button (Edit)
- ✅ Modal closes on swipe down (if gesture enabled)
- ✅ No state persists when reopening

## Test 12: Keyboard Handling

### Steps:
1. Open Edit Product modal
2. Tap any text input field
3. Verify keyboard behavior

### Expected Results:
- ✅ Keyboard appears when tapping input
- ✅ Modal adjusts for keyboard (KeyboardAvoidingView)
- ✅ Can scroll to see all fields with keyboard open
- ✅ Submit button remains accessible
- ✅ Keyboard dismisses on submit
- ✅ Keyboard dismisses on cancel

## Test 13: CSV File Preparation

### Steps:
1. Create a test CSV file using the template:
```csv
name,description,price,originalPrice,stock,category,imageUrl
Test Product 1,This is a test product,1999,2499,50,Electronics,https://via.placeholder.com/800
Test Product 2,Another test,999,,30,Fashion,https://via.placeholder.com/800
```
2. Save as `test-products.csv`
3. Transfer to mobile device
4. Try to upload via bulk upload

### Expected Results:
- ✅ File can be created in Excel/Sheets
- ✅ File saves as CSV format
- ✅ File is accessible on device
- ✅ File picker can find the file
- ⏳ (Future) File validates correctly

## Test 14: Error Handling

### Test Cases:
1. **Edit without changes**: 
   - Open Edit → Don't change anything → Update
   - Should still work (no error)

2. **Empty required fields**:
   - Open Edit → Clear product name → Update
   - ⏳ Should show validation error

3. **Invalid price**:
   - Open Edit → Enter text in price field
   - ⏳ Should prevent or show error

4. **Large CSV file**:
   - Try uploading 100+ products
   - ⏳ Should handle or show limit warning

## Test 15: Performance

### Steps:
1. Test with seller account that has many products (50+)
2. Scroll through products list
3. Open Edit on various products
4. Close and reopen modals multiple times

### Expected Results:
- ✅ Product list scrolls smoothly
- ✅ Edit modal opens quickly (<1 second)
- ✅ Image previews load efficiently
- ✅ No memory leaks on repeated opens
- ✅ App remains responsive

## Known Limitations (To Be Implemented)

### CSV Upload:
- ⏳ Actual CSV parsing logic not implemented
- ⏳ File validation not implemented
- ⏳ Progress indicator not shown
- ⏳ Success/error feedback not implemented
- ⏳ Products not actually added to inventory yet

### Current Behavior:
- File picker works ✅
- Format help shows ✅
- UI is complete ✅
- Backend integration pending ⏳

## Sample CSV Files for Testing

### Basic Test (test-products-basic.csv):
```csv
name,description,price,originalPrice,stock,category,imageUrl
iPhone 15 Pro,Latest Apple flagship,59999,65999,50,Electronics,https://via.placeholder.com/800x800.png?text=iPhone
Wireless Earbuds,Premium sound quality,2999,3499,100,Electronics,https://via.placeholder.com/800x800.png?text=Earbuds
Summer Dress,Light floral dress,1299,,75,Fashion,https://via.placeholder.com/800x800.png?text=Dress
Face Cream,Hydrating moisturizer,899,1099,120,Beauty,https://via.placeholder.com/800x800.png?text=Cream
```

### With Empty Original Price (test-products-no-discount.csv):
```csv
name,description,price,originalPrice,stock,category,imageUrl
Book: The Great Novel,Bestselling fiction,499,,200,Books,https://via.placeholder.com/800x800.png?text=Book
Yoga Mat,Non-slip exercise mat,1199,,60,Sports,https://via.placeholder.com/800x800.png?text=Yoga
Toy Car,Remote control car,799,,80,Toys,https://via.placeholder.com/800x800.png?text=Toy
```

### All Categories (test-products-categories.csv):
```csv
name,description,price,originalPrice,stock,category,imageUrl
Laptop,Gaming laptop,89999,,10,Electronics,https://via.placeholder.com/800x800.png?text=Laptop
T-Shirt,Cotton casual tee,399,499,150,Fashion,https://via.placeholder.com/800x800.png?text=TShirt
Lipstick,Matte finish,599,,200,Beauty,https://via.placeholder.com/800x800.png?text=Lipstick
Organic Honey,Pure honey 500g,599,,100,Food,https://via.placeholder.com/800x800.png?text=Honey
Lamp,Modern desk lamp,1299,,40,Home & Living,https://via.placeholder.com/800x800.png?text=Lamp
Basketball,Official size,899,,30,Sports,https://via.placeholder.com/800x800.png?text=Basketball
Novel,Fiction bestseller,399,,150,Books,https://via.placeholder.com/800x800.png?text=Book
Lego Set,Building blocks,1999,2499,50,Toys,https://via.placeholder.com/800x800.png?text=Lego
Phone Case,Protective case,299,,200,Accessories,https://via.placeholder.com/800x800.png?text=Case
Gift Voucher,₱500 voucher,500,,100,Others,https://via.placeholder.com/800x800.png?text=Voucher
```

## Reporting Issues

If you find any bugs or issues:

1. **Document**:
   - What you were doing
   - What you expected
   - What actually happened
   - Screenshots if possible

2. **Check**:
   - Console logs for errors
   - Network requests (if any)
   - State changes in debugger

3. **Report**:
   - Create issue in project tracker
   - Include reproduction steps
   - Tag with "seller-features" label

## Success Criteria

All tests should pass with ✅:
- [x] Bulk Upload button visible
- [x] Bulk Upload modal UI complete
- [x] CSV format help accessible
- [x] File picker opens and works
- [x] Edit button functional
- [x] Edit modal pre-fills data
- [x] Can edit all product fields
- [x] Can change/add product images
- [x] Update Product saves changes
- [x] Cancel discards changes
- [x] Modals close properly
- [x] No TypeScript errors
- [x] No runtime crashes
- [ ] CSV actually uploads (pending implementation)
- [ ] Validation errors shown (pending implementation)

---

**Testing Status**: UI Complete ✅ | Backend Integration Pending ⏳
**Last Updated**: January 2025
