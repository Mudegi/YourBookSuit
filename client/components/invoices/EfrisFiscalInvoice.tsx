'use client';

import React, { useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';

interface EfrisFiscalInvoiceProps {
  fiscalData: any; // The complete EFRIS response from API
  onClose?: () => void;
}

export function EfrisFiscalInvoice({ fiscalData, onClose }: EfrisFiscalInvoiceProps) {
  // Debug: Log the fiscal data structure
  useEffect(() => {
    console.log('[EFRIS Display] Full fiscal data received:', fiscalData);
    console.log('[EFRIS Display] FDN access paths:', {
      'fiscalData.fdn': fiscalData?.fdn,
      'fiscalData.fiscal_data?.fdn': fiscalData?.fiscal_data?.fdn,
      'fiscalData.fiscal_data?.fiscalDocumentNumber': fiscalData?.fiscal_data?.fiscalDocumentNumber,
    });
    console.log('[EFRIS Display] Verification Code access paths:', {
      'fiscalData.verification_code': fiscalData?.verification_code,
      'fiscalData.fiscal_data?.verification_code': fiscalData?.fiscal_data?.verification_code,
      'fiscalData.fiscal_data?.verificationCode': fiscalData?.fiscal_data?.verificationCode,
    });
  }, [fiscalData]);

  const printInvoice = () => {
    window.print();
  };

  // Extract FDN from multiple possible locations
  const fdn = fiscalData?.fdn || 
              fiscalData?.fiscal_data?.fdn || 
              fiscalData?.fiscal_data?.fiscalDocumentNumber ||
              fiscalData?.fiscal_data?.FDN ||
              '';

  // Extract Verification Code from multiple possible locations  
  const verificationCode = fiscalData?.verification_code || 
                           fiscalData?.fiscal_data?.verification_code ||
                           fiscalData?.fiscal_data?.verificationCode ||
                           fiscalData?.fiscal_data?.code ||
                           '';

  // Extract QR Code
  const qrCode = fiscalData?.qr_code ||
                 fiscalData?.fiscal_data?.qr_code ||
                 fiscalData?.fiscal_data?.qrCode ||
                 '';

  // Extract device number
  const deviceNumber = fiscalData?.fiscal_data?.device_number ||
                       fiscalData?.fiscal_data?.deviceNumber ||
                       '';

  console.log('[EFRIS Display] Extracted values:', {
    fdn,
    verificationCode,
    qrCode,
    deviceNumber,
  });

  return (
    <div className="efris-fiscal-invoice bg-white">
      {/* Action Buttons (hide on print) */}
      <div className="no-print sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
        <h2 className="text-xl font-semibold">EFRIS Fiscal Invoice</h2>
        <div className="flex gap-3">
          <button
            onClick={printInvoice}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Print Invoice
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Invoice Content - Receipt Style */}
      <div className="invoice-content max-w-2xl mx-auto p-4 bg-white">
        <div className="border border-gray-300 shadow-lg">
          {/* Header - Compact */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-center py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="text-xs">EFRIS</div>
              <h1 className="text-lg font-bold">e-INVOICE/TAX INVOICE</h1>
              <div className="text-xs">1/1</div>
            </div>
          </div>

          {/* Section A: Seller's Details */}
          <div className="border-b border-gray-300">
            <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200">
              <h2 className="text-xs font-semibold text-gray-700">Section A: Seller's Details</h2>
            </div>
            <div className="px-3 py-2 text-xs space-y-0.5">
              <div className="flex">
                <span className="font-medium w-28 text-gray-600">TIN:</span>
                <span className="flex-1">{fiscalData?.seller?.tin || 'N/A'}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-28 text-gray-600">Legal Name:</span>
                <span className="flex-1 uppercase text-gray-800">{fiscalData?.seller?.legal_name || 'N/A'}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-28 text-gray-600">Trade Name:</span>
                <span className="flex-1 uppercase text-gray-800">{fiscalData?.seller?.trade_name || fiscalData?.seller?.legal_name || 'N/A'}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-28 text-gray-600">Address:</span>
                <span className="flex-1 text-gray-800">{fiscalData?.seller?.address || 'N/A'}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-28 text-gray-600">Reference:</span>
                <span className="flex-1 font-semibold">{fiscalData?.seller?.reference_number || fiscalData?.invoice_number || 'N/A'}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-28 text-gray-600">Served by:</span>
                <span className="flex-1">{fiscalData?.seller?.served_by || 'API User'}</span>
              </div>
            </div>
          </div>

          {/* Section B: URA Information */}
          <div className="border-b border-gray-300">
            <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200">
              <h2 className="text-xs font-semibold text-gray-700">Section B: URA Information</h2>
            </div>
            <div className="px-3 py-2 text-xs space-y-0.5">
              <div className="flex">
                <span className="font-medium w-28 text-gray-600">Document Type:</span>
                <span className="flex-1">{fiscalData?.fiscal_data?.document_type || 'Original'}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-28 text-gray-600">Issued Date:</span>
                <span className="flex-1">{fiscalData?.fiscal_data?.issued_date || fiscalData?.fiscalized_at?.split('T')[0] || new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-28 text-gray-600">Time:</span>
                <span className="flex-1">{fiscalData?.fiscal_data?.issued_time || new Date().toLocaleTimeString()}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-28 text-gray-600">FDN:</span>
                <span className="flex-1 font-bold text-sm text-blue-700">{fdn || 'N/A'}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-28 text-gray-600">Verification:</span>
                <span className="flex-1 font-mono text-xs">{verificationCode || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Section C: Buyer's Details */}
          <div className="border-b border-gray-300">
            <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200">
              <h2 className="text-xs font-semibold text-gray-700">Section C: Buyer's Details</h2>
            </div>
            <div className="px-3 py-2 text-xs">
              <div className="flex">
                <span className="font-medium w-28 text-gray-600">Name:</span>
                <span className="flex-1 font-semibold">{fiscalData?.buyer?.name || fiscalData?.customer_name || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Section D: Goods & Services Details */}
          <div className="border-b border-gray-300">
            <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200">
              <h2 className="text-xs font-semibold text-gray-700">Section D: Goods & Services Details</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-100">
                  <tr className="border-b border-gray-300">
                    <th className="px-2 py-1 text-left">No</th>
                    <th className="px-2 py-1 text-left">Item</th>
                    <th className="px-2 py-1 text-right">Qty</th>
                    <th className="px-2 py-1 text-right">Unit Price</th>
                    <th className="px-2 py-1 text-right">Total</th>
                    <th className="px-2 py-1 text-center">Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {fiscalData?.items?.map((item: any, index: number) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="px-2 py-1.5">{index + 1}</td>
                      <td className="px-2 py-1.5">{item.item || item.description}</td>
                      <td className="px-2 py-1.5 text-right">{item.qty || item.quantity}</td>
                      <td className="px-2 py-1.5 text-right font-medium">{parseFloat(item.unitPrice || 0).toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-right font-semibold">{parseFloat(item.total || 0).toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-center">A</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section E: Tax Details */}
          <div className="border-b border-gray-300">
            <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200">
              <h2 className="text-xs font-semibold text-gray-700">Section E: Tax Details</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-100">
                  <tr className="border-b border-gray-300">
                    <th className="px-3 py-1 text-left">Category</th>
                    <th className="px-3 py-1 text-right">Net</th>
                    <th className="px-3 py-1 text-right">Tax</th>
                    <th className="px-3 py-1 text-right">Gross</th>
                  </tr>
                </thead>
                <tbody>
                  {fiscalData?.tax_details?.map((tax: any, index: number) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="px-3 py-1.5">A-Standard (18%)</td>
                      <td className="px-3 py-1.5 text-right">{parseFloat(tax.net_amount || tax.netAmount || 0).toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-right">{parseFloat(tax.tax_amount || tax.taxAmount || 0).toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-right font-semibold">{parseFloat(tax.gross_amount || tax.grossAmount || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section F: Summary */}
          <div className="border-b border-gray-300">
            <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200">
              <h2 className="text-xs font-semibold text-gray-700">Section F: Summary</h2>
            </div>
            <div className="px-3 py-2 text-xs space-y-1">
              <div className="flex justify-between py-0.5">
                <span className="text-gray-600">Net Amount:</span>
                <span className="font-semibold">{parseFloat(fiscalData?.summary?.net_amount || fiscalData?.total_amount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-gray-600">Tax Amount:</span>
                <span className="font-semibold">{parseFloat(fiscalData?.summary?.tax_amount || fiscalData?.total_tax || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-0.5 border-t border-gray-300 pt-1">
                <span className="font-semibold">Gross Amount:</span>
                <span className="font-bold text-sm">
                  {parseFloat(
                    fiscalData?.summary?.gross_amount || 
                    (parseFloat(fiscalData?.total_amount || 0) + parseFloat(fiscalData?.total_tax || 0))
                  ).toLocaleString()} {fiscalData?.currency || 'UGX'}
                </span>
              </div>
              <div className="text-xs text-gray-600 italic py-1 border-t border-gray-200">
                {fiscalData?.summary?.gross_amount_words || 'Amount in words'}
              </div>
              <div className="flex justify-between py-0.5 border-t border-gray-200 pt-1">
                <span className="text-gray-600">Payment Mode:</span>
                <span>{fiscalData?.summary?.payment_mode || (fiscalData?.payment_method === '102' ? 'Cash' : 'Other')}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-gray-600">Number of Items:</span>
                <span>{fiscalData?.items?.length || 0}</span>
              </div>
              {fiscalData?.notes && (
                <div className="pt-1 border-t border-gray-200">
                  <span className="text-gray-600">Remarks:</span>
                  <div className="text-gray-700 mt-0.5">{fiscalData.notes}</div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="py-2 text-center bg-blue-600 text-white text-xs font-bold">
            *** END OF e-INVOICE/TAX INVOICE ***
          </div>
        </div>
      </div>

      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .invoice-content {
            padding: 0;
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
