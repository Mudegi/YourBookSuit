'use client';

import React, { ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = React.useState(false);
  let timeout: NodeJS.Timeout;

  const show = () => {
    timeout = setTimeout(() => setVisible(true), 200);
  };
  const hide = () => {
    clearTimeout(timeout);
    setVisible(false);
  };

  return (
    <span className="relative inline-block" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} tabIndex={0}>
      {children}
      {visible && (
        <span className="absolute left-1/2 -translate-x-1/2 mt-2 z-50 px-3 py-2 rounded bg-slate-900 text-white text-xs shadow-lg whitespace-nowrap animate-in fade-in slide-in-from-top-2">
          {content}
        </span>
      )}
    </span>
  );
}
