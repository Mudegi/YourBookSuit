'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Building2, Globe } from 'lucide-react';

export interface BranchOption {
  id: string;
  name: string;
  code: string;
  type: string;
  isHeadquarters: boolean;
}

export const BRANCH_STORAGE_KEY = 'yb_active_branch';
export const BRANCH_CHANGE_EVENT = 'ybBranchChanged';

/** Retrieve the currently active branch ID from localStorage (null = All Branches). */
export function getActiveBranchId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(BRANCH_STORAGE_KEY);
}

/** Dispatch a branch-changed event so the rest of the app can react. */
function dispatchBranchChange(branchId: string | null) {
  window.dispatchEvent(new CustomEvent(BRANCH_CHANGE_EVENT, { detail: { branchId } }));
}

interface BranchSwitcherProps {
  orgSlug: string;
  /** called after the user switches branches */
  onChange?: (branchId: string | null) => void;
}

export default function BranchSwitcher({ orgSlug, onChange }: BranchSwitcherProps) {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  // Load branches & restore saved selection
  useEffect(() => {
    if (!orgSlug) return;
    fetch(`/api/${orgSlug}/branches?isActive=true`)
      .then((r) => r.json())
      .then((data: BranchOption[]) => {
        setBranches(Array.isArray(data) ? data : []);
        const saved = getActiveBranchId();
        // Verify the saved branch still exists
        if (saved && data.some((b) => b.id === saved)) {
          setActiveBranchId(saved);
        } else {
          localStorage.removeItem(BRANCH_STORAGE_KEY);
          setActiveBranchId(null);
        }
      })
      .catch(() => setBranches([]))
      .finally(() => setLoading(false));
  }, [orgSlug]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (id: string | null) => {
    setActiveBranchId(id);
    if (id) {
      localStorage.setItem(BRANCH_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(BRANCH_STORAGE_KEY);
    }
    dispatchBranchChange(id);
    onChange?.(id);
    setOpen(false);
  };

  const activeBranch = branches.find((b) => b.id === activeBranchId);

  // Don't render until loaded; always show once at least one branch exists
  if (!loading && branches.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 hover:border-blue-500 text-sm text-slate-200 transition-colors"
        title="Switch Branch"
      >
        {activeBranch ? (
          <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
        ) : (
          <Globe className="w-4 h-4 text-slate-400 shrink-0" />
        )}
        <span className="max-w-[120px] truncate">
          {loading ? '…' : activeBranch ? activeBranch.name : 'All Branches'}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
          {/* All Branches */}
          <button
            onClick={() => select(null)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
              !activeBranchId
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}
          >
            <Globe className="w-4 h-4 shrink-0 text-slate-400" />
            <div className="text-left">
              <div className="font-medium">All Branches</div>
              <div className="text-xs text-gray-400 dark:text-slate-500">Consolidated view</div>
            </div>
          </button>

          {branches.length > 0 && (
            <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
          )}

          {branches.map((branch) => (
            <button
              key={branch.id}
              onClick={() => select(branch.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                activeBranchId === branch.id
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                  : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <Building2 className="w-4 h-4 shrink-0" />
              <div className="text-left min-w-0">
                <div className="font-medium truncate">{branch.name}</div>
                <div className="text-xs text-gray-400 dark:text-slate-500 truncate">
                  {branch.code}
                  {branch.isHeadquarters && ' · HQ'}
                </div>
              </div>
              {activeBranchId === branch.id && (
                <span className="ml-auto text-blue-500 text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
