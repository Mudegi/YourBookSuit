-- Quick Setup: Bank Reconciliation Demo Data
-- Run this in your database to create sample data for testing

-- 1. Get the demo organization ID
DO $$
DECLARE
  org_id TEXT;
  user_id TEXT;
  bank_account_id TEXT;
  gl_bank_account_id TEXT;
  expense_account_id TEXT;
BEGIN
  -- Get first organization (demo-company)
  SELECT id INTO org_id FROM "Organization" LIMIT 1;
  SELECT id INTO user_id FROM "User" LIMIT 1;
  
  -- Get or create GL Bank Account
  SELECT id INTO gl_bank_account_id 
  FROM "ChartOfAccount" 
  WHERE "organizationId" = org_id 
    AND "accountType" = 'ASSET' 
    AND "accountName" ILIKE '%bank%'
  LIMIT 1;
  
  -- Get an expense account for bank charges
  SELECT id INTO expense_account_id 
  FROM "ChartOfAccount" 
  WHERE "organizationId" = org_id 
    AND "accountType" = 'EXPENSE'
  LIMIT 1;

  -- 2. Create a Bank Account if it doesn't exist
  INSERT INTO "BankAccount" (
    id, "organizationId", "accountName", "accountNumber", 
    "bankName", currency, "currentBalance", "isActive", 
    "glAccountId", "createdAt", "updatedAt"
  )
  VALUES (
    'bank_' || gen_random_uuid()::text,
    org_id,
    'Stanbic Business Account',
    '1234567890',
    'Stanbic Bank Uganda',
    'UGX',
    5000000.00,
    true,
    gl_bank_account_id,
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO bank_account_id;
  
  -- Get the bank account ID if it already existed
  IF bank_account_id IS NULL THEN
    SELECT id INTO bank_account_id 
    FROM "BankAccount" 
    WHERE "organizationId" = org_id 
    LIMIT 1;
  END IF;

  -- 3. Create some sample payments (Book entries)
  INSERT INTO "Payment" (
    id, "organizationId", "paymentNumber", "paymentDate", 
    "paymentType", amount, currency, "paymentMethod", 
    "bankAccountId", notes, "isReconciled", 
    "createdAt", "updatedAt"
  )
  VALUES
    -- Customer Payment 1
    (
      'pay_' || gen_random_uuid()::text,
      org_id,
      'PAY-2026-001',
      '2026-01-28'::date,
      'CUSTOMER_PAYMENT',
      500000.00,
      'UGX',
      'BANK_TRANSFER',
      bank_account_id,
      'Payment from Customer A',
      false,
      NOW(),
      NOW()
    ),
    -- Customer Payment 2
    (
      'pay_' || gen_random_uuid()::text,
      org_id,
      'PAY-2026-002',
      '2026-01-29'::date,
      'CUSTOMER_PAYMENT',
      750000.00,
      'UGX',
      'BANK_TRANSFER',
      bank_account_id,
      'Payment from Customer B',
      false,
      NOW(),
      NOW()
    ),
    -- Vendor Payment
    (
      'pay_' || gen_random_uuid()::text,
      org_id,
      'PAY-2026-003',
      '2026-01-30'::date,
      'VENDOR_PAYMENT',
      300000.00,
      'UGX',
      'CHECK',
      bank_account_id,
      'Payment to Vendor X',
      false,
      NOW(),
      NOW()
    )
  ON CONFLICT DO NOTHING;

  -- 4. Create Bank Feed for transactions
  INSERT INTO "BankFeed" (
    id, "organizationId", "bankAccountId", "feedName",
    "feedType", status, "createdAt", "updatedAt"
  )
  VALUES (
    'feed_' || gen_random_uuid()::text,
    org_id,
    bank_account_id,
    'January 2026 Statement',
    'CSV_UPLOAD',
    'COMPLETED',
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO bank_account_id; -- Reusing variable

  -- 5. Create Bank Transactions (from bank statement)
  INSERT INTO "BankTransaction" (
    id, "organizationId", "bankFeedId", "transactionDate",
    amount, description, "transactionType", status,
    "isReconciled", "createdAt"
  )
  SELECT
    'btx_' || gen_random_uuid()::text,
    org_id,
    bf.id,
    '2026-01-28'::date,
    500000.00,
    'CREDIT - Customer Deposit',
    'CREDIT',
    'PENDING',
    false,
    NOW()
  FROM "BankFeed" bf
  WHERE bf."organizationId" = org_id
  LIMIT 1
  UNION ALL
  SELECT
    'btx_' || gen_random_uuid()::text,
    org_id,
    bf.id,
    '2026-01-29'::date,
    750000.00,
    'CREDIT - Wire Transfer In',
    'CREDIT',
    'PENDING',
    false,
    NOW()
  FROM "BankFeed" bf
  WHERE bf."organizationId" = org_id
  LIMIT 1
  UNION ALL
  SELECT
    'btx_' || gen_random_uuid()::text,
    org_id,
    bf.id,
    '2026-01-30'::date,
    -300000.00,
    'DEBIT - Check Payment',
    'DEBIT',
    'PENDING',
    false,
    NOW()
  FROM "BankFeed" bf
  WHERE bf."organizationId" = org_id
  LIMIT 1
  UNION ALL
  SELECT
    'btx_' || gen_random_uuid()::text,
    org_id,
    bf.id,
    '2026-01-31'::date,
    -15000.00,
    'DEBIT - Bank Charges',
    'DEBIT',
    'PENDING',
    false,
    NOW()
  FROM "BankFeed" bf
  WHERE bf."organizationId" = org_id
  LIMIT 1
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Demo data created successfully for organization: %', org_id;
END $$;
