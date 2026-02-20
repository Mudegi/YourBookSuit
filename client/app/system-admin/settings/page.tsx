'use client';

import { useState } from 'react';

export default function SystemSettingsPage() {
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Platform-wide configuration for YourBooks.</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Subscription Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Subscription Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Trial Duration (days)</label>
              <input type="number" defaultValue={7} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Monthly Price (USD)</label>
              <input type="number" defaultValue={30} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Annual Price (USD)</label>
              <input type="number" defaultValue={300} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <p className="text-xs text-gray-400 mt-1">$30 × 12 = $360 → $300 saves subscribers $60 (2 months free)</p>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" defaultChecked id="auto-expire" className="rounded" />
              <label htmlFor="auto-expire" className="text-sm text-gray-600">Automatically expire trials after duration</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" defaultChecked id="require-approval" className="rounded" />
              <label htmlFor="require-approval" className="text-sm text-gray-600">Require admin approval after payment</label>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Admin Notifications</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" defaultChecked id="notify-signup" className="rounded" />
              <label htmlFor="notify-signup" className="text-sm text-gray-600">New user registration</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" defaultChecked id="notify-trial-expire" className="rounded" />
              <label htmlFor="notify-trial-expire" className="text-sm text-gray-600">Trial expiration (1 day before)</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" defaultChecked id="notify-payment" className="rounded" />
              <label htmlFor="notify-payment" className="text-sm text-gray-600">Payment received / pending approval</label>
            </div>
          </div>
        </div>

        {/* Platform Branding */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Platform Branding</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Platform Name</label>
              <input type="text" defaultValue="YourBooks" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Support Email</label>
              <input type="email" defaultValue="support@yourbooks.app" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
        </div>

        <button
          onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition"
        >
          {saved ? '✓ Saved' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
