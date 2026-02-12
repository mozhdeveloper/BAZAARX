# Address Flow Test Script
**Test Date:** February 10, 2026
**Feature:** Add New Address from Checkout → Save to Database → Display on HomeScreen

## Test Prerequisites
- [ ] Metro Manila test user logged in
- [ ] At least one item in cart
- [ ] Location permission granted
- [ ] Internet connection active

---

## Test Case 1: Add New Address from Checkout

### Steps:
1. **Navigate to Checkout**
   - Open app → Add item to cart → Click "Checkout"
   - Expected: Checkout screen opens

2. **Open Address Selection Modal**
   - Tap on "Select Delivery Address" or "Add Delivery Address" button
   - Expected: Modal shows "Select Delivery Address" with "Add New Address" button

3. **Open Add New Address Form**
   - Tap "Add New Address" button
   - Expected: 
     - Selection modal closes
     - Add New Address form modal opens (100ms delay)
     - Form shows pre-filled name and phone from user profile

4. **Fill Address Form**
   - Select Address Type: Home / Office / Other
   - Verify First Name: `(auto-filled from profile)`
   - Verify Last Name: `(auto-filled from profile)`
   - Verify Phone: `(auto-filled from profile)`
   - Select Region: `Metro Manila` or `NCR`
   - **Expected after region selection:**
     - Province dropdown stays empty (Metro Manila doesn't need province)
     - City dropdown loads with 17 cities (Caloocan, Las Piñas, Makati, Malabon, Mandaluyong, Manila, Marikina, Muntinlupa, Navotas, Parañaque, Pasay, Pasig, Quezon City, San Juan, Taguig, Valenzuela, Pateros)
   - Select City: `Marikina`
   - **Expected after city selection:**
     - Barangay dropdown loads with Marikina barangays
   - Select Barangay: `Industrial Valley`
   - Enter Street: `Kamagong Street, Unit 123`
   - Enter Postal Code: `1802`

5. **Pin Location on Map**
   - Tap "Search & Pin Location" on map preview
   - Expected: Full-screen map modal opens with:
     - Search bar at top
     - Draggable map
     - Center pin marker
     - "Confirm Pin" button at bottom
   
6. **Search for Location**
   - Type in search: `SM Marikina`
   - Tap "Search" button
   - Expected:
     - Loading indicator shows
     - Search results dropdown appears with matching locations
     - Results show "SM Marikina" and similar places
   
7. **Select Search Result**
   - Tap on first search result
   - Expected:
     - Map automatically centers to that location
     - Pin shows at center
     - Search results dropdown closes
     - Search query updates to selected location name

8. **Adjust Pin (Optional)**
   - Drag map to fine-tune location
   - Expected: Center pin stays fixed while map moves underneath

9. **Confirm Pin Location**
   - Tap "Confirm Pin" button
   - Expected:
     - Map modal closes
     - Form shows coordinates below map preview (e.g., "14.627382, 121.078162")
     - Map preview updates to show pinned location

10. **Set as Default (Optional)**
    - Toggle "Set as default delivery address" checkbox
    - Expected: Checkbox turns green with checkmark

11. **Save Address**
    - Tap "Save Address" button
    - Expected:
      - Loading indicator shows on button
      - Database insert happens
      - Success (modal closes, address selected)
      - Or Error alert if validation fails

---

## Test Case 2: Verify Database Save

### Database Check:
1. Open Supabase dashboard
2. Navigate to `shipping_addresses` table
3. Find latest entry for test user
4. Verify columns:
   ```sql
   SELECT 
     id,
     user_id,
     label,
     address_line_1,
     barangay,
     city,
     province,
     region,
     postal_code,
     coordinates,
     is_default,
     address_type,
     created_at
   FROM shipping_addresses
   WHERE user_id = '<test_user_id>'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

### Expected Database Values:
```
label: "Home" / "Office" / "Other"
address_line_1: "FirstName LastName, +639XXXXXXXXX, Kamagong Street, Unit 123"
barangay: "Industrial Valley"
city: "Marikina"
province: "" (empty for Metro Manila)
region: "Metro Manila" or "NCR"
postal_code: "1802"
coordinates: {"latitude": 14.627382, "longitude": 121.078162}
is_default: true/false
address_type: "residential"
```

---

## Test Case 3: Verify AsyncStorage Sync

### Steps:
1. After saving address, check AsyncStorage:
   ```javascript
   await AsyncStorage.getItem('currentDeliveryAddress')
   // Expected: "Kamagong Street, Unit 123, Marikina"
   
   await AsyncStorage.getItem('currentDeliveryCoordinates')
   // Expected: {"latitude":14.627382,"longitude":121.078162}
   
   await AsyncStorage.getItem('currentLocationDetails')
   // Expected: {
   //   "street": "Kamagong Street, Unit 123",
   //   "barangay": "Industrial Valley",
   //   "city": "Marikina",
   //   "province": "",
   //   "region": "Metro Manila",
   //   "postalCode": "1802"
   // }
   ```

---

## Test Case 4: Verify Address Shows in Checkout

### Steps:
1. After saving, verify address appears in checkout
2. Expected:
   - Add New Address modal closes
   - Selection modal closes
   - Checkout screen shows new address as selected:
     ```
     FirstName LastName
     Home (or Office/Other)
     +639XXXXXXXXX
     Kamagong Street, Unit 123, Industrial Valley, Marikina, Metro Manila, 1802
     ```

3. Can proceed with checkout
4. Order should save with this address_id

---

## Test Case 5: Verify Address Shows on HomeScreen

### Steps:
1. Navigate back to Home tab
2. Check top location bar (below search)
3. Expected display:
   - Location icon (MapPin)
   - Address text: `Kamagong Street, Unit 123, Marikina`
   - Should be truncated if too long (maxWidth: 200)

4. **Reload Test:**
   - Force close app
   - Reopen app
   - Navigate to Home
   - Expected: Same address still shows (loaded from AsyncStorage)

5. **Focus Effect Test:**
   - Go to Cart → Checkout → Save new address
   - Navigate back to Home
   - Expected: Home address updates automatically (useFocusEffect)

---

## Test Case 6: Address Autofill on Next Add

### Steps:
1. Go back to Checkout
2. Tap "Add New Address" again
3. Expected autofill from last location:
   - Region: `Metro Manila` (dropdown pre-loaded)
   - City: `Marikina` (dropdown pre-loaded)
   - Barangay: `Industrial Valley` (dropdown pre-loaded)
   - Street: `Kamagong Street, Unit 123`
   - Postal Code: `1802`
   - Map coordinates: Shows last pinned location

---

## Test Case 7: Multiple Addresses

### Steps:
1. Add first address (Home - Marikina)
2. Add second address (Office - Quezon City)
3. Add third address (Other - Pasig)

### Verify:
1. In address selection modal:
   - All 3 addresses show
   - Default address has "Default" badge
   - Each shows: Name, Label, Phone, Full Address
   - Can select any address via radio button
   - Tap "Confirm Address" to use selected address

2. In database:
   - 3 records exist for user
   - Only 1 has `is_default = true`

---

## Test Case 8: Metro Manila Edge Cases

### Test 8.1: No Province Required
- Select Region: Metro Manila
- Expected: Can select City directly without Province
- Save should succeed without province

### Test 8.2: City Dropdown Loads
- Select Region: NCR
- Expected: 
  - Province dropdown populated but optional
  - City dropdown loads all 17 Metro Manila cities
  - Can select city even if province is empty

---

## Test Case 9: Other Regions (Non-Metro Manila)

### Steps:
1. Select Region: `Region IV-A (CALABARZON)`
2. Expected: Province dropdown loads (Batangas, Cavite, Laguna, Quezon, Rizal)
3. Select Province: `Laguna`
4. Expected: City dropdown loads Laguna cities
5. Select City: `Santa Rosa`
6. Expected: Barangay dropdown loads
7. Save should succeed with region, province, city all filled

---

## Test Case 10: Validation Tests

### Test 10.1: Missing Required Fields
- Leave First Name empty → Save
- Expected: Alert "Incomplete Form", remains on form

### Test 10.2: Missing Metro Manila City
- Select Region: Metro Manila
- Don't select City → Save
- Expected: Alert "Incomplete Form"

### Test 10.3: Missing Non-Metro Province
- Select Region: CALABARZON
- Don't select Province → Save
- Expected: Alert "Incomplete Form"

---

## Test Case 11: Map Search Edge Cases

### Test 11.1: Invalid Search
- Search: `asdfghjkl12345`
- Expected: "No locations found" message

### Test 11.2: Philippines-Only Results
- Search: `New York`
- Expected: No results or only PH results (countrycodes=ph filter)

### Test 11.3: Clear Search
- Type search query
- Tap X button
- Expected: Search clears, results disappear

---

## Success Criteria

### All tests must pass:
- ✅ Add New Address modal opens properly (no stacking)
- ✅ Form pre-fills user info (name, phone)
- ✅ Metro Manila cities load without province
- ✅ Map search works and selects location
- ✅ Coordinates save to database
- ✅ Address shows in checkout after save
- ✅ Address syncs to AsyncStorage
- ✅ HomeScreen displays address after save
- ✅ HomeScreen reloads address on focus
- ✅ Multiple addresses can be added and selected
- ✅ Validation prevents incomplete saves

---

## Known Issues / Notes

1. **Modal Stacking Fix:** 100ms delay prevents iOS modal stacking issues
2. **Metro Manila:** Province is optional (stored as empty string)
3. **Coordinates Format:** Database stores as JSONB `{"latitude": X, "longitude": Y}`
4. **Address Line 1 Format:** `"Name, Phone, Street"` (parsed on read)
5. **Search Rate Limit:** Nominatim has rate limits, wait 1 second between searches

---

## Debug Logs to Watch

```bash
# When opening Add New Address modal:
[Checkout] Autofilling new address form with location details: {...}

# When searching map:
[Checkout] Map search error: (if error)

# When saving:
Error saving address: (if error)

# On HomeScreen:
[HomeScreen] Loaded address from AsyncStorage: ...
[HomeScreen] Error loading from AsyncStorage: (if error)
```

---

## Cleanup After Testing

```sql
-- Delete test addresses
DELETE FROM shipping_addresses 
WHERE user_id = '<test_user_id>' 
AND created_at > '2026-02-10';
```

```javascript
// Clear AsyncStorage
await AsyncStorage.removeItem('currentDeliveryAddress');
await AsyncStorage.removeItem('currentDeliveryCoordinates');
await AsyncStorage.removeItem('currentLocationDetails');
```
