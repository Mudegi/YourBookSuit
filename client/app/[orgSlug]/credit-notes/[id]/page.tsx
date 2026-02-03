'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, FilePlus, XCircle, DollarSign } from 'lucide-react';
import { CreditNoteApplicationModal } from '@/components/accounting/CreditNoteApplicationModal';

export default function CreditNoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<any>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  useEffect(() => { fetchNote(); }, [id]);

  const fetchNote = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orgs/${orgSlug}/credit-notes/${id}`);
      const data = await res.json();
      if (data.success) {
        setNote(data.data);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const approve = async () => {
    if (!confirm('Approve this credit note?')) return;
    const res = await fetch(`/api/orgs/${orgSlug}/credit-notes/${id}/approve`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approvalNotes: '', autoPost: true })
    });
    const data = await res.json();
    if (data.success) { fetchNote(); } else { alert('Error: ' + data.error); }
  };



  const currency = (n: number) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(n);

  if (loading) return <div className="container mx-auto p-6">Loading...</div>;
  if (!note) return <div className="container mx-auto p-6">Not found</div>;

  return (
    <div className="container mx-auto p-6">
      <Link href={`/${orgSlug}/credit-notes`} className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Credit Notes
      </Link>

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">Credit Note {note.creditNoteNumber}</h1>
          <div className="text-gray-600">{note.customer.companyName || `${note.customer.firstName} ${note.customer.lastName}`}</div>
        </div>
        <div className="flex gap-2">
          {note.status === 'APPROVED' || note.status === 'PARTIALLY_APPLIED' ? (
            <>
              <span className="px-3 py-2 bg-green-100 text-green-800 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> {note.status.replace('_', ' ')}
              </span>
              {note.remainingAmount > 0 && (
                <button 
                  onClick={() => setShowApplicationModal(true)} 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <DollarSign className="w-4 h-4" /> Apply to Invoices
                </button>
              )}
            </>
          ) : note.status === 'APPLIED' ? (
            <span className="px-3 py-2 bg-green-100 text-green-800 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Fully Applied
            </span>
          ) : note.status === 'VOID' ? (
            <span className="px-3 py-2 bg-red-100 text-red-800 rounded-lg flex items-center gap-2">
              <XCircle className="w-4 h-4" /> Void
            </span>
          ) : (
            <button onClick={approve} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Approve & Post
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Amount</div>
          <div className="text-xl font-bold">{currency(note.totalAmount)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Applied</div>
          <div className="text-xl font-bold text-green-600">{currency(note.appliedAmount)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Balance</div>
          <div className="text-xl font-bold text-blue-600">{currency(note.remainingAmount)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Reason</div>
          <div className="text-sm">{note.reason.replace('_', ' ')}</div>
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
       note.applications?.length > 0 &&ounded-lg shadow p-4 mb-6">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2"><FilePlus className="w-4 h-4" /> Apply to Invoices</h2>
          <div className="space-y-3">
            {applyRows.map((r, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input className="px-3 py-2 border rounded-lg" placeholder="Invoice ID" value={r.invoiceId} onChange={(e) => updateRow(i, 'invoiceId', e.target.value)} />
                <input className="px-3 py-2 border rounded-lg" type="number" placeholder="Amount" value={r.amount} onChange={(e) => updateRow(i, 'amount', e.target.value)} />
                <button type="button" onClick={() => removeRow(i)} className="px-3 py-2 border rounded-lg hover:bg-gray-50">Remove</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={addRow} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Add Application</button>
            <button type="button" onClick={apply} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Apply</button>
          </div>
        </div>
      )}

      {note.applications?.length ? (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-3">Applications</h2>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-sm">Invoice</th>
                <th className="px-3 py-2 text-right text-sm">Amount</th>
                <th className="px-3 py-2 text-left text-sm">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {note.applications.map((app: any) => (
                <tr key={app.id}>
                  <td className="px-3 py-2">{app.invoice.invoiceNumber}</td>
                  <td className="px-3 py-2 text-right">{currency(parseFloat(app.amount))}</td>
                  <td className="px-3 py-2">{new Date(app.appliedDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
}

      {/* Credit Note Application Modal */}
      {showApplicationModal && note && (
        <CreditNoteApplicationModal
          open={showApplicationModal}
          onClose={() => setShowApplicationModal(false)}
          creditNote={{
            id: note.id,
            creditNoteNumber: note.creditNoteNumber,
            customerId: note.customerId,
            totalAmount: parseFloat(note.totalAmount),
            appliedAmount: parseFloat(note.appliedAmount),
            remainingAmount: parseFloat(note.remainingAmount),
            currency: note.currency || 'UGX',
            lineItems: note.lineItems || [],
          }}
          orgSlug={orgSlug}
          onSuccess={() => {
            fetchNote();
            setShowApplicationModal(false);
          }}
        />
      )