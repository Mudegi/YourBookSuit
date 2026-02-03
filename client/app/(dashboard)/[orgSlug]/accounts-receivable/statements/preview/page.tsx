'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Mail, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/utils';

interface StatementData {
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    billingAddress: string | null;
    accountNumber: string | null;
  };
  organization: {
    name: string;
    legalName: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    tin: string | null;
    logoUrl: string | null;
    bankAccount: {
      bankName: string;
      accountName: string;
      accountNumber: string;
      currency: string;
    } | null;
  };
  statement: {
    fromDate: string;
    toDate: string;
    openingBalance: number;
    closingBalance: number;
    totalInvoiced: number;
    totalPaid: number;
    currency: string;
  };
  transactions: Array<{
    date: string;
    type: string;
    reference: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
    efrisFDN?: string;
  }>;
  aging: {
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    days90plus: number;
  };
}

export default function StatementPreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const { organization } = useOrganization();

  const [statementData, setStatementData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<Array<{
    id: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    currency: string;
  }>>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');

  const customerId = searchParams.get('customerId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const includePaid = searchParams.get('includePaid') === 'true';

  useEffect(() => {
    if (customerId && startDate && endDate) {
      fetchStatement();
      fetchBankAccounts();
    }
  }, [customerId, startDate, endDate, includePaid]);

  const fetchBankAccounts = async () => {
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/bank-accounts`);
      const data = await res.json();
      if (data.bankAccounts) {
        // Filter only active accounts
        const activeAccounts = data.bankAccounts.filter((acc: any) => acc.isActive);
        setBankAccounts(activeAccounts);
        // Auto-select first active account
        if (activeAccounts.length > 0) {
          setSelectedBankAccountId(activeAccounts[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching bank accounts:', err);
    }
  };

  const fetchStatement = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        fromDate: startDate!,
        toDate: endDate!,
        format: 'json',
      });

      const res = await fetch(`/api/orgs/${orgSlug}/customers/${customerId}/statement?${queryParams}`);
      const data = await res.json();

      if (data.success) {
        setStatementData(data.data);
      } else {
        setError(data.error || 'Failed to generate statement');
      }
    } catch (err: any) {
      console.error('Error fetching statement:', err);
      setError(err.message || 'Failed to generate statement');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      // Import html2pdf dynamically
      const html2pdf = (await import('html2pdf.js')).default;
      
      const element = document.getElementById('statement-content');
      if (!element) {
        alert('Statement content not found');
        return;
      }

      const opt = {
        margin: 0.5,
        filename: `statement-${statementData?.customer.name}-${formatDate(statementData?.statement.fromDate || '')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try using Print instead.');
    }
  };

  const handleEmail = () => {
    // TODO: Implement email sending
    alert('Email sending will be implemented');
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const currency = (amount: number) => {
    return formatCurrency(amount, statementData?.statement.currency || 'USD');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !statementData) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'No statement data available'}</p>
          <Link href={`/${orgSlug}/accounts-receivable/statements/new`} className="text-blue-600 hover:underline mt-2 inline-block">
            ← Back to generate statement
          </Link>
        </div>
      </div>
    );
  }

  const isUganda = organization?.homeCountry === 'UG' || organization?.homeCountry === 'UGANDA';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Action Bar (Hide on print) */}
      <div className="bg-white border-b print:hidden sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href={`/${orgSlug}/accounts-receivable/statements/new`}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleEmail}>
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
          </div>
        </div>
      </div>

      {/* Statement Document */}
      <div className="container mx-auto px-6 py-8 print:p-0">
        <div id="statement-content" className="bg-white shadow-lg rounded-lg p-8 print:shadow-none print:rounded-none max-w-5xl mx-auto">
          {/* Header */}
          <div className="border-b-2 border-gray-300 pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                {statementData.organization.logoUrl && (
                  <img
                    src={statementData.organization.logoUrl}
                    alt="Company Logo"
                    className="h-16 mb-4"
                  />
                )}
                <h1 className="text-2xl font-bold text-gray-900">
                  {statementData.organization.legalName || statementData.organization.name}
                </h1>
                {statementData.organization.address && (
                  <p className="text-sm text-gray-600 mt-1">{statementData.organization.address}</p>
                )}
                <div className="flex gap-4 text-sm text-gray-600 mt-2">
                  {statementData.organization.phone && <span>Tel: {statementData.organization.phone}</span>}
                  {statementData.organization.email && <span>Email: {statementData.organization.email}</span>}
                </div>
                {statementData.organization.tin && (
                  <p className="text-sm text-gray-600 mt-1">TIN: {statementData.organization.tin}</p>
                )}
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-gray-900">CUSTOMER STATEMENT</h2>
                <p className="text-sm text-gray-600 mt-2">
                  Period: {formatDate(statementData.statement.fromDate)} to {formatDate(statementData.statement.toDate)}
                </p>
                <p className="text-sm text-gray-600">
                  Generated: {formatDate(new Date().toISOString())}
                </p>
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Account Details</h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="font-semibold text-gray-900">{statementData.customer.name}</p>
              {statementData.customer.accountNumber && (
                <p className="text-sm text-gray-600">Account #: {statementData.customer.accountNumber}</p>
              )}
              {statementData.customer.billingAddress && (
                <p className="text-sm text-gray-600 mt-1">{statementData.customer.billingAddress}</p>
              )}
              {statementData.customer.phone && <p className="text-sm text-gray-600">Tel: {statementData.customer.phone}</p>}
              {statementData.customer.email && <p className="text-sm text-gray-600">Email: {statementData.customer.email}</p>}
            </div>
          </div>

          {/* Opening Balance */}
          <div className="mb-4 bg-blue-50 border border-blue-200 p-3 rounded-md flex justify-between items-center">
            <span className="font-semibold text-gray-900">Opening Balance ({formatDate(statementData.statement.fromDate)})</span>
            <span className="font-bold text-lg">{currency(statementData.statement.openingBalance)}</span>
          </div>

          {/* Transactions Table */}
          <div className="mb-6 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Date</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Ref #</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Type</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Description</th>
                  {isUganda && <th className="text-left p-3 text-sm font-semibold text-gray-700">EFRIS FDN</th>}
                  <th className="text-right p-3 text-sm font-semibold text-gray-700">Debit</th>
                  <th className="text-right p-3 text-sm font-semibold text-gray-700">Credit</th>
                  <th className="text-right p-3 text-sm font-semibold text-gray-700">Balance</th>
                </tr>
              </thead>
              <tbody>
                {statementData.transactions.map((txn, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-3 text-sm text-gray-700">{formatDate(txn.date)}</td>
                    <td className="p-3 text-sm text-gray-900 font-medium">{txn.reference}</td>
                    <td className="p-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        txn.type === 'INVOICE' ? 'bg-blue-100 text-blue-800' :
                        txn.type === 'PAYMENT' ? 'bg-green-100 text-green-800' :
                        txn.type === 'CREDIT_NOTE' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {txn.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-gray-700">{txn.description}</td>
                    {isUganda && (
                      <td className="p-3 text-xs text-gray-600 font-mono">
                        {txn.efrisFDN || '-'}
                      </td>
                    )}
                    <td className="p-3 text-sm text-right text-gray-900">
                      {txn.debit > 0 ? currency(txn.debit) : '-'}
                    </td>
                    <td className="p-3 text-sm text-right text-gray-900">
                      {txn.credit > 0 ? currency(txn.credit) : '-'}
                    </td>
                    <td className={`p-3 text-sm text-right font-semibold ${
                      txn.balance < 0 ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {currency(txn.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Closing Balance */}
          <div className="mb-6 bg-blue-50 border-2 border-blue-300 p-4 rounded-md flex justify-between items-center">
            <span className="font-bold text-gray-900 text-lg">Closing Balance ({formatDate(statementData.statement.toDate)})</span>
            <span className="font-bold text-2xl text-blue-600">{currency(statementData.statement.closingBalance)}</span>
          </div>

          {/* Aging Summary */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Aging Summary</h3>
            <div className="grid grid-cols-5 gap-3">
              <div className="bg-green-50 border border-green-200 p-3 rounded-md text-center">
                <p className="text-xs text-gray-600 mb-1">Current</p>
                <p className="font-bold text-gray-900">{currency(statementData.aging.current)}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md text-center">
                <p className="text-xs text-gray-600 mb-1">1-30 Days</p>
                <p className="font-bold text-gray-900">{currency(statementData.aging.days1to30)}</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 p-3 rounded-md text-center">
                <p className="text-xs text-gray-600 mb-1">31-60 Days</p>
                <p className="font-bold text-gray-900">{currency(statementData.aging.days31to60)}</p>
              </div>
              <div className="bg-red-50 border border-red-200 p-3 rounded-md text-center">
                <p className="text-xs text-gray-600 mb-1">61-90 Days</p>
                <p className="font-bold text-gray-900">{currency(statementData.aging.days61to90)}</p>
              </div>
              <div className="bg-red-100 border border-red-300 p-3 rounded-md text-center">
                <p className="text-xs text-gray-600 mb-1">90+ Days</p>
                <p className="font-bold text-red-600">{currency(statementData.aging.days90plus)}</p>
              </div>
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="border-t-2 border-gray-300 pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Payment Instructions</h3>
              {bankAccounts.length > 1 && (
                <select
                  value={selectedBankAccountId}
                  onChange={(e) => setSelectedBankAccountId(e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-3 py-1 print:hidden"
                >
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bankName} - {account.accountNumber}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-sm text-gray-700 mb-2">
              Please remit payment to the following account:
            </p>
            {(() => {
              const selectedAccount = bankAccounts.find(acc => acc.id === selectedBankAccountId);
              return selectedAccount ? (
                <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-700">
                  <p><strong>Bank:</strong> {selectedAccount.bankName}</p>
                  <p><strong>Account Name:</strong> {selectedAccount.accountName}</p>
                  <p><strong>Account Number:</strong> {selectedAccount.accountNumber}</p>
                  <p><strong>Currency:</strong> {selectedAccount.currency}</p>
                </div>
              ) : (
                <div className="bg-yellow-50 p-4 rounded-md text-sm text-gray-700">
                  <p className="text-yellow-800">⚠️ No bank account configured. Please set up a bank account in your organization settings.</p>
                </div>
              );
            })()}
            <p className="text-xs text-gray-600 mt-3">
              Please include your account number ({statementData.customer.accountNumber || statementData.customer.name}) as the payment reference.
            </p>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t border-gray-200">
            <p>This is a computer-generated statement and does not require a signature.</p>
            <p className="mt-1">For queries, please contact {statementData.organization.email || statementData.organization.phone}</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          /* Hide all page elements except statement */
          body * {
            visibility: hidden;
          }
          
          #statement-content,
          #statement-content * {
            visibility: visible;
          }
          
          #statement-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0.5in;
            margin: 0;
            box-shadow: none;
            border-radius: 0;
          }
          
          /* Ensure colors print correctly */
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          /* Hide specific elements */
          .print\\:hidden {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* Remove margins and padding from parent containers */
          .min-h-screen {
            min-height: auto;
          }
          
          .bg-gray-50 {
            background: white;
          }
        }
      `}</style>
    </div>
  );
}
