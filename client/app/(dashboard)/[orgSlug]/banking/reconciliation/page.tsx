'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ArrowLeftRight,
  Plus,
  FileText,
  Lock,
  Sparkles,
  X,
} from 'lucide-react';

interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  currency: string;
  currentBalance: number;
}

interface Reconciliation {
  id: string;
  bankAccountId: string;
  bankAccountName: string;
  statementDate: string;
  statementBalance: number;
  bookBalance: number;
  difference: number;
  status: string;
}

interface UnreconciledPayment {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  amount: number;
  paymentType: string;
  description: string;
  customerName?: string;
  vendorName?: string;
  referenceNumber?: string;
}

interface UnreconciledBankTransaction {
  id: string;
  transactionDate: string;
  amount: number;
  description: string;
  payee?: string;
  referenceNo?: string;
  transactionType: string;
}

interface MatchSuggestion {
  paymentId: string;
  bankTransactionId: string;
  confidenceScore: number;
  matchReason: string;
}

interface ReconciliationSummary {
  statementBalance: number;
  bookBalance: number;
  depositsInTransit: number;
  outstandingChecks: number;
  adjustedBookBalance: number;
  difference: number;
  isBalanced: boolean;
}

export default function BankReconciliationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgSlug = params?.orgSlug as string;
  const reconciliationId = searchParams?.get('id');

  // State
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split('T')[0]);
  const [statementBalance, setStatementBalance] = useState('');
  
  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(null);
  const [unreconciledPayments, setUnreconciledPayments] = useState<UnreconciledPayment[]>([]);
  const [unreconciledBankTransactions, setUnreconciledBankTransactions] = useState<UnreconciledBankTransaction[]>([]);
  const [matchSuggestions, setMatchSuggestions] = useState<MatchSuggestion[]>([]);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadAccounts();
    if (reconciliationId) {
      loadReconciliation(reconciliationId);
    }
  }, [orgSlug, reconciliationId]);

  const loadAccounts = async () => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/banking/accounts`);
      const data = await response.json();
      if (data.success) {
        setAccounts(data.data || []);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const loadReconciliation = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/banking/reconciliation/${id}`);
      const data = await response.json();
      
      if (data.success) {
        setReconciliation(data.data.reconciliation);
        setUnreconciledPayments(data.data.unreconciledPayments);
        setUnreconciledBankTransactions(data.data.unreconciledBankTransactions);
        setMatchSuggestions(data.data.matchSuggestions);
        setSummary(data.data.summary);
      }
    } catch (error) {
      console.error('Error loading reconciliation:', error);
      setError('Failed to load reconciliation');
    } finally {
      setLoading(false);
    }
  };

  const startReconciliation = async () => {
    if (!selectedAccountId || !statementBalance) {
      setError('Please select a bank account and enter statement balance');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/banking/reconciliation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccountId: selectedAccountId,
          statementDate,
          statementBalance: parseFloat(statementBalance),
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        router.push(`/${orgSlug}/banking/reconciliation?id=${data.data.id}`);
        setSuccess('Reconciliation started successfully');
      } else {
        setError(data.error || 'Failed to start reconciliation');
      }
    } catch (error) {
      setError('Failed to start reconciliation');
    } finally {
      setLoading(false);
    }
  };

  const matchTransaction = async (paymentId: string, bankTransactionId: string) => {
    if (!reconciliation) return;

    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/banking/reconciliation/${reconciliation.id}/match`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId, bankTransactionId }),
        }
      );

      if (response.ok) {
        setSuccess('Transaction matched successfully');
        loadReconciliation(reconciliation.id);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to match transaction');
      }
    } catch (error) {
      setError('Failed to match transaction');
    }
  };

  const autoMatchAll = async () => {
    if (!reconciliation || matchSuggestions.length === 0) return;

    const highConfidenceMatches = matchSuggestions
      .filter((s) => s.confidenceScore >= 80)
      .map((s) => ({
        paymentId: s.paymentId,
        bankTransactionId: s.bankTransactionId,
      }));

    if (highConfidenceMatches.length === 0) {
      setError('No high-confidence matches found');
      return;
    }

    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/banking/reconciliation/${reconciliation.id}/bulk-match`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matches: highConfidenceMatches }),
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Matched ${data.data.matched} transactions automatically`);
        loadReconciliation(reconciliation.id);
      }
    } catch (error) {
      setError('Failed to auto-match transactions');
    }
  };

  const finalizeReconciliation = async () => {
    if (!reconciliation) return;

    if (!summary?.isBalanced) {
      setError('Cannot finalize: Reconciliation is not balanced');
      return;
    }

    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/banking/reconciliation/${reconciliation.id}/finalize`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Reconciliation finalized successfully');
        loadReconciliation(reconciliation.id);
      } else {
        setError(data.error || 'Failed to finalize');
      }
    } catch (error) {
      setError('Failed to finalize reconciliation');
    }
  };

  // Render reconciliation header
  const renderHeader = () => {
    if (!reconciliation) {
      return (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Start New Reconciliation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Account
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
              >
                <option value="">-- Select Account --</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.bankName} - {account.accountNumber}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statement Date
              </label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statement Balance
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={statementBalance}
                onChange={(e) => setStatementBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={startReconciliation}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Start Reconciliation'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">{reconciliation.bankAccountName}</h2>
            <p className="text-blue-100">
              Statement Date: {new Date(reconciliation.statementDate).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {reconciliation.status === 'FINALIZED' ? (
              <div className="flex items-center px-4 py-2 bg-green-500 rounded-lg">
                <Lock className="h-5 w-5 mr-2" />
                <span className="font-semibold">FINALIZED</span>
              </div>
            ) : (
              <div className="flex items-center px-4 py-2 bg-yellow-500 rounded-lg text-gray-900">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span className="font-semibold">IN PROGRESS</span>
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="text-xs text-blue-100 uppercase">Statement Balance</div>
              <div className="text-2xl font-bold mt-1">
                ${summary.statementBalance.toFixed(2)}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="text-xs text-blue-100 uppercase">Book Balance</div>
              <div className="text-2xl font-bold mt-1">
                ${summary.bookBalance.toFixed(2)}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="text-xs text-blue-100 uppercase">Deposits in Transit</div>
              <div className="text-2xl font-bold mt-1">
                ${summary.depositsInTransit.toFixed(2)}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="text-xs text-blue-100 uppercase">Outstanding Checks</div>
              <div className="text-2xl font-bold mt-1">
                ${summary.outstandingChecks.toFixed(2)}
              </div>
            </div>
            <div className={`bg-white/10 backdrop-blur rounded-lg p-4 ${summary.isBalanced ? 'ring-2 ring-green-400' : 'ring-2 ring-red-400'}`}>
              <div className="text-xs text-blue-100 uppercase">Difference</div>
              <div className={`text-2xl font-bold mt-1 ${summary.isBalanced ? 'text-green-300' : 'text-red-300'}`}>
                ${summary.difference.toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading && reconciliationId) {
    return <div className="p-6">Loading reconciliation...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bank Reconciliation</h1>
        <p className="text-gray-600 mt-1">The Truth Filter - Match your books with actual bank statements</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
          <button onClick={() => setError('')} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <CheckCircle2 className="h-5 w-5 mr-2" />
          <div>{success}</div>
          <button onClick={() => setSuccess('')} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Section */}
      {renderHeader()}

      {/* Split Screen Workspace - Only show if reconciliation exists */}
      {reconciliation && (
        <>
          {/* Action Bar */}
          <div className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={autoMatchAll}
                disabled={matchSuggestions.length === 0 || reconciliation.status === 'FINALIZED'}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Auto-Match ({matchSuggestions.filter((s) => s.confidenceScore >= 80).length})
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={finalizeReconciliation}
                disabled={!summary?.isBalanced || reconciliation.status === 'FINALIZED'}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Lock className="h-4 w-4 mr-2" />
                Finalize & Lock
              </button>
            </div>
          </div>

          {/* Split Screen */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Book Entries (Payments) */}
            <div className="bg-white rounded-lg shadow">
              <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
                <h3 className="text-lg font-bold text-blue-900">Book Entries (ERP)</h3>
                <p className="text-sm text-blue-700">Unreconciled payments: {unreconciledPayments.length}</p>
              </div>
              <div className="p-4 max-h-[600px] overflow-y-auto">
                {unreconciledPayments.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>All payments reconciled!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {unreconciledPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="border border-gray-200 rounded-lg p-3 hover:bg-blue-50 cursor-pointer transition"
                        onClick={() => {
                          const newSet = new Set(selectedPayments);
                          if (newSet.has(payment.id)) {
                            newSet.delete(payment.id);
                          } else {
                            newSet.add(payment.id);
                          }
                          setSelectedPayments(newSet);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{payment.description}</div>
                            <div className="text-sm text-gray-500">
                              {payment.paymentNumber} • {new Date(payment.paymentDate).toLocaleDateString()}
                            </div>
                            {payment.customerName && (
                              <div className="text-xs text-gray-500">Customer: {payment.customerName}</div>
                            )}
                            {payment.vendorName && (
                              <div className="text-xs text-gray-500">Vendor: {payment.vendorName}</div>
                            )}
                          </div>
                          <div className={`text-lg font-bold ${payment.paymentType === 'CUSTOMER_PAYMENT' ? 'text-green-600' : 'text-red-600'}`}>
                            ${Math.abs(payment.amount).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Bank Statement */}
            <div className="bg-white rounded-lg shadow">
              <div className="bg-green-50 border-b border-green-200 px-6 py-4">
                <h3 className="text-lg font-bold text-green-900">Bank Statement</h3>
                <p className="text-sm text-green-700">Unmatched transactions: {unreconciledBankTransactions.length}</p>
              </div>
              <div className="p-4 max-h-[600px] overflow-y-auto">
                {unreconciledBankTransactions.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>All bank transactions matched!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {unreconciledBankTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="border border-gray-200 rounded-lg p-3 hover:bg-green-50 cursor-pointer transition"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{transaction.description}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(transaction.transactionDate).toLocaleDateString()}
                            </div>
                            {transaction.payee && (
                              <div className="text-xs text-gray-500">Payee: {transaction.payee}</div>
                            )}
                            {transaction.referenceNo && (
                              <div className="text-xs text-gray-500">Ref: {transaction.referenceNo}</div>
                            )}
                          </div>
                          <div className={`text-lg font-bold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${Math.abs(transaction.amount).toFixed(2)}
                          </div>
                        </div>
                        
                        {/* Match suggestions for this transaction */}
                        {matchSuggestions
                          .filter((s) => s.bankTransactionId === transaction.id)
                          .map((suggestion) => {
                            const payment = unreconciledPayments.find((p) => p.id === suggestion.paymentId);
                            if (!payment) return null;
                            
                            return (
                              <div key={suggestion.paymentId} className="mt-2 pt-2 border-t border-gray-200">
                                <div className="flex items-center justify-between text-xs">
                                  <div>
                                    <span className="text-purple-600 font-medium">Match: </span>
                                    <span className="text-gray-600">{payment.description}</span>
                                    <span className={`ml-2 px-2 py-1 rounded ${
                                      suggestion.confidenceScore >= 90 ? 'bg-green-100 text-green-800' :
                                      suggestion.confidenceScore >= 80 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {suggestion.confidenceScore}%
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => matchTransaction(payment.id, transaction.id)}
                                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    Match
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
