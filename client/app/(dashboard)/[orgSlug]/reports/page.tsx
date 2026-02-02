'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ReportCard {
  title: string;
  description: string;
  href: string;
  icon: string;
  category: 'financial' | 'operational' | 'analysis';
  status: 'available' | 'coming-soon';
}

export default function ReportsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const reports: ReportCard[] = [
    {
      title: 'Balance Sheet',
      description: 'Statement of financial position showing assets, liabilities, and equity as of a specific date. Validates the accounting equation.',
      href: `/${orgSlug}/reports/balance-sheet`,
      icon: '⚖️',
      category: 'financial',
      status: 'available',
    },
    {
      title: 'Profit & Loss',
      description: 'Income statement showing revenue, cost of goods sold, expenses, and net income for a period. Includes profitability metrics.',
      href: `/${orgSlug}/reports/profit-loss`,
      icon: '📊',
      category: 'financial',
      status: 'available',
    },
    {
      title: 'Cash Flow Statement',
      description: 'Shows cash inflows and outflows from operating, investing, and financing activities. Reconciles beginning to ending cash.',
      href: `/${orgSlug}/reports/cash-flow`,
      icon: '💵',
      category: 'financial',
      status: 'available',
    },
    {
      title: 'Trial Balance',
      description: 'Lists all accounts with their debit and credit balances. Verifies that total debits equal total credits.',
      href: `/${orgSlug}/reports/trial-balance`,
      icon: '🔢',
      category: 'financial',
      status: 'available',
    },
    {
      title: 'General Ledger',
      description: 'Detailed transaction history for selected accounts with running balances. Filter by account, date range, and transaction type.',
      href: `/${orgSlug}/reports/general-ledger`,
      icon: '📖',
      category: 'operational',
      status: 'available',
    },
    {
      title: 'Aged Receivables',
      description: 'Customer aging report showing outstanding invoices grouped by age: Current, 1-30, 31-60, 61-90, and 90+ days overdue.',
      href: `/${orgSlug}/reports/aged-receivables`,
      icon: '📅',
      category: 'analysis',
      status: 'available',
    },
    {
      title: 'Aged Payables',
      description: 'Vendor aging report showing outstanding bills grouped by age. Helps manage cash flow and payment priorities.',
      href: `/${orgSlug}/reports/aged-payables`,
      icon: '📆',
      category: 'analysis',
      status: 'available',
    },
    {
      title: 'Sales by Customer',
      description: 'Analyze revenue by customer with trends over time. Identify top customers and revenue patterns.',
      href: `/${orgSlug}/reports/sales-by-customer`,
      icon: '👥',
      category: 'analysis',
      status: 'coming-soon',
    },
    {
      title: 'Expenses by Vendor',
      description: 'Analyze expenses by vendor with spending trends. Identify top vendors and cost patterns.',
      href: `/${orgSlug}/reports/expenses-by-vendor`,
      icon: '🏢',
      category: 'analysis',
      status: 'coming-soon',
    },
  ];

  const availableReports = reports.filter(r => r.status === 'available');
  const comingSoonReports = reports.filter(r => r.status === 'coming-soon');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Financial Reports</h1>
        <p className="text-gray-600 mt-1">
          Access comprehensive financial statements and analytical reports
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">
                {availableReports.length}
              </p>
              <p className="text-sm text-gray-600 mt-1">Available Reports</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">4</p>
              <p className="text-sm text-gray-600 mt-1">Financial Statements</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">
                {comingSoonReports.length}
              </p>
              <p className="text-sm text-gray-600 mt-1">Coming Soon</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Reports */}
      <div>
        <h2 className="text-2xl font-bold mb-4">📋 Available Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableReports.map((report) => (
            <Link key={report.href} href={report.href}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer hover:border-blue-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="text-4xl mb-2">{report.icon}</div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        report.category === 'financial'
                          ? 'bg-blue-100 text-blue-700'
                          : report.category === 'operational'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {report.category}
                    </span>
                  </div>
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {report.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-blue-600 text-sm font-medium hover:underline">
                    View Report →
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Coming Soon Reports */}
      {comingSoonReports.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">🚀 Coming Soon</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comingSoonReports.map((report) => (
              <Card
                key={report.href}
                className="h-full opacity-75 hover:opacity-100 transition-opacity"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="text-4xl mb-2 grayscale">{report.icon}</div>
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                      {report.category}
                    </span>
                  </div>
                  <CardTitle className="text-lg text-gray-700">
                    {report.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {report.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-gray-500 text-sm font-medium">
                    Coming Soon
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick Guide */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">📚 Report Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-1">Financial Statements</h4>
            <p className="text-sm text-gray-700">
              Balance Sheet, Profit & Loss, Cash Flow, and Trial Balance provide a
              complete picture of your financial position and performance.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-1">Operational Reports</h4>
            <p className="text-sm text-gray-700">
              General Ledger and transaction reports help you track day-to-day
              accounting activities and audit trails.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-1">Analysis Reports</h4>
            <p className="text-sm text-gray-700">
              Aging reports and analytics help you manage receivables, payables, and
              identify trends in your business.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
