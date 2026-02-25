# Address Management Update (Short)

- Added inline validation and required field indicators in the address form.
- Added country field (default Philippines) and kept PH region/province/city flow.
- Added server-side validation and blocked deletion if address is used in an active order.
- Prevented local state updates when address mutations fail server-side.
