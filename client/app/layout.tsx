import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'YourBooks - Professional Accounting ERP',
  description: 'Multi-tenant accounting ERP system with double-entry bookkeeping',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent white flash: immediately set background based on route + theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              var p = window.location.pathname;
              var isDash = p.match(/^\/[^\/]+\//) && !p.startsWith('/login') && !p.startsWith('/register') && !p.startsWith('/onboarding') && p !== '/';
              var isAdmin = p.startsWith('/system-admin');
              if (isDash || isAdmin) {
                var t = ''; try { t = localStorage.getItem('theme') || ''; } catch(e) {}
                if (t === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.style.backgroundColor = '#0f172a';
                } else {
                  document.documentElement.style.backgroundColor = '#ffffff';
                }
              }
            })();`,
          }}
        />
        {/* Load Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&family=Open+Sans:wght@300;400;500;600;700&family=Merriweather:wght@300;400;700&family=Nunito:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="top-right" richColors closeButton duration={6000} />
      </body>
    </html>
  );
}
