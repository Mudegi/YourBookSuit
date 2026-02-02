'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';

export default function DebitNotesPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', startDate: '', endDate: '' });

  useEffect(() => { fetchNotes(); }, [filter]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (filter.status) qs.append('status', filter.status);
      if (filter.startDate) qs.append('startDate', filter.startDate);
      if (filter.endDate) qs.append('endDate', filter.endDate);
      const res = await fetch(`/api/${orgSlug}/debit-notes?${qs}`);
      const data = await res.json();
      if (data.success) setNotes(data.data);
    } finally { setLoading(false); }
  };

  const currency = (n: number) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(n);

  const statusBadge = (s: string) => {
    const m: any = { DRAFT: ['bg-gray-100','text-gray-800', Clock], PENDING_APPROVAL: ['bg-yellow-100','text-yellow-800', Clock], APPROVED: ['bg-green-100','text-green-800', CheckCircle], PARTIALLY_PAID: ['bg-blue-50','text-blue-700', Clock], PAID: ['bg-blue-100','text-blue-800', CheckCircle], OVERDUE:['bg-red-50','text-red-700', XCircle], VOID:['bg-red-100','text-red-800', XCircle] };
    const Icon = (m[s]||m.DRAFT)[2];
    return <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${(m[s]||m.DRAFT)[0]} ${(m[s]||m.DRAFT)[1]}`}><Icon className="w-3 h-3" />{s.replace('_',' ')}</span>;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Debit Notes</h1>
          <p className="text-gray-600">Additional charges and adjustments</p>
        </div>
        <Link href={`/${orgSlug}/debit-notes/new`} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"><Plus className="w-4 h-4" /> New Debit Note</Link>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-3">
          <select value={filter.status} onChange={(e)=>setFilter({ ...filter, status:e.target.value })} className="px-3 py-2 border rounded-lg">
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="VOID">Void</option>
          </select>
          <input type="date" value={filter.startDate} onChange={(e)=>setFilter({ ...filter, startDate:e.target.value })} className="px-3 py-2 border rounded-lg" />
          <input type="date" value={filter.endDate} onChange={(e)=>setFilter({ ...filter, endDate:e.target.value })} className="px-3 py-2 border rounded-lg" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading debit notes...</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <div className="text-gray-600">No debit notes found</div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm">Debit Note #</th>
                <th className="px-4 py-3 text-left text-sm">Date</th>
                <th className="px-4 py-3 text-left text-sm">Customer</th>
                <th className="px-4 py-3 text-left text-sm">Reason</th>
                <th className="px-4 py-3 text-right text-sm">Total</th>
                <th className="px-4 py-3 text-left text-sm">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {notes.map(n => (
                <tr key={n.id} className="hover:bg-gray-50 cursor-pointer" onClick={()=>router.push(`/${orgSlug}/debit-notes/${n.id}`)}>
                  <td className="px-4 py-3 font-mono text-blue-600">{n.debitNoteNumber}</td>
                  <td className="px-4 py-3 text-sm">{new Date(n.debitDate).toLocaleDateString('en-UG',{year:'numeric',month:'short',day:'numeric'})}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{n.customer.companyName || `${n.customer.firstName} ${n.customer.lastName}`}</div>
                    <div className="text-xs text-gray-500">{n.customer.customerNumber}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">{n.reason.replace('_',' ')}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{currency(n.totalAmount)}</td>
                  <td className="px-4 py-3">{statusBadge(n.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
