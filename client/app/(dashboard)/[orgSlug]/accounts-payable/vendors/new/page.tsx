'use client';

import { useRouter } from 'next/navigation';

export default function NewVendorPage() {
  const router = useRouter();
  
  // Redirect to vendors page for now
  router.push('../vendors');
  
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}
