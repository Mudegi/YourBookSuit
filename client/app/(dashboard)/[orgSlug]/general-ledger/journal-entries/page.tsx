'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, Trash2, AlertCircle, CheckCircle, RefreshCw, ArrowLeft,
  Search, Scale, Save, Send, BookOpen, Building, Zap, X, ChevronDown
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { formatCurrency } from '@/lib/utils';

interface LedgerLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: string;
  credit: string;
  description: string;
  branchId: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  accountType: string;
  balance: number;
  allowManualJournal: boolean;
}

interface Branch {
  id: string;
  code: string;
  name: string;
}

let lineCounter = 0;
const newLine = (): LedgerLine => ({
  id: `line-${++lineCounter}`,
  accountId: '', accountCode: '', accountName: '',
  debit: '', credit: '', description: '', branchId: '',
});

export default function JournalEntryFormPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const { organization, currency } = useOrganization();
  const onboardingCheck = useOnboardingGuard();

  // Header
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [journalType, setJournalType] = useState('General');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [branchId, setBranchId] = useState('');
  const [isReversal, setIsReversal] = useState(false);
  const [reversalDate, setReversalDate] = useState('');

  // Lines
  const [lines, setLines] = useState<LedgerLine[]>([newLine(), newLine()]);

  // Data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingRef, setLoadingRef] = useState(false);

  // UI
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [accountSearch, setAccountSearch] = useState<Record<string, string>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const baseCurrency = organization?.baseCurrency || currency || 'UGX';

  useEffect(() => {
    fetchAccounts();
    fetchBranches();
    generateRefNumber();
  }, [orgSlug]);

  useEffect(() => {
    if (isReversal && !reversalDate) {
      const d = new Date(journalDate);
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      setReversalDate(nextMonth.toISOString().split('T')[0]);
    }
  }, [isReversal, journalDate]);

  const fetchAccounts = async () => {
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/chart-of-accounts?isActive=true`);
      const data = await res.json();
      if (data.success && data.data) {
        setAccounts(data.data.map((a: any) => ({
          ...a, balance: Number(a.balance || 0),
        })));
      }
    } catch { /* ignore */ }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/branches`);
      const data = await res.json();
      if (Array.isArray(data)) setBranches(data);
      else if (data.data && Array.isArray(data.data)) setBranches(data.data);
    } catch { /* ignore */ }
  };

  const generateRefNumber = async () => {
    setLoadingRef(true);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/journal-entries/generate-number`);
      const data = await res.json();
      if (data.success) setReferenceNumber(data.data.number);
    } catch { /* ignore */ }
    finally { setLoadingRef(false); }
  };

  // ── Line management ──
  const addLine = () => setLines([...lines, newLine()]);

  const removeLine = (id: string) => {
    if (lines.length <= 2) return;
    setLines(lines.filter(l => l.id !== id));
  };

  const updateLine = (id: string, field: keyof LedgerLine, value: string) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      // If entering debit, clear credit and vice versa
      if (field === 'debit' && value) updated.credit = '';
      if (field === 'credit' && value) updated.debit = '';
      return updated;
    }));
  };

  const selectAccount = (lineId: string, account: Account) => {
    setLines(prev => prev.map(l => {
      if (l.id !== lineId) return l;
      return { ...l, accountId: account.id, accountCode: account.code, accountName: account.name };
    }));
    setOpenDropdown(null);
    setAccountSearch(prev => ({ ...prev, [lineId]: '' }));
  };

  // ── Computations ──
  const totalDebits = useMemo(() =>
    lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0), [lines]);
  const totalCredits = useMemo(() =>
    lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0), [lines]);
  const difference = Math.abs(totalDebits - totalCredits);
  const isBalanced = difference < 0.01 && totalDebits > 0;
  const hasAmounts = totalDebits > 0 || totalCredits > 0;

  // ── Auto-Balance ──
  const autoBalance = () => {
    if (isBalanced || !hasAmounts) return;
    const diff = totalDebits - totalCredits;
    const balanceLine = newLine();
    balanceLine.description = 'Auto-balance adjustment';
    if (diff > 0) {
      balanceLine.credit = diff.toFixed(2);
    } else {
      balanceLine.debit = Math.abs(diff).toFixed(2);
    }
    setLines([...lines, balanceLine]);
  };

  // ── Validation ──
  const validate = (): string[] => {
    const errs: string[] = [];
    const filledLines = lines.filter(l => l.accountId || l.debit || l.credit);
    
    if (filledLines.length < 2) errs.push('At least 2 lines are required');

    for (const line of filledLines) {
      if (!line.accountId) errs.push('All lines must have an account selected');
      if (!line.debit && !line.credit) errs.push('Each line must have a debit or credit amount');
      
      const account = accounts.find(a => a.id === line.accountId);
      if (account && !account.allowManualJournal) {
        errs.push(`Control account ${account.code} - ${account.name} cannot be used in manual journals`);
      }
    }

    const hasDebit = filledLines.some(l => parseFloat(l.debit) > 0);
    const hasCredit = filledLines.some(l => parseFloat(l.credit) > 0);
    if (!hasDebit || !hasCredit) errs.push('Entry must have at least one debit and one credit');

    return [...new Set(errs)];
  };

  // ── Submit ──
  const handleSubmit = async (status: 'DRAFT' | 'POSTED') => {
    setError('');
    setSuccess('');
    setValidationErrors([]);

    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    const filledLines = lines.filter(l => l.accountId && (l.debit || l.credit));

    if (status === 'POSTED') {
      const errs = validate();
      if (!isBalanced) errs.push(`Not balanced: Debits (${totalDebits.toFixed(2)}) ≠ Credits (${totalCredits.toFixed(2)})`);
      if (errs.length > 0) {
        setValidationErrors(errs);
        setError('Please fix validation errors');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/journal-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journalDate,
          referenceNumber,
          journalType,
          description,
          notes,
          branchId: branchId || null,
          status,
          isReversal,
          reversalDate: isReversal ? reversalDate : null,
          entries: filledLines.map(l => ({
            accountId: l.accountId,
            entryType: parseFloat(l.debit) > 0 ? 'DEBIT' : 'CREDIT',
            amount: parseFloat(l.debit) || parseFloat(l.credit) || 0,
            description: l.description || description,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create journal entry');

      setSuccess(status === 'DRAFT' ? 'Saved as draft!' : 'Journal entry posted successfully!');
      setTimeout(() => router.push(`/${orgSlug}/general-ledger/journal-entries/list`), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create journal entry');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter accounts for dropdown
  const getFilteredAccounts = (lineId: string) => {
    const search = (accountSearch[lineId] || '').toLowerCase();
    if (!search) return accounts.filter(a => a.allowManualJournal);
    return accounts.filter(a =>
      a.allowManualJournal &&
      (a.code.toLowerCase().includes(search) ||
       a.name.toLowerCase().includes(search) ||
       a.accountType.toLowerCase().includes(search))
    );
  };

  if (onboardingCheck.loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" onClick={() => setOpenDropdown(null)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/${orgSlug}/general-ledger/journal-entries/list`}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-500 dark:text-gray-400">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              New Journal Entry
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Double-entry accounting transaction</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Reference</div>
          <div className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">
            {loadingRef ? '...' : referenceNumber}
          </div>
        </div>
      </div>

      {/* Error / Success */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-800 dark:text-red-300">{error}</p>
              {validationErrors.length > 0 && (
                <ul className="mt-2 ml-4 list-disc text-sm text-red-700 dark:text-red-400 space-y-1">
                  {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
            <button onClick={() => { setError(''); setValidationErrors([]); }}
              className="text-red-500 hover:text-red-700"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <span className="text-green-800 dark:text-green-300 font-medium">{success}</span>
        </div>
      )}

      {/* ── Journal Header ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Journal Header</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Journal Date <span className="text-red-500">*</span>
            </label>
            <input type="date" required
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              value={journalDate} onChange={(e) => setJournalDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Journal Type <span className="text-red-500">*</span>
            </label>
            <select className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              value={journalType} onChange={(e) => setJournalType(e.target.value)}>
              <option value="General">General Journal</option>
              <option value="Adjustment">Adjusting Entry</option>
              <option value="Opening Balance">Opening Balance</option>
              <option value="Depreciation">Depreciation</option>
              <option value="Accrual">Accrual</option>
              <option value="Reversal">Reversal Entry</option>
              <option value="Payroll">Payroll Entry</option>
              <option value="Inter-Branch">Inter-Branch Transfer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Reference Number</label>
            <input type="text" readOnly
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-700 dark:text-gray-300 font-mono text-sm"
              value={referenceNumber} />
          </div>
          {branches.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <Building className="h-3.5 w-3.5 inline mr-1" />Branch
              </label>
              <select className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="">-- No Branch --</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.code} - {b.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <input type="text" required placeholder="Enter transaction description..."
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
              value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Notes <span className="text-gray-400 dark:text-gray-500">(optional)</span>
            </label>
            <textarea rows={2} placeholder="Additional notes or memo..."
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        {/* Auto-Reverse Toggle */}
        <div className="mt-4 flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isReversal} onChange={(e) => setIsReversal(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Schedule auto-reversal</span>
          </label>
          {isReversal && (
            <input type="date" required
              className="px-3 py-1.5 border border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 text-sm focus:ring-2 focus:ring-blue-500"
              value={reversalDate} onChange={(e) => setReversalDate(e.target.value)} />
          )}
        </div>
      </div>

      {/* ── Balanced Grid ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Journal Entry Lines
          </h2>
          <div className="flex items-center gap-2">
            {!isBalanced && hasAmounts && (
              <button onClick={autoBalance} type="button"
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 text-sm font-medium transition">
                <Zap className="h-4 w-4" /> Auto-Balance
              </button>
            )}
            <button onClick={addLine} type="button"
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition">
              <Plus className="h-4 w-4" /> Add Line
            </button>
          </div>
        </div>

        <div className="overflow-visible">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-10">#</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase min-w-[280px]">Account</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase min-w-[180px]">Description</th>
                {branches.length > 0 && (
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase min-w-[120px]">Branch</th>
                )}
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase min-w-[140px]">Debit</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase min-w-[140px]">Credit</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {lines.map((line, idx) => {
                const selectedAccount = accounts.find(a => a.id === line.accountId);
                const isControl = selectedAccount && !selectedAccount.allowManualJournal;
                const filtered = getFilteredAccounts(line.id);
                const isDropdownOpen = openDropdown === line.id;

                return (
                  <tr key={line.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                    <td className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400 font-medium text-center">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2.5 relative">
                      {/* Account Selector with Search */}
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <div
                          className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition ${
                            isControl
                              ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                          } ${isDropdownOpen ? 'ring-2 ring-blue-500' : ''}`}
                          onClick={() => setOpenDropdown(isDropdownOpen ? null : line.id)}
                        >
                          {line.accountId ? (
                            <div className="flex-1 min-w-0">
                              <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{line.accountCode}</span>
                              <span className="mx-1 text-gray-900 dark:text-white text-sm truncate"> {line.accountName}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-sm flex-1">Select account...</span>
                          )}
                          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        </div>

                        {isDropdownOpen && (
                          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-64 overflow-hidden">
                            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                              <div className="relative">
                                <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                  type="text"
                                  placeholder="Search accounts..."
                                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                                  value={accountSearch[line.id] || ''}
                                  onChange={(e) => setAccountSearch(prev => ({ ...prev, [line.id]: e.target.value }))}
                                  onClick={(e) => e.stopPropagation()}
                                  autoFocus
                                />
                              </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {filtered.length === 0 ? (
                                <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">No accounts found</div>
                              ) : (
                                filtered.map(a => (
                                  <button key={a.id} type="button"
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 transition ${
                                      line.accountId === a.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                                    }`}
                                    onClick={(e) => { e.stopPropagation(); selectAccount(line.id, a); }}>
                                    <div className="flex items-center justify-between">
                                      <span>
                                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400 mr-1">{a.code}</span>
                                        <span className="text-gray-900 dark:text-white">{a.name}</span>
                                      </span>
                                      <span className="text-xs text-gray-400 dark:text-gray-500">{a.accountType}</span>
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {isControl && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">Control account — manual entry not allowed</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <input type="text" placeholder="Line memo"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                        value={line.description} onChange={(e) => updateLine(line.id, 'description', e.target.value)} />
                    </td>
                    {branches.length > 0 && (
                      <td className="px-3 py-2.5">
                        <select
                          className="w-full px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                          value={line.branchId} onChange={(e) => updateLine(line.id, 'branchId', e.target.value)}>
                          <option value="">—</option>
                          {branches.map(b => <option key={b.id} value={b.id}>{b.code}</option>)}
                        </select>
                      </td>
                    )}
                    <td className="px-3 py-2.5">
                      <input type="number" min="0" step="0.01" placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right text-sm font-mono placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                        value={line.debit}
                        onChange={(e) => updateLine(line.id, 'debit', e.target.value)}
                        onFocus={() => { if (line.credit) updateLine(line.id, 'credit', ''); }} />
                    </td>
                    <td className="px-3 py-2.5">
                      <input type="number" min="0" step="0.01" placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right text-sm font-mono placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                        value={line.credit}
                        onChange={(e) => updateLine(line.id, 'credit', e.target.value)}
                        onFocus={() => { if (line.debit) updateLine(line.id, 'debit', ''); }} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button type="button" onClick={() => removeLine(line.id)}
                        disabled={lines.length <= 2}
                        className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Totals Footer ── */}
        <div className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 sm:gap-8">
            <div className="text-right">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Total Debits</div>
              <div className="text-xl font-bold text-blue-900 dark:text-blue-300 font-mono">
                {formatCurrency(totalDebits, baseCurrency)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Total Credits</div>
              <div className="text-xl font-bold text-green-900 dark:text-green-300 font-mono">
                {formatCurrency(totalCredits, baseCurrency)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Difference</div>
              <div className={`text-xl font-bold font-mono ${isBalanced ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(difference, baseCurrency)}
              </div>
            </div>
            <div>
              {isBalanced ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-700 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-semibold text-green-700 dark:text-green-300">BALANCED</span>
                </div>
              ) : hasAmounts ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-semibold text-red-700 dark:text-red-300">NOT BALANCED</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">EMPTY</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p><strong>Draft:</strong> Save without posting — no COA balance changes. Edit freely.</p>
            <p><strong>Post:</strong> Permanently write to the ledger. Debits must equal Credits. Immutable after posting.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/${orgSlug}/general-ledger/journal-entries/list`}
              className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition">
              Cancel
            </Link>
            <button type="button" onClick={() => handleSubmit('DRAFT')} disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 font-medium transition disabled:opacity-50">
              {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Draft
            </button>
            <button type="button" onClick={() => handleSubmit('POSTED')}
              disabled={!isBalanced || submitting || totalDebits === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Post Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
