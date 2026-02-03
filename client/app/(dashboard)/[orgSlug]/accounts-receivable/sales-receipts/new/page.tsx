'use client';

import { useParams } from 'next/navigation';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import SalesReceiptForm from '@/components/sales/SalesReceiptForm';

export default function NewSalesReceiptPage() {
  const params = useParams();
  const { organization, currency } = useOrganization();
  const { user } = useAuth();
  const orgSlug = params.orgSlug as string;

  const handleSuccess = (receipt: any) => {
    // Redirect to receipt detail page or list
    window.location.href = `/${orgSlug}/accounts-receivable/sales-receipts/${receipt.id}`;
  };

  const handleCancel = () => {
    window.location.href = `/${orgSlug}/accounts-receivable/sales-receipts`;
  };

  if (!organization || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">New Sales Receipt</h1>
        <p className="text-gray-600 mt-2">Record an instant cash or mobile money sale</p>
      </div>

      <SalesReceiptForm
        organizationId={organization.id}
        userId={user.id}
        branchId={user.branchId}
        defaultDepositAccountId={user.defaultDepositAccountId}
        isTaxInclusive={organization.taxCalculationMethod === 'INCLUSIVE'}
        baseCurrency={currency || organization.baseCurrency || 'UGX'}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}

