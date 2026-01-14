# Bulk Upload Preview - Quick Reference

## Feature Summary

✨ **New Preview Step**: Review all products before uploading to Quality Assurance

## What You Can See in Preview

| Field              | Display                      | Example                       |
| ------------------ | ---------------------------- | ----------------------------- |
| **Image**          | Product thumbnail            | iPhone 15 image               |
| **Name**           | Product title                | iPhone 15 Pro Max             |
| **Category**       | Product category             | Electronics                   |
| **Price**          | Current price (bold, orange) | ₱59,999                       |
| **Original Price** | Crossed out price            | ~~₱65,999~~                   |
| **Discount %**     | Calculated & shown in green  | 12% OFF                       |
| **Stock**          | Available quantity           | 50 units                      |
| **Description**    | First 2 lines                | Latest flagship smartphone... |

## How It Works

### Step 1: Upload CSV ✓

- Select or drag CSV file
- System validates format
- Takes ~2 seconds

### Step 2: Review Preview 👀

- See all products in cards
- Check images, prices, details
- Scroll through list
- Can go back and change file

### Step 3: Confirm Upload ✅

- Click "Confirm & Upload"
- See progress bar
- Products sent to QA queue
- Get success notification

## Key Features

### ✓ Image Preview

- Shows actual product images
- Placeholder if URL fails
- Fast loading with fallback

### ✓ Price & Discount

- Displays selling price
- Shows original price struck through
- Auto-calculates discount %
- Example: ₱59,999 ~~₱65,999~~ **12% OFF**

### ✓ Easy Navigation

- **Back** button to change file
- **Confirm & Upload** to proceed
- Close button to cancel

### ✓ Responsive Design

- Mobile: Single column
- Desktop: Multi-column grid
- Works on all devices

### ✓ Smart Error Handling

- Broken images show placeholder
- Long text truncated with ellipsis
- All data still uploadable

## Typical Preview

```
╔════════════════════════════════════════════════════════════════╗
║  📋 Review Products (9)                                        ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  ┌────────┬──────────────────────────────────────────────┐    ║
║  │        │ iPhone 15 Pro Max                            │    ║
║  │[Image] │ Category: Electronics                        │    ║
║  │        │ ₱59,999 ~~₱65,999~~ 12% OFF                  │    ║
║  │        │ Stock: 50 units | Description: Latest...     │    ║
║  └────────┴──────────────────────────────────────────────┘    ║
║                                                                ║
║  ┌────────┬──────────────────────────────────────────────┐    ║
║  │        │ Wireless Earbuds Pro                         │    ║
║  │[Image] │ Category: Electronics                        │    ║
║  │        │ ₱2,999 ~~₱3,499~~ 14% OFF                    │    ║
║  │        │ Stock: 100 units | Description: Premium...   │    ║
║  └────────┴──────────────────────────────────────────────┘    ║
║                                                                ║
║  ┌────────┬──────────────────────────────────────────────┐    ║
║  │        │ Summer Floral Dress                          │    ║
║  │[Image] │ Category: Fashion                            │    ║
║  │        │ ₱1,299 | Stock: 75 units                      │    ║
║  │        │ Description: Lightweight cotton dress...      │    ║
║  └────────┴──────────────────────────────────────────────┘    ║
║                                                                ║
║  [More products in scrollable list...]                         ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║  [← Back]                      [✓ Confirm & Upload] →          ║
╚════════════════════════════════════════════════════════════════╝
```

## What's Shown

### ✅ Included in Preview

- Product name
- Category
- Price & discount
- Stock quantity
- Product description (truncated)
- Product image
- Item count
- Discount percentage

### ❌ NOT in Preview

- Images from file system only (URLs only)
- Product sizes/colors
- Product ratings/reviews
- Seller information
- Shipping details

## Actions You Can Take

### Before Uploading

- **Back** - Go back to file selection
- **Confirm & Upload** - Send to QA
- **Close (X)** - Cancel preview
- **Scroll** - See more products

### During Upload

- See real-time progress
- Progress bar updates
- Loading indicator on button
- Cannot close modal during upload

### After Upload

- Success notification appears
- Modal auto-closes
- Ready for next batch

## Tips & Best Practices

### 📸 Image URLs

- Use full HTTPS URLs
- Test URL in browser first
- Image must be publicly accessible
- Common hosting: Unsplash, Cloudinary, Imgur

### 💰 Pricing

- Always review price in preview
- Check discount is correct
- Ensure no accidental decimals
- Format: numbers only (no ₱ symbol)

### 📝 Descriptions

- Preview shows first 2 lines
- Full description stored in system
- Check for typos in preview
- Max 500 characters

### 🏷️ Categories

- Verify category matches
- Categories are case-sensitive
- Choose most specific category
- Cannot change after upload

### 📦 Stock

- Review quantities in preview
- Prevent overselling
- Use realistic stock numbers
- Can be updated after approval

## Common Scenarios

### Scenario 1: Product Image Shows Wrong Photo

**What happened:** Wrong image URL
**Solution:** Go back, update CSV, re-upload

### Scenario 2: Discount Looks Incorrect

**What's happening:** Auto-calculated from original vs selling price
**Check:** Ensure originalPrice > price in CSV

### Scenario 3: Description is Truncated

**Note:** Normal - full description is uploaded
**See full text:** Check after product is approved

### Scenario 4: Want to Skip Certain Products

**Current:** All or nothing upload
**Tip:** Create separate CSV files and upload in batches

### Scenario 5: Large Product Batch

**Limit:** 100 products per upload
**Solution:** Split into multiple CSV files and upload separately

## Performance Notes

- Preview loads instantly for validated products
- Images load asynchronously
- Smooth scrolling with up to 100 products
- No lag during interaction
- Responsive animations at 60fps

## Troubleshooting

| Issue             | Solution                              |
| ----------------- | ------------------------------------- |
| Image not showing | URL is broken; use valid HTTPS URL    |
| Wrong discount %  | Check originalPrice vs price          |
| Category invalid  | Must match exactly (case-sensitive)   |
| Stock missing     | All products must have stock quantity |
| Price looks wrong | Numbers only; no symbols or commas    |

## Keyboard Shortcuts

| Key      | Action                   |
| -------- | ------------------------ |
| `Tab`    | Navigate between buttons |
| `Enter`  | Click focused button     |
| `Escape` | Close modal              |
| `Scroll` | Browse products          |

## Accessibility

- ♿ Full keyboard navigation
- 🔊 Screen reader compatible
- 🎨 High contrast colors
- 👁️ Clear focus indicators
- 📱 Mobile responsive

---

**Remember:** Preview is your chance to catch errors before uploading! Take a moment to review the products carefully.
