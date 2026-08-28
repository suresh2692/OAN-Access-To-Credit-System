import ApplyLoanClient from './components/ApplyLoanClient';

interface ApplyLoanPageProps {
  id: string; // The product slug
}

export default function ApplyLoanPage({ id }: ApplyLoanPageProps) {
  return <ApplyLoanClient productId={id} />;
}
