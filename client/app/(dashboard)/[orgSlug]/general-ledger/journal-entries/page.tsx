'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Trash2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface LedgerEntry {
  accountId: string;
  accountCode: string;
  accountName: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: string;
  description: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
  allowManualJournal: boolean;
}

export default function JournalEntriesPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  
  // Header state
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [journalType, setJournalType] = useState('General');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isReversal, setIsReversal] = useState(false);
  const [reversalDate, setReversalDate] = useState('');
  
  // Lines state
  const [entries, setEntries] = useState<LedgerEntry[]>([
    { accountId: '', accountCode: '', accountName: '', entryType: 'DEBIT', amount: '', description: '' },
    { accountId: '', accountCode: '', accountName: '', entryType: 'CREDIT', amount: '', description: '' },
  ]);
  
  // Data and UI state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRefNumber, setLoadingRefNumber] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    fetchAccounts();
    generateReferenceNumber();
  }, [orgSlug]);

  // Auto-calculate reversal date when toggle is enabled
  useEffect(() => {
    if (isReversal && !reversalDate) {
      const date = new Date(journalDate);
      // Default to first day of next month
      const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      setReversalDate(nextMonth.toISOString().split('T')[0]);
    }
  }, [isReversal, journalDate]);

  const fetchAccounts = async () => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/chart-of-accounts?isActive=true`);
      const data = await response.json();
      
      if (data.success) {
        setAccounts(data.data);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const generateReferenceNumber = async () => {
    setLoadingRefNumber(true);
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/journal-entries/generate-number`);
      const data = await response.json();
      
      if (data.success) {
        setReferenceNumber(data.data.number);
      }
    } catch (error) {
      console.error('Error generating reference number:', error);
    } finally {
      setLoadingRefNumber(false);
    }
  };

  const addEntry = () => {
    setEntries([
      ...entries,
      { accountId: '', accountCode: '', accountName: '', entryType: 'DEBIT', amount: '', description: '' },
    ]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 2) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (index: number, field: keyof LedgerEntry, value: string) => {
    const newEntries = [...entries];
    
    if (field === 'accountId') {
      const account = accounts.find((a) => a.id === value);
      if (account) {
        newEntries[index] = {
          ...newEntries[index],
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
        };
      }
    } else {
      newEntries[index] = { ...newEntries[index], [field]: value };
    }
    
    setEntries(newEntries);
  };

  // Real-time validation
  const validateEntry = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Check for empty accounts
    const emptyAccounts = entries.filter(e => !e.accountId);
    if (emptyAccounts.length > 0) {
      errors.push('All lines must have an account selected');
    }
    
    // Check for empty amounts
    const emptyAmounts = entries.filter(e => !e.amount || parseFloat(e.amount) <= 0);
    if (emptyAmounts.length > 0) {
      errors.push('All amounts must be greater than zero');
    }
    
    // Check for control accounts
    const controlAccounts = entries
      .map(e => accounts.find(a => a.id === e.accountId))
      .filter(a => a && !a.allowManualJournal);
    
    if (controlAccounts.length > 0) {
      errors.push(`Manual entries not allowed for: ${controlAccounts.map(a => a?.code).join(', ')}`);
    }
    
    // Check balance
    if (!isBalanced) {
      errors.push(`Not balanced: Debits (${totalDebits.toFixed(2)}) ≠ Credits (${totalCredits.toFixed(2)})`);
    }
    
    return { valid: errors.length === 0, errors };
  };

  // Calculate totals
  const totalDebits = entries
    .filter((e) => e.entryType === 'DEBIT')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const totalCredits = entries
    .filter((e) => e.entryType === 'CREDIT')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const difference = Math.abs(totalDebits - totalCredits);
  const hasAmounts = totalDebits > 0 || totalCredits > 0;
  const isBalanced = difference < 0.01 && totalDebits > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setValidationErrors([]);
    
    // Run validation
    const validation = validateEntry();
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      setError('Please fix the validation errors below');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/journal-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journalDate,
          referenceNumber,
          journalType,
          description,
          notes,
          isReversal,
          reversalDate: isReversal ? reversalDate : null,
          entries: entries.map((e) => ({
            accountId: e.accountId,
            entryType: e.entryType,
            amount: parseFloat(e.amount),
            description: e.description || description,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create journal entry');
      }

      setSuccess(true);
      
      // Redirect to list after a delay
      setTimeout(() => {
        router.push(`/${orgSlug}/general-ledger/journal-entries/list`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create journal entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Journal Entry</h1>
          <p className="text-gray-600 mt-1">Professional double-entry accounting transaction</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Reference Number</div>
          <div className="text-lg font-mono font-bold text-blue-600">
            {loadingRefNumber ? 'Generating...' : referenceNumber}
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-red-800">{error}</div>
              {validationErrors.length > 0 && (
                <ul className="mt-2 ml-4 list-disc text-sm text-red-700">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          Journal entry created successfully! Redirecting...
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Transaction Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Journal Entry Header</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Journal Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={journalDate}
                onChange={(e) => setJournalDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Journal Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={journalType}
                onChange={(e) => setJournalType(e.target.value)}
              >
                <option value="General">General Journal</option>
                <option value="Adjustment">Adjusting Entry</option>
                <option value="Opening Balance">Opening Balance</option>
                <option value="Depreciation">Depreciation</option>
                <option value="Accrual">Accrual</option>
                <option value="Reversal">Reversal Entry</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference Number
              </label>
              <input
                type="text"
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                value={referenceNumber}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-Reverse Entry
              </label>
              <div className="flex items-center space-x-3 mt-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isReversal}
                    onChange={(e) => setIsReversal(e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable</span>
                </label>
              </div>
            </div>
          </div>
          
          {/* Reversal Date Row */}
          {isReversal && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <RefreshCw className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-blue-900 mb-2">Automatic Reversal Enabled</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2">
                        Reversal Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={reversalDate}
                        onChange={(e) => setReversalDate(e.target.value)}
                      />
                      <p className="text-xs text-blue-600 mt-1">
                        A reversing entry will be automatically created on this date
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Enter transaction description"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Additional notes or memo"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Ledger Entries Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Journal Entry Lines</h2>
              <button
                type="button"
                onClick={addEntry}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Debit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Credit
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {entries.map((entry, index) => {
                    const selectedAccount = accounts.find(a => a.id === entry.accountId);
                    const isControlAccount = selectedAccount && !selectedAccount.allowManualJournal;
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600 font-medium">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            required
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                              isControlAccount ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            value={entry.accountId}
                            onChange={(e) => updateEntry(index, 'accountId', e.target.value)}
                          >
                            <option value="">-- Select Account --</option>
                            {accounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.code} - {account.name}
                                {!account.allowManualJournal && ' 🔒'}
                              </option>
                            ))}
                          </select>
                          {selectedAccount && (
                            <div className="mt-1 text-xs">
                              <span className="text-gray-500">Balance: </span>
                              <span className={`font-medium ${selectedAccount.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {new Intl.NumberFormat('en-UG', { 
                                  style: 'currency', 
                                  currency: 'UGX' 
                                }).format(selectedAccount.balance)}
                              </span>
                            </div>
                          )}
                          {isControlAccount && (
                            <div className="mt-1 text-xs text-red-600 font-medium">
                              ⚠️ Control Account - Manual entry not allowed
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="Line description (optional)"
                            value={entry.description}
                            onChange={(e) => updateEntry(index, 'description', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center space-x-2">
                            <label className="inline-flex items-center">
                              <input
                                type="radio"
                                name={`entryType-${index}`}
                                checked={entry.entryType === 'DEBIT'}
                                onChange={() => updateEntry(index, 'entryType', 'DEBIT')}
                                className="form-radio text-blue-600"
                              />
                              <span className="ml-1 text-sm">DR</span>
                            </label>
                            <label className="inline-flex items-center">
                              <input
                                type="radio"
                                name={`entryType-${index}`}
                                checked={entry.entryType === 'CREDIT'}
                                onChange={() => updateEntry(index, 'entryType', 'CREDIT')}
                                className="form-radio text-green-600"
                              />
                              <span className="ml-1 text-sm">CR</span>
                            </label>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {entry.entryType === 'DEBIT' && (
                            <input
                              type="number"
                              required
                              min="0"
                              step="0.01"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right text-sm font-mono"
                              placeholder="0.00"
                              value={entry.amount}
                              onChange={(e) => updateEntry(index, 'amount', e.target.value)}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {entry.entryType === 'CREDIT' && (
                            <input
                              type="number"
                              required
                              min="0"
                              step="0.01"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right text-sm font-mono"
                              placeholder="0.00"
                              value={entry.amount}
                              onChange={(e) => updateEntry(index, 'amount', e.target.value)}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeEntry(index)}
                            disabled={entries.length <= 2}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
                            title="Remove line"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Footer */}
          <div className="border-t-2 border-gray-300 bg-gray-50 px-6 py-4">
            <div className="flex justify-end items-center space-x-8">
              <div className="text-right">
                <div className="text-xs text-gray-500 uppercase font-medium">Total Debits</div>
                <div className="text-lg font-bold text-blue-900 font-mono">
                  {new Intl.NumberFormat('en-UG', { 
                    style: 'currency', 
                    currency: 'UGX' 
                  }).format(totalDebits)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 uppercase font-medium">Total Credits</div>
                <div className="text-lg font-bold text-green-900 font-mono">
                  {new Intl.NumberFormat('en-UG', { 
                    style: 'currency', 
                    currency: 'UGX' 
                  }).format(totalCredits)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 uppercase font-medium">Difference</div>
                <div className={`text-lg font-bold font-mono ${
                  isBalanced ? 'text-green-600' : 'text-red-600'
                }`}>
                  {new Intl.NumberFormat('en-UG', { 
                    style: 'currency', 
                    currency: 'UGX' 
                  }).format(difference)}
                </div>
              </div>
              <div className="flex items-center">
                {isBalanced ? (
                  <div className="flex items-center px-4 py-2 bg-green-100 border border-green-300 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-sm font-semibold text-green-700">BALANCED</span>
                  </div>
                ) : hasAmounts ? (
                  <div className="flex items-center px-4 py-2 bg-red-100 border border-red-300 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                    <span className="text-sm font-semibold text-red-700">NOT BALANCED</span>
                  </div>
                ) : (
                  <div className="flex items-center px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-sm font-semibold text-gray-600">EMPTY</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

{/* Form Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Note:</span> All journal entries will be posted immediately. 
              Control accounts (AR, AP, Inventory) cannot be edited manually.
            </div>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => router.push(`/${orgSlug}/general-ledger/journal-entries/list`)}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isBalanced || loading || totalDebits === 0}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Post Journal Entry
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
