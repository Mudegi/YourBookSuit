# Excise Duty Name Field Mapping Guide

**Issue**: `/api/external/efris/excise-duty` endpoint returns empty `name` fields for all 87 excise codes.

**Solution**: Populate `name` field with data from URA EFRIS T125 interface.

---

## Current vs Required Response Structure

### ❌ Current Response (Missing Names)
```json
{
  "success": true,
  "excise_codes": [
    {
      "code": "LED161600",
      "name": "",              ← EMPTY - This is the problem!
      "rate": "0",
      "unit": "%",
      "currency": "UGX",
      "excise_rule": "1"
    },
    {
      "code": "LED040600",
      "name": "",              ← EMPTY
      "rate": "10",
      "unit": "101",
      "currency": "UGX",
      "excise_rule": "2"
    }
  ],
  "total": 87,
  "last_updated": "2026-02-08T03:50:17.655395"
}
```

### ✅ Required Response (With Names)
```json
{
  "success": true,
  "excise_codes": [
    {
      "code": "LED161600",
      "name": "Internet Data for provision of Medical and Education services",
      "rate": "0",
      "unit": "%",
      "currency": "UGX",
      "excise_rule": "1"
    },
    {
      "code": "LED040600",
      "name": "Other Alcoholic Beverage Locally Produced",
      "rate": "10",
      "unit": "101",
      "currency": "UGX",
      "excise_rule": "2"
    }
  ],
  "total": 87,
  "last_updated": "2026-02-08T03:50:17.655395"
}
```

---

## T125 Response Structure (Source of Truth)

The T125 endpoint returns the complete excise duty data with descriptions:

**Endpoint**: `GET /api/public/efris/test/t125`

**Response Structure**:
```json
{
  "status": "success",
  "interface": "T125",
  "description": "Excise duty rates for alcohol, tobacco, and other products",
  "data": {
    "data": {
      "content": "...(base64 encoded gzipped data)...",
      "dataDescription": {
        "codeType": "0",
        "encryptCode": "2",
        "zipCode": "1"
      },
      "signature": "...",
      "decrypted_content": {
        "exciseDutyList": [
          {
            "exciseDutyCode": "LED161600",
            "goodService": "Internet Data for provision of Medical and Education services",
            "rateText": "0%",
            "effectiveDate": "01/07/2021",
            "parentCode": "LED160000",
            "isLeafNode": "1",
            "id": "120453215404593459",
            "exciseDutyDetailsList": [...]
          }
        ]
      }
    }
  }
}
```

---

## Field Mapping Reference

| Your API Field | T125 Field | Example Value | Notes |
|---------------|------------|---------------|-------|
| `code` | `exciseDutyCode` | "LED161600" | Already correct |
| **`name`** | **`goodService`** | "Internet Data for provision of Medical and Education services" | **THIS IS WHAT'S MISSING** |
| `rate` | Derived from `rateText` | "0" | May need parsing |
| `unit` | `exciseDutyDetailsList[].type` | "101" (%) or "102" (UGX) | Code mapping needed |
| `currency` | `exciseDutyDetailsList[].currency` or default | "UGX" / "USD" | |
| `excise_rule` | Not in T125 | "1" or "2" | Your business logic |

---

## Example Transformations

### Example 1: LED161600 - Internet Data
**T125 Input**:
```json
{
  "exciseDutyCode": "LED161600",
  "goodService": "Internet Data for provision of Medical and Education services",
  "rateText": "0%",
  "effectiveDate": "01/07/2021",
  "parentCode": "LED160000",
  "isLeafNode": "1",
  "exciseDutyDetailsList": [
    {
      "type": "101",
      "rate": "0"
    }
  ]
}
```

**Your API Output**:
```json
{
  "code": "LED161600",
  "name": "Internet Data for provision of Medical and Education services",
  "rate": "0",
  "unit": "%",
  "currency": "UGX",
  "excise_rule": "1"
}
```

### Example 2: LED040600 - Alcoholic Beverage
**T125 Input**:
```json
{
  "exciseDutyCode": "LED040600",
  "goodService": "Other Alcoholic Beverage Locally Produced",
  "rateText": "10%,UGX150 per Litre",
  "effectiveDate": "01/07/2021",
  "parentCode": "LED040000",
  "isLeafNode": "1",
  "exciseDutyDetailsList": [
    {
      "type": "101",
      "rate": "10"
    },
    {
      "type": "102",
      "rate": "150",
      "unit": "102",
      "currency": "101"
    }
  ]
}
```

**Your API Output**:
```json
{
  "code": "LED040600",
  "name": "Other Alcoholic Beverage Locally Produced",
  "rate": "10",
  "unit": "101",
  "currency": "UGX",
  "excise_rule": "2"
}
```

### Example 3: LED260100 - Plastic Products
**T125 Input**:
```json
{
  "exciseDutyCode": "LED260100",
  "goodService": "Plastic product and Plastic Granules",
  "rateText": "2.50%,USD70 per TNE-Metric ton (1000 kg)",
  "effectiveDate": "01/07/2021",
  "parentCode": "LED260000",
  "isLeafNode": "1",
  "exciseDutyDetailsList": [
    {
      "type": "101",
      "rate": "2.5"
    },
    {
      "type": "102",
      "rate": "70",
      "unit": "TNE",
      "currency": "102"
    }
  ]
}
```

**Your API Output**:
```json
{
  "code": "LED260100",
  "name": "Plastic product and Plastic Granules",
  "rate": "2.5",
  "unit": "101",
  "currency": "USD",
  "excise_rule": "2"
}
```

---

## Implementation Steps

### Step 1: Fetch T125 Data from URA EFRIS
```python
# Example pseudocode - adjust for your backend language
def fetch_t125_data():
    """Fetch excise duty data from actual URA EFRIS T125 interface"""
    response = call_ura_efris_api('T125')
    
    # The response is base64 encoded and gzipped
    if response['data']['dataDescription']['zipCode'] == '1':
        # Decode and decompress
        decrypted_content = decode_and_decompress(response['data']['content'])
        return decrypted_content['exciseDutyList']
    
    return []
```

### Step 2: Create Database Table (Recommended)
```sql
-- Cache T125 data for performance
CREATE TABLE excise_duty_codes (
    id SERIAL PRIMARY KEY,
    excise_duty_code VARCHAR(20) UNIQUE NOT NULL,
    good_service TEXT NOT NULL,
    rate_text VARCHAR(255),
    effective_date DATE,
    parent_code VARCHAR(20),
    is_leaf_node VARCHAR(1),
    raw_data JSONB,
    last_synced_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_excise_duty_code ON excise_duty_codes(excise_duty_code);
```

### Step 3: Sync T125 Data to Database
```python
def sync_excise_codes():
    """
    Sync T125 excise codes to local database
    Run this periodically (e.g., daily via cron job)
    """
    t125_codes = fetch_t125_data()
    
    for item in t125_codes:
        db.upsert('excise_duty_codes', {
            'excise_duty_code': item['exciseDutyCode'],
            'good_service': item['goodService'],
            'rate_text': item['rateText'],
            'effective_date': parse_date(item.get('effectiveDate')),
            'parent_code': item.get('parentCode'),
            'is_leaf_node': item.get('isLeafNode'),
            'raw_data': item,  # Store full object for reference
            'last_synced_at': now()
        })
    
    print(f"Synced {len(t125_codes)} excise codes")
```

### Step 4: Update Your API Endpoint
```python
def get_excise_codes():
    """
    GET /api/external/efris/excise-duty
    Returns excise codes with proper names
    """
    # Query from database (fast lookup)
    codes = db.query('''
        SELECT 
            excise_duty_code as code,
            good_service as name,          -- ← THIS IS THE FIX!
            raw_data
        FROM excise_duty_codes
        WHERE is_leaf_node = '1'
        ORDER BY excise_duty_code
    ''')
    
    # Transform to your API format
    result = []
    for code in codes:
        # Parse rate from raw_data or rate_text
        rate_info = parse_rate_info(code['raw_data'])
        
        result.append({
            'code': code['code'],
            'name': code['name'],          # ← NOW POPULATED!
            'rate': rate_info['rate'],
            'unit': rate_info['unit'],
            'currency': rate_info['currency'],
            'excise_rule': determine_rule(code['raw_data'])
        })
    
    return {
        'success': True,
        'excise_codes': result,
        'total': len(result),
        'last_updated': get_last_sync_time()
    }
```

---

## Complete T125 Excise Codes List (87 Total)

Here are all 87 codes with their proper descriptions from T125:

| Code | Name (goodService) | Rate Text |
|------|-------------------|-----------|
| LED020100 | aaa | 10%,UGX1000 per kg |
| LED030100 | Healthcare | 0% |
| LED030200 | Medical | 0% |
| LED040100 | Made from Imported Malt | 60%,UGX2050 per Litre |
| LED040200 | Made from Local Malt | 60%,UGX2050 per Litre |
| LED040300 | Opaque beer | 10%,UGX150 per Litre |
| LED040400 | Produced from barley grown and malted in Uganda | 30%,UGX950 per litre |
| LED040500 | whose local raw material content,excluding water is at least 75% by weight of its constituents | 30%,UGX900 per Litre |
| LED040600 | Other Alcoholic Beverage Locally Produced | 10%,UGX150 per Litre |
| LED040800 | Powder of Reconstitution into beer | UGX2500 per Kg |
| LED050000 | Cement | UGX500 per 50kgs |
| LED060000 | Chewing gum | 0% |
| LED070000 | Chocolates | 0% |
| LED080100 | Cigars, Cheroots, Cigarillos containing tobacco | 200% |
| LED080200 | Hinge lid - Imported | UGX100000 per 1,000sticks |
| LED080300 | Hinge lid - Locally manufactured | UGX80000 per 1,000sticks |
| LED080400 | Homogenized or Reconstituted tobacco | 200% |
| LED080500 | OTHER - Cigarettes | 200% |
| LED080600 | Smoking Tobacco, whether or not containing tobacco substitutes in any propotion | 200% |
| LED080700 | Soft Cap - Imported | UGX75000 per 1,000sticks |
| LED080800 | Soft Cap - Locally manufactured | UGX55000 per 1,000sticks |
| LED090000 | Cooking oil | UGX200 per litre |
| LED100100 | Cosmetics except creams used by the Albino in the treatment of their skin | 10% |
| LED100200 | Perfumes | 10% |
| LED110000 | Mineral Water, bottled water and other water purposely for drinking | 10%,UGX50 per Litre |
| LED120000 | Financial Services | 15% |
| LED130100 | Gas oil (automative, light, amber for high speed engine) | UGX1230 per Litre |
| LED130200 | Gas oil for thermal power generation to national grid | Nil |
| LED130300 | Gas oil for use in generators by industrialists | 0% |
| LED130400 | Illuminating kerosene | UGX200 per litre |
| LED130500 | Jet A1 and Aviation Fuel | UGX630 per litre |
| LED130600 | Jet A1 and Aviation Fuel imported by registered airlines | 0% |
| LED130700 | Motor Spirit (gasoline) | UGX1550 per Litre |
| LED130800 | Other Gas oils | UGX630 per litre |
| LED140100 | Furniture manufactured in Uganda using local materials but excluding furniture which is assembled in Uganda | 0% |
| LED140200 | Other Furniture | 20% |
| LED140300 | Specialized Hospital Furniture | 0% |
| LED150000 | Motor vehicle lubricants | 15% |
| LED160100 | Chargeable to Excise Duty Rate is  USD 0.09 per minute | 9% |
| LED160200 | Exempt from Local Excise Duty Rate is 0 per minute | 0% |
| LED160300 | Incoming International Call Services | 9% |
| LED160400 | Internet data | 12% |
| LED160500 | Mobile Money Transactions- on Value of Transaction (Complete Schedule 1B) | 0% |
| LED160600 | Money Transfer &  Withdrawal Services - On Charges (Except by Bank) | 15% |
| LED160700 | On Payments | 0% |
| LED160800 | On Receiving | 0% |
| LED160900 | On Withdrawals | .5% |
| LED161000 | Other Telecom Services - Total (1+2a+2b+3+4+5+6) | 15% |
| LED161200 | The Republic of Kenya | 0% |
| LED161300 | The Republic of Rwanda | 0% |
| LED161400 | The Republic of South Sudan | 0% |
| LED161500 | Value Added Services | 12% |
| LED161600 | Internet Data for provision of Medical and Education services | 0% |
| LED170100 | Cosmetics except creams used by the Albino in the treatment of their skin | 10% |
| LED170200 | Perfumes | 10% |
| LED180000 | Sacks and bags and other plastics | 120%,UGX10000 per Kg |
| LED190100 | Fruit juice and vegetable juice, except juice made from  at least 30% pulp or at least 30% juice by weight or volume of the total composition of the drink from fruits and vegetables grown locally | UGX250 per Litre,10% |
| LED190200 | Non alcoholic beverages not including fruit or vegetable juices | 12%,UGX250 per Litre |
| LED190300 | Powder for reconstitution to make juice or dilute- to- taste drinks, excluding pulp | 15% |
| LED190400 | Any other non-alcoholic beverage locally produced other than a beverage referred to in paragraph (a) made out of fermented sugary tea solution with a combination of yeast and bacteria | 10%,UGX150 per Litre |
| LED200100 | any other undenatured spirits that are locally produced, of alcoholic strength by volume of less than 80% | UGX1700 per Litre,60% |
| LED200200 | Undenatured spirits made from imported raw materials | 100% ,UGX2500 per litre |
| LED200300 | Un-denatured spirits of alcoholic strength by volume of 80% or more made from locally produced raw materials | 60%,UGX1500 per Litre |
| LED200400 | any other undenatured spirits that are imported of alcoholic strength by volume of less than 80% | 80%,UGX1700 per Litre |
| LED210100 | Cane or beet sugar and chemically pure sucrose in solid form | UGX100 per kg |
| LED210200 | Cane or beet sugar for industrial use | 0% |
| LED220000 | Sweets | 0% |
| LED230100 | Made from locally produced raw materials | 20% ,UGX2000 per litre |
| LED230200 | Other wine | 100%,UGX10000 per Litre |
| LED240100 | Airtime on Landline and Payphone - Less Adjustments(Please attach the proof) | 0% |
| LED240200 | Airtime on Landline and Payphone - Total (3+4+5-6) | 12% |
| LED240300 | Fixed Line - Postpaid - Monthly Billing | 12% |
| LED240400 | Fixed Line - Prepaid - Card loading | 12% |
| LED240500 | Fixed Line - Prepaid - Non card loading | 12% |
| LED240600 | Fixed Line - Prepaid - Total (1+2) | 12% |
| LED240700 | Payphone | 12% |
| LED250100 | Airtime - Postpaid - Contract | 13% |
| LED250200 | Airtime - Postpaid - Staff | 12% |
| LED250300 | Airtime - Postpaid - Total (4+5) | 12% |
| LED250400 | Airtime - Prepaid - Card loading | 12% |
| LED250500 | Airtime - Prepaid - Non card loading | 12% |
| LED250600 | Airtime - Prepaid - Total (1+2) | 12% |
| LED250700 | Airtime On Mobile - Less Adjustments(Please attach the proof) | 0% |
| LED250800 | Airtime On Mobile - Total (3+6-7) | 12% |
| LED260100 | Plastic product and Plastic Granules | 2.50%,USD70 per TNE-Metric ton (1000 kg) |
| LED270100 | Fermented Beverage made from imported  Cider , Perry ,Mead, Spears or near beer | 60%,UGX950 per Litre |
| LED270200 | Fermented Beverage made from Locally Grown  Cider , Perry ,Mead, Spears or near beer | 30%,UGX550 per Litre |

---

## Testing the Fix

After implementing the changes, test your endpoint:

```bash
# Call your API
curl https://efrisintegration.nafacademy.com/api/external/efris/excise-duty

# Expected response (names should NOT be empty)
{
  "success": true,
  "excise_codes": [
    {
      "code": "LED161600",
      "name": "Internet Data for provision of Medical and Education services",  ← Should have value!
      "rate": "0",
      ...
    }
  ]
}
```

---

## Summary

**The Fix**: Map T125's `goodService` field to your API's `name` field.

**Key Change**: 
```python
# Instead of:
'name': '',  # ❌ Empty

# Do this:
'name': t125_data['goodService']  # ✅ Populated from T125
```

**Recommendation**: 
1. Fetch T125 data from URA EFRIS
2. Cache it in your database
3. Map `goodService` → `name` in your API response
4. Set up daily sync to keep data fresh

---

**Created**: 2026-02-08  
**Issue**: Empty `name` fields in excise codes API  
**Root Cause**: Not fetching/mapping `goodService` from T125 interface  
**Solution**: Implement T125 data sync and field mapping
