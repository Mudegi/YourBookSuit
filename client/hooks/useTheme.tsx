'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

type Theme = 'light' | 'dark';
type Density = 'comfortable' | 'compact' | 'cozy';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  fontFamily: string;
  setFontFamily: (f: string) => void;
  density: Density;
  setDensity: (d: Density) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

function readLocal(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}

/** Persist a preference to the server (fire-and-forget) */
function persistPreference(key: string, value: string) {
  fetch('/api/user/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [key]: value }),
  }).catch(() => {}); // best-effort
}

export function ThemeProvider({ children, serverPrefs }: { children: ReactNode; serverPrefs?: Record<string, string> | null }) {
  const [theme, _setTheme] = useState<Theme>(() =>
    (readLocal('theme', serverPrefs?.theme || 'light') as Theme));
  const [fontFamily, _setFont] = useState(() =>
    readLocal('app-font', serverPrefs?.fontFamily || "'Inter', sans-serif"));
  const [density, _setDensity] = useState<Density>(() =>
    (readLocal('app-density', serverPrefs?.density || 'comfortable') as Density));

  // On first mount, seed localStorage from server prefs if they exist and localStorage is empty
  useEffect(() => {
    if (!serverPrefs) return;
    if (serverPrefs.theme && !localStorage.getItem('theme')) {
      localStorage.setItem('theme', serverPrefs.theme);
      _setTheme(serverPrefs.theme as Theme);
    }
    if (serverPrefs.fontFamily && !localStorage.getItem('app-font')) {
      localStorage.setItem('app-font', serverPrefs.fontFamily);
      _setFont(serverPrefs.fontFamily);
    }
    if (serverPrefs.density && !localStorage.getItem('app-density')) {
      localStorage.setItem('app-density', serverPrefs.density);
      _setDensity(serverPrefs.density as Density);
    }
  }, [serverPrefs]);

  // Sync theme to DOM + localStorage
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.backgroundColor = theme === 'dark' ? '#0f172a' : '#ffffff';
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--app-font', fontFamily);
    localStorage.setItem('app-font', fontFamily);
  }, [fontFamily]);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
    localStorage.setItem('app-density', density);
  }, [density]);

  const setTheme = useCallback((t: Theme) => {
    _setTheme(t);
    persistPreference('theme', t);
  }, []);

  const setFontFamily = useCallback((f: string) => {
    _setFont(f);
    persistPreference('fontFamily', f);
  }, []);

  const setDensity = useCallback((d: Density) => {
    _setDensity(d);
    persistPreference('density', d);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, fontFamily, setFontFamily, density, setDensity }}>
      {children}
    </ThemeContext.Provider>
  );
}
