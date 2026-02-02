# Migration Plan: YourBooks → New Organized Project

## Summary
The YourBooks folder contains a much more mature ERP system with **175 database models** compared to the new project's ~50 models. However, **all 378 client-side files are already identical** between both projects.

## Key Findings

### ✅ Already Migrated (Identical)
- **Client app modules**: All 378 files in `app/[orgSlug]/` are identical
- **Components**: All UI components match
- **Hooks**: All React hooks match  
- **Server services**: All service files match

### ❌ Major Differences

#### 1. Database Schema
- **YourBooks**: 5,313 lines, **175 models**
- **New Project**: ~1,000 lines, ~50 models

**Missing Models** (need to restore):
- Advanced inventory models (goods receipts, cycle counts, stock adjustments)
- Fixed assets (assets, depreciation, maintenance, disposal)
- Manufacturing (BOMs, work orders, assembly)
- CRM models
- HCM/Payroll models
- Advanced tax models (tax returns, withholding)
- Document management models
- Field service models
- MDM (Master Data Management) models
- Warehouse models
- Recurring transaction models
- Credit/Debit note models

#### 2. Architecture Issues in New Project
**WRONG**: Client-side services that should be server-side:
- `client/services/accounting/double-entry.service.ts` → Should be server-side
- `client/lib/coa-generator.ts` → Should be server-side  
- `client/prisma/` → Should only be in server/

**CORRECT** in YourBooks:
- `server/services/accounting/double-entry.service.ts`
- `server/lib/coa-generator.ts`
- Only server has Prisma client

## Migration Steps

### Step 1: Backup Current State
```powershell
# Create backup of new project's schema
Copy-Item "D:\BOOKKEEPING\server\prisma\schema.prisma" "D:\BOOKKEEPING\server\prisma\schema-new-backup.prisma"

# Create backup of new project's lib
Copy-Item -Recurse "D:\BOOKKEEPING\client\lib" "D:\BOOKKEEPING\client\lib-backup"
```

### Step 2: Restore Complete Database Schema
```powershell
# Copy the complete schema from YourBooks
Copy-Item "D:\BOOKKEEPING\YourBooks\server\prisma\schema.prisma" "D:\BOOKKEEPING\server\prisma\schema.prisma" -Force

# Also copy any seed files
Copy-Item "D:\BOOKKEEPING\YourBooks\server\prisma\seed*.ts" "D:\BOOKKEEPING\server\prisma\" -Force
```

### Step 3: Fix Architecture - Move Client-Side Services to Server
```powershell
# Delete incorrectly placed client-side Prisma and services
Remove-Item -Recurse "D:\BOOKKEEPING\client\prisma" -Force
Remove-Item -Recurse "D:\BOOKKEEPING\client\services" -Force

# Client lib is OK to keep (fetchWithAuth, etc.)
```

### Step 4: Restore Complete Server-Side Library
```powershell
# Copy all server lib files
robocopy "D:\BOOKKEEPING\YourBooks\server\lib" "D:\BOOKKEEPING\server\lib" /E /IS
```

### Step 5: Update Client Code to Use Server APIs
The client-side code that used `DoubleEntryService` and `coa-generator` directly needs to call server APIs instead.

**Files to Update:**
- `client/app/api/onboarding/complete/route.ts` - Remove direct DoubleEntryService import, call backend API
- `client/app/api/onboarding/seed-coa/route.ts` - Should call backend API for COA generation

### Step 6: Run Database Migration
```powershell
cd D:\BOOKKEEPING\server
npx prisma migrate dev --name restore_complete_schema
npx prisma generate
```

### Step 7: Copy Any Missing Server Scripts
```powershell
robocopy "D:\BOOKKEEPING\YourBooks\server\scripts" "D:\BOOKKEEPING\server\scripts" /E /IS
```

### Step 8: Update Environment Variables
Check if YourBooks has additional env vars needed:
```powershell
Compare-Object (Get-Content "D:\BOOKKEEPING\YourBooks\.env") (Get-Content "D:\BOOKKEEPING\server\.env")
```

### Step 9: Restart and Test
```powershell
# Stop current servers
taskkill /F /IM node.exe

# Start backend
cd D:\BOOKKEEPING\server
npm run dev

# Start frontend
cd D:\BOOKKEEPING\client  
npm run dev
```

## Post-Migration Testing

1. ✅ Login works
2. ✅ Onboarding flow works
3. ✅ Dashboard loads
4. ✅ Check all modules have data models:
   - Inventory
   - Fixed Assets
   - Manufacturing
   - CRM
   - HCM
   - Warehouse
   - Recurring templates

## Rollback Plan

If migration fails:
```powershell
# Restore schema backup
Copy-Item "D:\BOOKKEEPING\server\prisma\schema-new-backup.prisma" "D:\BOOKKEEPING\server\prisma\schema.prisma" -Force

# Regenerate Prisma client
cd D:\BOOKKEEPING\server
npx prisma generate
```

## Notes

- The new project's JWT authentication and API routing structure is BETTER than YourBooks
- Keep the new project's clean separation of client/server folders
- Only restore the database models and server-side business logic from YourBooks
- The UI files (page.tsx) are already present and identical
