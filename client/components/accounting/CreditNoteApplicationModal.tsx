'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface OutstandingInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: string;
}

interface CreditNote {
  id: string;
  creditNoteNumber: string;
  customerId: string;
  totalAmount: number;
  appliedAmount: number;
  remainingAmount: number;
  currency: string;
  lineItems: Array<{
    id: string;
    productId?: string;
    description: string;
    quantity: number;
  }>;
}

interface CreditNoteApplicationModalProps {
  open: boolean;
  onClose: () => void;
  creditNote: CreditNote;
  orgSlug: string;
  onSuccess?: () => void;
}

export function CreditNoteApplicationModal({
  open,
  onClose,
  creditNote,
  orgSlug,
  onSuccess,
}: CreditNoteApplicationModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [outstandingInvoices, setOutstandingInvoices] = useState<OutstandingInvoice[]>([]);
  const [applications, setApplications] = useState<Record<string, number>>({});
  const [restockInventory, setRestockInventory] = useState(false);
  const [notes, setNotes] = useState('');

  // Calculate totals
  const totalApplied = Object.values(applications).reduce((sum, amount) => sum + amount, 0);
  const remainingCredit = creditNote.remainingAmount - totalApplied;

  // Fetch outstanding invoices
  useEffect(() => {
    if (open && creditNote.customerId) {
      fetchOutstandingInvoices();
    }
  }, [open, creditNote.customerId]);

  const fetchOutstandingInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/customers/${creditNote.customerId}/outstanding-invoices`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch outstanding invoices');
      }

      const data = await response.json();
      setOutstandingInvoices(data.invoices || []);
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
      setError(err.message);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleAmountChange = (invoiceId: string, value: string) => {
    const amount = parseFloat(value) || 0;
    setApplications((prev) => ({
      ...prev,
      [invoiceId]: amount,
    }));
  };

  const handleQuickFill = (invoiceId: string) => {
    const invoice = outstandingInvoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;

    const availableCredit = creditNote.remainingAmount - totalApplied + (applications[invoiceId] || 0);
    const fillAmount = Math.min(invoice.amountDue, availableCredit);

    setApplications((prev) => ({
      ...prev,
      [invoiceId]: fillAmount,
    }));
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);

    // Validation
    if (totalApplied <= 0) {
      setError('Please enter at least one application amount');
      return;
    }

    if (totalApplied > creditNote.remainingAmount) {
      setError('Total application amount exceeds remaining credit');
      return;
    }

    // Prepare applications array
    const applicationsArray = Object.entries(applications)
      .filter(([_, amount]) => amount > 0)
      .map(([invoiceId, amount]) => ({
        invoiceId,
        amount,
      }));

    if (applicationsArray.length === 0) {
      setError('Please enter at least one application amount');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/credit-notes/${creditNote.id}/applications`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applications: applicationsArray,
            restockInventory,
            notes: notes || undefined,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to apply credit note');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error applying credit:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Apply Credit Note: {creditNote.creditNoteNumber}
          </DialogTitle>
          <DialogDescription>
            Apply credit to outstanding invoices for this customer
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert className="bg-red-50 border-red-200 text-red-900">
            <AlertCircle className="h-4 w-4" />
            <p className="ml-2">{error}</p>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200 text-green-900">
            <CheckCircle className="h-4 w-4" />
            <p className="ml-2">Credit note applied successfully!</p>
          </Alert>
        )}

        {/* Credit Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div>
            <p className="text-xs text-gray-600">Total Credit</p>
            <p className="text-lg font-bold text-blue-900">
              {formatCurrency(creditNote.totalAmount, creditNote.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Previously Applied</p>
            <p className="text-lg font-semibold text-gray-700">
              {formatCurrency(creditNote.appliedAmount, creditNote.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Remaining</p>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(remainingCredit, creditNote.currency)}
            </p>
          </div>
        </div>

        {/* Inventory Restock Option */}
        {creditNote.lineItems.some((item) => item.productId) && (
          <div className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-200 rounded">
            <Checkbox
              id="restock"
              checked={restockInventory}
              onCheckedChange={(checked) => setRestockInventory(checked as boolean)}
            />
            <Label htmlFor="restock" className="text-sm font-medium cursor-pointer">
              Return items to inventory (restock {creditNote.lineItems.length} item
              {creditNote.lineItems.length > 1 ? 's' : ''})
            </Label>
          </div>
        )}

        {/* Outstanding Invoices */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Outstanding Invoices</h3>

          {loadingInvoices ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading invoices...</span>
            </div>
          ) : outstandingInvoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No outstanding invoices found for this customer
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Invoice #</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">Total</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">Balance Due</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">Apply Amount</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {outstandingInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium text-blue-600">{invoice.invoiceNumber}</div>
                        <div className="text-xs text-gray-500">{invoice.status}</div>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {new Date(invoice.invoiceDate).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right text-sm">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </td>
                      <td className="p-3 text-right font-semibold text-orange-600">
                        {formatCurrency(invoice.amountDue, invoice.currency)}
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={Math.min(invoice.amountDue, remainingCredit)}
                          value={applications[invoice.id] || ''}
                          onChange={(e) => handleAmountChange(invoice.id, e.target.value)}
                          placeholder="0.00"
                          className="text-right"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickFill(invoice.id)}
                          disabled={remainingCredit <= 0}
                        >
                          Fill
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Application Summary */}
        <div className="p-4 bg-gray-50 border rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Total to Apply:</span>
            <span className="text-xl font-bold text-blue-600">
              {formatCurrency(totalApplied, creditNote.currency)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Remaining After Application:</span>
            <span
              className={`text-lg font-semibold ${
                remainingCredit < 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {formatCurrency(remainingCredit, creditNote.currency)}
            </span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes" className="text-sm font-medium">
            Notes (Optional)
          </Label>
          <Input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this application"
            className="mt-1"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || totalApplied <= 0 || remainingCredit < 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4 mr-2" />
                Apply Credit ({formatCurrency(totalApplied, creditNote.currency)})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
