'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, ArrowRight, Building2, Clock, CheckCircle, Truck, XCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface IBT {
  id: string;
  reference: string;
  status: string;
  notes: string | null;
  createdAt: string;
  shippedAt: string | null;
  receivedAt: string | null;
  fromBranch: { id: string; name: string; code: string };
  toBranch: { id: string; name: string; code: string };
  items: { id: string; quantity: string; unitCost: string; product: { name: string; sku: string } }[];
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  DRAFT:      { label: 'Draft',      icon: FileText,     color: 'bg-gray-100 text-gray-700' },
  REQUESTED:  { label: 'Requested',  icon: Clock,        color: 'bg-yellow-100 text-yellow-700' },
  APPROVED:   { label: 'Approved',   icon: CheckCircle,  color: 'bg-blue-100 text-blue-700' },
  IN_TRANSIT: { label: 'In Transit', icon: Truck,        color: 'bg-orange-100 text-orange-700' },
  RECEIVED:   { label: 'Received',   icon: CheckCircle,  color: 'bg-green-100 text-green-700' },
  CANCELLED:  { label: 'Cancelled',  icon: XCircle,      color: 'bg-red-100 text-red-700' },
};

export default function InterBranchTransfersPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [transfers, setTransfers] = useState<IBT[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    fetch(`/api/${orgSlug}/inter-branch-transfers`)
      .then((r) => r.json())
      .then((data) => setTransfers(Array.isArray(data) ? data : []))
      .catch(() => setTransfers([]))
      .finally(() => setLoading(false));
  }, [orgSlug]);

  const filtered = statusFilter === 'ALL' ? transfers : transfers.filter((t) => t.status === statusFilter);

  const handleAction = async (id: string, action: string) => {
    await fetch(`/api/${orgSlug}/inter-branch-transfers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    // Refresh
    const data = await fetch(`/api/${orgSlug}/inter-branch-transfers`).then((r) => r.json());
    setTransfers(Array.isArray(data) ? data : []);
  };

  const totalValue = (ibt: IBT) =>
    ibt.items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitCost), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inter-Branch Transfers</h1>
          <p className="text-gray-600 mt-1">Move stock between branches with automatic accounting entries</p>
        </div>
        <Link href={`/${orgSlug}/inventory/inter-branch-transfers/new`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Transfer
          </Button>
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const count = transfers.filter((t) => t.status === status).length;
          const Icon = cfg.icon;
          return (
            <Card key={status} className="cursor-pointer hover:ring-2 ring-blue-300 transition" onClick={() => setStatusFilter(status === statusFilter ? 'ALL' : status)}>
              <CardContent className="pt-4 flex items-center gap-3">
                <Icon className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs text-gray-500">{cfg.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', ...Object.keys(STATUS_CONFIG)].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'ALL' ? 'All' : STATUS_CONFIG[s]?.label ?? s}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((n) => <div key={n} className="h-16 bg-gray-100 rounded animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-500">
            <Truck className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No transfers found</p>
            <p className="text-sm mt-1">Create one to move stock between branches.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((ibt) => {
            const cfg = STATUS_CONFIG[ibt.status] ?? { label: ibt.status, icon: FileText, color: 'bg-gray-100 text-gray-700' };
            const Icon = cfg.icon;
            const value = totalValue(ibt);
            return (
              <Card key={ibt.id} className="hover:shadow-md transition">
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Reference + Branches */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div>
                        <div className="font-semibold text-gray-900">{ibt.reference}</div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                          <Building2 className="w-3 h-3" />
                          <span>{ibt.fromBranch.name}</span>
                          <ArrowRight className="w-3 h-3" />
                          <span>{ibt.toBranch.name}</span>
                        </div>
                      </div>
                    </div>

                    {/* Items count + value */}
                    <div className="text-sm text-gray-600 hidden md:block">
                      <span className="font-medium">{ibt.items.length}</span> item{ibt.items.length !== 1 ? 's' : ''}&nbsp;·&nbsp;
                      <span className="font-medium">
                        {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Status + Actions */}
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>

                      {ibt.status === 'DRAFT' && (
                        <Button size="sm" variant="outline" onClick={() => handleAction(ibt.id, 'submit')}>Submit</Button>
                      )}
                      {ibt.status === 'REQUESTED' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleAction(ibt.id, 'approve')}>Approve</Button>
                          <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => handleAction(ibt.id, 'cancel')}>Cancel</Button>
                        </>
                      )}
                      {ibt.status === 'APPROVED' && (
                        <Button size="sm" variant="outline" onClick={() => handleAction(ibt.id, 'ship')}>Mark Shipped</Button>
                      )}
                      {ibt.status === 'IN_TRANSIT' && (
                        <Button size="sm" onClick={() => handleAction(ibt.id, 'receive')}>Confirm Receipt</Button>
                      )}

                      <Link href={`/${orgSlug}/inventory/inter-branch-transfers/${ibt.id}`}>
                        <Button size="sm" variant="ghost">View</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
