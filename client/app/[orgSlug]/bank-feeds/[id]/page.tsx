'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

export default function BankFeedDetailPage({ params }: { params: { orgSlug: string; id: string } }) {
  const router = useRouter();
  const [bankFeed, setBankFeed] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function loadData() {
    try {
      const res = await fetch(`/api/${params.orgSlug}/bank-feeds/upload?feedId=${params.id}`);
      if (!res.ok) throw new Error('Failed to load');

      const data = await res.json();
      setBankFeed(data.bankFeeds?.[0]);
      setTransactions(data.bankFeeds?.[0]?.transactions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoMatch() {
    setMatching(true);
    try {
      const res = await fetch(`/api/${params.orgSlug}/bank-feeds/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankFeedId: params.id }),
      });

      if (!res.ok) throw new Error('Matching failed');
      const data = await res.json();
      alert(`${data.matchedCount} transactions matched!`);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Matching failed');
    } finally {
      setMatching(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-7xl">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-blue-600 mb-4 hover:text-blue-800">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}

      {bankFeed && (
        <>
          <div className="mb-6 p-4 bg-white border rounded-lg">
            <h1 className="text-3xl font-bold mb-4">{bankFeed.feedName}</h1>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-gray-600 text-sm">Feed Type</p>
                <p className="font-semibold">{bankFeed.feedType}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Transactions</p>
                <p className="font-semibold">{transactions.length}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Last Sync</p>
                <p className="font-semibold">{new Date(bankFeed.lastSyncAt).toLocaleDateString()}</p>
              </div>
            </div>
            <button
              onClick={handleAutoMatch}
              disabled={matching}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {matching ? 'Matching...' : 'Auto-Match Transactions'}
            </button>
          </div>

          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Payee</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Description</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Match Confidence</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn: any) => (
                  <tr key={txn.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{new Date(txn.transactionDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm font-medium">{txn.payee || '-'}</td>
                    <td className="px-6 py-4 text-sm">{txn.description}</td>
                    <td className="px-6 py-4 text-sm font-semibold">${Number(txn.amount).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          txn.status === 'MATCHED'
                            ? 'bg-green-100 text-green-800'
                            : txn.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {txn.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{txn.confidenceScore ? `${Number(txn.confidenceScore).toFixed(0)}%` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
