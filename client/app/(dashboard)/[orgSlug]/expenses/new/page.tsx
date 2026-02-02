'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Plus,
  Trash2,
  Upload,
  Camera,
  DollarSign,
  Calendar,
  User,
  Wallet,
  Receipt,
  Tags,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  ArrowLeft,
  Smartphone,
} from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';

interface ExpenseLine {
  id: string;
  categoryId: string;
  categoryName?: string;
  description: string;
  amount: string;
  taxInclusive: boolean;
  taxRateId?: string;
  projectId?: string;
  costCenterId?: string;
}

export default function ExpenseTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;
  const { organization } = useOrganization();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [payeeType, setPayeeType] = useState<'VENDOR' | 'ONETIME'>('ONETIME');
  const [payeeVendorId, setPayeeVendorId] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'PETTY_CASH' | 'DIRECTORS_LOAN'>('CASH');
  const [mobileMoneyTransactionId, setMobileMoneyTransactionId] = useState('');
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState('');
  const [isReimbursement, setIsReimbursement] = useState(false);
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // Expense lines
  const [lines, setLines] = useState<ExpenseLine[]>([
    { id: '1', categoryId: '', description: '', amount: '', taxInclusive: true },
  ]);

  // Data
  const [vendors, setVendors] = useState<any[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [taxRates, setTaxRates] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, [orgSlug]);

  useEffect(() => {
    // Load suggestions when vendor changes
    if (payeeType === 'VENDOR' && payeeVendorId) {
      loadSuggestions(payeeVendorId);
    } else if (payeeType === 'ONETIME' && payeeName.length > 2) {
      loadSuggestions(undefined, payeeName);
    }
  }, [payeeVendorId, payeeName]);

  const loadData = async () => {
    try {
      const [vendorsRes, accountsRes, categoriesRes, taxRatesRes, projectsRes, costCentersRes] = await Promise.all([
        fetch(`/api/orgs/${orgSlug}/vendors`),
        fetch(`/api/orgs/${orgSlug}/bank-accounts`),
        fetch(`/api/orgs/${orgSlug}/chart-of-accounts?type=EXPENSE`),
        fetch(`/api/${orgSlug}/tax-rates`),
        fetch(`/api/${orgSlug}/projects`),
        fetch(`/api/${orgSlug}/cost-centers`),
      ]);

      const [vendorsData, accountsData, categoriesData, taxRatesData, projectsData, costCentersData] = await Promise.all([
        vendorsRes.json(),
        accountsRes.json(),
        categoriesRes.json(),
        taxRatesRes.json(),
        projectsRes.json(),
        costCentersRes.json(),
      ]);

      setVendors(vendorsData.vendors || vendorsData.data || []);
      setPaymentAccounts(accountsData.bankAccounts || accountsData.data || []);
      setExpenseCategories(categoriesData.accounts || categoriesData.data || []);
      setTaxRates(taxRatesData.taxRates || taxRatesData.data || []);
      setProjects(projectsData.projects || projectsData.data || []);
      setCostCenters(costCentersData.costCenters || costCentersData.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load form data');
    }
  };

  const loadSuggestions = async (vendorId?: string, vendorName?: string) => {
    try {
      const params = new URLSearchParams();
      if (vendorId) params.append('vendorId', vendorId);
      if (vendorName) params.append('vendorName', vendorName);

      const response = await fetch(`/api/orgs/${orgSlug}/expenses/suggestions?${params}`);
      const data = await response.json();

      if (data.success) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const addLine = () => {
    const newLine: ExpenseLine = {
      id: Date.now().toString(),
      categoryId: '',
      description: '',
      amount: '',
      taxInclusive: true,
    };
    setLines([...lines, newLine]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter((line) => line.id !== id));
    }
  };

  const updateLine = (id: string, field: keyof ExpenseLine, value: any) => {
    setLines(
      lines.map((line) => {
        if (line.id === id) {
          const updated = { ...line, [field]: value };
          
          // Auto-fill category name
          if (field === 'categoryId') {
            const category = expenseCategories.find((c) => c.id === value);
            if (category) {
              updated.categoryName = category.accountName;
            }
          }
          
          return updated;
        }
        return line;
      })
    );
  };

  const applySuggestion = (lineId: string, suggestion: any) => {
    updateLine(lineId, 'categoryId', suggestion.categoryId);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateTotal = () => {
    return lines.reduce((sum, line) => {
      const amount = parseFloat(line.amount) || 0;
      return sum + amount;
    }, 0);
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    // Validation
    if (!paymentAccountId) {
      setError('Please select a payment account');
      return;
    }

    if (payeeType === 'VENDOR' && !payeeVendorId) {
      setError('Please select a vendor');
      return;
    }

    if (payeeType === 'ONETIME' && !payeeName) {
      setError('Please enter payee name');
      return;
    }

    if (paymentMethod === 'MOBILE_MONEY' && !mobileMoneyTransactionId) {
      setError('Mobile Money transaction ID is required');
      return;
    }

    const validLines = lines.filter((line) => line.categoryId && line.amount);
    if (validLines.length === 0) {
      setError('Please add at least one expense line');
      return;
    }

    setLoading(true);

    try {
      // Upload receipt if present
      let receiptAttachmentId: string | undefined;
      if (receiptFile) {
        const formData = new FormData();
        formData.append('file', receiptFile);
        formData.append('type', 'RECEIPT');

        const uploadRes = await fetch(`/api/orgs/${orgSlug}/attachments`, {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          receiptAttachmentId = uploadData.attachmentId;
        }
      }

      // Create expense
      const response = await fetch(`/api/orgs/${orgSlug}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseDate: new Date(expenseDate),
          payeeVendorId: payeeType === 'VENDOR' ? payeeVendorId : undefined,
          payeeName: payeeType === 'ONETIME' ? payeeName : undefined,
          paymentAccountId,
          paymentMethod,
          mobileMoneyTransactionId: paymentMethod === 'MOBILE_MONEY' ? mobileMoneyTransactionId : undefined,
          mobileMoneyProvider: paymentMethod === 'MOBILE_MONEY' ? mobileMoneyProvider : undefined,
          isReimbursement,
          currency: organization?.baseCurrency,
          lines: validLines.map((line) => ({
            categoryId: line.categoryId,
            description: line.description,
            amount: parseFloat(line.amount),
            taxInclusive: line.taxInclusive,
            taxRateId: line.taxRateId,
            projectId: line.projectId,
            costCenterId: line.costCenterId,
          })),
          receiptAttachmentId,
          notes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Expense ${data.expenseId} recorded successfully!`);
        
        // Reset form
        setTimeout(() => {
          router.push(`/${orgSlug}/expenses`);
        }, 2000);
      } else {
        setError(data.error || 'Failed to create expense');
      }
    } catch (error: any) {
      console.error('Error creating expense:', error);
      setError(error.message || 'Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  const total = calculateTotal();
  const currency = organization?.baseCurrency || 'USD';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push(`/${orgSlug}/expenses`)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Record Expense</h1>
            <p className="text-gray-600 mt-1">Track operational expenditure (OPEX) with receipt attachment</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Total Amount</div>
          <div className="text-2xl font-bold text-gray-900">
            {currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError('')} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <CheckCircle2 className="h-5 w-5 mr-2" />
          <div>{success}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Details Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Wallet className="h-5 w-5 mr-2" />
              Payment Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expense Date
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                >
                  <option value="CASH">Cash</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="PETTY_CASH">Petty Cash</option>
                  <option value="DIRECTORS_LOAN">Directors Loan</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Account
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                >
                  <option value="">-- Select Payment Account --</option>
                  {paymentAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountName} - {account.bankName} ({account.currency})
                    </option>
                  ))}
                </select>
              </div>

              {paymentMethod === 'MOBILE_MONEY' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Smartphone className="h-4 w-4 mr-1" />
                      Mobile Money Provider
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      value={mobileMoneyProvider}
                      onChange={(e) => setMobileMoneyProvider(e.target.value)}
                      placeholder="e.g., MTN, Airtel, M-Pesa"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transaction ID *
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      value={mobileMoneyTransactionId}
                      onChange={(e) => setMobileMoneyTransactionId(e.target.value)}
                      placeholder="MM12345678"
                      required
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payee Details Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Payee Details
            </h2>

            <div className="space-y-4">
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    className="mr-2"
                    checked={payeeType === 'VENDOR'}
                    onChange={() => setPayeeType('VENDOR')}
                  />
                  Registered Vendor
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    className="mr-2"
                    checked={payeeType === 'ONETIME'}
                    onChange={() => setPayeeType('ONETIME')}
                  />
                  One-Time Payee
                </label>
              </div>

              {payeeType === 'VENDOR' ? (
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  value={payeeVendorId}
                  onChange={(e) => setPayeeVendorId(e.target.value)}
                >
                  <option value="">-- Select Vendor --</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  placeholder="Enter payee name"
                />
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="reimbursement"
                  className="mr-2"
                  checked={isReimbursement}
                  onChange={(e) => setIsReimbursement(e.target.checked)}
                />
                <label htmlFor="reimbursement" className="text-sm text-gray-700">
                  I paid for this personally (create reimbursement claim)
                </label>
              </div>
            </div>
          </div>

          {/* Expense Lines Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center">
                <Tags className="h-5 w-5 mr-2" />
                Expense Items
              </h2>
              <button
                onClick={addLine}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center text-sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Line
              </button>
            </div>

            <div className="space-y-4">
              {lines.map((line, index) => (
                <div key={line.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-medium text-gray-600">Item #{index + 1}</span>
                    {lines.length > 1 && (
                      <button
                        onClick={() => removeLine(line.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category (Expense Account)
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={line.categoryId}
                        onChange={(e) => updateLine(line.id, 'categoryId', e.target.value)}
                      >
                        <option value="">-- Select Category --</option>
                        {expenseCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.code} - {category.name}
                          </option>
                        ))}
                      </select>

                      {/* Show suggestions */}
                      {suggestions.length > 0 && !line.categoryId && (
                        <div className="mt-2 text-sm">
                          <span className="text-gray-600">Suggestions: </span>
                          {suggestions.slice(0, 3).map((sug) => (
                            <button
                              key={sug.categoryId}
                              onClick={() => applySuggestion(line.id, sug)}
                              className="text-blue-600 hover:text-blue-700 mr-2"
                            >
                              {sug.categoryName}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={line.description}
                        onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                        placeholder="Describe this expense"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount ({currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={line.amount}
                        onChange={(e) => updateLine(line.id, 'amount', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Treatment
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={line.taxInclusive ? 'inclusive' : 'exclusive'}
                        onChange={(e) => updateLine(line.id, 'taxInclusive', e.target.value === 'inclusive')}
                      >
                        <option value="inclusive">Tax Inclusive</option>
                        <option value="exclusive">Tax Exclusive</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Rate (Optional)
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={line.taxRateId || ''}
                        onChange={(e) => updateLine(line.id, 'taxRateId', e.target.value || undefined)}
                      >
                        <option value="">No Tax</option>
                        {taxRates.map((rate) => (
                          <option key={rate.id} value={rate.id}>
                            {rate.name} ({rate.rate}%)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Project (Optional)
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={line.projectId || ''}
                        onChange={(e) => updateLine(line.id, 'projectId', e.target.value || undefined)}
                      >
                        <option value="">No Project</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional information..."
            />
          </div>
        </div>

        {/* Sidebar - Receipt Upload */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6 sticky top-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Receipt className="h-5 w-5 mr-2" />
              Receipt Attachment
            </h2>

            <div className="space-y-4">
              {receiptPreview ? (
                <div className="relative">
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="w-full rounded-lg border border-gray-300"
                  />
                  <button
                    onClick={() => {
                      setReceiptFile(null);
                      setReceiptPreview(null);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex justify-center space-x-2">
                      <Upload className="h-8 w-8 text-gray-400" />
                      <Camera className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Click to upload or take photo
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG, PDF up to 10MB
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded p-3">
                <strong>Audit Tip:</strong> Always attach receipts for tax compliance and audit readiness.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Recording Expense...' : 'Record Expense'}
              </button>
              <button
                onClick={() => router.push(`/${orgSlug}/expenses`)}
                className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
