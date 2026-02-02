'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface ExpenseClaim {
  id: string;
  claimNumber: string;
  employeeName: string;
  employeeNumber: string;
  claimDate: string;
  totalAmount: number;
  currency: string;
  status: string;
  purpose?: string;
  itemCount: number;
  createdAt: string;
}

export default function ExpenseClaimsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${orgSlug}/hcm/expense-claims`);
      if (!res.ok) throw new Error('Failed to load expense claims');
      const json = await res.json();
      setClaims(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expense claims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgSlug) load();
  }, [orgSlug]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Expense Claims</h1>
        <p className="text-gray-600">Manage employee expense reimbursements</p>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>}

      <div className="overflow-auto border border-gray-200 rounded-md bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Claim #</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Employee</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Items</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Purpose</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {claims.map((claim) => (
              <tr key={claim.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono">{claim.claimNumber}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="font-medium">{claim.employeeName}</div>
                  <div className="text-xs text-gray-500">{claim.employeeNumber}</div>
                </td>
                <td className="px-4 py-3 text-sm">{new Date(claim.claimDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm font-medium">
                  {claim.currency} {claim.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-sm">{claim.itemCount}</td>
                <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-xs">{claim.purpose || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    claim.status === 'PAID' ? 'bg-green-100 text-green-800' :
                    claim.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                    claim.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    claim.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {claim.status}
                  </span>
                </td>
              </tr>
            ))}
            {claims.length === 0 && !loading && (
              <tr>
                <td className="px-4 py-4 text-sm text-gray-600" colSpan={7}>No expense claims yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
