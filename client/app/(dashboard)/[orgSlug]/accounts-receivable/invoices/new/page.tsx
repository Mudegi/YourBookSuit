'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function InvoiceRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  useEffect(() => {
    router.replace(`/${orgSlug}/accounts-receivable/invoices/new-intelligent`);
  }, [orgSlug, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Redirecting to new invoice page...</p>
      </div>
    </div>
  );
}
