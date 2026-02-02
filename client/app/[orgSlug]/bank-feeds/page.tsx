'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Upload, List, Filter, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function BankFeedsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const router = useRouter();
  const [bankFeeds, setBankFeeds] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [feedName, setFeedName] = useState('');
  const [feedType, setFeedType] = useState('CSV');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, [orgSlug]);

  async function loadData() {
    try {
      const [feedsRes, accountsRes] = await Promise.all([
        fetch(`/api/${orgSlug}/bank-feeds/upload`),
        fetch(`/api/${orgSlug}/banking/accounts`),
      ]);

      if (!feedsRes.ok) throw new Error('Failed to load feeds');
      if (!accountsRes.ok) throw new Error('Failed to load accounts');

      const feedsData = await feedsRes.json();
      const accountsData = await accountsRes.json();

      setBankFeeds(feedsData.bankFeeds || []);
      setBankAccounts(accountsData.accounts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !selectedAccount || !feedName) {
      setError('Please fill all fields and select a file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bankAccountId', selectedAccount);
    formData.append('feedName', feedName);
    formData.append('feedType', feedType);

    try {
      const res = await fetch(`/api/${orgSlug}/bank-feeds/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await res.json();
      setBankFeeds([data.bankFeed, ...bankFeeds]);
      setShowUpload(false);
      setFile(null);
      setFeedName('');
      setSelectedAccount('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Bank Feeds</h1>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Upload className="w-4 h-4" /> Upload Feed
        </button>
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}

      {showUpload && (
        <div className="mb-6 p-6 bg-white border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Upload Bank Feed</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Bank Account</label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select account...</option>
                  {bankAccounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} - {acc.accountNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Feed Name</label>
                <input
                  type="text"
                  value={feedName}
                  onChange={(e) => setFeedName(e.target.value)}
                  placeholder="e.g., December 2025"
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">File Type</label>
                <select
                  value={feedType}
                  onChange={(e) => setFeedType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="CSV">CSV</option>
                  <option value="OFX">OFX</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">File</label>
                <input
                  type="file"
                  accept=".csv,.ofx,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button
                type="button"
                onClick={() => setShowUpload(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Feed Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Bank Account</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Transactions</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Last Sync</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bankFeeds.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No bank feeds uploaded yet
                </td>
              </tr>
            ) : (
              bankFeeds.map((feed: any) => (
                <tr key={feed.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{feed.feedName}</td>
                  <td className="px-6 py-4 text-sm">{feed.feedType}</td>
                  <td className="px-6 py-4 text-sm">{feed.bankAccount?.accountName || '-'}</td>
                  <td className="px-6 py-4 text-sm">{feed._count?.transactions || 0}</td>
                  <td className="px-6 py-4 text-sm">
                    {feed.lastSyncAt ? new Date(feed.lastSyncAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => router.push(`/${orgSlug}/bank-feeds/${feed.id}`)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
