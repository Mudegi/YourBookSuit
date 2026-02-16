# EFRIS Units of Measure - Complete List

## How to Add More Units

Edit `client/scripts/seed-efris-units.js` and add units to the `efrisUnits` array in this format:

```javascript
{ 
  code: 'unique_code',        // Unique identifier (lowercase, no spaces)
  name: 'Display Name',       // Full name
  abbreviation: 'Abbr',       // Short form
  category: 'category_name',  // quantity, weight, volume, length, time, etc.
  efrisCode: 'EFRIS_CODE'     // Optional: EFRIS system code
},
```

## Currently Included Units (51 units)

### Quantity/Count (11 units)
- ✅ Pieces (Pcs) - EFRIS Code: 102
- ✅ Box - EFRIS Code: 101
- ✅ Pair (Pr)
- ✅ Dozen (Dz) - EFRIS Code: 107
- ✅ Stick
- ✅ 1000 Sticks - EFRIS Code: 106
- ✅ Carton (Ctn) - EFRIS Code: 106
- ✅ Pack
- ✅ Set
- ✅ Bundle (Bdl)
- ✅ Roll
- ✅ Sheet (Sht)
- ✅ Ream (Rm)

### Weight (5 units)
- ✅ Kilogram (Kg) - EFRIS Code: 103
- ✅ Gram (g)
- ✅ 50 Kilograms (50kg)
- ✅ Ton (T) - EFRIS Code: 108
- ✅ Metric Ton (MT) - EFRIS Code: 107

### Volume/Capacity (2 units)
- ✅ Litre (L) - EFRIS Code: 104
- ✅ Millilitre (mL)

### Length/Distance (4 units)
- ✅ Meter (M) - EFRIS Code: 105
- ✅ Yard (Yd)
- ✅ Centimeter (cm)
- ✅ Millimeter (mm)

### Time-based (7 units)
- ✅ Hour (Hr) - EFRIS Code: 110
- ✅ Minute (Min)
- ✅ Day
- ✅ Per Week (/wk)
- ✅ Per Month (/mo)
- ✅ Per Annum (/yr)
- ✅ User per day of access (User/day)

### Currency-based (2 units)
- ✅ 1 UGX
- ✅ 1 USD

### Container Types (6 units)
- ✅ OT-Octabin
- ✅ OU-Container
- ✅ P2-Pan
- ✅ PA-Packet
- ✅ PB-Pallet, box
- ✅ PC-Parcel

### Area (3 units)
- ✅ Square Meter (m²)
- ✅ Hectare (Ha)
- ✅ Acre (Ac)

---

## Common Units You Might Want to Add

### Additional Containers/Packaging
```javascript
{ code: 'bag', name: 'Bag', abbreviation: 'Bag', category: 'container', efrisCode: 'BAG' },
{ code: 'bottle', name: 'Bottle', abbreviation: 'Btl', category: 'container', efrisCode: 'BTL' },
{ code: 'can', name: 'Can', abbreviation: 'Can', category: 'container', efrisCode: 'CAN' },
{ code: 'drum', name: 'Drum', abbreviation: 'Drm', category: 'container', efrisCode: 'DRM' },
{ code: 'jar', name: 'Jar', abbreviation: 'Jar', category: 'container', efrisCode: 'JAR' },
{ code: 'pallet', name: 'Pallet', abbreviation: 'Plt', category: 'container', efrisCode: 'PLT' },
{ code: 'sack', name: 'Sack', abbreviation: 'Sack', category: 'container', efrisCode: 'SACK' },
{ code: 'tube', name: 'Tube', abbreviation: 'Tube', category: 'container', efrisCode: 'TUBE' },
{ code: 'vial', name: 'Vial', abbreviation: 'Vial', category: 'container', efrisCode: 'VIAL' },
```

### Additional Weight Units
```javascript
{ code: 'lb', name: 'Pound', abbreviation: 'lb', category: 'weight', efrisCode: 'LB' },
{ code: 'oz', name: 'Ounce', abbreviation: 'oz', category: 'weight', efrisCode: 'OZ' },
{ code: 'quintal', name: 'Quintal', abbreviation: 'Q', category: 'weight', efrisCode: 'QTL' },
```

### Additional Volume Units
```javascript
{ code: 'gallon', name: 'Gallon', abbreviation: 'Gal', category: 'volume', efrisCode: 'GAL' },
{ code: 'barrel', name: 'Barrel', abbreviation: 'Bbl', category: 'volume', efrisCode: 'BBL' },
{ code: 'cup', name: 'Cup', abbreviation: 'Cup', category: 'volume', efrisCode: 'CUP' },
{ code: 'pint', name: 'Pint', abbreviation: 'Pt', category: 'volume', efrisCode: 'PT' },
```

### Additional Length Units
```javascript
{ code: 'km', name: 'Kilometer', abbreviation: 'km', category: 'length', efrisCode: 'KM' },
{ code: 'inch', name: 'Inch', abbreviation: 'in', category: 'length', efrisCode: 'IN' },
{ code: 'foot', name: 'Foot', abbreviation: 'ft', category: 'length', efrisCode: 'FT' },
{ code: 'mile', name: 'Mile', abbreviation: 'mi', category: 'length', efrisCode: 'MI' },
```

### Service-based Units
```javascript
{ code: 'session', name: 'Session', abbreviation: 'Sess', category: 'service', efrisCode: 'SESS' },
{ code: 'visit', name: 'Visit', abbreviation: 'Visit', category: 'service', efrisCode: 'VISIT' },
{ code: 'license', name: 'License', abbreviation: 'Lic', category: 'service', efrisCode: 'LIC' },
{ code: 'subscription', name: 'Subscription', abbreviation: 'Sub', category: 'service', efrisCode: 'SUB' },
```

---

## How to Run the Seed Script

### For demo organization:
```bash
cd client
node scripts/seed-efris-units.js demo-company
```

### For a different organization:
```bash
cd client
node scripts/seed-efris-units.js your-org-slug
```

### The script will:
1. ✅ Create new units that don't exist
2. ✅ Update existing units (if you modified names/abbreviations)
3. ✅ Skip units that had errors
4. ✅ Show summary of created/updated/skipped units

---

## Notes

- **Categories**: quantity, weight, volume, length, time, currency, container, area, service
- **EFRIS Codes**: These are the official codes used by EFRIS system
- **Code**: Must be unique within each organization (lowercase recommended)
- **Unit codes cannot be changed** after products are using them (to maintain data integrity)

---

## Need More Units?

If you have a complete list from EFRIS or Uganda Revenue Authority, paste them here and I can convert them to the proper format!
