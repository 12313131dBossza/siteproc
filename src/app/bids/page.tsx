import BidsPageClient from './pageClient';
import { PlanGate } from '@/components/PlanGate';

export default function BidsPage() {
  return (
    <PlanGate minPlan="pro" featureName="Bids">
      <BidsPageClient />
    </PlanGate>
  );
}
