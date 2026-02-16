# ERROR-XXX: [Endpoint Name] - [Brief Error Description]

## Error Summary

| Field | Value |
|-------|-------|
| **Error ID** | ERROR-XXX |
| **Endpoint** | `[METHOD] /api/external/efris/[endpoint]` |
| **Method** | [GET/POST] |
| **HTTP Status** | [500/400/404/etc] |
| **Error Message** | `[Exact error message from response]` |
| **Date Discovered** | [YYYY-MM-DD] |
| **Severity** | 🔴 High / 🟡 Medium / 🟢 Low |
| **Status** | ❌ UNRESOLVED / ✅ RESOLVED / ⏳ IN PROGRESS |

---

## Error Details

### Full Error Response
```json
{
  "detail": "[error message]",
  "error_code": "[if provided]"
}
```

### Response Headers
```
HTTP/1.1 [STATUS_CODE] [STATUS_TEXT]
Content-Type: application/json
Content-Length: [size]
Server: LiteSpeed
Date: [date]
```

---

## Request Details

### Full Request
```http
[METHOD] /api/external/efris/[endpoint] HTTP/1.1
Host: efrisintegration.nafacademy.com
X-API-Key: [API_KEY]
Content-Type: application/json
Accept: application/json

[request body if POST]
```

### Query Parameters (if GET)
| Parameter | Value | Required |
|-----------|-------|----------|
| `param1` | `value1` | Yes/No |

### Request Body (if POST)
```json
{
  "field1": "value1",
  "field2": "value2"
}
```

### Authentication
- Header: `X-API-Key: [valid_key]`
- Organization: Demo Company Inc.
- Organization ID: cmkr0wbeq0001vl95dodsfurp

---

## Root Cause Analysis

### Issue Type
[AttributeError / ValidationError / DatabaseError / NetworkError / etc]

### What's Happening
[Detailed explanation of what's causing the error in the backend]

### Probable Location in Backend Code
```python
# Example of where the bug likely exists
def endpoint_handler(request):
    # Problematic code here
    pass
```

### Why This Breaks
1. [Reason 1]
2. [Reason 2]
3. [Reason 3]

---

## Suggested Fixes

### Option 1: [Fix Description] ⭐ **RECOMMENDED**

[Detailed explanation]

```python
# Before (broken):
[broken code example]

# After (fixed):
[fixed code example]
```

**Implementation Steps:**
1. Step 1
2. Step 2
3. Step 3

---

### Option 2: [Alternative Fix]

[Alternative approach]

```python
# Alternative code
[code example]
```

---

## Impact Assessment

### What's Blocked
- ❌ [Feature 1 that doesn't work]
- ❌ [Feature 2 that doesn't work]
- ❌ [Feature 3 that doesn't work]

### Workaround in Place
[Describe any temporary workaround if implemented]

### Business Impact
- **Technical**: [Impact on development]
- **User**: [Impact on end users]
- **Production**: [Can this go to production?]

---

## Testing Instructions

### After Implementing Fix

1. **Restart backend server**

2. **Test with curl:**
```bash
curl -X [METHOD] "https://efrisintegration.nafacademy.com/api/external/efris/[endpoint]" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '[request body if POST]'
```

3. **Expected Success Response:**
```json
{
  "success": true,
  "data": {
    // expected data
  }
}
```

4. **Verify in our application:**
   - [Step-by-step verification in the app]

---

## Additional Information

### Related Endpoints
[List any other endpoints that might have the same issue]

### Database Schema Required
[Any database changes needed]

### API Documentation Reference
[Links to relevant documentation sections]

---

## Contact for This Error

**Reported By:** YourBookSuit Development Team  
**Organization:** Demo Company Inc. (cmkr0wbeq0001vl95dodsfurp)  
**Date:** [YYYY-MM-DD]  
**Priority:** [High/Medium/Low]  

**Evidence:**
- [List of evidence/logs available]

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| [YYYY-MM-DD] | 1.0 | Initial error report created |
