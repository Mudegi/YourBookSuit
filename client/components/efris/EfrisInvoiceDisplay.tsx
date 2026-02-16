/**
 * EFRIS Invoice Display Component
 * 
 * Displays the complete EFRIS fiscalized invoice with all sections
 */

import React, { useRef } from 'react';
import { Printer, Download } from 'lucide-react';

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
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = invoiceRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>EFRIS Invoice - ${data.fiscal_data?.fdn || 'Invoice'}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; margin: 20px; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .text-lg { font-size: 16px; }
          .text-xs { font-size: 10px; }
          .border-b-2 { border-bottom: 2px solid #1f2937; }
          .pb-3 { padding-bottom: 12px; }
          .mb-4 { margin-bottom: 16px; }
          .mb-2 { margin-bottom: 8px; }
          .grid { display: grid; }
          .grid-cols-2 { grid-template-columns: 1fr 1fr; }
          .gap-6 { gap: 24px; }
          .space-y-4 > * + * { margin-top: 16px; }
          .space-y-1 > * + * { margin-top: 4px; }
          .flex { display: flex; }
          .bg-gray-200 { background-color: #e5e7eb; }
          .bg-gray-100 { background-color: #f3f4f6; }
          .bg-gray-50 { background-color: #f9fafb; }
          .px-2 { padding-left: 8px; padding-right: 8px; }
          .py-1 { padding-top: 4px; padding-bottom: 4px; }
          .p-1 { padding: 4px; }
          .p-2 { padding: 8px; }
          .rounded { border-radius: 4px; }
          .w-20 { width: 80px; }
          .w-24 { width: 96px; }
          .w-8 { width: 32px; }
          .w-12 { width: 48px; }
          .font-mono { font-family: monospace; }
          .text-blue-600 { color: #2563eb; }
          .text-gray-600 { color: #4b5563; }
          .text-gray-500 { color: #6b7280; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #d1d5db; padding: 4px; }
          th { background-color: #f3f4f6; text-align: left; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .border-b { border-bottom: 1px solid #e5e7eb; }
          .border-b-2 { border-bottom: 2px solid #1f2937; }
          .justify-between { justify-content: space-between; }
          .flex-1 { flex: 1; }
          .italic { font-style: italic; }
          .border-t { border-top: 1px solid #e5e7eb; }
          .pt-3 { padding-top: 12px; }
          .mt-4 { margin-top: 16px; }
          .mt-3 { margin-top: 12px; }
          a { color: #2563eb; text-decoration: none; word-break: break-all; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownload = () => {
    handlePrint();
  };

  if (!data) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 text-center ${className}`}>
        <p className="text-gray-500">No EFRIS data available</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Print and Download Buttons */}
      <div className="flex justify-end gap-2 mb-3">
        <button
          onClick={handlePrint}
          className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-xs"
        >
          <Printer className="w-3 h-3" />
          Print
        </button>
        <button
          onClick={handleDownload}
          className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1 text-xs"
        >
          <Download className="w-3 h-3" />
          Download
        </button>
      </div>

      <div ref={invoiceRef} className={`efris-invoice bg-white ${className}`} style={{ maxWidth: '210mm', margin: '0 auto', fontSize: '11px' }}>
        {/* Header */}
        <div className="text-center border-b-2 border-gray-800 pb-3 mb-4">
          <h1 className="text-lg font-bold text-gray-900 mb-1">e-INVOICE/TAX INVOICE</h1>
          <p className="text-xs text-gray-600">EFRIS Fiscalized Invoice</p>
        </div>

      {/* Two-column layout for sections */}
      <div className="grid grid-cols-2 gap-6 mb-4">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Section A: Seller Details */}
          <div>
            <h2 className="font-bold bg-gray-200 px-2 py-1 text-xs mb-2">Section A: Seller's Details</h2>
            <div className="text-xs space-y-1">
              <div className="flex"><span className="font-medium w-20">TIN:</span><span>{data.seller?.tin || 'N/A'}</span></div>
              <div className="flex"><span className="font-medium w-20">Legal Name:</span><span className="flex-1">{data.seller?.legal_name || 'N/A'}</span></div>
              <div className="flex"><span className="font-medium w-20">Trade Name:</span><span className="flex-1">{data.seller?.trade_name || 'N/A'}</span></div>
              <div className="flex"><span className="font-medium w-20">Address:</span><span className="flex-1">{data.seller?.address || 'N/A'}</span></div>
              <div className="flex"><span className="font-medium w-20">Reference:</span><span className="flex-1">{data.seller?.reference_number || 'N/A'}</span></div>
              <div className="flex"><span className="font-medium w-20">Served by:</span><span>{data.seller?.served_by || 'N/A'}</span></div>
            </div>
          </div>

          {/* Section C: Buyer Details */}
          <div>
            <h2 className="font-bold bg-gray-200 px-2 py-1 text-xs mb-2">Section C: Buyer's Details</h2>
            <div className="text-xs space-y-1">
              <div className="flex"><span className="font-medium w-20">Name:</span><span className="flex-1">{data.buyer?.name || 'N/A'}</span></div>
              {data.buyer?.tin && <div className="flex"><span className="font-medium w-20">TIN:</span><span>{data.buyer.tin}</span></div>}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Section B: URA Information */}
          <div>
            <h2 className="font-bold bg-gray-200 px-2 py-1 text-xs mb-2">Section B: URA Information</h2>
            <div className="text-xs space-y-1">
              <div className="flex"><span className="font-medium w-24">Document Type:</span><span>{data.fiscal_data?.document_type || 'N/A'}</span></div>
              <div className="flex"><span className="font-medium w-24">Issued Date:</span><span>{data.fiscal_data?.issued_date || 'N/A'}</span></div>
              <div className="flex"><span className="font-medium w-24">Time:</span><span>{data.fiscal_data?.issued_time || 'N/A'}</span></div>
              <div className="flex"><span className="font-medium w-24">FDN:</span><span className="font-mono font-bold text-blue-600">{data.fiscal_data?.fdn || 'N/A'}</span></div>
              <div className="flex"><span className="font-medium w-24">Verification:</span><span className="font-mono text-xs">{data.fiscal_data?.verification_code || 'N/A'}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Section D: Goods & Services Details - Compact Table */}
      <div className="mb-4">
        <h2 className="font-bold bg-gray-200 px-2 py-1 text-xs mb-2">Section D: Goods & Services Details</h2>
        <table className="w-full text-xs border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 p-1 text-left w-8">No</th>
              <th className="border border-gray-300 p-1 text-left">Item</th>
              <th className="border border-gray-300 p-1 text-center w-12">Qty</th>
              <th className="border border-gray-300 p-1 text-right w-20">Unit Price</th>
              <th className="border border-gray-300 p-1 text-right w-20">Total</th>
              <th className="border border-gray-300 p-1 text-center w-8">Tax</th>
            </tr>
          </thead>
          <tbody>
            {data.items && data.items.length > 0 ? data.items.map((item: any, index: number) => (
              <tr key={index}>
                <td className="border border-gray-300 p-1 text-center">{index + 1}</td>
                <td className="border border-gray-300 p-1">{item.item}</td>
                <td className="border border-gray-300 p-1 text-center">{item.qty}</td>
                <td className="border border-gray-300 p-1 text-right">{Number(item.unitPrice).toLocaleString()}</td>
                <td className="border border-gray-300 p-1 text-right">{Number(item.total).toLocaleString()}</td>
                <td className="border border-gray-300 p-1 text-center">A</td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="border border-gray-300 p-2 text-center text-gray-500">No items</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Section: Tax Details and Summary Side by Side */}
      <div className="grid grid-cols-2 gap-6">
        {/* Section E: Tax Details */}
        <div>
          <h2 className="font-bold bg-gray-200 px-2 py-1 text-xs mb-2">Section E: Tax Details</h2>
          <table className="w-full text-xs border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 p-1 text-left">Category</th>
                <th className="border border-gray-300 p-1 text-right">Net</th>
                <th className="border border-gray-300 p-1 text-right">Tax</th>
                <th className="border border-gray-300 p-1 text-right">Gross</th>
              </tr>
            </thead>
            <tbody>
              {data.tax_details && data.tax_details.length > 0 ? data.tax_details.map((tax: any, index: number) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-1 text-xs">
                    {tax.taxCategoryCode === '01' ? 'A: Standard (18%)' : 
                     tax.taxCategoryCode === '05' ? 'Excise Duty' : tax.taxCategoryCode}
                  </td>
                  <td className="border border-gray-300 p-1 text-right">{Number(tax.netAmount).toLocaleString()}</td>
                  <td className="border border-gray-300 p-1 text-right">{Number(tax.taxAmount).toLocaleString()}</td>
                  <td className="border border-gray-300 p-1 text-right">{Number(tax.grossAmount).toLocaleString()}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="border border-gray-300 p-2 text-center text-gray-500">No tax details</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Section F: Summary */}
        <div>
          <h2 className="font-bold bg-gray-200 px-2 py-1 text-xs mb-2">Section F: Summary</h2>
          <div className="text-xs space-y-1 mb-3">
            <div className="flex justify-between border-b border-gray-200 pb-1">
              <span className="font-medium">Net Amount:</span>
              <span>{data.summary?.net_amount?.toLocaleString() || '0'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-1">
              <span className="font-medium">Tax Amount:</span>
              <span>{data.summary?.tax_amount?.toLocaleString() || '0'}</span>
            </div>
            <div className="flex justify-between border-b-2 border-gray-800 pb-1 mb-2">
              <span className="font-bold">Gross Amount:</span>
              <span className="font-bold">{data.summary?.gross_amount?.toLocaleString() || '0'} {data.summary?.currency || 'UGX'}</span>
            </div>
            <div className="text-xs italic text-gray-600 mb-2">{data.summary?.gross_amount_words || 'Amount in words'}</div>
            
            <div className="bg-gray-50 p-2 rounded space-y-1">
              <div className="flex justify-between">
                <span className="font-medium">Payment Mode:</span>
                <span>{data.summary?.payment_mode || 'Other'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Number of Items:</span>
                <span>{data.summary?.number_of_items || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Currency:</span>
                <span>{data.summary?.currency || 'UGX'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Section - Compact */}
      {data.fiscal_data?.qr_code && (
        <div className="mt-4 text-center border-t pt-3">
          <p className="text-xs text-gray-600 mb-1">Verification URL:</p>
          <a 
            href={data.fiscal_data.qr_code} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-xs break-all"
          >
            {data.fiscal_data.qr_code}
          </a>
        </div>
      )}
      </div>
    </div>
  );
}