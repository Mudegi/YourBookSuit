import { redirect } from 'next/navigation';

export default function OrgRootPage({ params }: { params: { orgSlug: string } }) {
  redirect(`/${params.orgSlug}/dashboard`);
}
