# PayMongo Test Cards - Quick Reference (Cheat Sheet)

**Print this page and keep it handy during testing!**

---

## SUCCESS CARDS ✅
| Card # | Card Number | Expiry | CVC | Result |
|--------|-------------|--------|-----|--------|
| 1 | 4343434343434345 | 12/25 | 123 | ✅ Success |
| 2 | 4571736000000075 | 12/25 | 123 | ✅ Success |
| 3 | 4009930000001421 | 12/25 | 123 | ✅ Success |
| 4 | 4404520000001439 | 12/25 | 123 | ✅ Success |
| 5 | 5555444444444457 | 12/25 | 123 | ✅ Success |
| 6 | 5455590000000009 | 12/25 | 123 | ✅ Success |
| 7 | 5339080000000003 | 12/25 | 123 | ✅ Success |
| 8 | 5240050000001440 | 12/25 | 123 | ✅ Success |
| 9 | 5577510000001446 | 12/25 | 123 | ✅ Success |

---

## 3DS CARDS 🔐
| Card # | Card Number | Expiry | CVC | Result |
|--------|-------------|--------|-----|--------|
| 10 | 4120000000000007 | 12/25 | 123 | 🔐 3DS Required |
| 11 | 4230000000000004 | 12/25 | 123 | ❌ Decline (before auth) |
| 12 | 5234000000000106 | 12/25 | 123 | ❌ Decline (after auth) |
| 13 | 5123000000000001 | 12/25 | 123 | ✅ Success (optional 3DS) |

---

## SCENARIO CARDS ❌
| Card # | Card Number | Expiry | CVC | Result | Error Code |
|--------|-------------|--------|-----|--------|------------|
| 14 | 4200000000000018 | **01/20** ⚠️ | 123 | ❌ Expired | card_expired |
| 15 | 4300000000000017 | 12/25 | **000** ⚠️ | ❌ Invalid CVC | cvc_invalid |
| 16 | 4400000000000016 | 12/25 | 123 | ❌ Generic | generic_decline |
| 17 | 4500000000000015 | 12/25 | 123 | ❌ Fraud | fraudulent |
| 18 | 5100000000000198 | 12/25 | 123 | ❌ No Funds | insufficient_funds |
| 19 | 5200000000000197 | 12/25 | 123 | ❌ Blocked | processor_blocked |
| 20 | 5300000000000196 | 12/25 | 123 | ❌ Lost | lost_card |
| 21 | 5400000000000195 | 12/25 | 123 | ❌ Stolen | stolen_card |
| 22 | 5500000000000194 | 12/25 | 123 | ❌ Unavail | processor_unavailable |
| 23 | 4600000000000014 | 12/25 | 123 | ❌ Blocked | blocked |

---

## CRITICAL NOTES ⚠️

### Card 14 - EXPIRED CARD
- **MUST USE:** Expiry 01/20 (January 2020)
- **NOT:** 12/25
- Tests if expiry date logic works
- Should decline with "card_expired"

### Card 15 - INVALID CVC
- **MUST USE:** CVC 000 (invalid)
- **NOT:** 123
- Tests if CVC validation works
- Using CVC 123 will make it succeed!

---

## TESTING WORKFLOW

### Quick Test (5 minutes)
```
1. Test card 1 (basic success)
2. Test card 14 (expired - use 01/20)
3. Test card 15 (invalid CVC - use 000)
4. Check console logs
✓ If all work, validators are functioning
```

### Full Test (30 minutes)
```
1. Test all 9 success cards (1-9)
2. Test all 4 3DS cards (10-13)
3. Test all 10 scenario cards (14-23)
4. Verify console output for each
5. Check mobile and web
✓ Ready for production
```

---

## Console Log Indicators

### SUCCESS ✅
```
shouldDecline: false
errorCode: none
```

### DECLINE ❌
```
shouldDecline: true
errorCode: [error_code]
```

### 3DS REQUIRED 🔐
```
requiresAuth: true
shouldDecline: false
```

---

## Copy-Paste Cards

Paste these to quickly test:

**Success:** `4343434343434345`  
**Expired:** `4200000000000018` (expiry: 01/20)  
**Bad CVC:** `4300000000000017` (cvc: 000)  
**Generic Decline:** `4400000000000016`  
**3DS Auth:** `4120000000000007`  

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Card not recognized | Check card number exactly |
| Wrong expiry for test 14 | Use 01/20, not 12/25 |
| CVC test fails | Use 000, not 123 |
| No console logs | Open DevTools console first |
| Different behavior mobile/web | Report inconsistency |

---

## Status Summary

| Category | Count | Status |
|----------|-------|--------|
| Success Cards | 9 | ✅ Ready |
| 3DS Cards | 4 | ✅ Ready |
| Scenario Cards | 10 | ✅ Ready |
| **TOTAL** | **23** | **✅ READY** |

---

**Last Updated:** April 16, 2026  
**Print & Keep Handy!**
