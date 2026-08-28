import ApplyLoanPage from '@/features/(farmer-application)/apply-loan/page';

interface PageProps {
  params: { id: string };
}

// In Next.js 15, `params` can be a Promise, so we must await it if needed, or handle it carefully.
// According to Next.js 15 docs, dynamic APIs like params should be awaited.
export default async function Page({ params }: PageProps) {
  // Await the params object
  const resolvedParams = await params;
  return <ApplyLoanPage id={resolvedParams.id} />;
}
