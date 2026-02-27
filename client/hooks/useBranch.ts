'use client';

import { useEffect, useState, useCallback } from 'react';
import { BRANCH_STORAGE_KEY, BRANCH_CHANGE_EVENT } from '@/components/branch-switcher';

/**
 * useBranch
 *
 * Returns the currently selected branchId (or null = All Branches).
 * Re-renders automatically when the user switches branches via the
 * BranchSwitcher dropdown (which fires the custom `ybBranchChanged` event).
 *
 * Usage in any list/report page:
 *   const { branchId, appendBranchParam } = useBranch();
 *
 *   // In your fetch URL builder:
 *   const url = `/api/orgs/${orgSlug}/invoices?status=DRAFT${appendBranchParam()}`;
 */
export function useBranch() {
  const [branchId, setBranchId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(BRANCH_STORAGE_KEY);
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const event = e as CustomEvent<{ branchId: string | null }>;
      setBranchId(event.detail.branchId);
    };
    window.addEventListener(BRANCH_CHANGE_EVENT, handler);
    return () => window.removeEventListener(BRANCH_CHANGE_EVENT, handler);
  }, []);

  /**
   * Returns `&branchId=xxx` when a branch is selected, empty string otherwise.
   * Append this to any API URL to automatically scope the request.
   */
  const appendBranchParam = useCallback(
    (prefix: '&' | '?' = '&') =>
      branchId ? `${prefix}branchId=${branchId}` : '',
    [branchId],
  );

  return { branchId, appendBranchParam };
}
