/**
 * Onboarding Status Display - Test Component
 * Add this to any page to see the current onboarding status
 * Usage: <OnboardingStatusDisplay />
 */

'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';

interface OnboardingStatus {
  completed: boolean;
  hasChartOfAccounts: boolean;
  hasCompanyProfile: boolean;
  organizationName: string;
  organizationSlug: string;
  isReady: boolean;
  missingRequirements: string[];
}

export default function OnboardingStatusDisplay() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch('/api/onboarding/status');
        if (!response.ok) {
          throw new Error('Failed to fetch onboarding status');
        }
        const data = await response.json();
        setStatus(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2">
          <Loader className="w-4 h-4 animate-spin text-gray-500" />
          <span className="text-sm text-gray-600">Checking onboarding status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2">
          <XCircle className="w-5 h-5 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-800">Error checking status</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const StatusIcon = status.isReady ? CheckCircle : AlertCircle;
  const bgColor = status.isReady ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200';
  const iconColor = status.isReady ? 'text-green-500' : 'text-yellow-500';
  const textColor = status.isReady ? 'text-green-800' : 'text-yellow-800';

  return (
    <div className={`border rounded-lg p-4 mb-6 ${bgColor}`}>
      <div className="flex items-start gap-3">
        <StatusIcon className={`w-6 h-6 ${iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <h3 className={`text-sm font-semibold ${textColor}`}>
            {status.isReady ? '✅ Organization Setup Complete' : '⚠️ Setup Required'}
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            Organization: <span className="font-medium">{status.organizationName}</span>
          </p>

          <div className="mt-3 space-y-2">
            <StatusItem
              label="Chart of Accounts"
              completed={status.hasChartOfAccounts}
            />
            <StatusItem
              label="Company Profile"
              completed={status.hasCompanyProfile}
            />
            <StatusItem
              label="Onboarding Completed"
              completed={status.completed}
            />
          </div>

          {status.missingRequirements.length > 0 && (
            <div className="mt-3 pt-3 border-t border-yellow-300">
              <p className="text-xs font-medium text-yellow-800 mb-2">
                Missing Requirements:
              </p>
              <ul className="space-y-1">
                {status.missingRequirements.map((req, idx) => (
                  <li key={idx} className="text-xs text-yellow-700 flex items-center gap-2">
                    <span className="w-1 h-1 bg-yellow-500 rounded-full"></span>
                    {req}
                  </li>
                ))}
              </ul>
              <a
                href="/onboarding"
                className="inline-block mt-3 text-xs font-medium text-yellow-700 underline hover:text-yellow-800"
              >
                Complete setup now →
              </a>
            </div>
          )}

          {status.isReady && (
            <div className="mt-3 pt-3 border-t border-green-300">
              <p className="text-xs text-green-700">
                🎉 Your organization is ready to process transactions!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusItem({ label, completed }: { label: string; completed: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {completed ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : (
        <XCircle className="w-4 h-4 text-red-500" />
      )}
      <span className={completed ? 'text-gray-700' : 'text-gray-500'}>
        {label}
      </span>
      {completed && (
        <span className="text-green-600 font-medium">✓</span>
      )}
    </div>
  );
}
