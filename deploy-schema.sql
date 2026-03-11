-- CreateTable
CREATE TABLE `Organization` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `legalName` VARCHAR(191) NULL,
    `taxIdNumber` VARCHAR(191) NULL,
    `tradingLicense` VARCHAR(191) NULL,
    `baseCurrency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `fiscalYearStart` INTEGER NOT NULL DEFAULT 1,
    `homeCountry` VARCHAR(191) NOT NULL DEFAULT 'US',
    `compliancePack` VARCHAR(191) NOT NULL DEFAULT 'DEFAULT',
    `address` TEXT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `logo` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `onboardingCompleted` BOOLEAN NOT NULL DEFAULT false,
    `industry` VARCHAR(191) NULL,
    `businessModel` VARCHAR(191) NOT NULL DEFAULT 'GENERAL',
    `subscriptionStatus` ENUM('TRIAL', 'TRIAL_EXPIRED', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED') NOT NULL DEFAULT 'TRIAL',
    `trialStartDate` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `trialEndDate` DATETIME(3) NULL,
    `subscriptionStartDate` DATETIME(3) NULL,
    `subscriptionEndDate` DATETIME(3) NULL,
    `approvedAt` DATETIME(3) NULL,
    `approvedById` VARCHAR(191) NULL,
    `suspendedReason` TEXT NULL,
    `fxGainAccountId` VARCHAR(191) NULL,
    `fxLossAccountId` VARCHAR(191) NULL,
    `unrealizedFxGainAccountId` VARCHAR(191) NULL,
    `unrealizedFxLossAccountId` VARCHAR(191) NULL,
    `defaultExchangeRateProvider` VARCHAR(191) NULL DEFAULT 'MANUAL',
    `enableAutoFetchRates` BOOLEAN NOT NULL DEFAULT false,
    `exchangeRateBufferPercent` DECIMAL(5, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Organization_slug_key`(`slug`),
    INDEX `Organization_slug_idx`(`slug`),
    INDEX `Organization_homeCountry_idx`(`homeCountry`),
    INDEX `Organization_compliancePack_idx`(`compliancePack`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UnitOfMeasure` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `abbreviation` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UnitOfMeasure_organizationId_idx`(`organizationId`),
    UNIQUE INDEX `UnitOfMeasure_organizationId_code_key`(`organizationId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Branch` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('HEADQUARTERS', 'OFFICE', 'WAREHOUSE', 'RETAIL_STORE', 'MANUFACTURING', 'DISTRIBUTION_CENTER', 'SERVICE_CENTER', 'REMOTE') NOT NULL DEFAULT 'OFFICE',
    `address` TEXT NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `managerId` VARCHAR(191) NULL,
    `isHeadquarters` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `openingDate` DATETIME(3) NULL,
    `closingDate` DATETIME(3) NULL,
    `taxIdNumber` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'UTC',
    `prefix` VARCHAR(191) NOT NULL DEFAULT '',
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Branch_organizationId_idx`(`organizationId`),
    INDEX `Branch_isActive_idx`(`isActive`),
    UNIQUE INDEX `Branch_organizationId_code_key`(`organizationId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentSequence` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `documentType` ENUM('INVOICE', 'BILL', 'SALES_RECEIPT', 'CREDIT_NOTE', 'DEBIT_NOTE', 'PAYMENT', 'CUSTOMER', 'VENDOR', 'TRANSACTION', 'JOURNAL', 'INTER_BRANCH_TRANSFER') NOT NULL,
    `prefix` VARCHAR(191) NOT NULL DEFAULT '',
    `currentNumber` INTEGER NOT NULL DEFAULT 0,
    `year` INTEGER NULL,
    `month` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DocumentSequence_organizationId_idx`(`organizationId`),
    INDEX `DocumentSequence_branchId_idx`(`branchId`),
    UNIQUE INDEX `DocumentSequence_organizationId_branchId_documentType_year_m_key`(`organizationId`, `branchId`, `documentType`, `year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Integration` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('PAYMENT_GATEWAY', 'BANKING', 'ACCOUNTING', 'E_COMMERCE', 'CRM', 'INVENTORY', 'PAYROLL', 'TAX_FILING', 'REPORTING', 'CUSTOM_API', 'WEBHOOK', 'E_INVOICING', 'TAX_ENGINE', 'SHIPPING_CARRIER', 'POS', 'CPQ', 'PLM') NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'ERROR', 'PENDING', 'SUSPENDED') NOT NULL DEFAULT 'INACTIVE',
    `apiKey` VARCHAR(191) NULL,
    `apiSecret` VARCHAR(191) NULL,
    `webhookUrl` VARCHAR(191) NULL,
    `webhookSecret` VARCHAR(191) NULL,
    `config` JSON NULL,
    `lastSyncAt` DATETIME(3) NULL,
    `syncFrequency` VARCHAR(191) NULL,
    `errorCount` INTEGER NOT NULL DEFAULT 0,
    `lastError` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Integration_organizationId_idx`(`organizationId`),
    INDEX `Integration_type_status_idx`(`type`, `status`),
    UNIQUE INDEX `Integration_organizationId_provider_key`(`organizationId`, `provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Webhook` (
    `id` VARCHAR(191) NOT NULL,
    `integrationId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `secret` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `retryCount` INTEGER NOT NULL DEFAULT 0,
    `maxRetries` INTEGER NOT NULL DEFAULT 3,
    `timeoutSeconds` INTEGER NOT NULL DEFAULT 30,
    `lastTriggeredAt` DATETIME(3) NULL,
    `lastSuccess` DATETIME(3) NULL,
    `lastFailure` DATETIME(3) NULL,
    `failureReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Webhook_integrationId_idx`(`integrationId`),
    INDEX `Webhook_eventType_idx`(`eventType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WebhookLog` (
    `id` VARCHAR(191) NOT NULL,
    `webhookId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `responseStatus` INTEGER NULL,
    `responseBody` VARCHAR(191) NULL,
    `success` BOOLEAN NOT NULL,
    `errorMessage` VARCHAR(191) NULL,
    `executionTime` INTEGER NULL,
    `attemptNumber` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WebhookLog_webhookId_idx`(`webhookId`),
    INDEX `WebhookLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IntegrationLog` (
    `id` VARCHAR(191) NOT NULL,
    `integrationId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `recordsProcessed` INTEGER NOT NULL DEFAULT 0,
    `recordsFailed` INTEGER NOT NULL DEFAULT 0,
    `errorMessage` VARCHAR(191) NULL,
    `details` JSON NULL,
    `startedAt` DATETIME(3) NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `duration` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IntegrationLog_integrationId_idx`(`integrationId`),
    INDEX `IntegrationLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApiKey` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `prefix` VARCHAR(191) NOT NULL,
    `rateLimit` INTEGER NOT NULL DEFAULT 1000,
    `expiresAt` DATETIME(3) NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ApiKey_key_key`(`key`),
    INDEX `ApiKey_organizationId_idx`(`organizationId`),
    INDEX `ApiKey_key_idx`(`key`),
    INDEX `ApiKey_isActive_expiresAt_idx`(`isActive`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `avatar` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `isSystemAdmin` BOOLEAN NOT NULL DEFAULT false,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrganizationUser` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'ACCOUNTANT', 'MANAGER', 'VIEWER') NOT NULL DEFAULT 'VIEWER',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `branchRestricted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OrganizationUser_organizationId_idx`(`organizationId`),
    INDEX `OrganizationUser_userId_idx`(`userId`),
    UNIQUE INDEX `OrganizationUser_organizationId_userId_key`(`organizationId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserBranchAccess` (
    `id` VARCHAR(191) NOT NULL,
    `organizationUserId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `grantedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserBranchAccess_organizationUserId_idx`(`organizationUserId`),
    INDEX `UserBranchAccess_branchId_idx`(`branchId`),
    UNIQUE INDEX `UserBranchAccess_organizationUserId_branchId_key`(`organizationUserId`, `branchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrganizationInvite` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED') NOT NULL DEFAULT 'PENDING',
    `expiresAt` DATETIME(3) NULL,
    `invitedById` VARCHAR(191) NOT NULL,
    `acceptedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OrganizationInvite_token_key`(`token`),
    INDEX `OrganizationInvite_organizationId_idx`(`organizationId`),
    INDEX `OrganizationInvite_email_idx`(`email`),
    INDEX `OrganizationInvite_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChartOfAccount` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `accountType` ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'COST_OF_SALES') NOT NULL,
    `accountSubType` VARCHAR(191) NULL,
    `parentId` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `allowManualJournal` BOOLEAN NOT NULL DEFAULT true,
    `requiresDimension` BOOLEAN NOT NULL DEFAULT false,
    `isBankAccount` BOOLEAN NOT NULL DEFAULT false,
    `balance` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `foreignBalance` DECIMAL(19, 4) NULL,
    `level` INTEGER NOT NULL DEFAULT 0,
    `hasChildren` BOOLEAN NOT NULL DEFAULT false,
    `fullPath` VARCHAR(191) NULL,
    `tags` JSON NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ChartOfAccount_organizationId_accountType_idx`(`organizationId`, `accountType`),
    INDEX `ChartOfAccount_parentId_idx`(`parentId`),
    INDEX `ChartOfAccount_currency_idx`(`currency`),
    INDEX `ChartOfAccount_isActive_idx`(`isActive`),
    UNIQUE INDEX `ChartOfAccount_organizationId_code_key`(`organizationId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaction` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `transactionNumber` VARCHAR(191) NOT NULL,
    `transactionDate` DATETIME(3) NOT NULL,
    `transactionType` ENUM('JOURNAL_ENTRY', 'INVOICE', 'BILL', 'PAYMENT', 'RECEIPT', 'BANK_TRANSFER', 'INVENTORY_ADJUSTMENT', 'DEPRECIATION', 'OPENING_BALANCE', 'CLOSING_ENTRY') NOT NULL,
    `referenceType` VARCHAR(191) NULL,
    `referenceId` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `notes` TEXT NULL,
    `attachments` JSON NOT NULL,
    `status` ENUM('DRAFT', 'POSTED', 'VOIDED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `isReconciled` BOOLEAN NOT NULL DEFAULT false,
    `createdById` VARCHAR(191) NOT NULL,
    `approvedById` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `taxCategory` VARCHAR(191) NULL,
    `taxAmount` DECIMAL(19, 4) NULL,
    `taxReturnId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `isLocked` BOOLEAN NOT NULL DEFAULT false,
    `lockedAt` DATETIME(3) NULL,
    `lockedByReconciliationId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Transaction_organizationId_transactionDate_idx`(`organizationId`, `transactionDate`),
    INDEX `Transaction_organizationId_transactionType_idx`(`organizationId`, `transactionType`),
    INDEX `Transaction_branchId_idx`(`branchId`),
    INDEX `Transaction_referenceType_referenceId_idx`(`referenceType`, `referenceId`),
    INDEX `Transaction_taxCategory_idx`(`taxCategory`),
    INDEX `Transaction_taxReturnId_idx`(`taxReturnId`),
    UNIQUE INDEX `Transaction_organizationId_transactionNumber_key`(`organizationId`, `transactionNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LedgerEntry` (
    `id` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `entryType` ENUM('DEBIT', 'CREDIT') NOT NULL,
    `amount` DECIMAL(19, 4) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `exchangeRate` DECIMAL(12, 6) NOT NULL DEFAULT 1,
    `amountInBase` DECIMAL(19, 4) NOT NULL,
    `description` TEXT NULL,
    `reconciled` BOOLEAN NOT NULL DEFAULT false,
    `reconciledAt` DATETIME(3) NULL,
    `isLocked` BOOLEAN NOT NULL DEFAULT false,
    `lockedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LedgerEntry_transactionId_idx`(`transactionId`),
    INDEX `LedgerEntry_accountId_idx`(`accountId`),
    INDEX `LedgerEntry_entryType_idx`(`entryType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `customerNumber` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `taxIdNumber` VARCHAR(191) NULL,
    `paymentTerms` INTEGER NOT NULL DEFAULT 30,
    `paymentTermId` VARCHAR(191) NULL,
    `creditLimit` DECIMAL(19, 4) NULL,
    `billingAddress` JSON NULL,
    `shippingAddress` JSON NULL,
    `notes` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `region` VARCHAR(191) NULL,
    `taxCategory` VARCHAR(191) NULL,
    `taxExempt` BOOLEAN NOT NULL DEFAULT false,
    `taxExemptionReason` TEXT NULL,
    `buyerType` VARCHAR(191) NOT NULL DEFAULT '1',
    `defaultRevenueAccountId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `branchId` VARCHAR(191) NULL,

    INDEX `Customer_organizationId_idx`(`organizationId`),
    INDEX `Customer_email_idx`(`email`),
    INDEX `Customer_paymentTermId_idx`(`paymentTermId`),
    UNIQUE INDEX `Customer_organizationId_customerNumber_key`(`organizationId`, `customerNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invoice` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `invoiceNumber` VARCHAR(191) NOT NULL,
    `invoiceDate` DATETIME(3) NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `exchangeRate` DECIMAL(12, 6) NOT NULL DEFAULT 1,
    `baseCurrencyTotal` DECIMAL(19, 4) NULL,
    `subtotal` DECIMAL(19, 4) NOT NULL,
    `taxAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `discountAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `shippingAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `total` DECIMAL(19, 4) NOT NULL,
    `amountPaid` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `amountDue` DECIMAL(19, 4) NOT NULL,
    `taxCalculationMethod` VARCHAR(191) NOT NULL DEFAULT 'EXCLUSIVE',
    `status` ENUM('DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'VOIDED') NOT NULL DEFAULT 'DRAFT',
    `approvalStatus` VARCHAR(191) NULL,
    `approvedById` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `reference` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `terms` TEXT NULL,
    `attachments` JSON NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `warehouseId` VARCHAR(191) NULL,
    `priceListId` VARCHAR(191) NULL,
    `whtApplicable` BOOLEAN NOT NULL DEFAULT false,
    `whtAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `whtRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `transactionId` VARCHAR(191) NULL,
    `buyerType` VARCHAR(191) NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `inventoryCommitted` BOOLEAN NOT NULL DEFAULT false,
    `inventoryCommittedAt` DATETIME(3) NULL,
    `creditCheckPassed` BOOLEAN NOT NULL DEFAULT true,
    `creditCheckNotes` TEXT NULL,
    `requiresApproval` BOOLEAN NOT NULL DEFAULT false,
    `approvalReason` TEXT NULL,
    `salespersonId` VARCHAR(191) NULL,
    `commissionRate` DECIMAL(5, 2) NULL,
    `commissionAmount` DECIMAL(19, 4) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Invoice_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `Invoice_customerId_idx`(`customerId`),
    INDEX `Invoice_branchId_idx`(`branchId`),
    INDEX `Invoice_createdById_idx`(`createdById`),
    INDEX `Invoice_salespersonId_idx`(`salespersonId`),
    UNIQUE INDEX `Invoice_organizationId_invoiceNumber_key`(`organizationId`, `invoiceNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvoiceItem` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `serviceId` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `quantity` DECIMAL(12, 4) NOT NULL,
    `unitPrice` DECIMAL(19, 4) NOT NULL,
    `netAmount` DECIMAL(19, 4) NULL,
    `listPrice` DECIMAL(19, 4) NULL,
    `discount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `discountPercent` DECIMAL(5, 2) NULL,
    `taxRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `taxCategory` VARCHAR(191) NULL,
    `taxRateId` VARCHAR(191) NULL,
    `taxAgencyRateId` VARCHAR(191) NULL,
    `taxExempt` BOOLEAN NOT NULL DEFAULT false,
    `taxExemptReason` TEXT NULL,
    `discountFlag` VARCHAR(191) NOT NULL DEFAULT '2',
    `deemedFlag` VARCHAR(191) NOT NULL DEFAULT '2',
    `exciseFlag` VARCHAR(191) NOT NULL DEFAULT '2',
    `exciseTax` DECIMAL(19, 4) NULL,
    `exciseCurrency` VARCHAR(191) NULL,
    `exciseRateName` TEXT NULL,
    `subtotal` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `total` DECIMAL(19, 4) NOT NULL,
    `warehouseId` VARCHAR(191) NULL,
    `stockReservedQty` DECIMAL(12, 4) NULL,
    `stockCommitted` BOOLEAN NOT NULL DEFAULT false,
    `priceListItemId` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,

    INDEX `InvoiceItem_invoiceId_idx`(`invoiceId`),
    INDEX `InvoiceItem_productId_idx`(`productId`),
    INDEX `InvoiceItem_serviceId_idx`(`serviceId`),
    INDEX `InvoiceItem_taxRateId_idx`(`taxRateId`),
    INDEX `InvoiceItem_taxAgencyRateId_idx`(`taxAgencyRateId`),
    INDEX `InvoiceItem_warehouseId_idx`(`warehouseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvoiceTaxLine` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceItemId` VARCHAR(191) NOT NULL,
    `taxRuleId` VARCHAR(191) NULL,
    `jurisdictionId` VARCHAR(191) NULL,
    `taxType` VARCHAR(191) NOT NULL,
    `rate` DECIMAL(5, 2) NOT NULL,
    `baseAmount` DECIMAL(19, 4) NOT NULL,
    `taxAmount` DECIMAL(19, 4) NOT NULL,
    `isCompound` BOOLEAN NOT NULL DEFAULT false,
    `compoundSequence` INTEGER NOT NULL DEFAULT 1,
    `isWithholding` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InvoiceTaxLine_invoiceItemId_idx`(`invoiceItemId`),
    INDEX `InvoiceTaxLine_taxRuleId_idx`(`taxRuleId`),
    INDEX `InvoiceTaxLine_jurisdictionId_idx`(`jurisdictionId`),
    INDEX `InvoiceTaxLine_isWithholding_idx`(`isWithholding`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Estimate` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `estimateNumber` VARCHAR(191) NOT NULL,
    `estimateDate` DATETIME(3) NOT NULL,
    `expirationDate` DATETIME(3) NOT NULL,
    `status` ENUM('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'INVOICED') NOT NULL DEFAULT 'DRAFT',
    `versionNumber` INTEGER NOT NULL DEFAULT 1,
    `sourceEstimateId` VARCHAR(191) NULL,
    `convertedInvoiceId` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `exchangeRate` DECIMAL(12, 6) NOT NULL DEFAULT 1,
    `baseCurrencyTotal` DECIMAL(19, 4) NULL,
    `taxCalculationMethod` VARCHAR(191) NOT NULL DEFAULT 'EXCLUSIVE',
    `subtotal` DECIMAL(19, 4) NOT NULL,
    `taxAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `discountAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `shippingAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `total` DECIMAL(19, 4) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `terms` TEXT NULL,
    `attachments` JSON NOT NULL,
    `deliveryAddress` JSON NULL,
    `salespersonId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `sentAt` DATETIME(3) NULL,
    `acceptedAt` DATETIME(3) NULL,
    `declinedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Estimate_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `Estimate_customerId_idx`(`customerId`),
    INDEX `Estimate_expirationDate_idx`(`expirationDate`),
    INDEX `Estimate_createdById_idx`(`createdById`),
    UNIQUE INDEX `Estimate_organizationId_estimateNumber_key`(`organizationId`, `estimateNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EstimateItem` (
    `id` VARCHAR(191) NOT NULL,
    `estimateId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `serviceId` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `isOptional` BOOLEAN NOT NULL DEFAULT false,
    `quantity` DECIMAL(12, 4) NOT NULL,
    `unitPrice` DECIMAL(19, 4) NOT NULL,
    `discount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `discountPercent` DECIMAL(5, 2) NULL,
    `taxRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `taxCategory` VARCHAR(191) NULL,
    `taxRateId` VARCHAR(191) NULL,
    `taxExempt` BOOLEAN NOT NULL DEFAULT false,
    `subtotal` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `total` DECIMAL(19, 4) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,

    INDEX `EstimateItem_estimateId_idx`(`estimateId`),
    INDEX `EstimateItem_productId_idx`(`productId`),
    INDEX `EstimateItem_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesReceipt` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `receiptNumber` VARCHAR(191) NOT NULL,
    `receiptDate` DATETIME(3) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `exchangeRate` DECIMAL(12, 6) NOT NULL DEFAULT 1,
    `baseCurrencyTotal` DECIMAL(19, 4) NULL,
    `subtotal` DECIMAL(19, 4) NOT NULL,
    `taxAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `discountAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `total` DECIMAL(19, 4) NOT NULL,
    `taxCalculationMethod` VARCHAR(191) NOT NULL DEFAULT 'INCLUSIVE',
    `paymentMethod` ENUM('CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_MONEY', 'ONLINE_PAYMENT', 'OTHER') NOT NULL,
    `referenceNumber` VARCHAR(191) NULL,
    `depositToAccountId` VARCHAR(191) NOT NULL,
    `mobileNetwork` VARCHAR(191) NULL,
    `payerPhoneNumber` VARCHAR(191) NULL,
    `branchId` VARCHAR(191) NULL,
    `warehouseId` VARCHAR(191) NULL,
    `status` ENUM('COMPLETED', 'VOIDED') NOT NULL DEFAULT 'COMPLETED',
    `voidedAt` DATETIME(3) NULL,
    `voidReason` TEXT NULL,
    `reference` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `transactionId` VARCHAR(191) NULL,
    `inventoryDeducted` BOOLEAN NOT NULL DEFAULT false,
    `inventoryDeductedAt` DATETIME(3) NULL,
    `salespersonId` VARCHAR(191) NULL,
    `commissionRate` DECIMAL(5, 2) NULL,
    `commissionAmount` DECIMAL(19, 4) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SalesReceipt_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `SalesReceipt_customerId_idx`(`customerId`),
    INDEX `SalesReceipt_depositToAccountId_idx`(`depositToAccountId`),
    INDEX `SalesReceipt_branchId_idx`(`branchId`),
    INDEX `SalesReceipt_createdById_idx`(`createdById`),
    INDEX `SalesReceipt_paymentMethod_idx`(`paymentMethod`),
    UNIQUE INDEX `SalesReceipt_organizationId_receiptNumber_key`(`organizationId`, `receiptNumber`),
    UNIQUE INDEX `SalesReceipt_organizationId_referenceNumber_receiptDate_key`(`organizationId`, `referenceNumber`, `receiptDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesReceiptItem` (
    `id` VARCHAR(191) NOT NULL,
    `salesReceiptId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `serviceId` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `quantity` DECIMAL(19, 4) NOT NULL,
    `unitPrice` DECIMAL(19, 4) NOT NULL,
    `discount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `discountType` VARCHAR(191) NOT NULL DEFAULT 'AMOUNT',
    `taxAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `taxRuleId` VARCHAR(191) NULL,
    `lineTotal` DECIMAL(19, 4) NOT NULL,
    `warehouseId` VARCHAR(191) NULL,
    `lotNumber` VARCHAR(191) NULL,
    `serialNumber` VARCHAR(191) NULL,
    `unitCost` DECIMAL(19, 4) NULL,

    INDEX `SalesReceiptItem_salesReceiptId_idx`(`salesReceiptId`),
    INDEX `SalesReceiptItem_productId_idx`(`productId`),
    INDEX `SalesReceiptItem_serviceId_idx`(`serviceId`),
    INDEX `SalesReceiptItem_warehouseId_idx`(`warehouseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SalesReceiptTaxLine` (
    `id` VARCHAR(191) NOT NULL,
    `salesReceiptItemId` VARCHAR(191) NOT NULL,
    `taxRuleId` VARCHAR(191) NULL,
    `jurisdictionId` VARCHAR(191) NULL,
    `taxType` VARCHAR(191) NOT NULL,
    `rate` DECIMAL(5, 2) NOT NULL,
    `baseAmount` DECIMAL(19, 4) NOT NULL,
    `taxAmount` DECIMAL(19, 4) NOT NULL,
    `isCompound` BOOLEAN NOT NULL DEFAULT false,
    `compoundSequence` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SalesReceiptTaxLine_salesReceiptItemId_idx`(`salesReceiptItemId`),
    INDEX `SalesReceiptTaxLine_taxRuleId_idx`(`taxRuleId`),
    INDEX `SalesReceiptTaxLine_jurisdictionId_idx`(`jurisdictionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vendor` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `vendorNumber` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NOT NULL,
    `contactName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `taxIdNumber` VARCHAR(191) NULL,
    `paymentTerms` INTEGER NOT NULL DEFAULT 30,
    `paymentTermId` VARCHAR(191) NULL,
    `bankAccount` JSON NULL,
    `billingAddress` JSON NULL,
    `notes` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `branchId` VARCHAR(191) NULL,

    INDEX `Vendor_organizationId_idx`(`organizationId`),
    INDEX `Vendor_paymentTermId_idx`(`paymentTermId`),
    UNIQUE INDEX `Vendor_organizationId_vendorNumber_key`(`organizationId`, `vendorNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseOrder` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NULL,
    `poNumber` VARCHAR(191) NOT NULL,
    `poDate` DATETIME(3) NOT NULL,
    `expectedDate` DATETIME(3) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `exchangeRate` DECIMAL(12, 6) NOT NULL DEFAULT 1,
    `subtotal` DECIMAL(19, 4) NOT NULL,
    `taxAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `total` DECIMAL(19, 4) NOT NULL,
    `status` ENUM('DRAFT', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PurchaseOrder_organizationId_status_idx`(`organizationId`, `status`),
    UNIQUE INDEX `PurchaseOrder_organizationId_poNumber_key`(`organizationId`, `poNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseOrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `purchaseOrderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `quantity` DECIMAL(12, 4) NOT NULL,
    `receivedQty` DECIMAL(12, 4) NOT NULL DEFAULT 0,
    `unitPrice` DECIMAL(19, 4) NOT NULL,
    `taxRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(19, 4) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `PurchaseOrderItem_purchaseOrderId_idx`(`purchaseOrderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GoodsReceipt` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `receiptNumber` VARCHAR(191) NOT NULL,
    `purchaseOrderId` VARCHAR(191) NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NULL,
    `receiptDate` DATETIME(3) NOT NULL,
    `referenceNumber` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `exchangeRate` DECIMAL(12, 6) NOT NULL DEFAULT 1,
    `subtotal` DECIMAL(19, 4) NOT NULL,
    `taxAmount` DECIMAL(19, 4) NOT NULL,
    `total` DECIMAL(19, 4) NOT NULL,
    `status` ENUM('DRAFT', 'RECEIVED', 'QC_PENDING', 'QC_PASSED', 'QC_FAILED', 'POSTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `notes` TEXT NULL,
    `freightCost` DECIMAL(19, 4) NULL,
    `insuranceCost` DECIMAL(19, 4) NULL,
    `customsDuty` DECIMAL(19, 4) NULL,
    `otherCosts` DECIMAL(19, 4) NULL,
    `landedCostMethod` ENUM('BY_VALUE', 'BY_WEIGHT', 'BY_VOLUME', 'BY_QUANTITY', 'MANUAL') NULL,
    `glTransactionId` VARCHAR(191) NULL,
    `apBillId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GoodsReceipt_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `GoodsReceipt_purchaseOrderId_idx`(`purchaseOrderId`),
    INDEX `GoodsReceipt_vendorId_idx`(`vendorId`),
    UNIQUE INDEX `GoodsReceipt_organizationId_receiptNumber_key`(`organizationId`, `receiptNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GoodsReceiptItem` (
    `id` VARCHAR(191) NOT NULL,
    `goodsReceiptId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `poItemId` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `quantity` DECIMAL(12, 4) NOT NULL,
    `unitPrice` DECIMAL(19, 4) NOT NULL,
    `taxRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `total` DECIMAL(19, 4) NOT NULL,
    `originalUnitCost` DECIMAL(19, 4) NOT NULL,
    `landedUnitCost` DECIMAL(19, 4) NULL,
    `qcStatus` ENUM('PENDING', 'PASSED', 'FAILED', 'PARTIAL') NULL DEFAULT 'PENDING',
    `qcNotes` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `GoodsReceiptItem_goodsReceiptId_idx`(`goodsReceiptId`),
    INDEX `GoodsReceiptItem_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bill` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `purchaseOrderId` VARCHAR(191) NULL,
    `billNumber` VARCHAR(191) NOT NULL,
    `vendorInvoiceNo` VARCHAR(191) NULL,
    `billDate` DATETIME(3) NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `exchangeRate` DECIMAL(12, 6) NOT NULL DEFAULT 1,
    `subtotal` DECIMAL(19, 4) NOT NULL,
    `taxAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `total` DECIMAL(19, 4) NOT NULL,
    `amountPaid` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `amountDue` DECIMAL(19, 4) NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'VOIDED') NOT NULL DEFAULT 'DRAFT',
    `notes` TEXT NULL,
    `attachments` JSON NOT NULL,
    `transactionId` VARCHAR(191) NULL,
    `whtApplicable` BOOLEAN NOT NULL DEFAULT false,
    `whtAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `whtRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `whtCertificateNo` VARCHAR(191) NULL,
    `stockInType` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `branchId` VARCHAR(191) NULL,

    INDEX `Bill_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `Bill_vendorId_idx`(`vendorId`),
    UNIQUE INDEX `Bill_organizationId_billNumber_key`(`organizationId`, `billNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BillItem` (
    `id` VARCHAR(191) NOT NULL,
    `billId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `serviceId` VARCHAR(191) NULL,
    `accountId` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `quantity` DECIMAL(12, 4) NOT NULL,
    `unitPrice` DECIMAL(19, 4) NOT NULL,
    `taxRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `total` DECIMAL(19, 4) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `taxRateId` VARCHAR(191) NULL,
    `taxAgencyRateId` VARCHAR(191) NULL,
    `taxCategory` VARCHAR(191) NULL,
    `claimInputTax` BOOLEAN NOT NULL DEFAULT true,

    INDEX `BillItem_billId_idx`(`billId`),
    INDEX `BillItem_serviceId_idx`(`serviceId`),
    INDEX `BillItem_taxRateId_idx`(`taxRateId`),
    INDEX `BillItem_taxAgencyRateId_idx`(`taxAgencyRateId`),
    INDEX `BillItem_accountId_idx`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `paymentNumber` VARCHAR(191) NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL,
    `paymentType` ENUM('RECEIPT', 'PAYMENT', 'INTERNAL_TRANSFER') NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `amount` DECIMAL(19, 4) NOT NULL,
    `allocatedAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `exchangeRate` DECIMAL(12, 6) NOT NULL DEFAULT 1,
    `fxGainLossAmount` DECIMAL(19, 4) NULL,
    `fxGainLossAccountId` VARCHAR(191) NULL,
    `baseCurrencyAmount` DECIMAL(19, 4) NULL,
    `paymentMethod` ENUM('CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'MOBILE_MONEY', 'ONLINE_PAYMENT', 'OTHER') NOT NULL,
    `referenceNumber` VARCHAR(191) NULL,
    `mobileMoneyProvider` VARCHAR(191) NULL,
    `mobileMoneyTxnId` VARCHAR(191) NULL,
    `bankAccountId` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NULL,
    `vendorId` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `attachments` JSON NOT NULL,
    `transactionId` VARCHAR(191) NULL,
    `isReconciled` BOOLEAN NOT NULL DEFAULT false,
    `reconciledDate` DATETIME(3) NULL,
    `reconciliationId` VARCHAR(191) NULL,
    `isLocked` BOOLEAN NOT NULL DEFAULT false,
    `lockedAt` DATETIME(3) NULL,
    `voidedAt` DATETIME(3) NULL,
    `voidedById` VARCHAR(191) NULL,
    `voidReason` TEXT NULL,
    `createdById` VARCHAR(191) NULL,
    `updatedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Payment_organizationId_paymentDate_idx`(`organizationId`, `paymentDate`),
    INDEX `Payment_customerId_idx`(`customerId`),
    INDEX `Payment_vendorId_idx`(`vendorId`),
    INDEX `Payment_createdById_idx`(`createdById`),
    INDEX `Payment_isReconciled_idx`(`isReconciled`),
    INDEX `Payment_reconciliationId_idx`(`reconciliationId`),
    INDEX `Payment_currency_idx`(`currency`),
    INDEX `Payment_status_idx`(`status`),
    UNIQUE INDEX `Payment_organizationId_paymentNumber_key`(`organizationId`, `paymentNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentEvent` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `externalId` VARCHAR(191) NULL,
    `payload` JSON NOT NULL,
    `rawPayload` VARCHAR(191) NULL,
    `paymentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PaymentEvent_organizationId_provider_reference_idx`(`organizationId`, `provider`, `reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentAllocation` (
    `id` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NULL,
    `billId` VARCHAR(191) NULL,
    `amount` DECIMAL(19, 4) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PaymentAllocation_paymentId_idx`(`paymentId`),
    INDEX `PaymentAllocation_invoiceId_idx`(`invoiceId`),
    INDEX `PaymentAllocation_billId_idx`(`billId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentTerm` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `daysUntilDue` INTEGER NOT NULL,
    `discountPercentage` DECIMAL(5, 2) NULL,
    `discountDays` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PaymentTerm_organizationId_idx`(`organizationId`),
    INDEX `PaymentTerm_isDefault_idx`(`isDefault`),
    UNIQUE INDEX `PaymentTerm_organizationId_code_key`(`organizationId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BankAccount` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `accountName` VARCHAR(191) NOT NULL,
    `accountNumber` VARCHAR(191) NOT NULL,
    `bankName` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `accountType` ENUM('CHECKING', 'SAVINGS', 'CREDIT_CARD', 'LINE_OF_CREDIT', 'MONEY_MARKET', 'CASH', 'MOBILE_MONEY', 'OTHER') NOT NULL,
    `openingBalance` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `currentBalance` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `statementBalance` DECIMAL(19, 4) NULL,
    `glAccountId` VARCHAR(191) NULL,
    `routingNumber` VARCHAR(191) NULL,
    `swiftCode` VARCHAR(191) NULL,
    `mobileMerchantId` VARCHAR(191) NULL,
    `mobileShortcode` VARCHAR(191) NULL,
    `lastReconciledDate` DATETIME(3) NULL,
    `lastReconciledBalance` DECIMAL(19, 4) NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `branchId` VARCHAR(191) NULL,

    INDEX `BankAccount_organizationId_idx`(`organizationId`),
    INDEX `BankAccount_organizationId_accountType_idx`(`organizationId`, `accountType`),
    UNIQUE INDEX `BankAccount_organizationId_glAccountId_key`(`organizationId`, `glAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BankReconciliation` (
    `id` VARCHAR(191) NOT NULL,
    `bankAccountId` VARCHAR(191) NOT NULL,
    `statementDate` DATETIME(3) NOT NULL,
    `statementBalance` DECIMAL(19, 4) NOT NULL,
    `bookBalance` DECIMAL(19, 4) NOT NULL,
    `difference` DECIMAL(19, 4) NOT NULL,
    `depositsInTransit` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `outstandingChecks` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `adjustedBookBalance` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `status` ENUM('IN_PROGRESS', 'COMPLETED', 'FINALIZED', 'REVIEWED') NOT NULL DEFAULT 'IN_PROGRESS',
    `reconciledBy` VARCHAR(191) NULL,
    `reconciledAt` DATETIME(3) NULL,
    `finalizedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `clearedTransactionIds` JSON NOT NULL,
    `clearedPaymentIds` JSON NOT NULL,
    `adjustmentEntries` JSON NULL,
    `reconciliationReport` TEXT NULL,
    `openingBalance` DECIMAL(19, 4) NULL,

    INDEX `BankReconciliation_bankAccountId_statementDate_idx`(`bankAccountId`, `statementDate`),
    INDEX `BankReconciliation_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `productType` ENUM('INVENTORY', 'SERVICE', 'NON_INVENTORY') NOT NULL,
    `category` VARCHAR(191) NULL,
    `unitOfMeasureId` VARCHAR(191) NULL,
    `purchasePrice` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `sellingPrice` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `trackInventory` BOOLEAN NOT NULL DEFAULT true,
    `reorderLevel` DECIMAL(12, 4) NULL,
    `reorderQuantity` DECIMAL(12, 4) NULL,
    `taxable` BOOLEAN NOT NULL DEFAULT true,
    `defaultTaxRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `taxGroupId` VARCHAR(191) NULL,
    `incomeAccountId` VARCHAR(191) NULL,
    `expenseAccountId` VARCHAR(191) NULL,
    `assetAccountId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `branchId` VARCHAR(191) NULL,

    INDEX `Product_organizationId_sku_idx`(`organizationId`, `sku`),
    INDEX `Product_organizationId_productType_idx`(`organizationId`, `productType`),
    UNIQUE INDEX `Product_organizationId_name_key`(`organizationId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecurringTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `templateType` ENUM('JOURNAL_ENTRY', 'INVOICE', 'BILL', 'PAYMENT') NOT NULL,
    `frequency` ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM_CRON') NOT NULL,
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'UTC',
    `startDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endDate` DATETIME(3) NULL,
    `dayOfMonth` INTEGER NULL,
    `weekday` INTEGER NULL,
    `cronExpression` VARCHAR(191) NULL,
    `nextRunAt` DATETIME(3) NULL,
    `lastRunAt` DATETIME(3) NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('ACTIVE', 'PAUSED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `approvalRequired` BOOLEAN NOT NULL DEFAULT false,
    `approverRoles` JSON NOT NULL,
    `maxExecutions` INTEGER NULL,
    `executedCount` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RecurringTemplate_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `RecurringTemplate_nextRunAt_idx`(`nextRunAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecurringExecution` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `runAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('PENDING', 'SUCCESS', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `attempt` INTEGER NOT NULL DEFAULT 1,
    `transactionId` VARCHAR(191) NULL,
    `invoiceId` VARCHAR(191) NULL,
    `billId` VARCHAR(191) NULL,
    `paymentId` VARCHAR(191) NULL,
    `message` TEXT NULL,
    `errorStack` TEXT NULL,
    `payloadSnapshot` JSON NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RecurringExecution_organizationId_templateId_idx`(`organizationId`, `templateId`),
    INDEX `RecurringExecution_runAt_idx`(`runAt`),
    INDEX `RecurringExecution_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryItem` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `warehouseLocation` VARCHAR(191) NOT NULL DEFAULT 'Main',
    `quantityOnHand` DECIMAL(12, 4) NOT NULL,
    `quantityReserved` DECIMAL(12, 4) NOT NULL DEFAULT 0,
    `quantityAvailable` DECIMAL(12, 4) NOT NULL,
    `averageCost` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `totalValue` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InventoryItem_productId_idx`(`productId`),
    UNIQUE INDEX `InventoryItem_productId_warehouseLocation_key`(`productId`, `warehouseLocation`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockMovement` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `movementType` ENUM('PURCHASE', 'SALE', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'WRITE_OFF') NOT NULL,
    `quantity` DECIMAL(12, 4) NOT NULL,
    `unitCost` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `totalCost` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `balanceAfter` DECIMAL(12, 4) NULL,
    `warehouseLocation` VARCHAR(191) NOT NULL DEFAULT 'Main',
    `branchId` VARCHAR(191) NULL,
    `warehouseId` VARCHAR(191) NULL,
    `performedById` VARCHAR(191) NULL,
    `referenceType` VARCHAR(191) NULL,
    `referenceId` VARCHAR(191) NULL,
    `referenceNumber` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `movementDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `transactionId` VARCHAR(191) NULL,
    `transferGroupId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StockMovement_productId_movementDate_idx`(`productId`, `movementDate`),
    INDEX `StockMovement_referenceType_referenceId_idx`(`referenceType`, `referenceId`),
    INDEX `StockMovement_branchId_movementDate_idx`(`branchId`, `movementDate`),
    INDEX `StockMovement_warehouseId_idx`(`warehouseId`),
    INDEX `StockMovement_transferGroupId_idx`(`transferGroupId`),
    INDEX `StockMovement_performedById_idx`(`performedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryWarehouse` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `type` ENUM('GENERAL', 'MANUFACTURING', 'RECEIVING', 'SHIPPING', 'QA_HOLD', 'THIRD_PARTY', 'TRANSIT', 'DAMAGED', 'QUARANTINE') NOT NULL DEFAULT 'GENERAL',
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `address` TEXT NULL,
    `city` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `managerId` VARCHAR(191) NULL,
    `capacityVolume` DECIMAL(12, 2) NULL,
    `capacityWeight` DECIMAL(12, 2) NULL,
    `usedVolume` DECIMAL(12, 2) NULL,
    `usedWeight` DECIMAL(12, 2) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InventoryWarehouse_organizationId_idx`(`organizationId`),
    INDEX `InventoryWarehouse_branchId_idx`(`branchId`),
    UNIQUE INDEX `InventoryWarehouse_organizationId_code_key`(`organizationId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WarehouseStockLevel` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `quantityOnHand` DECIMAL(12, 4) NOT NULL DEFAULT 0,
    `quantityReserved` DECIMAL(12, 4) NOT NULL DEFAULT 0,
    `quantityAvailable` DECIMAL(12, 4) NOT NULL DEFAULT 0,
    `averageCost` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `totalValue` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `reorderLevel` DECIMAL(12, 4) NULL,
    `maxStockLevel` DECIMAL(12, 4) NULL,
    `lastMovementDate` DATETIME(3) NULL,
    `lastCountDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WarehouseStockLevel_organizationId_idx`(`organizationId`),
    INDEX `WarehouseStockLevel_warehouseId_idx`(`warehouseId`),
    INDEX `WarehouseStockLevel_productId_idx`(`productId`),
    UNIQUE INDEX `WarehouseStockLevel_warehouseId_productId_key`(`warehouseId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryBin` (
    `id` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('STANDARD', 'REPLENISHMENT', 'PICKING', 'BULK', 'RECEIVING', 'SHIPPING', 'HOLD') NOT NULL DEFAULT 'STANDARD',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InventoryBin_warehouseId_idx`(`warehouseId`),
    INDEX `InventoryBin_type_idx`(`type`),
    UNIQUE INDEX `InventoryBin_warehouseId_code_key`(`warehouseId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryLot` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NULL,
    `binId` VARCHAR(191) NULL,
    `lotNumber` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'QUARANTINE', 'EXPIRED', 'CONSUMED', 'SCRAPPED') NOT NULL DEFAULT 'ACTIVE',
    `quantityOnHand` DECIMAL(12, 4) NOT NULL DEFAULT 0,
    `quantityReserved` DECIMAL(12, 4) NOT NULL DEFAULT 0,
    `quantityAvailable` DECIMAL(12, 4) NOT NULL DEFAULT 0,
    `receivedDate` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiryDate` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InventoryLot_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `InventoryLot_warehouseId_binId_idx`(`warehouseId`, `binId`),
    UNIQUE INDEX `InventoryLot_organizationId_productId_lotNumber_key`(`organizationId`, `productId`, `lotNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventorySerial` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `lotId` VARCHAR(191) NULL,
    `warehouseId` VARCHAR(191) NULL,
    `binId` VARCHAR(191) NULL,
    `workOrderId` VARCHAR(191) NULL,
    `serialNumber` VARCHAR(191) NOT NULL,
    `status` ENUM('AVAILABLE', 'ALLOCATED', 'IN_PROGRESS', 'CONSUMED', 'SCRAPPED') NOT NULL DEFAULT 'AVAILABLE',
    `receivedAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `assignedAt` DATETIME(3) NULL,
    `consumedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InventorySerial_productId_idx`(`productId`),
    INDEX `InventorySerial_warehouseId_binId_idx`(`warehouseId`, `binId`),
    UNIQUE INDEX `InventorySerial_organizationId_serialNumber_key`(`organizationId`, `serialNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TransferOrder` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `fromWarehouseId` VARCHAR(191) NOT NULL,
    `toWarehouseId` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'REQUESTED', 'PICKING', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `expectedShipDate` DATETIME(3) NULL,
    `expectedReceiveDate` DATETIME(3) NULL,
    `shippedAt` DATETIME(3) NULL,
    `receivedAt` DATETIME(3) NULL,
    `reference` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TransferOrder_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `TransferOrder_fromWarehouseId_idx`(`fromWarehouseId`),
    INDEX `TransferOrder_toWarehouseId_idx`(`toWarehouseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TransferOrderLine` (
    `id` VARCHAR(191) NOT NULL,
    `transferOrderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(12, 4) NOT NULL,
    `unitOfMeasureId` VARCHAR(191) NULL,
    `lotId` VARCHAR(191) NULL,
    `notes` TEXT NULL,

    INDEX `TransferOrderLine_transferOrderId_idx`(`transferOrderId`),
    INDEX `TransferOrderLine_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkCenter` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `costRate` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `capacityPerHour` DECIMAL(12, 4) NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WorkCenter_organizationId_idx`(`organizationId`),
    UNIQUE INDEX `WorkCenter_organizationId_code_key`(`organizationId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BillOfMaterial` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `version` VARCHAR(191) NOT NULL DEFAULT '1.0',
    `status` ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `revisionNotes` TEXT NULL,
    `yieldPercent` DECIMAL(6, 2) NOT NULL DEFAULT 100,
    `scrapPercent` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `effectiveFrom` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `effectiveTo` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BillOfMaterial_organizationId_status_idx`(`organizationId`, `status`),
    UNIQUE INDEX `BillOfMaterial_organizationId_productId_version_key`(`organizationId`, `productId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BillOfMaterialLine` (
    `id` VARCHAR(191) NOT NULL,
    `bomId` VARCHAR(191) NOT NULL,
    `componentId` VARCHAR(191) NOT NULL,
    `quantityPer` DECIMAL(12, 4) NOT NULL,
    `scrapPercent` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `backflush` BOOLEAN NOT NULL DEFAULT true,
    `operationSeq` INTEGER NULL,

    INDEX `BillOfMaterialLine_bomId_idx`(`bomId`),
    INDEX `BillOfMaterialLine_componentId_idx`(`componentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Routing` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `version` VARCHAR(191) NOT NULL DEFAULT '1.0',
    `status` ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `effectiveFrom` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `effectiveTo` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Routing_organizationId_status_idx`(`organizationId`, `status`),
    UNIQUE INDEX `Routing_organizationId_productId_version_key`(`organizationId`, `productId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoutingStep` (
    `id` VARCHAR(191) NOT NULL,
    `routingId` VARCHAR(191) NOT NULL,
    `workCenterId` VARCHAR(191) NULL,
    `sequence` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `setupTimeMins` INTEGER NOT NULL DEFAULT 0,
    `runTimeMinsPerUnit` INTEGER NOT NULL DEFAULT 0,
    `laborTimeMinsPerUnit` INTEGER NOT NULL DEFAULT 0,
    `queueTimeMins` INTEGER NOT NULL DEFAULT 0,
    `moveTimeMins` INTEGER NOT NULL DEFAULT 0,

    INDEX `RoutingStep_routingId_idx`(`routingId`),
    INDEX `RoutingStep_workCenterId_idx`(`workCenterId`),
    UNIQUE INDEX `RoutingStep_routingId_sequence_key`(`routingId`, `sequence`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkOrder` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `bomId` VARCHAR(191) NULL,
    `routingId` VARCHAR(191) NULL,
    `workCenterId` VARCHAR(191) NULL,
    `workOrderNumber` VARCHAR(191) NOT NULL,
    `status` ENUM('PLANNED', 'RELEASED', 'IN_PROGRESS', 'HOLD', 'COMPLETED', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `quantityPlanned` DECIMAL(12, 4) NOT NULL,
    `quantityCompleted` DECIMAL(12, 4) NOT NULL DEFAULT 0,
    `quantityScrapped` DECIMAL(12, 4) NOT NULL DEFAULT 0,
    `startDate` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dueDate` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `priority` INTEGER NOT NULL DEFAULT 3,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WorkOrder_workOrderNumber_key`(`workOrderNumber`),
    INDEX `WorkOrder_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `WorkOrder_productId_idx`(`productId`),
    INDEX `WorkOrder_branchId_idx`(`branchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkOrderMaterial` (
    `id` VARCHAR(191) NOT NULL,
    `workOrderId` VARCHAR(191) NOT NULL,
    `componentId` VARCHAR(191) NOT NULL,
    `requiredQuantity` DECIMAL(12, 4) NOT NULL,
    `issuedQuantity` DECIMAL(12, 4) NOT NULL DEFAULT 0,
    `scrapPercent` DECIMAL(6, 2) NOT NULL DEFAULT 0,
    `backflush` BOOLEAN NOT NULL DEFAULT true,

    INDEX `WorkOrderMaterial_workOrderId_idx`(`workOrderId`),
    INDEX `WorkOrderMaterial_componentId_idx`(`componentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkOrderOperation` (
    `id` VARCHAR(191) NOT NULL,
    `workOrderId` VARCHAR(191) NOT NULL,
    `routingStepId` VARCHAR(191) NULL,
    `sequence` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'DONE', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `setupTimeMins` INTEGER NOT NULL DEFAULT 0,
    `runTimeMins` INTEGER NOT NULL DEFAULT 0,
    `laborTimeMins` INTEGER NOT NULL DEFAULT 0,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,

    INDEX `WorkOrderOperation_workOrderId_idx`(`workOrderId`),
    INDEX `WorkOrderOperation_routingStepId_idx`(`routingStepId`),
    UNIQUE INDEX `WorkOrderOperation_workOrderId_sequence_key`(`workOrderId`, `sequence`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxConfiguration` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `taxName` VARCHAR(191) NOT NULL,
    `taxType` ENUM('VAT', 'GST', 'SALES_TAX', 'EXCISE', 'IMPORT_DUTY', 'WITHHOLDING', 'PAYROLL', 'DEEMED') NOT NULL,
    `rate` DECIMAL(5, 2) NOT NULL,
    `description` TEXT NULL,
    `taxAccountId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `effectiveFrom` DATETIME(3) NOT NULL,
    `effectiveTo` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TaxConfiguration_organizationId_isActive_idx`(`organizationId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FiscalPeriod` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `fiscalYear` INTEGER NOT NULL,
    `quarter` INTEGER NULL,
    `month` INTEGER NULL,
    `status` ENUM('OPEN', 'CLOSED', 'LOCKED') NOT NULL DEFAULT 'OPEN',
    `closedAt` DATETIME(3) NULL,
    `closedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FiscalPeriod_organizationId_fiscalYear_idx`(`organizationId`, `fiscalYear`),
    UNIQUE INDEX `FiscalPeriod_organizationId_startDate_endDate_key`(`organizationId`, `startDate`, `endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Budget` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `fiscalYear` INTEGER NOT NULL,
    `month` INTEGER NULL,
    `budgetAmount` DECIMAL(19, 4) NOT NULL,
    `actualAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `variance` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Budget_accountId_fiscalYear_idx`(`accountId`, `fiscalYear`),
    UNIQUE INDEX `Budget_accountId_fiscalYear_month_key`(`accountId`, `fiscalYear`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'VOID', 'RECONCILE', 'LOGIN', 'LOGOUT', 'EXPORT') NOT NULL,
    `changes` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_organizationId_entityType_entityId_idx`(`organizationId`, `entityType`, `entityId`),
    INDEX `AuditLog_userId_timestamp_idx`(`userId`, `timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxRate` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `taxType` ENUM('VAT', 'GST', 'SALES_TAX', 'EXCISE', 'IMPORT_DUTY', 'WITHHOLDING', 'PAYROLL', 'DEEMED') NOT NULL,
    `rate` DECIMAL(5, 2) NOT NULL,
    `country` VARCHAR(191) NOT NULL,
    `calculationType` VARCHAR(191) NOT NULL DEFAULT 'EXCLUSIVE',
    `isInclusiveByDefault` BOOLEAN NOT NULL DEFAULT false,
    `recoveryType` VARCHAR(191) NOT NULL DEFAULT 'PAYABLE',
    `salesTaxAccountId` VARCHAR(191) NULL,
    `purchaseTaxAccountId` VARCHAR(191) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `effectiveFrom` DATETIME(3) NOT NULL,
    `effectiveTo` DATETIME(3) NULL,
    `description` TEXT NULL,
    `taxCode` VARCHAR(191) NULL,
    `claimable` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TaxRate_organizationId_country_idx`(`organizationId`, `country`),
    INDEX `TaxRate_taxType_isActive_idx`(`taxType`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WHTRule` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NOT NULL,
    `whtType` ENUM('PROFESSIONAL_SERVICES', 'MANAGEMENT_FEES', 'RENT', 'DIVIDENDS', 'INTEREST', 'ROYALTIES', 'COMMISSION', 'CONTRACTORS', 'IMPORTED_SERVICES') NOT NULL,
    `rate` DECIMAL(5, 2) NOT NULL,
    `threshold` DECIMAL(15, 2) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `description` TEXT NULL,
    `effectiveFrom` DATETIME(3) NOT NULL,
    `effectiveTo` DATETIME(3) NULL,
    `serviceCategories` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WHTRule_organizationId_country_idx`(`organizationId`, `country`),
    INDEX `WHTRule_whtType_isActive_idx`(`whtType`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WHTTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `whtRuleId` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NULL,
    `billId` VARCHAR(191) NULL,
    `paymentId` VARCHAR(191) NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `grossAmount` DECIMAL(15, 2) NOT NULL,
    `whtRate` DECIMAL(5, 2) NOT NULL,
    `whtAmount` DECIMAL(15, 2) NOT NULL,
    `netAmount` DECIMAL(15, 2) NOT NULL,
    `whtDate` DATETIME(3) NOT NULL,
    `description` TEXT NULL,
    `whtCertificateNo` VARCHAR(191) NULL,
    `filed` BOOLEAN NOT NULL DEFAULT false,
    `filedDate` DATETIME(3) NULL,
    `taxPeriod` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WHTTransaction_organizationId_whtDate_idx`(`organizationId`, `whtDate`),
    INDEX `WHTTransaction_vendorId_idx`(`vendorId`),
    INDEX `WHTTransaction_filed_taxPeriod_idx`(`filed`, `taxPeriod`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxReturn` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `returnType` ENUM('VAT_MONTHLY', 'VAT_QUARTERLY', 'INCOME_TAX_PROVISIONAL', 'INCOME_TAX_ANNUAL', 'WHT_MONTHLY', 'PAYE_MONTHLY', 'CIT_ANNUAL') NOT NULL,
    `taxPeriod` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `country` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'READY_TO_FILE', 'FILED', 'PAID', 'OVERDUE', 'AMENDED') NOT NULL DEFAULT 'DRAFT',
    `totalSales` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalPurchases` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `outputVAT` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `inputVAT` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `netVAT` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `whtWithheld` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `payeWithheld` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `filedDate` DATETIME(3) NULL,
    `filedBy` VARCHAR(191) NULL,
    `referenceNumber` VARCHAR(191) NULL,
    `paymentDueDate` DATETIME(3) NULL,
    `paymentDate` DATETIME(3) NULL,
    `paymentAmount` DECIMAL(15, 2) NULL,
    `paymentReference` VARCHAR(191) NULL,
    `returnData` JSON NULL,
    `attachments` JSON NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TaxReturn_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `TaxReturn_taxPeriod_returnType_idx`(`taxPeriod`, `returnType`),
    UNIQUE INDEX `TaxReturn_organizationId_returnType_taxPeriod_key`(`organizationId`, `returnType`, `taxPeriod`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxPeriodLock` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `lockedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lockedByUserId` VARCHAR(191) NOT NULL,
    `lockedReason` VARCHAR(191) NULL,

    INDEX `TaxPeriodLock_organizationId_idx`(`organizationId`),
    INDEX `TaxPeriodLock_periodStart_periodEnd_idx`(`periodStart`, `periodEnd`),
    UNIQUE INDEX `TaxPeriodLock_organizationId_periodStart_periodEnd_key`(`organizationId`, `periodStart`, `periodEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxAgency` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `registrationNumber` VARCHAR(191) NULL,
    `country` VARCHAR(191) NOT NULL,
    `taxType` ENUM('VAT', 'GST', 'SALES_TAX', 'EXCISE', 'IMPORT_DUTY', 'WITHHOLDING', 'PAYROLL', 'DEEMED') NOT NULL,
    `address` TEXT NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `liabilityAccountId` VARCHAR(191) NULL,
    `filingFrequency` VARCHAR(191) NULL,
    `filingDeadlineDays` INTEGER NULL,
    `nextFilingDate` DATETIME(3) NULL,
    `apiEndpoint` VARCHAR(191) NULL,
    `apiCredentials` JSON NULL,
    `externalSystemId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TaxAgency_organizationId_country_idx`(`organizationId`, `country`),
    INDEX `TaxAgency_taxType_isActive_idx`(`taxType`, `isActive`),
    UNIQUE INDEX `TaxAgency_organizationId_code_key`(`organizationId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxAgencyRate` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `taxAgencyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NULL,
    `rate` DECIMAL(10, 4) NOT NULL,
    `isInclusiveDefault` BOOLEAN NOT NULL DEFAULT false,
    `calculationType` VARCHAR(191) NOT NULL DEFAULT 'PERCENTAGE',
    `isCompoundTax` BOOLEAN NOT NULL DEFAULT false,
    `fixedAmount` DECIMAL(18, 2) NULL,
    `salesTaxAccountId` VARCHAR(191) NULL,
    `purchaseTaxAccountId` VARCHAR(191) NULL,
    `effectiveFrom` DATETIME(3) NOT NULL,
    `effectiveTo` DATETIME(3) NULL,
    `externalTaxCode` VARCHAR(191) NULL,
    `reportingCategory` VARCHAR(191) NULL,
    `exemptionReasonCode` VARCHAR(191) NULL,
    `isRecoverable` BOOLEAN NOT NULL DEFAULT true,
    `recoveryPercentage` DECIMAL(5, 2) NOT NULL DEFAULT 100,
    `applicableContext` JSON NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `requiresApproval` BOOLEAN NOT NULL DEFAULT false,
    `description` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,

    INDEX `TaxAgencyRate_organizationId_isActive_idx`(`organizationId`, `isActive`),
    INDEX `TaxAgencyRate_effectiveFrom_effectiveTo_idx`(`effectiveFrom`, `effectiveTo`),
    INDEX `TaxAgencyRate_externalTaxCode_idx`(`externalTaxCode`),
    UNIQUE INDEX `TaxAgencyRate_organizationId_taxAgencyId_name_key`(`organizationId`, `taxAgencyId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxGroup` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `taxAgencyId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `compoundMethod` VARCHAR(191) NOT NULL DEFAULT 'SEQUENTIAL',
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TaxGroup_organizationId_isActive_idx`(`organizationId`, `isActive`),
    UNIQUE INDEX `TaxGroup_organizationId_code_key`(`organizationId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxGroupRate` (
    `id` VARCHAR(191) NOT NULL,
    `taxGroupId` VARCHAR(191) NOT NULL,
    `taxAgencyRateId` VARCHAR(191) NOT NULL,
    `sequence` INTEGER NOT NULL DEFAULT 1,
    `isCompound` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TaxGroupRate_taxGroupId_sequence_idx`(`taxGroupId`, `sequence`),
    UNIQUE INDEX `TaxGroupRate_taxGroupId_taxAgencyRateId_key`(`taxGroupId`, `taxAgencyRateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxExemptionReason` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NULL,
    `externalCode` VARCHAR(191) NULL,
    `requiresDocumentation` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TaxExemptionReason_organizationId_category_idx`(`organizationId`, `category`),
    UNIQUE INDEX `TaxExemptionReason_organizationId_code_key`(`organizationId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssetCategory` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `assetAccountId` VARCHAR(191) NOT NULL,
    `depreciationAccountId` VARCHAR(191) NOT NULL,
    `expenseAccountId` VARCHAR(191) NOT NULL,
    `defaultMethod` ENUM('STRAIGHT_LINE', 'DECLINING_BALANCE', 'DOUBLE_DECLINING', 'SUM_OF_YEARS', 'UNITS_OF_PRODUCTION') NOT NULL DEFAULT 'STRAIGHT_LINE',
    `defaultLifeYears` INTEGER NOT NULL,
    `defaultSalvagePercent` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `ugandaTaxRate` DECIMAL(5, 2) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AssetCategory_organizationId_isActive_idx`(`organizationId`, `isActive`),
    UNIQUE INDEX `AssetCategory_organizationId_code_key`(`organizationId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Asset` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `assetNumber` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `purchaseDate` DATETIME(3) NOT NULL,
    `purchasePrice` DECIMAL(19, 4) NOT NULL,
    `vendor` VARCHAR(191) NULL,
    `invoiceNumber` VARCHAR(191) NULL,
    `depreciationMethod` ENUM('STRAIGHT_LINE', 'DECLINING_BALANCE', 'DOUBLE_DECLINING', 'SUM_OF_YEARS', 'UNITS_OF_PRODUCTION') NOT NULL,
    `usefulLifeYears` INTEGER NOT NULL,
    `usefulLifeUnits` INTEGER NULL,
    `salvageValue` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `depreciationStartDate` DATETIME(3) NOT NULL,
    `currentBookValue` DECIMAL(19, 4) NOT NULL,
    `accumulatedDepreciation` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `location` TEXT NULL,
    `serialNumber` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `manufacturer` VARCHAR(191) NULL,
    `insurancePolicy` VARCHAR(191) NULL,
    `insuranceExpiry` DATETIME(3) NULL,
    `warrantyExpiry` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', 'DISPOSED', 'LOST', 'WRITTEN_OFF') NOT NULL DEFAULT 'ACTIVE',
    `disposalDate` DATETIME(3) NULL,
    `disposalMethod` VARCHAR(191) NULL,
    `disposalPrice` DECIMAL(19, 4) NULL,
    `disposalNotes` TEXT NULL,
    `tags` JSON NOT NULL,
    `customFields` JSON NULL,
    `attachments` JSON NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Asset_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `Asset_categoryId_idx`(`categoryId`),
    INDEX `Asset_branchId_idx`(`branchId`),
    INDEX `Asset_purchaseDate_idx`(`purchaseDate`),
    UNIQUE INDEX `Asset_organizationId_assetNumber_key`(`organizationId`, `assetNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssetDepreciation` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `assetId` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `periodStartDate` DATETIME(3) NOT NULL,
    `periodEndDate` DATETIME(3) NOT NULL,
    `depreciationMethod` ENUM('STRAIGHT_LINE', 'DECLINING_BALANCE', 'DOUBLE_DECLINING', 'SUM_OF_YEARS', 'UNITS_OF_PRODUCTION') NOT NULL,
    `openingBookValue` DECIMAL(19, 4) NOT NULL,
    `depreciationAmount` DECIMAL(19, 4) NOT NULL,
    `accumulatedDepreciation` DECIMAL(19, 4) NOT NULL,
    `closingBookValue` DECIMAL(19, 4) NOT NULL,
    `taxDepreciationAmount` DECIMAL(19, 4) NULL,
    `taxBookValue` DECIMAL(19, 4) NULL,
    `posted` BOOLEAN NOT NULL DEFAULT false,
    `transactionId` VARCHAR(191) NULL,
    `postedDate` DATETIME(3) NULL,
    `postedBy` VARCHAR(191) NULL,
    `calculationDetails` JSON NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AssetDepreciation_organizationId_period_idx`(`organizationId`, `period`),
    INDEX `AssetDepreciation_posted_idx`(`posted`),
    UNIQUE INDEX `AssetDepreciation_assetId_period_key`(`assetId`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssetDisposal` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `assetId` VARCHAR(191) NOT NULL,
    `disposalDate` DATETIME(3) NOT NULL,
    `disposalMethod` ENUM('SALE', 'TRADE_IN', 'SCRAP', 'DONATION', 'LOST', 'WRITE_OFF') NOT NULL,
    `disposalPrice` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `costAtDisposal` DECIMAL(19, 4) NOT NULL,
    `accDepAtDisposal` DECIMAL(19, 4) NOT NULL,
    `bookValueAtDisposal` DECIMAL(19, 4) NOT NULL,
    `gainLoss` DECIMAL(19, 4) NOT NULL,
    `gainLossType` VARCHAR(191) NOT NULL,
    `buyer` VARCHAR(191) NULL,
    `buyerTIN` VARCHAR(191) NULL,
    `disposalInvoiceNo` VARCHAR(191) NULL,
    `posted` BOOLEAN NOT NULL DEFAULT false,
    `transactionId` VARCHAR(191) NULL,
    `postedDate` DATETIME(3) NULL,
    `postedBy` VARCHAR(191) NULL,
    `reason` TEXT NULL,
    `approvedBy` VARCHAR(191) NULL,
    `approvedDate` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `attachments` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AssetDisposal_assetId_key`(`assetId`),
    INDEX `AssetDisposal_organizationId_disposalDate_idx`(`organizationId`, `disposalDate`),
    INDEX `AssetDisposal_posted_idx`(`posted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssetMaintenance` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `assetId` VARCHAR(191) NOT NULL,
    `maintenanceType` ENUM('ROUTINE', 'REPAIR', 'INSPECTION', 'UPGRADE', 'EMERGENCY', 'PREVENTIVE', 'PREDICTIVE', 'CORRECTIVE') NOT NULL,
    `maintenanceDate` DATETIME(3) NOT NULL,
    `description` TEXT NOT NULL,
    `vendor` VARCHAR(191) NULL,
    `cost` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `isScheduled` BOOLEAN NOT NULL DEFAULT false,
    `nextMaintenanceDate` DATETIME(3) NULL,
    `nextMaintenanceMiles` INTEGER NULL,
    `status` ENUM('SCHEDULED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'OVERDUE') NOT NULL DEFAULT 'COMPLETED',
    `startDate` DATETIME(3) NULL,
    `completionDate` DATETIME(3) NULL,
    `meterReading` INTEGER NULL,
    `performedBy` VARCHAR(191) NULL,
    `billId` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `attachments` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AssetMaintenance_organizationId_assetId_idx`(`organizationId`, `assetId`),
    INDEX `AssetMaintenance_maintenanceDate_idx`(`maintenanceDate`),
    INDEX `AssetMaintenance_nextMaintenanceDate_idx`(`nextMaintenanceDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreditNote` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `creditNoteNumber` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `subtotal` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `appliedAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `remainingAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `creditDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reason` ENUM('GOODS_RETURNED', 'DAMAGED_GOODS', 'PRICING_ERROR', 'BILLING_ERROR', 'DISCOUNT_ADJUSTMENT', 'SERVICE_ISSUE', 'CANCELLATION', 'GOODWILL', 'OTHER') NOT NULL,
    `description` TEXT NOT NULL,
    `internalNotes` TEXT NULL,
    `status` ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'APPLIED', 'PARTIALLY_APPLIED', 'VOID') NOT NULL DEFAULT 'DRAFT',
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `approvalNotes` TEXT NULL,
    `voidedBy` VARCHAR(191) NULL,
    `voidedAt` DATETIME(3) NULL,
    `voidReason` TEXT NULL,
    `isPosted` BOOLEAN NOT NULL DEFAULT false,
    `postedAt` DATETIME(3) NULL,
    `transactionId` VARCHAR(191) NULL,
    `attachments` JSON NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CreditNote_organizationId_customerId_idx`(`organizationId`, `customerId`),
    INDEX `CreditNote_invoiceId_idx`(`invoiceId`),
    INDEX `CreditNote_status_idx`(`status`),
    INDEX `CreditNote_creditDate_idx`(`creditDate`),
    UNIQUE INDEX `CreditNote_organizationId_creditNoteNumber_key`(`organizationId`, `creditNoteNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreditNoteItem` (
    `id` VARCHAR(191) NOT NULL,
    `creditNoteId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `quantity` DECIMAL(12, 4) NOT NULL,
    `unitPrice` DECIMAL(19, 4) NOT NULL,
    `taxRateId` VARCHAR(191) NULL,
    `taxRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `subtotal` DECIMAL(19, 4) NOT NULL,
    `totalAmount` DECIMAL(19, 4) NOT NULL,
    `accountId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CreditNoteItem_creditNoteId_idx`(`creditNoteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreditNoteApplication` (
    `id` VARCHAR(191) NOT NULL,
    `creditNoteId` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(19, 4) NOT NULL,
    `appliedDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `appliedBy` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,

    INDEX `CreditNoteApplication_creditNoteId_idx`(`creditNoteId`),
    INDEX `CreditNoteApplication_invoiceId_idx`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DebitNote` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `debitNoteNumber` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `subtotal` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `paidAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `balanceAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `debitDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `dueDate` DATETIME(3) NULL,
    `reason` ENUM('ADDITIONAL_CHARGES', 'LATE_PAYMENT_FEE', 'INTEREST_CHARGE', 'SHIPPING_ADJUSTMENT', 'PRICE_ADJUSTMENT', 'SERVICE_UPGRADE', 'UNDERBILLING', 'PENALTY', 'OTHER') NOT NULL,
    `description` TEXT NOT NULL,
    `internalNotes` TEXT NULL,
    `status` ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_PAID', 'PAID', 'VOID', 'OVERDUE') NOT NULL DEFAULT 'DRAFT',
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `approvalNotes` TEXT NULL,
    `voidedBy` VARCHAR(191) NULL,
    `voidedAt` DATETIME(3) NULL,
    `voidReason` TEXT NULL,
    `isPosted` BOOLEAN NOT NULL DEFAULT false,
    `postedAt` DATETIME(3) NULL,
    `transactionId` VARCHAR(191) NULL,
    `attachments` JSON NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DebitNote_organizationId_customerId_idx`(`organizationId`, `customerId`),
    INDEX `DebitNote_invoiceId_idx`(`invoiceId`),
    INDEX `DebitNote_status_idx`(`status`),
    INDEX `DebitNote_debitDate_idx`(`debitDate`),
    UNIQUE INDEX `DebitNote_organizationId_debitNoteNumber_key`(`organizationId`, `debitNoteNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DebitNoteItem` (
    `id` VARCHAR(191) NOT NULL,
    `debitNoteId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `quantity` DECIMAL(12, 4) NOT NULL,
    `unitPrice` DECIMAL(19, 4) NOT NULL,
    `taxRateId` VARCHAR(191) NULL,
    `taxRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `subtotal` DECIMAL(19, 4) NOT NULL,
    `totalAmount` DECIMAL(19, 4) NOT NULL,
    `accountId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DebitNoteItem_debitNoteId_idx`(`debitNoteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BankFeed` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `bankAccountId` VARCHAR(191) NULL,
    `feedName` VARCHAR(191) NOT NULL,
    `feedType` VARCHAR(191) NOT NULL,
    `externalId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `lastSyncAt` DATETIME(3) NULL,
    `nextSyncAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BankFeed_organizationId_status_idx`(`organizationId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BankTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `bankFeedId` VARCHAR(191) NOT NULL,
    `externalId` VARCHAR(191) NULL,
    `transactionDate` DATETIME(3) NOT NULL,
    `amount` DECIMAL(19, 4) NOT NULL,
    `description` TEXT NOT NULL,
    `rawDescription` TEXT NULL,
    `payee` VARCHAR(191) NULL,
    `referenceNo` VARCHAR(191) NULL,
    `transactionType` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'UNPROCESSED',
    `duplicateHash` VARCHAR(191) NULL,
    `matchedPaymentId` VARCHAR(191) NULL,
    `matchedTransactionId` VARCHAR(191) NULL,
    `matchedInvoiceId` VARCHAR(191) NULL,
    `matchedBillId` VARCHAR(191) NULL,
    `categoryAccountId` VARCHAR(191) NULL,
    `appliedRuleId` VARCHAR(191) NULL,
    `confidenceScore` DECIMAL(5, 2) NULL,
    `clearedDate` DATETIME(3) NULL,
    `reconciliationId` VARCHAR(191) NULL,
    `isReconciled` BOOLEAN NOT NULL DEFAULT false,
    `isLocked` BOOLEAN NOT NULL DEFAULT false,
    `lockedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BankTransaction_organizationId_transactionDate_idx`(`organizationId`, `transactionDate`),
    INDEX `BankTransaction_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `BankTransaction_status_matchedPaymentId_idx`(`status`, `matchedPaymentId`),
    INDEX `BankTransaction_reconciliationId_idx`(`reconciliationId`),
    INDEX `BankTransaction_isReconciled_idx`(`isReconciled`),
    INDEX `BankTransaction_appliedRuleId_idx`(`appliedRuleId`),
    UNIQUE INDEX `BankTransaction_organizationId_duplicateHash_key`(`organizationId`, `duplicateHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BankRule` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `ruleName` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `conditionField` VARCHAR(191) NOT NULL DEFAULT 'description',
    `conditionOperator` VARCHAR(191) NOT NULL DEFAULT 'contains',
    `conditionValue` VARCHAR(191) NOT NULL,
    `categoryAccountId` VARCHAR(191) NULL,
    `taxRateId` VARCHAR(191) NULL,
    `payee` VARCHAR(191) NULL,
    `timesApplied` INTEGER NOT NULL DEFAULT 0,
    `lastAppliedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BankRule_organizationId_isActive_idx`(`organizationId`, `isActive`),
    INDEX `BankRule_priority_idx`(`priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileType` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'UPLOADED',
    `extractedText` TEXT NULL,
    `ocrConfidence` DECIMAL(5, 2) NULL,
    `transactionId` VARCHAR(191) NULL,
    `invoiceId` VARCHAR(191) NULL,
    `billId` VARCHAR(191) NULL,
    `linkedEntities` JSON NULL,
    `uploadedBy` VARCHAR(191) NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tags` JSON NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Document_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `Document_transactionId_invoiceId_billId_idx`(`transactionId`, `invoiceId`, `billId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Project` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `budget` DECIMAL(19, 4) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `managerId` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Project_organizationId_status_idx`(`organizationId`, `status`),
    UNIQUE INDEX `Project_organizationId_code_key`(`organizationId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectTask` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'TODO',
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `assignedTo` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProjectTask_projectId_status_idx`(`projectId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectCost` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `amount` DECIMAL(19, 4) NOT NULL,
    `category` VARCHAR(191) NULL,
    `transactionId` VARCHAR(191) NULL,
    `billId` VARCHAR(191) NULL,
    `invoiceId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProjectCost_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Company` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `lifecycleStage` VARCHAR(191) NOT NULL DEFAULT 'LEAD',
    `industry` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `city` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `taxId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `accountManagerId` VARCHAR(191) NULL,
    `branchId` VARCHAR(191) NULL,
    `defaultCurrency` VARCHAR(191) NULL,
    `defaultPaymentTerms` INTEGER NULL,
    `lastContactedAt` DATETIME(3) NULL,
    `lifetimeValue` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `outstandingBalance` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Company_organizationId_type_idx`(`organizationId`, `type`),
    INDEX `Company_organizationId_lifecycleStage_idx`(`organizationId`, `lifecycleStage`),
    INDEX `Company_accountManagerId_idx`(`accountManagerId`),
    INDEX `Company_branchId_idx`(`branchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Contact` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `whatsapp` VARCHAR(191) NULL,
    `extension` VARCHAR(191) NULL,
    `linkedIn` VARCHAR(191) NULL,
    `title` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `contactRole` VARCHAR(191) NOT NULL DEFAULT 'GENERAL',
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `isDecisionMaker` BOOLEAN NOT NULL DEFAULT false,
    `branchId` VARCHAR(191) NULL,
    `optOutMarketing` BOOLEAN NOT NULL DEFAULT false,
    `sendInvoicesWhatsApp` BOOLEAN NOT NULL DEFAULT false,
    `lastInteractionAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Contact_organizationId_companyId_idx`(`organizationId`, `companyId`),
    INDEX `Contact_organizationId_contactRole_idx`(`organizationId`, `contactRole`),
    INDEX `Contact_branchId_idx`(`branchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Opportunity` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NULL,
    `assignedTo` VARCHAR(191) NULL,
    `branchId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `value` DECIMAL(19, 4) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `stage` VARCHAR(191) NOT NULL DEFAULT 'QUALIFICATION',
    `probability` DECIMAL(5, 2) NOT NULL DEFAULT 10,
    `expectedCloseDate` DATETIME(3) NULL,
    `source` VARCHAR(191) NULL,
    `reasonLost` VARCHAR(191) NULL,
    `wonDate` DATETIME(3) NULL,
    `lostDate` DATETIME(3) NULL,
    `convertedEstimateId` VARCHAR(191) NULL,
    `convertedInvoiceId` VARCHAR(191) NULL,
    `closedDate` DATETIME(3) NULL,
    `reason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Opportunity_organizationId_stage_idx`(`organizationId`, `stage`),
    INDEX `Opportunity_assignedTo_idx`(`assignedTo`),
    INDEX `Opportunity_branchId_idx`(`branchId`),
    INDEX `Opportunity_expectedCloseDate_idx`(`expectedCloseDate`),
    INDEX `Opportunity_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Activity` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `dueDate` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Activity_organizationId_companyId_idx`(`organizationId`, `companyId`),
    INDEX `Activity_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CrmTask` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `assignedTo` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `dueDate` DATETIME(3) NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'MEDIUM',
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    `completedAt` DATETIME(3) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CrmTask_organizationId_companyId_idx`(`organizationId`, `companyId`),
    INDEX `CrmTask_assignedTo_idx`(`assignedTo`),
    INDEX `CrmTask_dueDate_idx`(`dueDate`),
    INDEX `CrmTask_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Employee` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `branchId` VARCHAR(191) NULL,
    `employeeNumber` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `middleName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `gender` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `whatsapp` VARCHAR(191) NULL,
    `profileImage` VARCHAR(191) NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `nationalId` VARCHAR(191) NULL,
    `socialSecurityNo` VARCHAR(191) NULL,
    `hireDate` DATETIME(3) NOT NULL,
    `probationEndDate` DATETIME(3) NULL,
    `terminationDate` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RETIRED') NOT NULL DEFAULT 'ACTIVE',
    `jobTitleId` VARCHAR(191) NULL,
    `departmentId` VARCHAR(191) NULL,
    `positionId` VARCHAR(191) NULL,
    `managerId` VARCHAR(191) NULL,
    `workLocation` VARCHAR(191) NULL,
    `employmentType` ENUM('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERN') NOT NULL DEFAULT 'FULL_TIME',
    `payrollCurrency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `baseSalary` DECIMAL(19, 4) NULL,
    `payFrequency` ENUM('WEEKLY', 'BI_WEEKLY', 'SEMI_MONTHLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY') NOT NULL DEFAULT 'MONTHLY',
    `taxIdNumber` VARCHAR(191) NULL,
    `bankAccountNumber` VARCHAR(191) NULL,
    `bankName` VARCHAR(191) NULL,
    `bankBranch` VARCHAR(191) NULL,
    `bankSortCode` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `localVillage` VARCHAR(191) NULL,
    `localParish` VARCHAR(191) NULL,
    `localDistrict` VARCHAR(191) NULL,
    `localRegion` VARCHAR(191) NULL,
    `nextOfKinName` VARCHAR(191) NULL,
    `nextOfKinPhone` VARCHAR(191) NULL,
    `nextOfKinRelation` VARCHAR(191) NULL,
    `emergencyContact` VARCHAR(191) NULL,
    `emergencyPhone` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Employee_userId_key`(`userId`),
    INDEX `Employee_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `Employee_departmentId_idx`(`departmentId`),
    INDEX `Employee_managerId_idx`(`managerId`),
    INDEX `Employee_branchId_idx`(`branchId`),
    UNIQUE INDEX `Employee_organizationId_employeeNumber_key`(`organizationId`, `employeeNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Department` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `parentId` VARCHAR(191) NULL,
    `managerId` VARCHAR(191) NULL,
    `costCenterId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Department_organizationId_idx`(`organizationId`),
    INDEX `Department_parentId_idx`(`parentId`),
    UNIQUE INDEX `Department_organizationId_code_key`(`organizationId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JobTitle` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `level` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `JobTitle_organizationId_idx`(`organizationId`),
    UNIQUE INDEX `JobTitle_organizationId_code_key`(`organizationId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Position` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `positionNumber` VARCHAR(191) NOT NULL,
    `jobTitleId` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NOT NULL,
    `status` ENUM('OPEN', 'FILLED', 'CLOSED', 'ON_HOLD') NOT NULL DEFAULT 'OPEN',
    `description` TEXT NULL,
    `requirements` VARCHAR(191) NULL,
    `openedDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closedDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Position_organizationId_status_idx`(`organizationId`, `status`),
    UNIQUE INDEX `Position_organizationId_positionNumber_key`(`organizationId`, `positionNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PayrollRun` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `payrollNumber` VARCHAR(191) NOT NULL,
    `payPeriodStart` DATETIME(3) NOT NULL,
    `payPeriodEnd` DATETIME(3) NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL,
    `status` ENUM('DRAFT', 'CALCULATED', 'APPROVED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `totalGrossPay` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `totalDeductions` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `totalNetPay` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `totalEmployerTax` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `transactionId` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `processedBy` VARCHAR(191) NULL,
    `processedAt` DATETIME(3) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PayrollRun_transactionId_key`(`transactionId`),
    INDEX `PayrollRun_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `PayrollRun_payPeriodStart_payPeriodEnd_idx`(`payPeriodStart`, `payPeriodEnd`),
    UNIQUE INDEX `PayrollRun_organizationId_payrollNumber_key`(`organizationId`, `payrollNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PayrollItem` (
    `id` VARCHAR(191) NOT NULL,
    `payrollRunId` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `grossPay` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `basicSalary` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `allowances` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `bonuses` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `overtime` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `totalDeductions` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `taxDeduction` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `socialSecurity` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `benefitDeductions` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `otherDeductions` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `netPay` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `employerTaxes` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PayrollItem_payrollRunId_idx`(`payrollRunId`),
    INDEX `PayrollItem_employeeId_idx`(`employeeId`),
    UNIQUE INDEX `PayrollItem_payrollRunId_employeeId_key`(`payrollRunId`, `employeeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Benefit` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `benefitType` ENUM('HEALTH_INSURANCE', 'DENTAL_INSURANCE', 'VISION_INSURANCE', 'LIFE_INSURANCE', 'RETIREMENT_401K', 'PENSION', 'STOCK_OPTIONS', 'OTHER') NOT NULL,
    `employerCost` DECIMAL(19, 4) NULL,
    `employeeCost` DECIMAL(19, 4) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Benefit_organizationId_idx`(`organizationId`),
    UNIQUE INDEX `Benefit_organizationId_code_key`(`organizationId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BenefitEnrollment` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `benefitId` VARCHAR(191) NOT NULL,
    `enrollmentDate` DATETIME(3) NOT NULL,
    `effectiveDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `employeeCost` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `employerCost` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `status` ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED') NOT NULL DEFAULT 'ACTIVE',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BenefitEnrollment_employeeId_idx`(`employeeId`),
    INDEX `BenefitEnrollment_benefitId_idx`(`benefitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeaveType` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `daysPerYear` DECIMAL(8, 2) NULL,
    `isPaid` BOOLEAN NOT NULL DEFAULT true,
    `requiresApproval` BOOLEAN NOT NULL DEFAULT true,
    `requiresAttachment` BOOLEAN NOT NULL DEFAULT false,
    `maxCarryForward` DECIMAL(8, 2) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LeaveType_organizationId_idx`(`organizationId`),
    UNIQUE INDEX `LeaveType_organizationId_code_key`(`organizationId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeaveRequest` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `leaveTypeId` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `daysRequested` DECIMAL(8, 2) NOT NULL,
    `isHalfDay` BOOLEAN NOT NULL DEFAULT false,
    `halfDayPeriod` VARCHAR(191) NULL,
    `reason` TEXT NULL,
    `attachmentUrl` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LeaveRequest_employeeId_idx`(`employeeId`),
    INDEX `LeaveRequest_leaveTypeId_idx`(`leaveTypeId`),
    INDEX `LeaveRequest_status_idx`(`status`),
    INDEX `LeaveRequest_startDate_endDate_idx`(`startDate`, `endDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TimeEntry` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `entryDate` DATETIME(3) NOT NULL,
    `hoursWorked` DECIMAL(8, 2) NOT NULL,
    `overtimeHours` DECIMAL(8, 2) NOT NULL DEFAULT 0,
    `projectId` VARCHAR(191) NULL,
    `taskDescription` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED',
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TimeEntry_employeeId_idx`(`employeeId`),
    INDEX `TimeEntry_projectId_idx`(`projectId`),
    INDEX `TimeEntry_entryDate_idx`(`entryDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExpenseClaim` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `claimNumber` VARCHAR(191) NOT NULL,
    `claimDate` DATETIME(3) NOT NULL,
    `totalAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `totalTax` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `netAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `exchangeRate` DECIMAL(12, 6) NOT NULL DEFAULT 1,
    `amountInBase` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `paymentMethod` VARCHAR(191) NULL,
    `merchantName` VARCHAR(191) NULL,
    `projectId` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'ACCOUNTING_REVIEW', 'QUERIED', 'REJECTED', 'PAID') NOT NULL DEFAULT 'DRAFT',
    `purpose` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `rejectionReason` TEXT NULL,
    `submittedAt` DATETIME(3) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `accountingValidatedBy` VARCHAR(191) NULL,
    `accountingValidatedAt` DATETIME(3) NULL,
    `paidBy` VARCHAR(191) NULL,
    `paidAt` DATETIME(3) NULL,
    `paidViaPayroll` BOOLEAN NOT NULL DEFAULT false,
    `payrollRunId` VARCHAR(191) NULL,
    `transactionId` VARCHAR(191) NULL,
    `reimbursementTxnId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ExpenseClaim_transactionId_key`(`transactionId`),
    UNIQUE INDEX `ExpenseClaim_reimbursementTxnId_key`(`reimbursementTxnId`),
    INDEX `ExpenseClaim_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `ExpenseClaim_employeeId_idx`(`employeeId`),
    INDEX `ExpenseClaim_status_idx`(`status`),
    INDEX `ExpenseClaim_claimDate_idx`(`claimDate`),
    UNIQUE INDEX `ExpenseClaim_organizationId_claimNumber_key`(`organizationId`, `claimNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExpenseItem` (
    `id` VARCHAR(191) NOT NULL,
    `expenseClaimId` VARCHAR(191) NOT NULL,
    `expenseDate` DATETIME(3) NOT NULL,
    `categoryId` VARCHAR(191) NULL,
    `category` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `amount` DECIMAL(19, 4) NOT NULL,
    `taxInclusive` BOOLEAN NOT NULL DEFAULT false,
    `taxRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `netAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `receiptUrl` VARCHAR(191) NULL,
    `receiptName` VARCHAR(191) NULL,
    `merchantName` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ExpenseItem_expenseClaimId_idx`(`expenseClaimId`),
    INDEX `ExpenseItem_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExpensePolicy` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `categoryPattern` VARCHAR(191) NULL,
    `maxAmountPerItem` DECIMAL(19, 4) NULL,
    `maxDailyTotal` DECIMAL(19, 4) NULL,
    `maxMonthlyTotal` DECIMAL(19, 4) NULL,
    `requiresReceipt` BOOLEAN NOT NULL DEFAULT true,
    `requiresApproval` BOOLEAN NOT NULL DEFAULT true,
    `autoApproveBelow` DECIMAL(19, 4) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ExpensePolicy_organizationId_idx`(`organizationId`),
    UNIQUE INDEX `ExpensePolicy_organizationId_name_key`(`organizationId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PerformanceReview` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `reviewCycleId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewDate` DATETIME(3) NOT NULL,
    `reviewPeriodStart` DATETIME(3) NULL,
    `reviewPeriodEnd` DATETIME(3) NULL,
    `overallRating` DECIMAL(3, 2) NULL,
    `strengths` VARCHAR(191) NULL,
    `areasForImprovement` VARCHAR(191) NULL,
    `goals` VARCHAR(191) NULL,
    `comments` TEXT NULL,
    `status` ENUM('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'APPROVED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PerformanceReview_employeeId_idx`(`employeeId`),
    INDEX `PerformanceReview_reviewerId_idx`(`reviewerId`),
    INDEX `PerformanceReview_reviewCycleId_idx`(`reviewCycleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReviewCycle` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ReviewCycle_organizationId_idx`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceWorkOrder` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `workOrderNumber` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `contactName` VARCHAR(191) NULL,
    `contactPhone` VARCHAR(191) NULL,
    `serviceLocation` VARCHAR(191) NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    `status` ENUM('SCHEDULED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `scheduledStart` DATETIME(3) NULL,
    `scheduledEnd` DATETIME(3) NULL,
    `actualStart` DATETIME(3) NULL,
    `actualEnd` DATETIME(3) NULL,
    `technicianId` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `resolution` VARCHAR(191) NULL,
    `laborHours` DECIMAL(8, 2) NULL,
    `laborCost` DECIMAL(19, 4) NULL,
    `partsCost` DECIMAL(19, 4) NULL,
    `totalCost` DECIMAL(19, 4) NULL,
    `invoiceId` VARCHAR(191) NULL,
    `slaId` VARCHAR(191) NULL,
    `slaCompliant` BOOLEAN NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ServiceWorkOrder_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `ServiceWorkOrder_technicianId_idx`(`technicianId`),
    INDEX `ServiceWorkOrder_customerId_idx`(`customerId`),
    UNIQUE INDEX `ServiceWorkOrder_organizationId_workOrderNumber_key`(`organizationId`, `workOrderNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceTechnician` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `skills` JSON NOT NULL,
    `availability` VARCHAR(191) NOT NULL DEFAULT 'AVAILABLE',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ServiceTechnician_employeeId_key`(`employeeId`),
    INDEX `ServiceTechnician_organizationId_idx`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceSLA` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `responseTime` INTEGER NOT NULL,
    `resolutionTime` INTEGER NOT NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ServiceSLA_organizationId_idx`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceCatalog` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `serviceCode` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `serviceType` ENUM('PROFESSIONAL', 'TECHNICAL', 'CREATIVE', 'EDUCATIONAL', 'SUPPORT', 'ADMINISTRATIVE', 'FIELD_SERVICE', 'DIGITAL', 'RESEARCH', 'PROJECT_BASED') NOT NULL DEFAULT 'PROFESSIONAL',
    `category` VARCHAR(191) NULL,
    `pricingModel` ENUM('FIXED_PRICE', 'HOURLY_RATE', 'DAILY_RATE', 'PROJECT_BASED', 'VALUE_BASED', 'RETAINER', 'SUBSCRIPTION', 'PER_USER', 'PER_TRANSACTION', 'TIERED') NOT NULL DEFAULT 'FIXED_PRICE',
    `unitOfMeasure` VARCHAR(191) NULL,
    `standardRate` DECIMAL(19, 4) NULL,
    `standardDuration` INTEGER NULL,
    `skillLevel` ENUM('ENTRY_LEVEL', 'JUNIOR', 'STANDARD', 'SENIOR', 'EXPERT', 'SPECIALIST') NOT NULL DEFAULT 'STANDARD',
    `department` VARCHAR(191) NULL,
    `taxGroupId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isBillable` BOOLEAN NOT NULL DEFAULT true,
    `isInternal` BOOLEAN NOT NULL DEFAULT false,
    `requiresApproval` BOOLEAN NOT NULL DEFAULT false,
    `autoScheduling` BOOLEAN NOT NULL DEFAULT false,
    `allowOnlineBooking` BOOLEAN NOT NULL DEFAULT false,
    `minimumBookingHours` INTEGER NULL DEFAULT 1,
    `maximumBookingHours` INTEGER NULL,
    `advanceBookingHours` INTEGER NULL DEFAULT 24,
    `cancellationHours` INTEGER NULL DEFAULT 24,
    `serviceUrl` VARCHAR(191) NULL,
    `serviceIcon` VARCHAR(191) NULL,
    `tags` JSON NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ServiceCatalog_organizationId_serviceType_idx`(`organizationId`, `serviceType`),
    INDEX `ServiceCatalog_organizationId_category_idx`(`organizationId`, `category`),
    INDEX `ServiceCatalog_organizationId_isActive_idx`(`organizationId`, `isActive`),
    UNIQUE INDEX `ServiceCatalog_organizationId_serviceCode_key`(`organizationId`, `serviceCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceActivity` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `serviceCatalogId` VARCHAR(191) NOT NULL,
    `activityCode` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `sequence` INTEGER NOT NULL DEFAULT 1,
    `estimatedHours` DECIMAL(8, 2) NULL,
    `standardRate` DECIMAL(19, 4) NULL,
    `skillRequired` ENUM('ENTRY_LEVEL', 'JUNIOR', 'STANDARD', 'SENIOR', 'EXPERT', 'SPECIALIST') NOT NULL DEFAULT 'STANDARD',
    `isOptional` BOOLEAN NOT NULL DEFAULT false,
    `isMilestone` BOOLEAN NOT NULL DEFAULT false,
    `dependencies` JSON NOT NULL,
    `deliverables` JSON NOT NULL,
    `qualityChecks` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ServiceActivity_serviceCatalogId_idx`(`serviceCatalogId`),
    UNIQUE INDEX `ServiceActivity_organizationId_serviceCatalogId_activityCode_key`(`organizationId`, `serviceCatalogId`, `activityCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceOffering` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `serviceCatalogId` VARCHAR(191) NOT NULL,
    `offeringCode` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `packagePrice` DECIMAL(19, 4) NOT NULL,
    `packageDuration` INTEGER NOT NULL,
    `validityDays` INTEGER NOT NULL DEFAULT 365,
    `maxParticipants` INTEGER NULL,
    `location` ENUM('CLIENT_SITE', 'OUR_OFFICE', 'REMOTE', 'HYBRID', 'FIELD', 'WORKSHOP') NOT NULL DEFAULT 'CLIENT_SITE',
    `deliveryMethod` ENUM('ON_SITE', 'REMOTE', 'VIRTUAL', 'SELF_PACED', 'BLENDED', 'WORKSHOP', 'ONE_ON_ONE') NOT NULL DEFAULT 'ON_SITE',
    `prerequisites` JSON NOT NULL,
    `includedActivities` JSON NOT NULL,
    `materials` JSON NOT NULL,
    `deliverables` JSON NOT NULL,
    `supportPeriodDays` INTEGER NULL DEFAULT 30,
    `warrantyPeriodDays` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ServiceOffering_serviceCatalogId_idx`(`serviceCatalogId`),
    UNIQUE INDEX `ServiceOffering_organizationId_serviceCatalogId_offeringCode_key`(`organizationId`, `serviceCatalogId`, `offeringCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceDelivery` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `serviceCatalogId` VARCHAR(191) NOT NULL,
    `deliveryNumber` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `projectId` VARCHAR(191) NULL,
    `bookingId` VARCHAR(191) NULL,
    `status` ENUM('PLANNED', 'SCHEDULED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'PENDING_APPROVAL') NOT NULL DEFAULT 'PLANNED',
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    `plannedStartDate` DATETIME(3) NOT NULL,
    `plannedEndDate` DATETIME(3) NOT NULL,
    `actualStartDate` DATETIME(3) NULL,
    `actualEndDate` DATETIME(3) NULL,
    `assignedTo` JSON NOT NULL,
    `location` TEXT NULL,
    `clientContactName` VARCHAR(191) NULL,
    `clientContactEmail` VARCHAR(191) NULL,
    `clientContactPhone` VARCHAR(191) NULL,
    `estimatedHours` DECIMAL(8, 2) NOT NULL,
    `actualHours` DECIMAL(8, 2) NULL,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `qualityScore` INTEGER NULL,
    `customerSatisfaction` INTEGER NULL,
    `notes` TEXT NULL,
    `deliverables` JSON NOT NULL,
    `completionCriteria` JSON NOT NULL,
    `signOffRequired` BOOLEAN NOT NULL DEFAULT false,
    `signOffBy` VARCHAR(191) NULL,
    `signOffDate` DATETIME(3) NULL,
    `invoiceId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ServiceDelivery_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `ServiceDelivery_serviceCatalogId_idx`(`serviceCatalogId`),
    INDEX `ServiceDelivery_customerId_idx`(`customerId`),
    UNIQUE INDEX `ServiceDelivery_organizationId_deliveryNumber_key`(`organizationId`, `deliveryNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceBooking` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `serviceCatalogId` VARCHAR(191) NULL,
    `offeringId` VARCHAR(191) NULL,
    `bookingNumber` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `contactName` VARCHAR(191) NULL,
    `contactEmail` VARCHAR(191) NULL,
    `contactPhone` VARCHAR(191) NULL,
    `bookingDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `requestedDate` DATETIME(3) NOT NULL,
    `confirmedDate` DATETIME(3) NULL,
    `status` ENUM('REQUESTED', 'PENDING_APPROVAL', 'CONFIRMED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED') NOT NULL DEFAULT 'REQUESTED',
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    `location` TEXT NULL,
    `specialRequests` VARCHAR(191) NULL,
    `estimatedHours` DECIMAL(8, 2) NULL,
    `quotedPrice` DECIMAL(19, 4) NULL,
    `approvedPrice` DECIMAL(19, 4) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `approvedDate` DATETIME(3) NULL,
    `cancellationReason` VARCHAR(191) NULL,
    `cancellationDate` DATETIME(3) NULL,
    `paymentTerms` VARCHAR(191) NULL,
    `paymentStatus` ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'REFUNDED', 'DISPUTED') NULL DEFAULT 'UNPAID',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ServiceBooking_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `ServiceBooking_customerId_idx`(`customerId`),
    INDEX `ServiceBooking_serviceCatalogId_idx`(`serviceCatalogId`),
    UNIQUE INDEX `ServiceBooking_organizationId_bookingNumber_key`(`organizationId`, `bookingNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceActivityEntry` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `deliveryId` VARCHAR(191) NOT NULL,
    `activityId` VARCHAR(191) NOT NULL,
    `entryDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NULL,
    `durationMinutes` INTEGER NULL,
    `assignedTo` VARCHAR(191) NOT NULL,
    `status` ENUM('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED', 'ON_HOLD') NOT NULL DEFAULT 'NOT_STARTED',
    `progress` INTEGER NOT NULL DEFAULT 0,
    `qualityCheck` BOOLEAN NOT NULL DEFAULT false,
    `qualityNotes` VARCHAR(191) NULL,
    `blockers` JSON NOT NULL,
    `completionNotes` VARCHAR(191) NULL,
    `deliverables` JSON NOT NULL,
    `clientPresent` BOOLEAN NOT NULL DEFAULT false,
    `clientFeedback` VARCHAR(191) NULL,
    `billableHours` DECIMAL(8, 2) NULL,
    `billableRate` DECIMAL(19, 4) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ServiceActivityEntry_organizationId_deliveryId_idx`(`organizationId`, `deliveryId`),
    INDEX `ServiceActivityEntry_activityId_idx`(`activityId`),
    INDEX `ServiceActivityEntry_assignedTo_idx`(`assignedTo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceTimeEntry` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `deliveryId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `entryDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NULL,
    `durationHours` DECIMAL(8, 2) NOT NULL,
    `description` TEXT NOT NULL,
    `workType` ENUM('DELIVERY', 'PREPARATION', 'TRAVEL', 'ADMIN', 'FOLLOW_UP', 'QUALITY_ASSURANCE', 'CLIENT_COMMUNICATION') NOT NULL DEFAULT 'DELIVERY',
    `isBillable` BOOLEAN NOT NULL DEFAULT true,
    `hourlyRate` DECIMAL(19, 4) NULL,
    `totalAmount` DECIMAL(19, 4) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `approvedDate` DATETIME(3) NULL,
    `invoiced` BOOLEAN NOT NULL DEFAULT false,
    `invoiceId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ServiceTimeEntry_organizationId_deliveryId_idx`(`organizationId`, `deliveryId`),
    INDEX `ServiceTimeEntry_userId_idx`(`userId`),
    INDEX `ServiceTimeEntry_entryDate_idx`(`entryDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceResource` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `serviceCatalogId` VARCHAR(191) NOT NULL,
    `resourceType` ENUM('HUMAN', 'EQUIPMENT', 'FACILITY', 'DIGITAL', 'MATERIAL') NOT NULL DEFAULT 'HUMAN',
    `resourceId` VARCHAR(191) NOT NULL,
    `resourceName` VARCHAR(191) NOT NULL,
    `availability` ENUM('AVAILABLE', 'BUSY', 'PARTIALLY_AVAILABLE', 'UNAVAILABLE', 'ON_LEAVE', 'OVERBOOKED') NOT NULL DEFAULT 'AVAILABLE',
    `hourlyRate` DECIMAL(19, 4) NULL,
    `utilizationTarget` INTEGER NOT NULL DEFAULT 80,
    `skills` JSON NOT NULL,
    `certifications` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ServiceResource_serviceCatalogId_idx`(`serviceCatalogId`),
    INDEX `ServiceResource_resourceType_idx`(`resourceType`),
    INDEX `ServiceResource_availability_idx`(`availability`),
    UNIQUE INDEX `ServiceResource_organizationId_serviceCatalogId_resourceId_key`(`organizationId`, `serviceCatalogId`, `resourceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MaintenancePlan` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `planNumber` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `assetId` VARCHAR(191) NULL,
    `planType` ENUM('ROUTINE', 'REPAIR', 'INSPECTION', 'UPGRADE', 'EMERGENCY', 'PREVENTIVE', 'PREDICTIVE', 'CORRECTIVE') NOT NULL DEFAULT 'PREVENTIVE',
    `frequency` VARCHAR(191) NULL,
    `frequencyValue` INTEGER NULL,
    `usageTrigger` DECIMAL(12, 2) NULL,
    `usageUnit` VARCHAR(191) NULL,
    `nextDueDate` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MaintenancePlan_organizationId_idx`(`organizationId`),
    INDEX `MaintenancePlan_assetId_idx`(`assetId`),
    UNIQUE INDEX `MaintenancePlan_organizationId_planNumber_key`(`organizationId`, `planNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MaintenanceWorkOrder` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `workOrderNumber` VARCHAR(191) NOT NULL,
    `maintenancePlanId` VARCHAR(191) NULL,
    `assetId` VARCHAR(191) NULL,
    `maintenanceType` ENUM('ROUTINE', 'REPAIR', 'INSPECTION', 'UPGRADE', 'EMERGENCY', 'PREVENTIVE', 'PREDICTIVE', 'CORRECTIVE') NOT NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    `status` ENUM('SCHEDULED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'OVERDUE') NOT NULL DEFAULT 'SCHEDULED',
    `scheduledDate` DATETIME(3) NULL,
    `completedDate` DATETIME(3) NULL,
    `technicianId` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `resolution` VARCHAR(191) NULL,
    `laborHours` DECIMAL(8, 2) NULL,
    `laborCost` DECIMAL(19, 4) NULL,
    `partsCost` DECIMAL(19, 4) NULL,
    `totalCost` DECIMAL(19, 4) NULL,
    `downtimeHours` DECIMAL(8, 2) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MaintenanceWorkOrder_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `MaintenanceWorkOrder_assetId_idx`(`assetId`),
    INDEX `MaintenanceWorkOrder_maintenancePlanId_idx`(`maintenancePlanId`),
    UNIQUE INDEX `MaintenanceWorkOrder_organizationId_workOrderNumber_key`(`organizationId`, `workOrderNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SparePart` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `partNumber` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `productId` VARCHAR(191) NULL,
    `minimumStock` DECIMAL(12, 4) NULL,
    `quantityOnHand` DECIMAL(12, 4) NOT NULL DEFAULT 0,
    `unitCost` DECIMAL(19, 4) NULL,
    `location` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SparePart_organizationId_idx`(`organizationId`),
    INDEX `SparePart_productId_idx`(`productId`),
    UNIQUE INDEX `SparePart_organizationId_partNumber_key`(`organizationId`, `partNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SparePartUsage` (
    `id` VARCHAR(191) NOT NULL,
    `workOrderId` VARCHAR(191) NOT NULL,
    `sparePartId` VARCHAR(191) NOT NULL,
    `quantityUsed` DECIMAL(12, 4) NOT NULL,
    `unitCost` DECIMAL(19, 4) NOT NULL,
    `totalCost` DECIMAL(19, 4) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SparePartUsage_workOrderId_idx`(`workOrderId`),
    INDEX `SparePartUsage_sparePartId_idx`(`sparePartId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Report` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `reportType` ENUM('BALANCE_SHEET', 'PROFIT_LOSS', 'CASH_FLOW', 'TRIAL_BALANCE', 'AGED_RECEIVABLES', 'AGED_PAYABLES', 'INVENTORY_VALUATION', 'SALES_ANALYSIS', 'PURCHASE_ANALYSIS', 'CUSTOM') NOT NULL,
    `category` VARCHAR(191) NULL,
    `query` JSON NOT NULL,
    `columns` JSON NOT NULL,
    `filters` JSON NULL,
    `sorting` JSON NULL,
    `grouping` JSON NULL,
    `aggregations` JSON NULL,
    `chartConfig` JSON NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Report_organizationId_idx`(`organizationId`),
    INDEX `Report_reportType_idx`(`reportType`),
    INDEX `Report_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Dashboard` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `layout` JSON NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Dashboard_organizationId_idx`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DashboardWidget` (
    `id` VARCHAR(191) NOT NULL,
    `dashboardId` VARCHAR(191) NOT NULL,
    `reportId` VARCHAR(191) NULL,
    `widgetType` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `position` JSON NOT NULL,
    `config` JSON NOT NULL,
    `refreshInterval` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DashboardWidget_dashboardId_idx`(`dashboardId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReportSchedule` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `reportId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `frequency` ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM') NOT NULL,
    `cronExpression` VARCHAR(191) NULL,
    `recipients` JSON NOT NULL,
    `format` ENUM('PDF', 'EXCEL', 'CSV', 'JSON') NOT NULL DEFAULT 'PDF',
    `filters` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastRun` DATETIME(3) NULL,
    `nextRun` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ReportSchedule_organizationId_idx`(`organizationId`),
    INDEX `ReportSchedule_nextRun_idx`(`nextRun`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScheduleExecution` (
    `id` VARCHAR(191) NOT NULL,
    `scheduleId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED') NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `fileUrl` VARCHAR(191) NULL,
    `errorMessage` VARCHAR(191) NULL,

    INDEX `ScheduleExecution_scheduleId_idx`(`scheduleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DataCube` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `sourceType` VARCHAR(191) NOT NULL,
    `dimensions` JSON NOT NULL,
    `measures` JSON NOT NULL,
    `query` JSON NOT NULL,
    `aggregationRule` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DataCube_organizationId_idx`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApprovalWorkflow` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `entityType` ENUM('PURCHASE_ORDER', 'BILL', 'PAYMENT', 'JOURNAL', 'EXPENSE_CLAIM', 'CREDIT_NOTE', 'DEBIT_NOTE', 'TRANSFER', 'INVOICE') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ApprovalWorkflow_organizationId_entityType_idx`(`organizationId`, `entityType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApprovalStep` (
    `id` VARCHAR(191) NOT NULL,
    `workflowId` VARCHAR(191) NOT NULL,
    `stepOrder` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `approverType` ENUM('USER', 'ROLE', 'MANAGER', 'CUSTOM') NOT NULL,
    `approverIds` JSON NULL,
    `approverRoles` JSON NULL,
    `requireAll` BOOLEAN NOT NULL DEFAULT false,
    `escalationHours` INTEGER NULL,
    `escalationTo` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ApprovalStep_workflowId_stepOrder_idx`(`workflowId`, `stepOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApprovalRule` (
    `id` VARCHAR(191) NOT NULL,
    `workflowId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `conditions` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ApprovalRule_workflowId_idx`(`workflowId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApprovalRequest` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `workflowId` VARCHAR(191) NOT NULL,
    `entityType` ENUM('PURCHASE_ORDER', 'BILL', 'PAYMENT', 'JOURNAL', 'EXPENSE_CLAIM', 'CREDIT_NOTE', 'DEBIT_NOTE', 'TRANSFER', 'INVOICE') NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `requestedById` VARCHAR(191) NOT NULL,
    `currentStepOrder` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ApprovalRequest_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `ApprovalRequest_entityType_entityId_idx`(`entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApprovalAction` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `stepId` VARCHAR(191) NOT NULL,
    `approverId` VARCHAR(191) NOT NULL,
    `action` ENUM('APPROVE', 'REJECT', 'DELEGATE', 'COMMENT') NOT NULL,
    `delegatedTo` VARCHAR(191) NULL,
    `comment` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ApprovalAction_requestId_idx`(`requestId`),
    INDEX `ApprovalAction_approverId_idx`(`approverId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WebhookEndpoint` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `events` JSON NOT NULL,
    `secret` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WebhookEndpoint_organizationId_idx`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WebhookDelivery` (
    `id` VARCHAR(191) NOT NULL,
    `endpointId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `responseStatus` INTEGER NULL,
    `responseBody` VARCHAR(191) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `nextRetry` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WebhookDelivery_endpointId_idx`(`endpointId`),
    INDEX `WebhookDelivery_nextRetry_idx`(`nextRetry`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventLog` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `integrationId` VARCHAR(191) NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('SUCCESS', 'FAILED', 'PENDING') NOT NULL,
    `errorMessage` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EventLog_organizationId_eventType_idx`(`organizationId`, `eventType`),
    INDEX `EventLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RowLevelSecurityRule` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `conditions` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RowLevelSecurityRule_organizationId_entityType_idx`(`organizationId`, `entityType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SSOConfig` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `issuer` VARCHAR(191) NOT NULL,
    `entryPoint` VARCHAR(191) NOT NULL,
    `certificate` VARCHAR(191) NOT NULL,
    `identifierFormat` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SSOConfig_organizationId_key`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MFASettings` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `method` ENUM('TOTP', 'SMS', 'EMAIL') NOT NULL,
    `secret` VARCHAR(191) NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `backupCodes` JSON NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MFASettings_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItemMaster` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `masterNumber` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(191) NULL,
    `productId` VARCHAR(191) NULL,
    `attributeSetId` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdById` VARCHAR(191) NOT NULL,
    `approvedById` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ItemMaster_productId_key`(`productId`),
    INDEX `ItemMaster_organizationId_status_idx`(`organizationId`, `status`),
    UNIQUE INDEX `ItemMaster_organizationId_masterNumber_key`(`organizationId`, `masterNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MasterDataVersion` (
    `id` VARCHAR(191) NOT NULL,
    `itemMasterId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `changes` JSON NOT NULL,
    `changeReason` VARCHAR(191) NULL,
    `changedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MasterDataVersion_itemMasterId_idx`(`itemMasterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttributeSet` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `attributes` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AttributeSet_organizationId_idx`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductVariant` (
    `id` VARCHAR(191) NOT NULL,
    `itemMasterId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NOT NULL,
    `attributeSetId` VARCHAR(191) NULL,
    `attributeValues` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProductVariant_productId_key`(`productId`),
    INDEX `ProductVariant_itemMasterId_idx`(`itemMasterId`),
    UNIQUE INDEX `ProductVariant_itemMasterId_sku_key`(`itemMasterId`, `sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PriceList` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `validFrom` DATETIME(3) NULL,
    `validTo` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PriceList_organizationId_idx`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PriceListItem` (
    `id` VARCHAR(191) NOT NULL,
    `priceListId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `price` DECIMAL(19, 4) NOT NULL,
    `minQuantity` DECIMAL(12, 4) NULL,
    `maxQuantity` DECIMAL(12, 4) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PriceListItem_priceListId_idx`(`priceListId`),
    INDEX `PriceListItem_productId_idx`(`productId`),
    UNIQUE INDEX `PriceListItem_priceListId_productId_minQuantity_key`(`priceListId`, `productId`, `minQuantity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Discount` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `discountType` ENUM('PERCENTAGE', 'FIXED_AMOUNT') NOT NULL,
    `value` DECIMAL(19, 4) NOT NULL,
    `minPurchase` DECIMAL(19, 4) NULL,
    `maxDiscount` DECIMAL(19, 4) NULL,
    `validFrom` DATETIME(3) NOT NULL,
    `validTo` DATETIME(3) NOT NULL,
    `usageLimit` INTEGER NULL,
    `usageCount` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Discount_organizationId_idx`(`organizationId`),
    INDEX `Discount_validFrom_validTo_idx`(`validFrom`, `validTo`),
    UNIQUE INDEX `Discount_organizationId_code_key`(`organizationId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Promotion` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `promotionType` ENUM('BUY_X_GET_Y', 'BUNDLE', 'TIERED', 'FREE_SHIPPING') NOT NULL,
    `rules` JSON NOT NULL,
    `discountType` ENUM('PERCENTAGE', 'FIXED_AMOUNT') NOT NULL,
    `discountValue` DECIMAL(19, 4) NOT NULL,
    `validFrom` DATETIME(3) NOT NULL,
    `validTo` DATETIME(3) NOT NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Promotion_organizationId_idx`(`organizationId`),
    INDEX `Promotion_validFrom_validTo_idx`(`validFrom`, `validTo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CycleCount` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `countNumber` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NULL,
    `status` ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `scheduledDate` DATETIME(3) NOT NULL,
    `countedDate` DATETIME(3) NULL,
    `assignedToId` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CycleCount_organizationId_status_idx`(`organizationId`, `status`),
    UNIQUE INDEX `CycleCount_organizationId_countNumber_key`(`organizationId`, `countNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CycleCountItem` (
    `id` VARCHAR(191) NOT NULL,
    `cycleCountId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `expectedQty` DECIMAL(12, 4) NOT NULL,
    `countedQty` DECIMAL(12, 4) NULL,
    `variance` DECIMAL(12, 4) NULL,
    `varianceValue` DECIMAL(19, 4) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CycleCountItem_cycleCountId_idx`(`cycleCountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryValuation` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NULL,
    `valuationDate` DATETIME(3) NOT NULL,
    `method` ENUM('FIFO', 'LIFO', 'WEIGHTED_AVERAGE', 'STANDARD') NOT NULL,
    `quantity` DECIMAL(12, 4) NOT NULL,
    `unitCost` DECIMAL(19, 4) NOT NULL,
    `totalValue` DECIMAL(19, 4) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InventoryValuation_organizationId_valuationDate_idx`(`organizationId`, `valuationDate`),
    INDEX `InventoryValuation_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockReservation` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NULL,
    `quantity` DECIMAL(12, 4) NOT NULL,
    `reservationType` VARCHAR(191) NOT NULL,
    `referenceId` VARCHAR(191) NULL,
    `reservedUntil` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'FULFILLED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StockReservation_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `StockReservation_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StandardCost` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `costingMethod` ENUM('STANDARD', 'FIFO', 'LIFO', 'WEIGHTED_AVERAGE', 'SPECIFIC_IDENTIFICATION') NOT NULL DEFAULT 'WEIGHTED_AVERAGE',
    `materialCost` DECIMAL(19, 4) NOT NULL,
    `laborCost` DECIMAL(19, 4) NOT NULL,
    `overheadCost` DECIMAL(19, 4) NOT NULL,
    `totalStandardCost` DECIMAL(19, 4) NOT NULL,
    `costingVersion` VARCHAR(191) NOT NULL DEFAULT '1.0',
    `status` ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'FROZEN', 'REJECTED', 'EXPIRED', 'SUPERSEDED') NOT NULL DEFAULT 'DRAFT',
    `effectiveFrom` DATETIME(3) NOT NULL,
    `effectiveTo` DATETIME(3) NULL,
    `validFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `validTo` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isFrozen` BOOLEAN NOT NULL DEFAULT false,
    `approvalRequired` BOOLEAN NOT NULL DEFAULT false,
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectedBy` VARCHAR(191) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `baseCurrency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `localizedCosts` JSON NULL,
    `lastPurchasePrice` DECIMAL(19, 4) NULL,
    `priceDelta` DECIMAL(19, 4) NULL,
    `priceVariance` DECIMAL(19, 4) NULL,
    `bomId` VARCHAR(191) NULL,
    `routingId` VARCHAR(191) NULL,
    `lastRollupDate` DATETIME(3) NULL,
    `rollupSource` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StandardCost_organizationId_productId_idx`(`organizationId`, `productId`),
    INDEX `StandardCost_effectiveFrom_effectiveTo_idx`(`effectiveFrom`, `effectiveTo`),
    INDEX `StandardCost_costingVersion_status_idx`(`costingVersion`, `status`),
    INDEX `StandardCost_status_approvalRequired_idx`(`status`, `approvalRequired`),
    UNIQUE INDEX `StandardCost_organizationId_productId_costingVersion_key`(`organizationId`, `productId`, `costingVersion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CostVariance` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `standardCostId` VARCHAR(191) NULL,
    `transactionId` VARCHAR(191) NULL,
    `varianceType` ENUM('MATERIAL_PRICE', 'MATERIAL_USAGE', 'LABOR_RATE', 'LABOR_EFFICIENCY', 'OVERHEAD_SPENDING', 'OVERHEAD_VOLUME', 'PURCHASE_PRICE', 'PRODUCTION') NOT NULL,
    `materialVariance` DECIMAL(19, 4) NULL,
    `laborVariance` DECIMAL(19, 4) NULL,
    `overheadVariance` DECIMAL(19, 4) NULL,
    `totalVariance` DECIMAL(19, 4) NOT NULL,
    `quantity` DECIMAL(12, 4) NOT NULL,
    `referenceType` VARCHAR(191) NULL,
    `referenceId` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CostVariance_organizationId_productId_idx`(`organizationId`, `productId`),
    INDEX `CostVariance_varianceType_idx`(`varianceType`),
    INDEX `CostVariance_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LandedCost` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `referenceType` VARCHAR(191) NOT NULL,
    `referenceId` VARCHAR(191) NOT NULL,
    `totalProductCost` DECIMAL(19, 4) NOT NULL,
    `freightCost` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `insuranceCost` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `customsDuty` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `handlingCost` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `otherCosts` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `totalLandedCost` DECIMAL(19, 4) NOT NULL,
    `allocationMethod` ENUM('BY_VALUE', 'BY_WEIGHT', 'BY_VOLUME', 'BY_QUANTITY', 'MANUAL') NOT NULL DEFAULT 'BY_VALUE',
    `isAllocated` BOOLEAN NOT NULL DEFAULT false,
    `allocatedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LandedCost_organizationId_referenceType_referenceId_idx`(`organizationId`, `referenceType`, `referenceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LandedCostAllocationItem` (
    `id` VARCHAR(191) NOT NULL,
    `landedCostId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(12, 4) NOT NULL,
    `productCost` DECIMAL(19, 4) NOT NULL,
    `allocatedAmount` DECIMAL(19, 4) NOT NULL,
    `unitLandedCost` DECIMAL(19, 4) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LandedCostAllocationItem_landedCostId_idx`(`landedCostId`),
    INDEX `LandedCostAllocationItem_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CostRevaluation` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `revaluationNumber` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `warehouseId` VARCHAR(191) NULL,
    `revaluationDate` DATETIME(3) NOT NULL,
    `reason` TEXT NOT NULL,
    `oldUnitCost` DECIMAL(19, 4) NOT NULL,
    `newUnitCost` DECIMAL(19, 4) NOT NULL,
    `quantity` DECIMAL(12, 4) NOT NULL,
    `valueDifference` DECIMAL(19, 4) NOT NULL,
    `transactionId` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'POSTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `approvedById` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CostRevaluation_transactionId_key`(`transactionId`),
    INDEX `CostRevaluation_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `CostRevaluation_productId_idx`(`productId`),
    UNIQUE INDEX `CostRevaluation_organizationId_revaluationNumber_key`(`organizationId`, `revaluationNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DemandForecast` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NULL,
    `forecastPeriod` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `forecastMethod` ENUM('MOVING_AVERAGE', 'EXPONENTIAL_SMOOTHING', 'LINEAR_REGRESSION', 'SEASONAL', 'MACHINE_LEARNING', 'MANUAL') NOT NULL DEFAULT 'MOVING_AVERAGE',
    `forecastedDemand` DECIMAL(12, 4) NOT NULL,
    `actualDemand` DECIMAL(12, 4) NULL,
    `accuracy` DECIMAL(5, 2) NULL,
    `confidenceLevel` DECIMAL(5, 2) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DemandForecast_organizationId_productId_idx`(`organizationId`, `productId`),
    INDEX `DemandForecast_periodStart_periodEnd_idx`(`periodStart`, `periodEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SafetyStock` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NULL,
    `safetyStockQty` DECIMAL(12, 4) NOT NULL,
    `calculationMethod` ENUM('FIXED', 'PERCENTAGE_OF_DEMAND', 'BASED_ON_LEAD_TIME', 'STATISTICAL') NOT NULL DEFAULT 'FIXED',
    `leadTimeDays` INTEGER NULL,
    `demandVariability` DECIMAL(5, 2) NULL,
    `serviceLevel` DECIMAL(5, 2) NULL,
    `reviewPeriodDays` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `effectiveFrom` DATETIME(3) NOT NULL,
    `effectiveTo` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SafetyStock_organizationId_productId_idx`(`organizationId`, `productId`),
    UNIQUE INDEX `SafetyStock_organizationId_productId_warehouseId_effectiveFr_key`(`organizationId`, `productId`, `warehouseId`, `effectiveFrom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReorderPolicy` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NULL,
    `policyType` ENUM('MIN_MAX', 'REORDER_POINT', 'PERIODIC_REVIEW', 'ECONOMIC_ORDER_QUANTITY', 'JUST_IN_TIME') NOT NULL DEFAULT 'MIN_MAX',
    `reorderPoint` DECIMAL(12, 4) NOT NULL,
    `reorderQuantity` DECIMAL(12, 4) NOT NULL,
    `minQuantity` DECIMAL(12, 4) NULL,
    `maxQuantity` DECIMAL(12, 4) NULL,
    `leadTimeDays` INTEGER NOT NULL,
    `reviewCycleDays` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `effectiveFrom` DATETIME(3) NOT NULL,
    `effectiveTo` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ReorderPolicy_organizationId_isActive_idx`(`organizationId`, `isActive`),
    UNIQUE INDEX `ReorderPolicy_organizationId_productId_warehouseId_effective_key`(`organizationId`, `productId`, `warehouseId`, `effectiveFrom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductPlanning` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `planningMethod` ENUM('MRP', 'MRP_II', 'KANBAN', 'LEAN', 'MANUAL') NOT NULL DEFAULT 'MRP',
    `abcClassification` ENUM('A', 'B', 'C') NULL,
    `criticalityLevel` ENUM('LOW', 'NORMAL', 'HIGH', 'CRITICAL') NULL DEFAULT 'NORMAL',
    `isPurchased` BOOLEAN NOT NULL DEFAULT true,
    `isManufactured` BOOLEAN NOT NULL DEFAULT false,
    `defaultVendorId` VARCHAR(191) NULL,
    `procurementLeadTime` INTEGER NULL,
    `manufacturingLeadTime` INTEGER NULL,
    `shelfLifeDays` INTEGER NULL,
    `lotControl` BOOLEAN NOT NULL DEFAULT false,
    `serialControl` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProductPlanning_organizationId_planningMethod_idx`(`organizationId`, `planningMethod`),
    UNIQUE INDEX `ProductPlanning_organizationId_productId_key`(`organizationId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QualityInspection` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `inspectionNumber` VARCHAR(191) NOT NULL,
    `inspectionType` ENUM('RECEIVING', 'IN_PROCESS', 'FINAL', 'OUTGOING', 'AUDIT') NOT NULL,
    `referenceType` VARCHAR(191) NOT NULL,
    `referenceId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `lotNumber` VARCHAR(191) NULL,
    `quantity` DECIMAL(12, 4) NOT NULL,
    `inspectedQty` DECIMAL(12, 4) NULL,
    `acceptedQty` DECIMAL(12, 4) NULL,
    `rejectedQty` DECIMAL(12, 4) NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'CONDITIONAL', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `inspectedById` VARCHAR(191) NULL,
    `inspectedAt` DATETIME(3) NULL,
    `dueDate` DATETIME(3) NULL,
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `QualityInspection_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `QualityInspection_referenceType_referenceId_idx`(`referenceType`, `referenceId`),
    UNIQUE INDEX `QualityInspection_organizationId_inspectionNumber_key`(`organizationId`, `inspectionNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QualityMeasurement` (
    `id` VARCHAR(191) NOT NULL,
    `inspectionId` VARCHAR(191) NOT NULL,
    `parameter` VARCHAR(191) NOT NULL,
    `specification` VARCHAR(191) NULL,
    `measuredValue` VARCHAR(191) NOT NULL,
    `uom` VARCHAR(191) NULL,
    `isCompliant` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `QualityMeasurement_inspectionId_idx`(`inspectionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QualityHold` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `holdNumber` VARCHAR(191) NOT NULL,
    `inspectionId` VARCHAR(191) NULL,
    `productId` VARCHAR(191) NOT NULL,
    `lotNumber` VARCHAR(191) NULL,
    `batchNumber` VARCHAR(191) NULL,
    `serialNumber` VARCHAR(191) NULL,
    `quantity` DECIMAL(12, 4) NOT NULL,
    `warehouseId` VARCHAR(191) NULL,
    `holdType` ENUM('QUALITY', 'SAFETY', 'REGULATORY', 'SUPPLIER_RECALL', 'CUSTOMER_COMPLAINT', 'INTERNAL_REVIEW') NOT NULL DEFAULT 'QUALITY',
    `holdReason` TEXT NOT NULL,
    `status` ENUM('ACTIVE', 'RELEASED', 'SCRAPPED', 'REWORKED', 'RETURNED') NOT NULL DEFAULT 'ACTIVE',
    `dispositionAction` ENUM('USE_AS_IS', 'REWORK', 'SCRAP', 'RETURN_TO_VENDOR', 'SORT') NULL,
    `dispositionNotes` VARCHAR(191) NULL,
    `releasedById` VARCHAR(191) NULL,
    `releasedAt` DATETIME(3) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `metadata` JSON NULL,
    `attachments` JSON NULL,

    INDEX `QualityHold_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `QualityHold_productId_idx`(`productId`),
    UNIQUE INDEX `QualityHold_organizationId_holdNumber_key`(`organizationId`, `holdNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CertificateOfAnalysis` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `coaNumber` VARCHAR(191) NOT NULL,
    `inspectionId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `lotNumber` VARCHAR(191) NOT NULL,
    `batchNumber` VARCHAR(191) NULL,
    `manufactureDate` DATETIME(3) NULL,
    `expiryDate` DATETIME(3) NULL,
    `testResults` JSON NOT NULL,
    `conclusion` VARCHAR(191) NOT NULL,
    `issuedById` VARCHAR(191) NOT NULL,
    `issuedAt` DATETIME(3) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CertificateOfAnalysis_inspectionId_key`(`inspectionId`),
    INDEX `CertificateOfAnalysis_organizationId_productId_idx`(`organizationId`, `productId`),
    INDEX `CertificateOfAnalysis_lotNumber_idx`(`lotNumber`),
    UNIQUE INDEX `CertificateOfAnalysis_organizationId_coaNumber_key`(`organizationId`, `coaNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NonConformanceReport` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `ncrNumber` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `source` ENUM('RECEIVING_INSPECTION', 'IN_PROCESS', 'FINAL_INSPECTION', 'CUSTOMER_COMPLAINT', 'VENDOR_ISSUE', 'INTERNAL_AUDIT', 'EXTERNAL_AUDIT') NOT NULL,
    `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `status` ENUM('OPEN', 'INVESTIGATING', 'CONTAINMENT', 'ROOT_CAUSE_ANALYSIS', 'CORRECTIVE_ACTION', 'VERIFICATION', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    `productId` VARCHAR(191) NULL,
    `lotNumber` VARCHAR(191) NULL,
    `vendorId` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NULL,
    `quantity` DECIMAL(12, 4) NULL,
    `detectedDate` DATETIME(3) NOT NULL,
    `detectedById` VARCHAR(191) NOT NULL,
    `rootCause` VARCHAR(191) NULL,
    `containmentAction` VARCHAR(191) NULL,
    `assignedToId` VARCHAR(191) NULL,
    `targetCloseDate` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `closedById` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `localComplianceData` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `NonConformanceReport_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `NonConformanceReport_severity_idx`(`severity`),
    UNIQUE INDEX `NonConformanceReport_organizationId_ncrNumber_key`(`organizationId`, `ncrNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CAPA` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `capaNumber` VARCHAR(191) NOT NULL,
    `ncrId` VARCHAR(191) NULL,
    `source` ENUM('NCR', 'AUDIT', 'CUSTOMER_COMPLAINT', 'MANAGEMENT_REVIEW', 'INTERNAL_REVIEW', 'SUPPLIER_ISSUE', 'OTHER') NOT NULL DEFAULT 'NCR',
    `riskLevel` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `investigationMethod` ENUM('FIVE_WHY', 'FISHBONE', 'PARETO', 'FMEA', 'OTHER') NULL,
    `type` ENUM('CORRECTIVE', 'PREVENTIVE', 'BOTH') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `rootCause` VARCHAR(191) NULL,
    `correctiveAction` VARCHAR(191) NULL,
    `preventiveAction` VARCHAR(191) NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'IMPLEMENTED', 'VERIFYING', 'VERIFIED', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `assignedToId` VARCHAR(191) NULL,
    `dueDate` DATETIME(3) NULL,
    `implementedAt` DATETIME(3) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `verifiedById` VARCHAR(191) NULL,
    `effectiveness` VARCHAR(191) NULL,
    `closureDate` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `closedById` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `localData` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CAPA_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `CAPA_type_idx`(`type`),
    INDEX `CAPA_source_idx`(`source`),
    INDEX `CAPA_riskLevel_idx`(`riskLevel`),
    UNIQUE INDEX `CAPA_organizationId_capaNumber_key`(`organizationId`, `capaNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CapaTask` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `capaId` VARCHAR(191) NOT NULL,
    `taskNumber` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `assignedToId` VARCHAR(191) NULL,
    `dueDate` DATETIME(3) NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `completedAt` DATETIME(3) NULL,
    `completedById` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `localData` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CapaTask_organizationId_status_idx`(`organizationId`, `status`),
    INDEX `CapaTask_capaId_idx`(`capaId`),
    UNIQUE INDEX `CapaTask_organizationId_capaId_taskNumber_key`(`organizationId`, `capaId`, `taskNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxJurisdiction` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NOT NULL,
    `countryCode` VARCHAR(191) NULL,
    `stateProvince` VARCHAR(191) NULL,
    `countyDistrict` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `postalCodeStart` VARCHAR(191) NULL,
    `postalCodeEnd` VARCHAR(191) NULL,
    `jurisdictionType` ENUM('FEDERAL', 'STATE', 'COUNTY', 'CITY', 'LOCAL', 'SPECIAL') NOT NULL,
    `taxAuthority` VARCHAR(191) NULL,
    `taxLiabilityAccountId` VARCHAR(191) NULL,
    `eInvoiceFormat` VARCHAR(191) NULL,
    `requiresEInvoicing` BOOLEAN NOT NULL DEFAULT false,
    `metadata` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `parentJurisdictionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TaxJurisdiction_organizationId_country_idx`(`organizationId`, `country`),
    INDEX `TaxJurisdiction_postalCode_idx`(`postalCode`),
    INDEX `TaxJurisdiction_taxLiabilityAccountId_idx`(`taxLiabilityAccountId`),
    UNIQUE INDEX `TaxJurisdiction_organizationId_code_key`(`organizationId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxRule` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `jurisdictionId` VARCHAR(191) NULL,
    `taxType` ENUM('STANDARD_RATE', 'REDUCED_RATE', 'ZERO_RATE', 'EXEMPTION', 'REVERSE_CHARGE', 'COMPOUND', 'WITHHOLDING', 'CUSTOM') NOT NULL,
    `taxRate` DECIMAL(5, 2) NOT NULL,
    `ruleType` ENUM('STANDARD_RATE', 'REDUCED_RATE', 'ZERO_RATE', 'EXEMPTION', 'REVERSE_CHARGE', 'COMPOUND', 'WITHHOLDING', 'CUSTOM') NOT NULL,
    `applicableOn` VARCHAR(191) NOT NULL,
    `productCategory` VARCHAR(191) NULL,
    `customerType` VARCHAR(191) NULL,
    `minimumAmount` DECIMAL(19, 4) NULL,
    `maximumAmount` DECIMAL(19, 4) NULL,
    `effectiveFrom` DATETIME(3) NOT NULL,
    `effectiveTo` DATETIME(3) NULL,
    `isCompound` BOOLEAN NOT NULL DEFAULT false,
    `compoundSequence` INTEGER NULL,
    `parentRuleId` VARCHAR(191) NULL,
    `calculationFormula` VARCHAR(191) NULL,
    `priority` INTEGER NOT NULL DEFAULT 1,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TaxRule_organizationId_taxType_idx`(`organizationId`, `taxType`),
    INDEX `TaxRule_effectiveFrom_effectiveTo_idx`(`effectiveFrom`, `effectiveTo`),
    INDEX `TaxRule_ruleType_priority_idx`(`ruleType`, `priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxExemption` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `exemptionNumber` VARCHAR(191) NOT NULL,
    `taxRuleId` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `exemptionType` VARCHAR(191) NOT NULL,
    `exemptionRate` DECIMAL(5, 2) NULL,
    `certificateNumber` VARCHAR(191) NULL,
    `issuingAuthority` VARCHAR(191) NULL,
    `issuedDate` DATETIME(3) NULL,
    `validFrom` DATETIME(3) NOT NULL,
    `validTo` DATETIME(3) NULL,
    `documentUrl` VARCHAR(191) NULL,
    `documentPath` VARCHAR(191) NULL,
    `reason` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TaxExemption_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `TaxExemption_validFrom_validTo_idx`(`validFrom`, `validTo`),
    INDEX `TaxExemption_issuingAuthority_idx`(`issuingAuthority`),
    INDEX `TaxExemption_exemptionType_idx`(`exemptionType`),
    UNIQUE INDEX `TaxExemption_organizationId_exemptionNumber_key`(`organizationId`, `exemptionNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LocalizationConfig` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NOT NULL,
    `language` VARCHAR(191) NOT NULL DEFAULT 'en',
    `dateFormat` VARCHAR(191) NOT NULL DEFAULT 'MM/DD/YYYY',
    `timeFormat` VARCHAR(191) NOT NULL DEFAULT '12h',
    `numberFormat` VARCHAR(191) NOT NULL DEFAULT '1,234.56',
    `currencyFormat` VARCHAR(191) NOT NULL DEFAULT '$1,234.56',
    `firstDayOfWeek` INTEGER NOT NULL DEFAULT 0,
    `fiscalYearStart` INTEGER NOT NULL DEFAULT 1,
    `taxIdLabel` VARCHAR(191) NULL,
    `addressFormat` JSON NULL,
    `reportingRequirements` JSON NULL,
    `complianceSettings` JSON NULL,
    `customFields` JSON NULL,
    `apiEndpoints` JSON NULL,
    `taxReturnTemplates` JSON NULL,
    `digitalFiscalization` JSON NULL,
    `translationKeys` JSON NULL,
    `complianceDrivers` JSON NULL,
    `fiscalCalendar` JSON NULL,
    `regulatoryBodies` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LocalizationConfig_organizationId_key`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssemblyTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `bomId` VARCHAR(191) NOT NULL,
    `finishedProductId` VARCHAR(191) NOT NULL,
    `assemblyNumber` VARCHAR(191) NOT NULL,
    `assemblyDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `quantity` DECIMAL(12, 4) NOT NULL,
    `materialCost` DECIMAL(19, 4) NOT NULL,
    `laborCost` DECIMAL(19, 4) NOT NULL,
    `overheadCost` DECIMAL(19, 4) NOT NULL,
    `wastageQuantity` DECIMAL(12, 4) NOT NULL DEFAULT 0,
    `wastageCost` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `totalManufacturingCost` DECIMAL(19, 4) NOT NULL,
    `previousUnitCost` DECIMAL(19, 4) NOT NULL,
    `newUnitCost` DECIMAL(19, 4) NOT NULL,
    `isExcisableProduct` BOOLEAN NOT NULL DEFAULT false,
    `exciseDutyRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `exciseDutyAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `inputVATRecovered` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `glTransactionId` VARCHAR(191) NULL,
    `rawMaterialAccountId` VARCHAR(191) NULL,
    `finishedGoodsAccountId` VARCHAR(191) NULL,
    `laborAccountId` VARCHAR(191) NULL,
    `overheadAccountId` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'READY_FOR_REVIEW', 'APPROVED', 'POSTED', 'REVERSED') NOT NULL DEFAULT 'DRAFT',
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `attachments` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AssemblyTransaction_assemblyNumber_key`(`assemblyNumber`),
    INDEX `AssemblyTransaction_organizationId_assemblyDate_idx`(`organizationId`, `assemblyDate`),
    INDEX `AssemblyTransaction_bomId_idx`(`bomId`),
    INDEX `AssemblyTransaction_status_idx`(`status`),
    INDEX `AssemblyTransaction_glTransactionId_idx`(`glTransactionId`),
    UNIQUE INDEX `AssemblyTransaction_organizationId_assemblyNumber_key`(`organizationId`, `assemblyNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssemblyLine` (
    `id` VARCHAR(191) NOT NULL,
    `assemblyTransactionId` VARCHAR(191) NOT NULL,
    `componentProductId` VARCHAR(191) NOT NULL,
    `plannedQuantity` DECIMAL(12, 4) NOT NULL,
    `actualQuantity` DECIMAL(12, 4) NOT NULL,
    `wasteQuantity` DECIMAL(12, 4) NOT NULL DEFAULT 0,
    `unitCost` DECIMAL(19, 4) NOT NULL,
    `plannedCost` DECIMAL(19, 4) NOT NULL,
    `actualCost` DECIMAL(19, 4) NOT NULL,
    `wasteCost` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `costVariance` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `lotId` VARCHAR(191) NULL,
    `warehouseId` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AssemblyLine_assemblyTransactionId_idx`(`assemblyTransactionId`),
    INDEX `AssemblyLine_componentProductId_idx`(`componentProductId`),
    INDEX `AssemblyLine_lotId_idx`(`lotId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WastageTracking` (
    `id` VARCHAR(191) NOT NULL,
    `assemblyTransactionId` VARCHAR(191) NOT NULL,
    `totalWastageQuantity` DECIMAL(12, 4) NOT NULL,
    `totalWastageCost` DECIMAL(19, 4) NOT NULL,
    `wastagePercentage` DECIMAL(6, 2) NOT NULL,
    `wastageReasons` JSON NOT NULL,
    `description` TEXT NULL,
    `scrapValue` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `scrapAccountId` VARCHAR(191) NULL,
    `documentationUrl` VARCHAR(191) NULL,
    `authorizedBy` VARCHAR(191) NULL,
    `authorizedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WastageTracking_assemblyTransactionId_key`(`assemblyTransactionId`),
    INDEX `WastageTracking_assemblyTransactionId_idx`(`assemblyTransactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UGExcisableDuty` (
    `id` VARCHAR(191) NOT NULL,
    `assemblyTransactionId` VARCHAR(191) NOT NULL,
    `productSKU` VARCHAR(191) NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `excisableCategoryId` VARCHAR(191) NOT NULL,
    `baseValue` DECIMAL(19, 4) NOT NULL,
    `exciseRate` DECIMAL(5, 2) NOT NULL,
    `exciseDutyAmount` DECIMAL(19, 4) NOT NULL,
    `inputVATOnMaterials` DECIMAL(19, 4) NOT NULL,
    `outputVATOnFinished` DECIMAL(19, 4) NOT NULL,
    `netVATPosition` DECIMAL(19, 4) NOT NULL,
    `whtRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `whtAmount` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    `exciseDutyAccountId` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UGExcisableDuty_assemblyTransactionId_key`(`assemblyTransactionId`),
    INDEX `UGExcisableDuty_assemblyTransactionId_idx`(`assemblyTransactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ManufacturingLaborCost` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `costType` ENUM('HOURLY_RATE', 'FLAT_COST', 'PER_UNIT') NOT NULL,
    `rate` DECIMAL(12, 4) NOT NULL,
    `laborAccountId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ManufacturingLaborCost_organizationId_idx`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ManufacturingOverhead` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `allocationMethod` ENUM('PERCENTAGE', 'FIXED', 'MATERIAL_PERCENTAGE', 'LABOR_PERCENTAGE', 'PER_UNIT') NOT NULL,
    `rate` DECIMAL(12, 4) NOT NULL,
    `overheadAccountId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `effectiveFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `effectiveTo` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ManufacturingOverhead_organizationId_idx`(`organizationId`),
    INDEX `ManufacturingOverhead_allocationMethod_idx`(`allocationMethod`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InterBranchTransfer` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `fromBranchId` VARCHAR(191) NOT NULL,
    `toBranchId` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `notes` TEXT NULL,
    `requestedById` VARCHAR(191) NULL,
    `approvedById` VARCHAR(191) NULL,
    `shippedAt` DATETIME(3) NULL,
    `receivedAt` DATETIME(3) NULL,
    `clearingAccountId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InterBranchTransfer_organizationId_idx`(`organizationId`),
    INDEX `InterBranchTransfer_fromBranchId_idx`(`fromBranchId`),
    INDEX `InterBranchTransfer_toBranchId_idx`(`toBranchId`),
    INDEX `InterBranchTransfer_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InterBranchTransferItem` (
    `id` VARCHAR(191) NOT NULL,
    `transferId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(18, 4) NOT NULL,
    `unitCost` DECIMAL(18, 4) NOT NULL,

    INDEX `InterBranchTransferItem_transferId_idx`(`transferId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemSettings` (
    `id` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NOT NULL DEFAULT 'YourBooks ERP',
    `companyTagline` VARCHAR(191) NOT NULL DEFAULT 'Professional Accounting Made Simple',
    `companyDescription` VARCHAR(191) NULL,
    `companyEmail` VARCHAR(191) NULL,
    `companyPhone` VARCHAR(191) NULL,
    `supportEmail` VARCHAR(191) NULL,
    `heroTitle` VARCHAR(191) NOT NULL DEFAULT 'Complete ERP Solution for Modern Businesses',
    `heroSubtitle` VARCHAR(191) NOT NULL DEFAULT 'Enterprise-grade accounting system with double-entry bookkeeping, multi-tenant architecture, and real-time financial reporting.',
    `heroCTA1Text` VARCHAR(191) NOT NULL DEFAULT 'Access Dashboard',
    `heroCTA1Link` VARCHAR(191) NOT NULL DEFAULT '/login',
    `heroCTA2Text` VARCHAR(191) NOT NULL DEFAULT 'Watch Demo',
    `heroCTA2Link` VARCHAR(191) NOT NULL DEFAULT '/login',
    `showModules` BOOLEAN NOT NULL DEFAULT true,
    `showStats` BOOLEAN NOT NULL DEFAULT true,
    `showDemoCredentials` BOOLEAN NOT NULL DEFAULT true,
    `address` TEXT NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `zipCode` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `logo` VARCHAR(191) NULL,
    `favicon` VARCHAR(191) NULL,
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#2563eb',
    `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#4f46e5',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SocialMediaLink` (
    `id` VARCHAR(191) NOT NULL,
    `platform` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `systemSettingsId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SocialMediaLink_systemSettingsId_idx`(`systemSettingsId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PricingPlan` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `billingPeriod` VARCHAR(191) NOT NULL DEFAULT 'MONTHLY',
    `features` JSON NOT NULL,
    `isPopular` BOOLEAN NOT NULL DEFAULT false,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `ctaText` VARCHAR(191) NOT NULL DEFAULT 'Get Started',
    `ctaLink` VARCHAR(191) NOT NULL DEFAULT '/register',
    `systemSettingsId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PricingPlan_systemSettingsId_idx`(`systemSettingsId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeatureHighlight` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `icon` VARCHAR(191) NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT 'blue',
    `link` VARCHAR(191) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `systemSettingsId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FeatureHighlight_systemSettingsId_idx`(`systemSettingsId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Testimonial` (
    `id` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerRole` VARCHAR(191) NULL,
    `companyName` VARCHAR(191) NULL,
    `content` TEXT NOT NULL,
    `rating` INTEGER NULL DEFAULT 5,
    `avatar` VARCHAR(191) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `systemSettingsId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Testimonial_systemSettingsId_idx`(`systemSettingsId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Currency` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `decimalPlaces` INTEGER NOT NULL DEFAULT 2,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isBase` BOOLEAN NOT NULL DEFAULT false,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Currency_organizationId_idx`(`organizationId`),
    INDEX `Currency_isActive_idx`(`isActive`),
    UNIQUE INDEX `Currency_organizationId_code_key`(`organizationId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExchangeRate` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `fromCurrencyCode` VARCHAR(191) NOT NULL,
    `toCurrencyCode` VARCHAR(191) NOT NULL,
    `rate` DECIMAL(18, 6) NOT NULL,
    `effectiveDate` DATETIME(3) NOT NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'MANUAL',
    `isManualOverride` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ExchangeRate_organizationId_idx`(`organizationId`),
    INDEX `ExchangeRate_effectiveDate_idx`(`effectiveDate`),
    INDEX `ExchangeRate_fromCurrencyCode_toCurrencyCode_idx`(`fromCurrencyCode`, `toCurrencyCode`),
    UNIQUE INDEX `ExchangeRate_organizationId_fromCurrencyCode_toCurrencyCode__key`(`organizationId`, `fromCurrencyCode`, `toCurrencyCode`, `effectiveDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ForeignExchangeGainLoss` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NULL,
    `paymentId` VARCHAR(191) NULL,
    `invoiceId` VARCHAR(191) NULL,
    `billId` VARCHAR(191) NULL,
    `fxType` VARCHAR(191) NOT NULL,
    `foreignCurrency` VARCHAR(191) NOT NULL,
    `foreignAmount` DECIMAL(19, 4) NOT NULL,
    `transactionDate` DATETIME(3) NOT NULL,
    `transactionRate` DECIMAL(18, 6) NOT NULL,
    `transactionBaseAmount` DECIMAL(19, 4) NOT NULL,
    `settlementDate` DATETIME(3) NOT NULL,
    `settlementRate` DECIMAL(18, 6) NOT NULL,
    `settlementBaseAmount` DECIMAL(19, 4) NOT NULL,
    `gainLossAmount` DECIMAL(19, 4) NOT NULL,
    `glAccountId` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ForeignExchangeGainLoss_paymentId_key`(`paymentId`),
    INDEX `ForeignExchangeGainLoss_organizationId_idx`(`organizationId`),
    INDEX `ForeignExchangeGainLoss_paymentId_idx`(`paymentId`),
    INDEX `ForeignExchangeGainLoss_invoiceId_idx`(`invoiceId`),
    INDEX `ForeignExchangeGainLoss_billId_idx`(`billId`),
    INDEX `ForeignExchangeGainLoss_fxType_idx`(`fxType`),
    INDEX `ForeignExchangeGainLoss_settlementDate_idx`(`settlementDate`),
    INDEX `ForeignExchangeGainLoss_foreignCurrency_idx`(`foreignCurrency`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_DebitNotePayments` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_DebitNotePayments_AB_unique`(`A`, `B`),
    INDEX `_DebitNotePayments_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UnitOfMeasure` ADD CONSTRAINT `UnitOfMeasure_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Branch` ADD CONSTRAINT `Branch_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentSequence` ADD CONSTRAINT `DocumentSequence_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentSequence` ADD CONSTRAINT `DocumentSequence_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Integration` ADD CONSTRAINT `Integration_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Webhook` ADD CONSTRAINT `Webhook_integrationId_fkey` FOREIGN KEY (`integrationId`) REFERENCES `Integration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WebhookLog` ADD CONSTRAINT `WebhookLog_webhookId_fkey` FOREIGN KEY (`webhookId`) REFERENCES `Webhook`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IntegrationLog` ADD CONSTRAINT `IntegrationLog_integrationId_fkey` FOREIGN KEY (`integrationId`) REFERENCES `Integration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrganizationUser` ADD CONSTRAINT `OrganizationUser_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrganizationUser` ADD CONSTRAINT `OrganizationUser_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserBranchAccess` ADD CONSTRAINT `UserBranchAccess_organizationUserId_fkey` FOREIGN KEY (`organizationUserId`) REFERENCES `OrganizationUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserBranchAccess` ADD CONSTRAINT `UserBranchAccess_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrganizationInvite` ADD CONSTRAINT `OrganizationInvite_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrganizationInvite` ADD CONSTRAINT `OrganizationInvite_invitedById_fkey` FOREIGN KEY (`invitedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChartOfAccount` ADD CONSTRAINT `ChartOfAccount_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChartOfAccount` ADD CONSTRAINT `ChartOfAccount_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `ChartOfAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LedgerEntry` ADD CONSTRAINT `LedgerEntry_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `ChartOfAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LedgerEntry` ADD CONSTRAINT `LedgerEntry_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_paymentTermId_fkey` FOREIGN KEY (`paymentTermId`) REFERENCES `PaymentTerm`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `InventoryWarehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_priceListId_fkey` FOREIGN KEY (`priceListId`) REFERENCES `PriceList`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceItem` ADD CONSTRAINT `InvoiceItem_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceItem` ADD CONSTRAINT `InvoiceItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceItem` ADD CONSTRAINT `InvoiceItem_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `ServiceCatalog`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceItem` ADD CONSTRAINT `InvoiceItem_taxRateId_fkey` FOREIGN KEY (`taxRateId`) REFERENCES `TaxRate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceItem` ADD CONSTRAINT `InvoiceItem_taxAgencyRateId_fkey` FOREIGN KEY (`taxAgencyRateId`) REFERENCES `TaxAgencyRate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceItem` ADD CONSTRAINT `InvoiceItem_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `InventoryWarehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceTaxLine` ADD CONSTRAINT `InvoiceTaxLine_invoiceItemId_fkey` FOREIGN KEY (`invoiceItemId`) REFERENCES `InvoiceItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceTaxLine` ADD CONSTRAINT `InvoiceTaxLine_jurisdictionId_fkey` FOREIGN KEY (`jurisdictionId`) REFERENCES `TaxJurisdiction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvoiceTaxLine` ADD CONSTRAINT `InvoiceTaxLine_taxRuleId_fkey` FOREIGN KEY (`taxRuleId`) REFERENCES `TaxRule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Estimate` ADD CONSTRAINT `Estimate_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Estimate` ADD CONSTRAINT `Estimate_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EstimateItem` ADD CONSTRAINT `EstimateItem_estimateId_fkey` FOREIGN KEY (`estimateId`) REFERENCES `Estimate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EstimateItem` ADD CONSTRAINT `EstimateItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EstimateItem` ADD CONSTRAINT `EstimateItem_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `ServiceCatalog`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EstimateItem` ADD CONSTRAINT `EstimateItem_taxRateId_fkey` FOREIGN KEY (`taxRateId`) REFERENCES `TaxRate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesReceipt` ADD CONSTRAINT `SalesReceipt_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesReceipt` ADD CONSTRAINT `SalesReceipt_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesReceipt` ADD CONSTRAINT `SalesReceipt_depositToAccountId_fkey` FOREIGN KEY (`depositToAccountId`) REFERENCES `ChartOfAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesReceipt` ADD CONSTRAINT `SalesReceipt_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesReceipt` ADD CONSTRAINT `SalesReceipt_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `InventoryWarehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesReceiptItem` ADD CONSTRAINT `SalesReceiptItem_salesReceiptId_fkey` FOREIGN KEY (`salesReceiptId`) REFERENCES `SalesReceipt`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesReceiptItem` ADD CONSTRAINT `SalesReceiptItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesReceiptItem` ADD CONSTRAINT `SalesReceiptItem_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `ServiceOffering`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesReceiptItem` ADD CONSTRAINT `SalesReceiptItem_taxRuleId_fkey` FOREIGN KEY (`taxRuleId`) REFERENCES `TaxRule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesReceiptItem` ADD CONSTRAINT `SalesReceiptItem_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `InventoryWarehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesReceiptTaxLine` ADD CONSTRAINT `SalesReceiptTaxLine_salesReceiptItemId_fkey` FOREIGN KEY (`salesReceiptItemId`) REFERENCES `SalesReceiptItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesReceiptTaxLine` ADD CONSTRAINT `SalesReceiptTaxLine_jurisdictionId_fkey` FOREIGN KEY (`jurisdictionId`) REFERENCES `TaxJurisdiction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesReceiptTaxLine` ADD CONSTRAINT `SalesReceiptTaxLine_taxRuleId_fkey` FOREIGN KEY (`taxRuleId`) REFERENCES `TaxRule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vendor` ADD CONSTRAINT `Vendor_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vendor` ADD CONSTRAINT `Vendor_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vendor` ADD CONSTRAINT `Vendor_paymentTermId_fkey` FOREIGN KEY (`paymentTermId`) REFERENCES `PaymentTerm`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrder` ADD CONSTRAINT `PurchaseOrder_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrder` ADD CONSTRAINT `PurchaseOrder_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `InventoryWarehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItem` ADD CONSTRAINT `PurchaseOrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItem` ADD CONSTRAINT `PurchaseOrderItem_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoodsReceipt` ADD CONSTRAINT `GoodsReceipt_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoodsReceipt` ADD CONSTRAINT `GoodsReceipt_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoodsReceipt` ADD CONSTRAINT `GoodsReceipt_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoodsReceipt` ADD CONSTRAINT `GoodsReceipt_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `InventoryWarehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoodsReceipt` ADD CONSTRAINT `GoodsReceipt_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoodsReceiptItem` ADD CONSTRAINT `GoodsReceiptItem_goodsReceiptId_fkey` FOREIGN KEY (`goodsReceiptId`) REFERENCES `GoodsReceipt`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoodsReceiptItem` ADD CONSTRAINT `GoodsReceiptItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoodsReceiptItem` ADD CONSTRAINT `GoodsReceiptItem_poItemId_fkey` FOREIGN KEY (`poItemId`) REFERENCES `PurchaseOrderItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bill` ADD CONSTRAINT `Bill_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bill` ADD CONSTRAINT `Bill_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bill` ADD CONSTRAINT `Bill_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bill` ADD CONSTRAINT `Bill_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BillItem` ADD CONSTRAINT `BillItem_billId_fkey` FOREIGN KEY (`billId`) REFERENCES `Bill`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BillItem` ADD CONSTRAINT `BillItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BillItem` ADD CONSTRAINT `BillItem_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `ServiceCatalog`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BillItem` ADD CONSTRAINT `BillItem_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `ChartOfAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BillItem` ADD CONSTRAINT `BillItem_taxRateId_fkey` FOREIGN KEY (`taxRateId`) REFERENCES `TaxRate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BillItem` ADD CONSTRAINT `BillItem_taxAgencyRateId_fkey` FOREIGN KEY (`taxAgencyRateId`) REFERENCES `TaxAgencyRate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `BankAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentEvent` ADD CONSTRAINT `PaymentEvent_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentEvent` ADD CONSTRAINT `PaymentEvent_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentAllocation` ADD CONSTRAINT `PaymentAllocation_billId_fkey` FOREIGN KEY (`billId`) REFERENCES `Bill`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentAllocation` ADD CONSTRAINT `PaymentAllocation_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentAllocation` ADD CONSTRAINT `PaymentAllocation_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentTerm` ADD CONSTRAINT `PaymentTerm_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankAccount` ADD CONSTRAINT `BankAccount_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankAccount` ADD CONSTRAINT `BankAccount_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankReconciliation` ADD CONSTRAINT `BankReconciliation_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `BankAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_unitOfMeasureId_fkey` FOREIGN KEY (`unitOfMeasureId`) REFERENCES `UnitOfMeasure`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_taxGroupId_fkey` FOREIGN KEY (`taxGroupId`) REFERENCES `TaxGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurringTemplate` ADD CONSTRAINT `RecurringTemplate_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurringTemplate` ADD CONSTRAINT `RecurringTemplate_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurringTemplate` ADD CONSTRAINT `RecurringTemplate_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurringExecution` ADD CONSTRAINT `RecurringExecution_billId_fkey` FOREIGN KEY (`billId`) REFERENCES `Bill`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurringExecution` ADD CONSTRAINT `RecurringExecution_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurringExecution` ADD CONSTRAINT `RecurringExecution_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurringExecution` ADD CONSTRAINT `RecurringExecution_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurringExecution` ADD CONSTRAINT `RecurringExecution_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurringExecution` ADD CONSTRAINT `RecurringExecution_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `RecurringTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurringExecution` ADD CONSTRAINT `RecurringExecution_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `InventoryWarehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryWarehouse` ADD CONSTRAINT `InventoryWarehouse_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryWarehouse` ADD CONSTRAINT `InventoryWarehouse_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryWarehouse` ADD CONSTRAINT `InventoryWarehouse_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WarehouseStockLevel` ADD CONSTRAINT `WarehouseStockLevel_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WarehouseStockLevel` ADD CONSTRAINT `WarehouseStockLevel_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `InventoryWarehouse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WarehouseStockLevel` ADD CONSTRAINT `WarehouseStockLevel_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryBin` ADD CONSTRAINT `InventoryBin_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `InventoryWarehouse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryLot` ADD CONSTRAINT `InventoryLot_binId_fkey` FOREIGN KEY (`binId`) REFERENCES `InventoryBin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryLot` ADD CONSTRAINT `InventoryLot_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryLot` ADD CONSTRAINT `InventoryLot_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryLot` ADD CONSTRAINT `InventoryLot_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `InventoryWarehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventorySerial` ADD CONSTRAINT `InventorySerial_binId_fkey` FOREIGN KEY (`binId`) REFERENCES `InventoryBin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventorySerial` ADD CONSTRAINT `InventorySerial_lotId_fkey` FOREIGN KEY (`lotId`) REFERENCES `InventoryLot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventorySerial` ADD CONSTRAINT `InventorySerial_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventorySerial` ADD CONSTRAINT `InventorySerial_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventorySerial` ADD CONSTRAINT `InventorySerial_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `InventoryWarehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventorySerial` ADD CONSTRAINT `InventorySerial_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `WorkOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransferOrder` ADD CONSTRAINT `TransferOrder_fromWarehouseId_fkey` FOREIGN KEY (`fromWarehouseId`) REFERENCES `InventoryWarehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransferOrder` ADD CONSTRAINT `TransferOrder_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransferOrder` ADD CONSTRAINT `TransferOrder_toWarehouseId_fkey` FOREIGN KEY (`toWarehouseId`) REFERENCES `InventoryWarehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransferOrderLine` ADD CONSTRAINT `TransferOrderLine_lotId_fkey` FOREIGN KEY (`lotId`) REFERENCES `InventoryLot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransferOrderLine` ADD CONSTRAINT `TransferOrderLine_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransferOrderLine` ADD CONSTRAINT `TransferOrderLine_transferOrderId_fkey` FOREIGN KEY (`transferOrderId`) REFERENCES `TransferOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkCenter` ADD CONSTRAINT `WorkCenter_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BillOfMaterial` ADD CONSTRAINT `BillOfMaterial_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BillOfMaterial` ADD CONSTRAINT `BillOfMaterial_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BillOfMaterialLine` ADD CONSTRAINT `BillOfMaterialLine_bomId_fkey` FOREIGN KEY (`bomId`) REFERENCES `BillOfMaterial`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BillOfMaterialLine` ADD CONSTRAINT `BillOfMaterialLine_componentId_fkey` FOREIGN KEY (`componentId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Routing` ADD CONSTRAINT `Routing_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Routing` ADD CONSTRAINT `Routing_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoutingStep` ADD CONSTRAINT `RoutingStep_routingId_fkey` FOREIGN KEY (`routingId`) REFERENCES `Routing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoutingStep` ADD CONSTRAINT `RoutingStep_workCenterId_fkey` FOREIGN KEY (`workCenterId`) REFERENCES `WorkCenter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkOrder` ADD CONSTRAINT `WorkOrder_bomId_fkey` FOREIGN KEY (`bomId`) REFERENCES `BillOfMaterial`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkOrder` ADD CONSTRAINT `WorkOrder_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkOrder` ADD CONSTRAINT `WorkOrder_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkOrder` ADD CONSTRAINT `WorkOrder_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkOrder` ADD CONSTRAINT `WorkOrder_routingId_fkey` FOREIGN KEY (`routingId`) REFERENCES `Routing`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkOrder` ADD CONSTRAINT `WorkOrder_workCenterId_fkey` FOREIGN KEY (`workCenterId`) REFERENCES `WorkCenter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkOrderMaterial` ADD CONSTRAINT `WorkOrderMaterial_componentId_fkey` FOREIGN KEY (`componentId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkOrderMaterial` ADD CONSTRAINT `WorkOrderMaterial_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `WorkOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkOrderOperation` ADD CONSTRAINT `WorkOrderOperation_routingStepId_fkey` FOREIGN KEY (`routingStepId`) REFERENCES `RoutingStep`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkOrderOperation` ADD CONSTRAINT `WorkOrderOperation_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `WorkOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxConfiguration` ADD CONSTRAINT `TaxConfiguration_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FiscalPeriod` ADD CONSTRAINT `FiscalPeriod_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Budget` ADD CONSTRAINT `Budget_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `ChartOfAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxRate` ADD CONSTRAINT `TaxRate_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WHTRule` ADD CONSTRAINT `WHTRule_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WHTTransaction` ADD CONSTRAINT `WHTTransaction_billId_fkey` FOREIGN KEY (`billId`) REFERENCES `Bill`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WHTTransaction` ADD CONSTRAINT `WHTTransaction_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WHTTransaction` ADD CONSTRAINT `WHTTransaction_whtRuleId_fkey` FOREIGN KEY (`whtRuleId`) REFERENCES `WHTRule`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxReturn` ADD CONSTRAINT `TaxReturn_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxPeriodLock` ADD CONSTRAINT `TaxPeriodLock_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxPeriodLock` ADD CONSTRAINT `TaxPeriodLock_lockedByUserId_fkey` FOREIGN KEY (`lockedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxAgency` ADD CONSTRAINT `TaxAgency_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxAgency` ADD CONSTRAINT `TaxAgency_liabilityAccountId_fkey` FOREIGN KEY (`liabilityAccountId`) REFERENCES `ChartOfAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxAgencyRate` ADD CONSTRAINT `TaxAgencyRate_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxAgencyRate` ADD CONSTRAINT `TaxAgencyRate_taxAgencyId_fkey` FOREIGN KEY (`taxAgencyId`) REFERENCES `TaxAgency`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxAgencyRate` ADD CONSTRAINT `TaxAgencyRate_salesTaxAccountId_fkey` FOREIGN KEY (`salesTaxAccountId`) REFERENCES `ChartOfAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxAgencyRate` ADD CONSTRAINT `TaxAgencyRate_purchaseTaxAccountId_fkey` FOREIGN KEY (`purchaseTaxAccountId`) REFERENCES `ChartOfAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxGroup` ADD CONSTRAINT `TaxGroup_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxGroup` ADD CONSTRAINT `TaxGroup_taxAgencyId_fkey` FOREIGN KEY (`taxAgencyId`) REFERENCES `TaxAgency`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxGroupRate` ADD CONSTRAINT `TaxGroupRate_taxGroupId_fkey` FOREIGN KEY (`taxGroupId`) REFERENCES `TaxGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxGroupRate` ADD CONSTRAINT `TaxGroupRate_taxAgencyRateId_fkey` FOREIGN KEY (`taxAgencyRateId`) REFERENCES `TaxAgencyRate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxExemptionReason` ADD CONSTRAINT `TaxExemptionReason_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssetCategory` ADD CONSTRAINT `AssetCategory_assetAccountId_fkey` FOREIGN KEY (`assetAccountId`) REFERENCES `ChartOfAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssetCategory` ADD CONSTRAINT `AssetCategory_depreciationAccountId_fkey` FOREIGN KEY (`depreciationAccountId`) REFERENCES `ChartOfAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssetCategory` ADD CONSTRAINT `AssetCategory_expenseAccountId_fkey` FOREIGN KEY (`expenseAccountId`) REFERENCES `ChartOfAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssetCategory` ADD CONSTRAINT `AssetCategory_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Asset` ADD CONSTRAINT `Asset_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Asset` ADD CONSTRAINT `Asset_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `AssetCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Asset` ADD CONSTRAINT `Asset_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssetDepreciation` ADD CONSTRAINT `AssetDepreciation_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `Asset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssetDisposal` ADD CONSTRAINT `AssetDisposal_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `Asset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssetMaintenance` ADD CONSTRAINT `AssetMaintenance_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `Asset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditNote` ADD CONSTRAINT `CreditNote_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditNote` ADD CONSTRAINT `CreditNote_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditNote` ADD CONSTRAINT `CreditNote_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditNote` ADD CONSTRAINT `CreditNote_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditNote` ADD CONSTRAINT `CreditNote_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditNoteItem` ADD CONSTRAINT `CreditNoteItem_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `ChartOfAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditNoteItem` ADD CONSTRAINT `CreditNoteItem_creditNoteId_fkey` FOREIGN KEY (`creditNoteId`) REFERENCES `CreditNote`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditNoteItem` ADD CONSTRAINT `CreditNoteItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditNoteItem` ADD CONSTRAINT `CreditNoteItem_taxRateId_fkey` FOREIGN KEY (`taxRateId`) REFERENCES `TaxRate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditNoteApplication` ADD CONSTRAINT `CreditNoteApplication_creditNoteId_fkey` FOREIGN KEY (`creditNoteId`) REFERENCES `CreditNote`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditNoteApplication` ADD CONSTRAINT `CreditNoteApplication_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DebitNote` ADD CONSTRAINT `DebitNote_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DebitNote` ADD CONSTRAINT `DebitNote_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DebitNote` ADD CONSTRAINT `DebitNote_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DebitNote` ADD CONSTRAINT `DebitNote_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DebitNote` ADD CONSTRAINT `DebitNote_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DebitNoteItem` ADD CONSTRAINT `DebitNoteItem_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `ChartOfAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DebitNoteItem` ADD CONSTRAINT `DebitNoteItem_debitNoteId_fkey` FOREIGN KEY (`debitNoteId`) REFERENCES `DebitNote`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DebitNoteItem` ADD CONSTRAINT `DebitNoteItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DebitNoteItem` ADD CONSTRAINT `DebitNoteItem_taxRateId_fkey` FOREIGN KEY (`taxRateId`) REFERENCES `TaxRate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankFeed` ADD CONSTRAINT `BankFeed_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `BankAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankFeed` ADD CONSTRAINT `BankFeed_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankTransaction` ADD CONSTRAINT `BankTransaction_bankFeedId_fkey` FOREIGN KEY (`bankFeedId`) REFERENCES `BankFeed`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankTransaction` ADD CONSTRAINT `BankTransaction_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankTransaction` ADD CONSTRAINT `BankTransaction_reconciliationId_fkey` FOREIGN KEY (`reconciliationId`) REFERENCES `BankReconciliation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankTransaction` ADD CONSTRAINT `BankTransaction_appliedRuleId_fkey` FOREIGN KEY (`appliedRuleId`) REFERENCES `BankRule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BankRule` ADD CONSTRAINT `BankRule_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_uploadedBy_fkey` FOREIGN KEY (`uploadedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectTask` ADD CONSTRAINT `ProjectTask_assignedTo_fkey` FOREIGN KEY (`assignedTo`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectTask` ADD CONSTRAINT `ProjectTask_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectCost` ADD CONSTRAINT `ProjectCost_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Company` ADD CONSTRAINT `Company_accountManagerId_fkey` FOREIGN KEY (`accountManagerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Company` ADD CONSTRAINT `Company_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Company` ADD CONSTRAINT `Company_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contact` ADD CONSTRAINT `Contact_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contact` ADD CONSTRAINT `Contact_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contact` ADD CONSTRAINT `Contact_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Opportunity` ADD CONSTRAINT `Opportunity_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Opportunity` ADD CONSTRAINT `Opportunity_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Opportunity` ADD CONSTRAINT `Opportunity_assignedTo_fkey` FOREIGN KEY (`assignedTo`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Opportunity` ADD CONSTRAINT `Opportunity_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Opportunity` ADD CONSTRAINT `Opportunity_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Activity` ADD CONSTRAINT `Activity_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Activity` ADD CONSTRAINT `Activity_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `Contact`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Activity` ADD CONSTRAINT `Activity_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Activity` ADD CONSTRAINT `Activity_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CrmTask` ADD CONSTRAINT `CrmTask_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CrmTask` ADD CONSTRAINT `CrmTask_assignedTo_fkey` FOREIGN KEY (`assignedTo`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CrmTask` ADD CONSTRAINT `CrmTask_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CrmTask` ADD CONSTRAINT `CrmTask_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_jobTitleId_fkey` FOREIGN KEY (`jobTitleId`) REFERENCES `JobTitle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_positionId_fkey` FOREIGN KEY (`positionId`) REFERENCES `Position`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Department` ADD CONSTRAINT `Department_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Department` ADD CONSTRAINT `Department_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobTitle` ADD CONSTRAINT `JobTitle_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Position` ADD CONSTRAINT `Position_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Position` ADD CONSTRAINT `Position_jobTitleId_fkey` FOREIGN KEY (`jobTitleId`) REFERENCES `JobTitle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Position` ADD CONSTRAINT `Position_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollRun` ADD CONSTRAINT `PayrollRun_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollRun` ADD CONSTRAINT `PayrollRun_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollItem` ADD CONSTRAINT `PayrollItem_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PayrollItem` ADD CONSTRAINT `PayrollItem_payrollRunId_fkey` FOREIGN KEY (`payrollRunId`) REFERENCES `PayrollRun`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Benefit` ADD CONSTRAINT `Benefit_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BenefitEnrollment` ADD CONSTRAINT `BenefitEnrollment_benefitId_fkey` FOREIGN KEY (`benefitId`) REFERENCES `Benefit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BenefitEnrollment` ADD CONSTRAINT `BenefitEnrollment_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveType` ADD CONSTRAINT `LeaveType_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveRequest` ADD CONSTRAINT `LeaveRequest_approvedBy_fkey` FOREIGN KEY (`approvedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveRequest` ADD CONSTRAINT `LeaveRequest_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveRequest` ADD CONSTRAINT `LeaveRequest_leaveTypeId_fkey` FOREIGN KEY (`leaveTypeId`) REFERENCES `LeaveType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimeEntry` ADD CONSTRAINT `TimeEntry_approvedBy_fkey` FOREIGN KEY (`approvedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimeEntry` ADD CONSTRAINT `TimeEntry_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimeEntry` ADD CONSTRAINT `TimeEntry_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExpenseClaim` ADD CONSTRAINT `ExpenseClaim_approvedBy_fkey` FOREIGN KEY (`approvedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExpenseClaim` ADD CONSTRAINT `ExpenseClaim_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExpenseClaim` ADD CONSTRAINT `ExpenseClaim_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExpenseClaim` ADD CONSTRAINT `ExpenseClaim_paidBy_fkey` FOREIGN KEY (`paidBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExpenseClaim` ADD CONSTRAINT `ExpenseClaim_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExpenseItem` ADD CONSTRAINT `ExpenseItem_expenseClaimId_fkey` FOREIGN KEY (`expenseClaimId`) REFERENCES `ExpenseClaim`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExpenseItem` ADD CONSTRAINT `ExpenseItem_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ChartOfAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExpensePolicy` ADD CONSTRAINT `ExpensePolicy_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PerformanceReview` ADD CONSTRAINT `PerformanceReview_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PerformanceReview` ADD CONSTRAINT `PerformanceReview_reviewCycleId_fkey` FOREIGN KEY (`reviewCycleId`) REFERENCES `ReviewCycle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PerformanceReview` ADD CONSTRAINT `PerformanceReview_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewCycle` ADD CONSTRAINT `ReviewCycle_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceWorkOrder` ADD CONSTRAINT `ServiceWorkOrder_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceWorkOrder` ADD CONSTRAINT `ServiceWorkOrder_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceWorkOrder` ADD CONSTRAINT `ServiceWorkOrder_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceWorkOrder` ADD CONSTRAINT `ServiceWorkOrder_slaId_fkey` FOREIGN KEY (`slaId`) REFERENCES `ServiceSLA`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceWorkOrder` ADD CONSTRAINT `ServiceWorkOrder_technicianId_fkey` FOREIGN KEY (`technicianId`) REFERENCES `ServiceTechnician`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceTechnician` ADD CONSTRAINT `ServiceTechnician_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceTechnician` ADD CONSTRAINT `ServiceTechnician_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceSLA` ADD CONSTRAINT `ServiceSLA_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceCatalog` ADD CONSTRAINT `ServiceCatalog_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceCatalog` ADD CONSTRAINT `ServiceCatalog_taxGroupId_fkey` FOREIGN KEY (`taxGroupId`) REFERENCES `TaxGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceActivity` ADD CONSTRAINT `ServiceActivity_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceActivity` ADD CONSTRAINT `ServiceActivity_serviceCatalogId_fkey` FOREIGN KEY (`serviceCatalogId`) REFERENCES `ServiceCatalog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceOffering` ADD CONSTRAINT `ServiceOffering_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceOffering` ADD CONSTRAINT `ServiceOffering_serviceCatalogId_fkey` FOREIGN KEY (`serviceCatalogId`) REFERENCES `ServiceCatalog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceDelivery` ADD CONSTRAINT `ServiceDelivery_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceDelivery` ADD CONSTRAINT `ServiceDelivery_serviceCatalogId_fkey` FOREIGN KEY (`serviceCatalogId`) REFERENCES `ServiceCatalog`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceDelivery` ADD CONSTRAINT `ServiceDelivery_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceDelivery` ADD CONSTRAINT `ServiceDelivery_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `ServiceBooking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceBooking` ADD CONSTRAINT `ServiceBooking_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceBooking` ADD CONSTRAINT `ServiceBooking_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceBooking` ADD CONSTRAINT `ServiceBooking_serviceCatalogId_fkey` FOREIGN KEY (`serviceCatalogId`) REFERENCES `ServiceCatalog`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceBooking` ADD CONSTRAINT `ServiceBooking_offeringId_fkey` FOREIGN KEY (`offeringId`) REFERENCES `ServiceOffering`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceActivityEntry` ADD CONSTRAINT `ServiceActivityEntry_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceActivityEntry` ADD CONSTRAINT `ServiceActivityEntry_deliveryId_fkey` FOREIGN KEY (`deliveryId`) REFERENCES `ServiceDelivery`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceActivityEntry` ADD CONSTRAINT `ServiceActivityEntry_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `ServiceActivity`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceTimeEntry` ADD CONSTRAINT `ServiceTimeEntry_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceTimeEntry` ADD CONSTRAINT `ServiceTimeEntry_deliveryId_fkey` FOREIGN KEY (`deliveryId`) REFERENCES `ServiceDelivery`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceTimeEntry` ADD CONSTRAINT `ServiceTimeEntry_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceResource` ADD CONSTRAINT `ServiceResource_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceResource` ADD CONSTRAINT `ServiceResource_serviceCatalogId_fkey` FOREIGN KEY (`serviceCatalogId`) REFERENCES `ServiceCatalog`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaintenancePlan` ADD CONSTRAINT `MaintenancePlan_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `Asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaintenancePlan` ADD CONSTRAINT `MaintenancePlan_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaintenanceWorkOrder` ADD CONSTRAINT `MaintenanceWorkOrder_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `Asset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaintenanceWorkOrder` ADD CONSTRAINT `MaintenanceWorkOrder_maintenancePlanId_fkey` FOREIGN KEY (`maintenancePlanId`) REFERENCES `MaintenancePlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaintenanceWorkOrder` ADD CONSTRAINT `MaintenanceWorkOrder_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaintenanceWorkOrder` ADD CONSTRAINT `MaintenanceWorkOrder_technicianId_fkey` FOREIGN KEY (`technicianId`) REFERENCES `ServiceTechnician`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SparePart` ADD CONSTRAINT `SparePart_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SparePart` ADD CONSTRAINT `SparePart_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SparePartUsage` ADD CONSTRAINT `SparePartUsage_sparePartId_fkey` FOREIGN KEY (`sparePartId`) REFERENCES `SparePart`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SparePartUsage` ADD CONSTRAINT `SparePartUsage_workOrderId_fkey` FOREIGN KEY (`workOrderId`) REFERENCES `MaintenanceWorkOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dashboard` ADD CONSTRAINT `Dashboard_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dashboard` ADD CONSTRAINT `Dashboard_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DashboardWidget` ADD CONSTRAINT `DashboardWidget_dashboardId_fkey` FOREIGN KEY (`dashboardId`) REFERENCES `Dashboard`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DashboardWidget` ADD CONSTRAINT `DashboardWidget_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `Report`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportSchedule` ADD CONSTRAINT `ReportSchedule_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportSchedule` ADD CONSTRAINT `ReportSchedule_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `Report`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduleExecution` ADD CONSTRAINT `ScheduleExecution_scheduleId_fkey` FOREIGN KEY (`scheduleId`) REFERENCES `ReportSchedule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DataCube` ADD CONSTRAINT `DataCube_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApprovalWorkflow` ADD CONSTRAINT `ApprovalWorkflow_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApprovalStep` ADD CONSTRAINT `ApprovalStep_workflowId_fkey` FOREIGN KEY (`workflowId`) REFERENCES `ApprovalWorkflow`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApprovalRule` ADD CONSTRAINT `ApprovalRule_workflowId_fkey` FOREIGN KEY (`workflowId`) REFERENCES `ApprovalWorkflow`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApprovalRequest` ADD CONSTRAINT `ApprovalRequest_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApprovalRequest` ADD CONSTRAINT `ApprovalRequest_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApprovalRequest` ADD CONSTRAINT `ApprovalRequest_workflowId_fkey` FOREIGN KEY (`workflowId`) REFERENCES `ApprovalWorkflow`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApprovalAction` ADD CONSTRAINT `ApprovalAction_approverId_fkey` FOREIGN KEY (`approverId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApprovalAction` ADD CONSTRAINT `ApprovalAction_delegatedTo_fkey` FOREIGN KEY (`delegatedTo`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApprovalAction` ADD CONSTRAINT `ApprovalAction_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `ApprovalRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApprovalAction` ADD CONSTRAINT `ApprovalAction_stepId_fkey` FOREIGN KEY (`stepId`) REFERENCES `ApprovalStep`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WebhookEndpoint` ADD CONSTRAINT `WebhookEndpoint_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WebhookDelivery` ADD CONSTRAINT `WebhookDelivery_endpointId_fkey` FOREIGN KEY (`endpointId`) REFERENCES `WebhookEndpoint`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventLog` ADD CONSTRAINT `EventLog_integrationId_fkey` FOREIGN KEY (`integrationId`) REFERENCES `Integration`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventLog` ADD CONSTRAINT `EventLog_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RowLevelSecurityRule` ADD CONSTRAINT `RowLevelSecurityRule_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SSOConfig` ADD CONSTRAINT `SSOConfig_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MFASettings` ADD CONSTRAINT `MFASettings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemMaster` ADD CONSTRAINT `ItemMaster_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemMaster` ADD CONSTRAINT `ItemMaster_attributeSetId_fkey` FOREIGN KEY (`attributeSetId`) REFERENCES `AttributeSet`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemMaster` ADD CONSTRAINT `ItemMaster_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemMaster` ADD CONSTRAINT `ItemMaster_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemMaster` ADD CONSTRAINT `ItemMaster_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MasterDataVersion` ADD CONSTRAINT `MasterDataVersion_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MasterDataVersion` ADD CONSTRAINT `MasterDataVersion_itemMasterId_fkey` FOREIGN KEY (`itemMasterId`) REFERENCES `ItemMaster`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttributeSet` ADD CONSTRAINT `AttributeSet_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductVariant` ADD CONSTRAINT `ProductVariant_attributeSetId_fkey` FOREIGN KEY (`attributeSetId`) REFERENCES `AttributeSet`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductVariant` ADD CONSTRAINT `ProductVariant_itemMasterId_fkey` FOREIGN KEY (`itemMasterId`) REFERENCES `ItemMaster`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductVariant` ADD CONSTRAINT `ProductVariant_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PriceList` ADD CONSTRAINT `PriceList_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PriceListItem` ADD CONSTRAINT `PriceListItem_priceListId_fkey` FOREIGN KEY (`priceListId`) REFERENCES `PriceList`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PriceListItem` ADD CONSTRAINT `PriceListItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Discount` ADD CONSTRAINT `Discount_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Promotion` ADD CONSTRAINT `Promotion_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CycleCount` ADD CONSTRAINT `CycleCount_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CycleCount` ADD CONSTRAINT `CycleCount_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CycleCount` ADD CONSTRAINT `CycleCount_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `InventoryWarehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CycleCountItem` ADD CONSTRAINT `CycleCountItem_cycleCountId_fkey` FOREIGN KEY (`cycleCountId`) REFERENCES `CycleCount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CycleCountItem` ADD CONSTRAINT `CycleCountItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryValuation` ADD CONSTRAINT `InventoryValuation_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryValuation` ADD CONSTRAINT `InventoryValuation_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryValuation` ADD CONSTRAINT `InventoryValuation_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `InventoryWarehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockReservation` ADD CONSTRAINT `StockReservation_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockReservation` ADD CONSTRAINT `StockReservation_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockReservation` ADD CONSTRAINT `StockReservation_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `InventoryWarehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StandardCost` ADD CONSTRAINT `StandardCost_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StandardCost` ADD CONSTRAINT `StandardCost_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StandardCost` ADD CONSTRAINT `StandardCost_bomId_fkey` FOREIGN KEY (`bomId`) REFERENCES `BillOfMaterial`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StandardCost` ADD CONSTRAINT `StandardCost_routingId_fkey` FOREIGN KEY (`routingId`) REFERENCES `Routing`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CostVariance` ADD CONSTRAINT `CostVariance_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CostVariance` ADD CONSTRAINT `CostVariance_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CostVariance` ADD CONSTRAINT `CostVariance_standardCostId_fkey` FOREIGN KEY (`standardCostId`) REFERENCES `StandardCost`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CostVariance` ADD CONSTRAINT `CostVariance_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LandedCost` ADD CONSTRAINT `LandedCost_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LandedCostAllocationItem` ADD CONSTRAINT `LandedCostAllocationItem_landedCostId_fkey` FOREIGN KEY (`landedCostId`) REFERENCES `LandedCost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LandedCostAllocationItem` ADD CONSTRAINT `LandedCostAllocationItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CostRevaluation` ADD CONSTRAINT `CostRevaluation_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CostRevaluation` ADD CONSTRAINT `CostRevaluation_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CostRevaluation` ADD CONSTRAINT `CostRevaluation_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CostRevaluation` ADD CONSTRAINT `CostRevaluation_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CostRevaluation` ADD CONSTRAINT `CostRevaluation_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `InventoryWarehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DemandForecast` ADD CONSTRAINT `DemandForecast_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DemandForecast` ADD CONSTRAINT `DemandForecast_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DemandForecast` ADD CONSTRAINT `DemandForecast_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `InventoryWarehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SafetyStock` ADD CONSTRAINT `SafetyStock_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SafetyStock` ADD CONSTRAINT `SafetyStock_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SafetyStock` ADD CONSTRAINT `SafetyStock_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `InventoryWarehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReorderPolicy` ADD CONSTRAINT `ReorderPolicy_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReorderPolicy` ADD CONSTRAINT `ReorderPolicy_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReorderPolicy` ADD CONSTRAINT `ReorderPolicy_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `InventoryWarehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductPlanning` ADD CONSTRAINT `ProductPlanning_defaultVendorId_fkey` FOREIGN KEY (`defaultVendorId`) REFERENCES `Vendor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductPlanning` ADD CONSTRAINT `ProductPlanning_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductPlanning` ADD CONSTRAINT `ProductPlanning_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QualityInspection` ADD CONSTRAINT `QualityInspection_inspectedById_fkey` FOREIGN KEY (`inspectedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QualityInspection` ADD CONSTRAINT `QualityInspection_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QualityInspection` ADD CONSTRAINT `QualityInspection_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QualityMeasurement` ADD CONSTRAINT `QualityMeasurement_inspectionId_fkey` FOREIGN KEY (`inspectionId`) REFERENCES `QualityInspection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QualityHold` ADD CONSTRAINT `QualityHold_inspectionId_fkey` FOREIGN KEY (`inspectionId`) REFERENCES `QualityInspection`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QualityHold` ADD CONSTRAINT `QualityHold_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QualityHold` ADD CONSTRAINT `QualityHold_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QualityHold` ADD CONSTRAINT `QualityHold_releasedById_fkey` FOREIGN KEY (`releasedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QualityHold` ADD CONSTRAINT `QualityHold_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QualityHold` ADD CONSTRAINT `QualityHold_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `InventoryWarehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CertificateOfAnalysis` ADD CONSTRAINT `CertificateOfAnalysis_inspectionId_fkey` FOREIGN KEY (`inspectionId`) REFERENCES `QualityInspection`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CertificateOfAnalysis` ADD CONSTRAINT `CertificateOfAnalysis_issuedById_fkey` FOREIGN KEY (`issuedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CertificateOfAnalysis` ADD CONSTRAINT `CertificateOfAnalysis_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CertificateOfAnalysis` ADD CONSTRAINT `CertificateOfAnalysis_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NonConformanceReport` ADD CONSTRAINT `NonConformanceReport_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NonConformanceReport` ADD CONSTRAINT `NonConformanceReport_closedById_fkey` FOREIGN KEY (`closedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NonConformanceReport` ADD CONSTRAINT `NonConformanceReport_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NonConformanceReport` ADD CONSTRAINT `NonConformanceReport_detectedById_fkey` FOREIGN KEY (`detectedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NonConformanceReport` ADD CONSTRAINT `NonConformanceReport_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NonConformanceReport` ADD CONSTRAINT `NonConformanceReport_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NonConformanceReport` ADD CONSTRAINT `NonConformanceReport_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CAPA` ADD CONSTRAINT `CAPA_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CAPA` ADD CONSTRAINT `CAPA_closedById_fkey` FOREIGN KEY (`closedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CAPA` ADD CONSTRAINT `CAPA_ncrId_fkey` FOREIGN KEY (`ncrId`) REFERENCES `NonConformanceReport`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CAPA` ADD CONSTRAINT `CAPA_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CAPA` ADD CONSTRAINT `CAPA_verifiedById_fkey` FOREIGN KEY (`verifiedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CapaTask` ADD CONSTRAINT `CapaTask_capaId_fkey` FOREIGN KEY (`capaId`) REFERENCES `CAPA`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CapaTask` ADD CONSTRAINT `CapaTask_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CapaTask` ADD CONSTRAINT `CapaTask_completedById_fkey` FOREIGN KEY (`completedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CapaTask` ADD CONSTRAINT `CapaTask_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxJurisdiction` ADD CONSTRAINT `TaxJurisdiction_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxJurisdiction` ADD CONSTRAINT `TaxJurisdiction_parentJurisdictionId_fkey` FOREIGN KEY (`parentJurisdictionId`) REFERENCES `TaxJurisdiction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxJurisdiction` ADD CONSTRAINT `TaxJurisdiction_taxLiabilityAccountId_fkey` FOREIGN KEY (`taxLiabilityAccountId`) REFERENCES `ChartOfAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxRule` ADD CONSTRAINT `TaxRule_jurisdictionId_fkey` FOREIGN KEY (`jurisdictionId`) REFERENCES `TaxJurisdiction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxRule` ADD CONSTRAINT `TaxRule_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxRule` ADD CONSTRAINT `TaxRule_parentRuleId_fkey` FOREIGN KEY (`parentRuleId`) REFERENCES `TaxRule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxExemption` ADD CONSTRAINT `TaxExemption_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxExemption` ADD CONSTRAINT `TaxExemption_taxRuleId_fkey` FOREIGN KEY (`taxRuleId`) REFERENCES `TaxRule`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LocalizationConfig` ADD CONSTRAINT `LocalizationConfig_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssemblyTransaction` ADD CONSTRAINT `AssemblyTransaction_bomId_fkey` FOREIGN KEY (`bomId`) REFERENCES `BillOfMaterial`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssemblyTransaction` ADD CONSTRAINT `AssemblyTransaction_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssemblyTransaction` ADD CONSTRAINT `AssemblyTransaction_finishedProductId_fkey` FOREIGN KEY (`finishedProductId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssemblyTransaction` ADD CONSTRAINT `AssemblyTransaction_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssemblyLine` ADD CONSTRAINT `AssemblyLine_assemblyTransactionId_fkey` FOREIGN KEY (`assemblyTransactionId`) REFERENCES `AssemblyTransaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssemblyLine` ADD CONSTRAINT `AssemblyLine_componentProductId_fkey` FOREIGN KEY (`componentProductId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssemblyLine` ADD CONSTRAINT `AssemblyLine_lotId_fkey` FOREIGN KEY (`lotId`) REFERENCES `InventoryLot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssemblyLine` ADD CONSTRAINT `AssemblyLine_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `InventoryWarehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WastageTracking` ADD CONSTRAINT `WastageTracking_assemblyTransactionId_fkey` FOREIGN KEY (`assemblyTransactionId`) REFERENCES `AssemblyTransaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UGExcisableDuty` ADD CONSTRAINT `UGExcisableDuty_assemblyTransactionId_fkey` FOREIGN KEY (`assemblyTransactionId`) REFERENCES `AssemblyTransaction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ManufacturingLaborCost` ADD CONSTRAINT `ManufacturingLaborCost_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ManufacturingOverhead` ADD CONSTRAINT `ManufacturingOverhead_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterBranchTransfer` ADD CONSTRAINT `InterBranchTransfer_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterBranchTransfer` ADD CONSTRAINT `InterBranchTransfer_fromBranchId_fkey` FOREIGN KEY (`fromBranchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterBranchTransfer` ADD CONSTRAINT `InterBranchTransfer_toBranchId_fkey` FOREIGN KEY (`toBranchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterBranchTransferItem` ADD CONSTRAINT `InterBranchTransferItem_transferId_fkey` FOREIGN KEY (`transferId`) REFERENCES `InterBranchTransfer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InterBranchTransferItem` ADD CONSTRAINT `InterBranchTransferItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SocialMediaLink` ADD CONSTRAINT `SocialMediaLink_systemSettingsId_fkey` FOREIGN KEY (`systemSettingsId`) REFERENCES `SystemSettings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PricingPlan` ADD CONSTRAINT `PricingPlan_systemSettingsId_fkey` FOREIGN KEY (`systemSettingsId`) REFERENCES `SystemSettings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeatureHighlight` ADD CONSTRAINT `FeatureHighlight_systemSettingsId_fkey` FOREIGN KEY (`systemSettingsId`) REFERENCES `SystemSettings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Testimonial` ADD CONSTRAINT `Testimonial_systemSettingsId_fkey` FOREIGN KEY (`systemSettingsId`) REFERENCES `SystemSettings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Currency` ADD CONSTRAINT `Currency_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExchangeRate` ADD CONSTRAINT `ExchangeRate_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExchangeRate` ADD CONSTRAINT `ExchangeRate_organizationId_fromCurrencyCode_fkey` FOREIGN KEY (`organizationId`, `fromCurrencyCode`) REFERENCES `Currency`(`organizationId`, `code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExchangeRate` ADD CONSTRAINT `ExchangeRate_organizationId_toCurrencyCode_fkey` FOREIGN KEY (`organizationId`, `toCurrencyCode`) REFERENCES `Currency`(`organizationId`, `code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ForeignExchangeGainLoss` ADD CONSTRAINT `ForeignExchangeGainLoss_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ForeignExchangeGainLoss` ADD CONSTRAINT `ForeignExchangeGainLoss_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ForeignExchangeGainLoss` ADD CONSTRAINT `ForeignExchangeGainLoss_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ForeignExchangeGainLoss` ADD CONSTRAINT `ForeignExchangeGainLoss_billId_fkey` FOREIGN KEY (`billId`) REFERENCES `Bill`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DebitNotePayments` ADD CONSTRAINT `_DebitNotePayments_A_fkey` FOREIGN KEY (`A`) REFERENCES `DebitNote`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DebitNotePayments` ADD CONSTRAINT `_DebitNotePayments_B_fkey` FOREIGN KEY (`B`) REFERENCES `Payment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Prisma migration tracking table
CREATE TABLE IF NOT EXISTS `_prisma_migrations` (
    `id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `checksum` VARCHAR(64) NOT NULL,
    `finished_at` DATETIME(3) NULL,
    `migration_name` VARCHAR(255) NOT NULL,
    `logs` TEXT NULL,
    `rolled_back_at` DATETIME(3) NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `applied_steps_count` INTEGER UNSIGNED NOT NULL DEFAULT 0
);

-- Record that the init migration has been applied
INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `started_at`, `applied_steps_count`)
VALUES (UUID(), SHA2('init', 256), NOW(3), '20260308184029_init', NOW(3), 1);
