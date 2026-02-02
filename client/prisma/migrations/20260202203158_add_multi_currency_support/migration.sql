-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "defaultExchangeRateProvider" TEXT DEFAULT 'MANUAL',
ADD COLUMN     "enableAutoFetchRates" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "exchangeRateBufferPercent" DECIMAL(5,2),
ADD COLUMN     "fxGainAccountId" TEXT,
ADD COLUMN     "fxLossAccountId" TEXT,
ADD COLUMN     "unrealizedFxGainAccountId" TEXT,
ADD COLUMN     "unrealizedFxLossAccountId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "baseCurrencyAmount" DECIMAL(19,4),
ADD COLUMN     "fxGainLossAccountId" TEXT,
ADD COLUMN     "fxGainLossAmount" DECIMAL(19,4);

-- CreateTable
CREATE TABLE "Currency" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimalPlaces" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fromCurrencyCode" TEXT NOT NULL,
    "toCurrencyCode" TEXT NOT NULL,
    "rate" DECIMAL(18,6) NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "isManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForeignExchangeGainLoss" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "transactionId" TEXT,
    "paymentId" TEXT,
    "invoiceId" TEXT,
    "billId" TEXT,
    "fxType" TEXT NOT NULL,
    "foreignCurrency" TEXT NOT NULL,
    "foreignAmount" DECIMAL(19,4) NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "transactionRate" DECIMAL(18,6) NOT NULL,
    "transactionBaseAmount" DECIMAL(19,4) NOT NULL,
    "settlementDate" TIMESTAMP(3) NOT NULL,
    "settlementRate" DECIMAL(18,6) NOT NULL,
    "settlementBaseAmount" DECIMAL(19,4) NOT NULL,
    "gainLossAmount" DECIMAL(19,4) NOT NULL,
    "glAccountId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForeignExchangeGainLoss_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Currency_organizationId_idx" ON "Currency"("organizationId");

-- CreateIndex
CREATE INDEX "Currency_isActive_idx" ON "Currency"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Currency_organizationId_code_key" ON "Currency"("organizationId", "code");

-- CreateIndex
CREATE INDEX "ExchangeRate_organizationId_idx" ON "ExchangeRate"("organizationId");

-- CreateIndex
CREATE INDEX "ExchangeRate_effectiveDate_idx" ON "ExchangeRate"("effectiveDate");

-- CreateIndex
CREATE INDEX "ExchangeRate_fromCurrencyCode_toCurrencyCode_idx" ON "ExchangeRate"("fromCurrencyCode", "toCurrencyCode");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_organizationId_fromCurrencyCode_toCurrencyCode_key" ON "ExchangeRate"("organizationId", "fromCurrencyCode", "toCurrencyCode", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "ForeignExchangeGainLoss_paymentId_key" ON "ForeignExchangeGainLoss"("paymentId");

-- CreateIndex
CREATE INDEX "ForeignExchangeGainLoss_organizationId_idx" ON "ForeignExchangeGainLoss"("organizationId");

-- CreateIndex
CREATE INDEX "ForeignExchangeGainLoss_paymentId_idx" ON "ForeignExchangeGainLoss"("paymentId");

-- CreateIndex
CREATE INDEX "ForeignExchangeGainLoss_invoiceId_idx" ON "ForeignExchangeGainLoss"("invoiceId");

-- CreateIndex
CREATE INDEX "ForeignExchangeGainLoss_billId_idx" ON "ForeignExchangeGainLoss"("billId");

-- CreateIndex
CREATE INDEX "ForeignExchangeGainLoss_fxType_idx" ON "ForeignExchangeGainLoss"("fxType");

-- CreateIndex
CREATE INDEX "ForeignExchangeGainLoss_settlementDate_idx" ON "ForeignExchangeGainLoss"("settlementDate");

-- CreateIndex
CREATE INDEX "ForeignExchangeGainLoss_foreignCurrency_idx" ON "ForeignExchangeGainLoss"("foreignCurrency");

-- CreateIndex
CREATE INDEX "Payment_currency_idx" ON "Payment"("currency");

-- AddForeignKey
ALTER TABLE "Currency" ADD CONSTRAINT "Currency_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_organizationId_fromCurrencyCode_fkey" FOREIGN KEY ("organizationId", "fromCurrencyCode") REFERENCES "Currency"("organizationId", "code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_organizationId_toCurrencyCode_fkey" FOREIGN KEY ("organizationId", "toCurrencyCode") REFERENCES "Currency"("organizationId", "code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForeignExchangeGainLoss" ADD CONSTRAINT "ForeignExchangeGainLoss_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForeignExchangeGainLoss" ADD CONSTRAINT "ForeignExchangeGainLoss_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForeignExchangeGainLoss" ADD CONSTRAINT "ForeignExchangeGainLoss_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForeignExchangeGainLoss" ADD CONSTRAINT "ForeignExchangeGainLoss_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
