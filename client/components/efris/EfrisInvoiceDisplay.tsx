/**
 * EFRIS Invoice Display Component
 * 
 * Displays the complete EFRIS fiscalized invoice with all sections
 */

import React from 'react';

interface EfrisInvoiceData {
  seller: {
    tin: string;
    legal_name: string;
    trade_name: string;
    address: string;
    reference_number: string;
    served_by: string;
  };
  fiscal_data: {
    document_type: string;
    issued_date: string;
    issued_time: string;
    device_number: string;
    fdn: string;
    verification_code: string;
  };
  buyer: {
    name: string;
    tin?: string;
  };
  items: Array<{
    item: string;
    qty: string;
    unitPrice: string;
    total: string;
    taxRate: string;
  }>;
  tax_details: Array<{
    taxCategoryCode: string;
    netAmount: string;
    taxAmount: string;
    grossAmount: string;
  }>;
  summary: {
    net_amount: number;
    tax_amount: number;
    gross_amount: number;
    gross_amount_words: string;
    payment_mode: string;
    total_amount: number;
    currency: string;
    number_of_items: number;
    mode: string;
  };
}

interface EfrisInvoiceDisplayProps {
  data?: EfrisInvoiceData | any;
  className?: string;
}

export default function EfrisInvoiceDisplay({ data, className = '' }: EfrisInvoiceDisplayProps) {
  if (!data) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 text-center ${className}`}>
        <p className="text-gray-500">No EFRIS data available</p>
      </div>
    );
  }

  return (
    <div className={`fiscal-invoice p-6 bg-white border rounded-lg ${className}`}>
      {/* Header */}
      <div className="text-center border-b pb-4 mb-6">
        <h1 className="text-xl font-bold text-gray-900">e-INVOICE/TAX INVOICE</h1>
        <p className="text-sm text-gray-600 mt-1">EFRIS Fiscalized Invoice</p>
      </div>

      {/* Section A: Seller Details */}
      <section className="mb-6">
        <h2 className="font-bold bg-gray-200 px-3 py-2 text-gray-900 rounded">Section A: Seller's Details</h2>
        <table className="w-full text-sm mt-2">
          <tbody>
            <tr className="border-b">
              <td className="font-medium w-1/3 py-2 text-gray-700">TIN:</td>
              <td className="py-2">{data.seller?.tin || 'N/A'}</td>
            </tr>
            <tr className="border-b">
              <td className="font-medium py-2 text-gray-700">Legal Name:</td>
              <td className="py-2">{data.seller?.legal_name || 'N/A'}</td>
            </tr>
            <tr className="border-b">
              <td className="font-medium py-2 text-gray-700">Trade Name:</td>
              <td className="py-2">{data.seller?.trade_name || 'N/A'}</td>
            </tr>
            <tr className="border-b">
              <td className="font-medium py-2 text-gray-700">Address:</td>
              <td className="py-2">{data.seller?.address || 'N/A'}</td>
            </tr>
            <tr className="border-b">
              <td className="font-medium py-2 text-gray-700">Reference:</td>
              <td className="py-2">{data.seller?.reference_number || 'N/A'}</td>
            </tr>
            <tr>
              <td className="font-medium py-2 text-gray-700">Served by:</td>
              <td className="py-2">{data.seller?.served_by || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Section B: URA Information */}
      <section className="mb-6">
        <h2 className="font-bold bg-gray-200 px-3 py-2 text-gray-900 rounded">Section B: URA Information</h2>
        <table className="w-full text-sm mt-2">
          <tbody>
            <tr className="border-b">
              <td className="font-medium w-1/3 py-2 text-gray-700">Document Type:</td>
              <td className="py-2">{data.fiscal_data?.document_type || 'N/A'}</td>
            </tr>
            <tr className="border-b">
              <td className="font-medium py-2 text-gray-700">Issued Date:</td>
              <td className="py-2">{data.fiscal_data?.issued_date || 'N/A'}</td>
            </tr>
            <tr className="border-b">
              <td className="font-medium py-2 text-gray-700">Time:</td>
              <td className="py-2">{data.fiscal_data?.issued_time || 'N/A'}</td>
            </tr>
            <tr className="border-b">
              <td className="font-medium py-2 text-gray-700">FDN:</td>
              <td className="py-2 font-mono font-bold">{data.fiscal_data?.fdn || 'N/A'}</td>
            </tr>
            <tr>
              <td className="font-medium py-2 text-gray-700">Verification:</td>
              <td className="py-2 text-xs font-mono">{data.fiscal_data?.verification_code || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Section C: Buyer Details */}
      <section className="mb-6">
        <h2 className="font-bold bg-gray-200 px-3 py-2 text-gray-900 rounded">Section C: Buyer's Details</h2>
        <table className="w-full text-sm mt-2">
          <tbody>
            <tr className="border-b">
              <td className="font-medium w-1/3 py-2 text-gray-700">Name:</td>
              <td className="py-2">{data.buyer?.name || 'N/A'}</td>
            </tr>
            {data.buyer?.tin && (
              <tr>
                <td className="font-medium py-2 text-gray-700">TIN:</td>
                <td className="py-2">{data.buyer.tin}</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Section D: Goods & Services Details */}
      <section className="mb-6">
        <h2 className="font-bold bg-gray-200 px-3 py-2 text-gray-900 rounded">Section D: Goods & Services Details</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">No</th>
                <th className="border border-gray-300 p-2 text-left">Item</th>
                <th className="border border-gray-300 p-2 text-right">Qty</th>
                <th className="border border-gray-300 p-2 text-right">Unit Price</th>
                <th className="border border-gray-300 p-2 text-right">Total</th>
                <th className="border border-gray-300 p-2 text-center">Tax</th>
              </tr>
            </thead>
            <tbody>
              {data.items && data.items.length > 0 ? data.items.map((item: any, index: number) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-2">{index + 1}</td>
                  <td className="border border-gray-300 p-2">{item.item}</td>
                  <td className="border border-gray-300 p-2 text-right">{item.qty}</td>
                  <td className="border border-gray-300 p-2 text-right">{Number(item.unitPrice).toLocaleString()}</td>
                  <td className="border border-gray-300 p-2 text-right">{Number(item.total).toLocaleString()}</td>
                  <td className="border border-gray-300 p-2 text-center">A</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="border border-gray-300 p-4 text-center text-gray-500">No items</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section E: Tax Details */}
      <section className="mb-6">
        <h2 className="font-bold bg-gray-200 px-3 py-2 text-gray-900 rounded">Section E: Tax Details</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">Category</th>
                <th className="border border-gray-300 p-2 text-right">Net</th>
                <th className="border border-gray-300 p-2 text-right">Tax</th>
                <th className="border border-gray-300 p-2 text-right">Gross</th>
              </tr>
            </thead>
            <tbody>
              {data.tax_details && data.tax_details.length > 0 ? data.tax_details.map((tax: any, index: number) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-2">
                    {tax.taxCategoryCode === '01' ? 'A: Standard (18%)' : 
                     tax.taxCategoryCode === '05' ? 'Excise Duty' : tax.taxCategoryCode}
                  </td>
                  <td className="border border-gray-300 p-2 text-right">{Number(tax.netAmount).toLocaleString()}</td>
                  <td className="border border-gray-300 p-2 text-right">{Number(tax.taxAmount).toLocaleString()}</td>
                  <td className="border border-gray-300 p-2 text-right">{Number(tax.grossAmount).toLocaleString()}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="border border-gray-300 p-4 text-center text-gray-500">No tax details</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section F: Summary */}
      <section className="mb-6">
        <h2 className="font-bold bg-gray-200 px-3 py-2 text-gray-900 rounded">Section F: Summary</h2>
        <table className="w-full text-sm mt-2">
          <tbody>
            <tr className="border-b">
              <td className="font-medium w-1/3 py-2 text-gray-700">Net Amount:</td>
              <td className="py-2 text-right">{data.summary?.net_amount?.toLocaleString() || '0'}</td>
            </tr>
            <tr className="border-b">
              <td className="font-medium py-2 text-gray-700">Tax Amount:</td>
              <td className="py-2 text-right">{data.summary?.tax_amount?.toLocaleString() || '0'}</td>
            </tr>
            <tr className="border-b">
              <td className="font-medium py-2 text-gray-700">Gross Amount:</td>
              <td className="py-2 text-right font-bold">{data.summary?.gross_amount?.toLocaleString() || '0'} {data.summary?.currency || 'UGX'}</td>
            </tr>
            <tr className="border-b">
              <td colSpan={2} className="py-2 italic text-sm text-gray-600">{data.summary?.gross_amount_words || 'Amount in words'}</td>
            </tr>
            <tr className="border-b">
              <td className="font-medium py-2 text-gray-700">Payment Mode:</td>
              <td className="py-2">{data.summary?.payment_mode || 'Other'}</td>
            </tr>
            <tr>
              <td className="font-medium py-2 text-gray-700">Number of Items:</td>
              <td className="py-2">{data.summary?.number_of_items || '0'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* QR Code Section */}
      {data.fiscal_data?.qr_code && (
        <section className="bg-gray-50 p-4 rounded text-center">
          <p className="text-sm text-gray-600 mb-2">Scan to verify:</p>
          <a 
            href={data.fiscal_data.qr_code} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm break-all"
          >
            {data.fiscal_data.qr_code}
          </a>
        </section>
      )}
    </div>
  );
}