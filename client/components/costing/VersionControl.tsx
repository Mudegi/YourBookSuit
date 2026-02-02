/**
 * Version Control Component for Standard Costs
 */

'use client';

import { useState } from 'react';
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface StandardCostVersion {
  id: string;
  costingVersion: string;
  status: string;
  effectiveFrom: string;
  effectiveTo?: string;
  totalCost: number;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  notes?: string;
}

interface VersionControlProps {
  versions: StandardCostVersion[];
  currentVersion: StandardCostVersion;
  onVersionSelect?: (version: StandardCostVersion) => void;
  currency?: string;
}

export default function VersionControl({ 
  versions, 
  currentVersion, 
  onVersionSelect,
  currency = 'USD' 
}: VersionControlProps) {
  
  const [selectedVersion, setSelectedVersion] = useState(currentVersion.id);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'FROZEN':
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'PENDING_APPROVAL':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FROZEN':
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'PENDING_APPROVAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const handleVersionClick = (version: StandardCostVersion) => {
    setSelectedVersion(version.id);
    onVersionSelect?.(version);
  };

  const sortedVersions = [...versions].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-medium text-gray-900">Version History</h3>
        <p className="text-sm text-gray-600 mt-1">
          Track changes and approval status across costing versions
        </p>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {sortedVersions.map((version) => (
          <div
            key={version.id}
            className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
              selectedVersion === version.id ? 'bg-blue-50 border-blue-200' : ''
            }`}
            onClick={() => handleVersionClick(version)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-gray-900">
                    Version {version.costingVersion}
                  </span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(version.status)}`}>
                    {version.status.replace(/_/g, ' ')}
                  </span>
                  {getStatusIcon(version.status)}
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Effective: {new Date(version.effectiveFrom).toLocaleDateString()}</span>
                    </div>
                    {version.effectiveTo && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Until: {new Date(version.effectiveTo).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  
                  {version.approvedBy && (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>Approved by: {version.approvedBy}</span>
                      {version.approvedAt && (
                        <span className="text-gray-400">
                          on {new Date(version.approvedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {version.notes && (
                  <p className="text-sm text-gray-500 mt-2 italic">
                    "{version.notes}"
                  </p>
                )}
              </div>
              
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(version.totalCost)}
                </div>
                <div className="text-xs text-gray-500">
                  Total Cost
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {sortedVersions.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <Clock className="w-8 h-8 mx-auto mb-3 text-gray-400" />
          <p>No version history available</p>
        </div>
      )}
    </div>
  );
}