'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

export default function DebitNoteDetailPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<any>(null);

  useEffect(() => { fetchNote(); }, [id]);

  const fetchNote = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/${orgSlug}/debit-notes/${id}`);
      const data = await res.json();
      if (data.success) setNote(data.data);
    } finally { setLoading(false); }
  };

  const approve = async () => {
    if (!confirm('Approve this debit note?')) return;
    const res = await fetch(`/api/${orgSlug}/debit-notes/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approvalNotes: '', autoPost: true }) });
    const data = await res.json();
    if (data.success) fetchNote(); else alert('Error: ' + data.error);
  };

  const currency = (n: number) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(n);

  if (loading) return <div className="container mx-auto p-6">Loading...</div>;
  if (!note) return <div className="container mx-auto p-6">Not found</div>;

  return (
    <div className="container mx-auto p-6">
      <Link href={`/${orgSlug}/debit-notes`} className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"><ArrowLeft className="w-4 h-4" /> Back to Debit Notes</Link>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">Debit Note {note.debitNoteNumber}</h1>
          <div className="text-gray-600">{note.customer.companyName || `${note.customer.firstName} ${note.customer.lastName}`}</div>
        </div>
        <div className="flex gap-2">
          {note.status === 'APPROVED' || note.status === 'PAID' || note.status === 'PARTIALLY_PAID' ? (
            <span className="px-3 py-2 bg-green-100 text-green-800 rounded-lg flex items-center gap-2"><CheckCircle className="w-4 h-4" /> {note.status.replace('_', ' ')}</span>
          ) : note.status === 'VOID' ? (
            <span className="px-3 py-2 bg-red-100 text-red-800 rounded-lg flex items-center gap-2"><XCircle className="w-4 h-4" /> Void</span>
          ) : (
            <button onClick={approve} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Approve & Post</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Amount</div>
          <div className="text-xl font-bold">{currency(note.totalAmount)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Balance</div>
          <div className="text-xl font-bold text-blue-600">{currency(note.balanceAmount)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Reason</div>
          <div className="text-sm">{note.reason.replace('_', ' ')}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Due Date</div>
          <div className="text-sm">{note.dueDate ? new Date(note.dueDate).toLocaleDateString() : '—'}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3">Line Items</h2>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-sm">Description</th>
              <th className="px-3 py-2 text-right text-sm">Qty</th>
              <th className="px-3 py-2 text-right text-sm">Unit Price</th>
              <th className="px-3 py-2 text-right text-sm">Tax</th>
              <th className="px-3 py-2 text-right text-sm">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {note.lineItems.map((li: any) => (
              <tr key={li.id}>
                <td className="px-3 py-2">{li.description}</td>
                <td className="px-3 py-2 text-right">{li.quantity}</td>
                <td className="px-3 py-2 text-right">{currency(parseFloat(li.unitPrice))}</td>
                <td className="px-3 py-2 text-right">{currency(parseFloat(li.taxAmount))}</td>
                <td className="px-3 py-2 text-right font-medium">{currency(parseFloat(li.totalAmount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {note.payments?.length ? (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-3">Payments</h2>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-sm">Payment #</th>
                <th className="px-3 py-2 text-left text-sm">Date</th>
                <th className="px-3 py-2 text-right text-sm">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {note.payments.map((p: any) => (
                <tr key={p.id}>
                  <td className="px-3 py-2">{p.paymentNumber}</td>
                  <td className="px-3 py-2">{new Date(p.paymentDate).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-right">{currency(parseFloat(p.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
