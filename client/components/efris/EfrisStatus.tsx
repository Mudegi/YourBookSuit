/**
 * EFRIS Status Display Component
 * 
 * Displays the EFRIS fiscalization status and details for an invoice
 */

import React from 'react';
import { CheckCircle, XCircle, Clock, QrCode, FileText } from 'lucide-react';

export interface EfrisStatusProps {
  status?: string | null;
  fdn?: string | null;
  verificationCode?: string | null;
  qrCode?: string | null;
  submittedAt?: Date | string | null;
  errorMessage?: string | null;
  className?: string;
}

export function EfrisStatusBadge({ status, className = '' }: { status?: string | null; className?: string }) {
  if (!status) {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ${className}`}>
        <Clock className="w-3 h-3 mr-1" />
        Not Submitted
      </span>
    );
  }

  switch (status) {
    case 'ACCEPTED':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ${className}`}>
          <CheckCircle className="w-3 h-3 mr-1" />
          Fiscalized
        </span>
      );
    case 'PENDING':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 ${className}`}>
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </span>
      );
    case 'REJECTED':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ${className}`}>
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </span>
      );
    case 'SUBMITTED':
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ${className}`}>
          <Clock className="w-3 h-3 mr-1" />
          Submitted
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ${className}`}>
          {status}
        </span>
      );
  }
}

export function EfrisStatusDetails({ 
  status, 
  fdn, 
  verificationCode, 
  qrCode, 
  submittedAt, 
  errorMessage,
  className = '' 
}: EfrisStatusProps) {
  if (!status || status === 'NOT_SUBMITTED') {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center text-gray-600">
          <Clock className="w-5 h-5 mr-2" />
          <span className="font-medium">Not submitted to EFRIS</span>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          This invoice has not been fiscalized yet. Submit it to EFRIS to generate an FDN.
        </p>
      </div>
    );
  }

  if (status === 'REJECTED') {
    return (
      <div className={`bg-red-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center text-red-800">
          <XCircle className="w-5 h-5 mr-2" />
          <span className="font-medium">EFRIS Submission Rejected</span>
        </div>
        {errorMessage && (
          <p className="mt-2 text-sm text-red-700">{errorMessage}</p>
        )}
        {submittedAt && (
          <p className="mt-2 text-xs text-red-600">
            Attempted: {new Date(submittedAt).toLocaleString()}
          </p>
        )}
      </div>
    );
  }

  if (status === 'ACCEPTED' && fdn) {
    return (
      <div className={`bg-green-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center text-green-800 mb-3">
          <CheckCircle className="w-5 h-5 mr-2" />
          <span className="font-medium">Fiscalized by EFRIS</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-gray-600">Fiscal Document Number (FDN)</label>
                <div className="flex items-center mt-1">
                  <FileText className="w-4 h-4 mr-2 text-green-600" />
                  <span className="text-sm font-mono text-gray-900">{fdn}</span>
                </div>
              </div>

              {verificationCode && (
                <div>
                  <label className="text-xs font-medium text-gray-600">Verification Code</label>
                  <div className="mt-1">
                    <span className="text-sm font-mono text-gray-900">{verificationCode}</span>
                  </div>
                </div>
              )}

              {submittedAt && (
                <div>
                  <label className="text-xs font-medium text-gray-600">Fiscalized At</label>
                  <div className="mt-1">
                    <span className="text-sm text-gray-900">
                      {new Date(submittedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {qrCode && (
            <div className="flex flex-col items-center">
              <label className="text-xs font-medium text-gray-600 mb-2">QR Code</label>
              <div className="bg-white p-2 rounded border border-gray-200">
                <img 
                  src={qrCode} 
                  alt="EFRIS QR Code" 
                  className="w-32 h-32"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Scan to verify on EFRIS portal
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === 'PENDING' || status === 'SUBMITTED') {
    return (
      <div className={`bg-blue-50 rounded-lg p-4 ${className}`}>
        <div className="flex items-center text-blue-800">
          <Clock className="w-5 h-5 mr-2 animate-spin" />
          <span className="font-medium">Submission Pending</span>
        </div>
        <p className="mt-2 text-sm text-blue-700">
          This invoice has been submitted to EFRIS and is awaiting confirmation.
        </p>
        {submittedAt && (
          <p className="mt-2 text-xs text-blue-600">
            Submitted: {new Date(submittedAt).toLocaleString()}
          </p>
        )}
      </div>
    );
  }

  return null;
}

export function EfrisQRCodeModal({ 
  isOpen, 
  onClose, 
  qrCode, 
  fdn, 
  verificationCode 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  qrCode?: string | null; 
  fdn?: string | null;
  verificationCode?: string | null;
}) {
  if (!isOpen || !qrCode) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">EFRIS QR Code</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="text-2xl">&times;</span>
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div className="bg-white p-4 border-2 border-gray-200 rounded-lg mb-4">
            <img 
              src={qrCode} 
              alt="EFRIS QR Code" 
              className="w-64 h-64"
            />
          </div>

          {fdn && (
            <div className="w-full mb-2">
              <label className="text-xs font-medium text-gray-600">FDN</label>
              <div className="text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded">
                {fdn}
              </div>
            </div>
          )}

          {verificationCode && (
            <div className="w-full mb-4">
              <label className="text-xs font-medium text-gray-600">Verification Code</label>
              <div className="text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded">
                {verificationCode}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              const link = document.createElement('a');
              link.href = qrCode;
              link.download = `efris-qr-${fdn || 'code'}.png`;
              link.click();
            }}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Download QR Code
          </button>
        </div>
      </div>
    </div>
  );
}
