# ERROR-001: GET /excise-duty - Company Object Missing is_test_mode Attribute

## Error Summary

| Field | Value |
|-------|-------|
| **Error ID** | ERROR-001 |
| **Endpoint** | `GET /api/external/efris/excise-duty` |
| **Method** | GET |
| **HTTP Status** | 500 Internal Server Error |
| **Error Message** | `'Company' object has no attribute 'is_test_mode'` |
| **Date Discovered** | February 7, 2026 |
| **Severity** | 🔴 **High** - Completely blocking excise duty integration |
| **Status** | ❌ **UNRESOLVED** |

---

## Error Details

### Full Error Response
```json
{
  "detail": "Failed to fetch excise duty codes: 'Company' object has no attribute 'is_test_mode'"
}
```

### Response Headers
```
HTTP/1.1 500 Internal Server Error
Content-Type: application/json
Content-Length: 96
Server: LiteSpeed
Date: Sat, 07 Feb 2026 21:09:09 GMT
```

---

## Request Details

### Full Request
```http
GET /api/external/efris/excise-duty?token=test_token HTTP/1.1
Host: efrisintegration.nafacademy.com
X-API-Key: [API_KEY_PROVIDED_SEPARATELY]
Accept: application/json
```

### Query Parameters
| Parameter | Value | Required |
|-----------|-------|----------|
| `token` | `test_token` | Yes |
| `excise_code` | (none) | No |
| `excise_name` | (none) | No |

### Authentication
- Header: `X-API-Key: [valid_key]`
- Organization: Demo Company Inc.
- Organization ID: cmkr0wbeq0001vl95dodsfurp
- Country: UG (Uganda)

---

## Root Cause Analysis

### Issue Type
**Python AttributeError** - Attempting to access a non-existent attribute on a model object

### What's Happening
The EFRIS backend Python code (likely Django or FastAPI) is trying to access an attribute `is_test_mode` on a `Company` model instance, but this field does not exist in the database schema.

### Probable Location in Backend Code
```python
# Somewhere in the GET /excise-duty handler
def get_excise_duty_codes(request):
    company = get_company_from_request(request)
    
    # This line is causing the error:
    if company.is_test_mode:  # ❌ AttributeError raised here
        # Use test EFRIS endpoint
        pass
    else:
        # Use production EFRIS endpoint
        pass
```

### Why This Breaks
1. The `Company` database model doesn't have an `is_test_mode` field
2. Python raises `AttributeError` when accessing non-existent attributes
3. The error is caught and returned as HTTP 500 with the detail message

---

## Suggested Fixes

### Option 1: Add Missing Database Field ⭐ **RECOMMENDED**

Add the `is_test_mode` field to the Company model:

```python
# models.py (Django example)
class Company(models.Model):
    name = models.CharField(max_length=255)
    tin = models.CharField(max_length=50)
    # ... other existing fields ...
    
    # ADD THIS FIELD:
    is_test_mode = models.BooleanField(
        default=True,
        help_text="Whether this company uses EFRIS test mode or production"
    )
```

**Then run migrations:**
```bash
# Django
python manage.py makemigrations
python manage.py migrate

# Or SQLAlchemy/Alembic
alembic revision --autogenerate -m "Add is_test_mode to Company"
alembic upgrade head
```

---

### Option 2: Use Existing Field with Different Name

If you already have a similar field (like `test_mode`, `efris_test_mode`, etc.), update the code to use it:

```python
# Find this in your code:
if company.is_test_mode:  # ❌ WRONG attribute name

# Change to:
if company.test_mode:  # ✅ CORRECT (use actual field name)
# OR
if company.efris_test_mode:  # ✅ If this is the actual field
```

---

### Option 3: Add Safe Attribute Access

Use `getattr()` with a default value to prevent the error:

```python
# Before (crashes):
test_mode = company.is_test_mode  # ❌

# After (safe):
test_mode = getattr(company, 'is_test_mode', True)  # ✅ Defaults to True
```

This is a **temporary workaround** but should be replaced with Option 1.

---

### Option 4: Check Attribute Existence

Add a check before accessing:

```python
# Defensive programming approach
if hasattr(company, 'is_test_mode'):
    test_mode = company.is_test_mode
else:
    test_mode = True  # Default to test mode for safety
```

---

## Impact Assessment

### What's Blocked
- ❌ Fetching excise duty codes for product setup
- ❌ Assigning excise codes to products (beer, spirits, tobacco, etc.)
- ❌ Displaying excise rates in tax settings
- ❌ Proper tax calculation for excisable goods

### Workaround in Place
We've implemented mock/fallback data on the client side with 30+ sample excise codes. This allows development to continue but:
- ⚠️ Not using real EFRIS data
- ⚠️ May not have all current codes
- ⚠️ Rates might be outdated

### Business Impact
- **Medium**: Development can continue with mock data
- **High**: Cannot go to production until fixed
- **Critical**: Required for businesses selling excisable goods (beverages, tobacco, fuel, telecom)

---

## Testing Instructions

### After Implementing Fix

1. **Restart your backend server** to load the new code/model changes

2. **Test with curl:**
```bash
curl -X GET "https://efrisintegration.nafacademy.com/api/external/efris/excise-duty?token=test_token" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Accept: application/json"
```

3. **Expected Success Response:**
```json
{
  "success": true,
  "status": "200",
  "message": "SUCCESS",
  "data": {
    "exciseDutyList": [
      {
        "exciseDutyCode": "LED190100",
        "goodService": "Beer and malt beverages",
        "effectiveDate": "01/07/2021",
        "parentCode": "LED190000",
        "rateText": "30% or UGX 1400/liter",
        "isLeafNode": "1",
        "exciseDutyDetailsList": [...]
      },
      ...
    ]
  }
}
```

4. **Verify in our application:**
   - Navigate to: `http://localhost:3000/demo-company/settings/taxes/rates`
   - Click "Excise Duty (EFRIS)" tab
   - Click "Refresh from EFRIS" button
   - Should see real codes (no yellow warning banner)

---

## Additional Information

### Related Endpoints
This same `is_test_mode` attribute might be accessed in other endpoints. Please check:
- `/submit-invoice`
- `/register-product`
- `/submit-purchase-order`
- `/submit-credit-note`
- `/stock-decrease`

If they also access `company.is_test_mode`, they will have the same error.

### Database Schema Verification
To verify your current Company model fields, run:

```python
# Django
from your_app.models import Company
print([f.name for f in Company._meta.get_fields()])

# SQLAlchemy
from sqlalchemy import inspect
inspector = inspect(Company)
print([c.name for c in inspector.columns])
```

### API Documentation Reference
According to your documentation:
- Test mode should control whether requests go to EFRIS sandbox or production
- This is a per-company setting
- Should be configurable when setting up EFRIS integration

---

## Contact for This Error

**Reported By:** YourBookSuit Development Team  
**Organization:** Demo Company Inc. (cmkr0wbeq0001vl95dodsfurp)  
**Date:** February 7, 2026  
**Priority:** High  

**Evidence:**
- Full server logs available
- Request/response captured
- Database configuration verified
- Mock data workaround implemented

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-07 | 1.0 | Initial error report created |
| 2026-02-08 | 1.1 | Added testing instructions and impact assessment |
