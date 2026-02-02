'use client';

import { useRouter } from 'next/navigation';

export default function NewVendorPage() {
  const router = useRouter();
  
  // Redirect to vendors page for now
  router.push('../vendors');
  
  return (
    <div className="flex items-center justify-center h-screen">
      <p>Redirecting to vendors...</p>
    </div>
  );
}
