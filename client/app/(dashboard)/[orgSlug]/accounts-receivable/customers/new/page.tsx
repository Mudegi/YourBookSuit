'use client';

import { useRouter } from 'next/navigation';

export default function NewCustomerPage() {
  const router = useRouter();
  
  // Redirect to customers page for now - full form coming soon
  router.push('../customers');
  
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}
