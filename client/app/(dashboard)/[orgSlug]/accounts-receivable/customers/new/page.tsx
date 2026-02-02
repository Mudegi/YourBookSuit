'use client';

import { useRouter } from 'next/navigation';

export default function NewCustomerPage() {
  const router = useRouter();
  
  // Redirect to customers page for now - full form coming soon
  router.push('../customers');
  
  return (
    <div className="flex items-center justify-center h-screen">
      <p>Redirecting to customers...</p>
    </div>
  );
}
