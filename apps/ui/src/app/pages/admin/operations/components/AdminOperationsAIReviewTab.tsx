import { AdminOperationsPartnerLabTab } from '@/app/pages/admin/operations/components/AdminOperationsPartnerLabTab';

/** AI review uses the same lab reports table with extraction filter pre-applied. */
export function AdminOperationsAIReviewTab() {
  return (
    <AdminOperationsPartnerLabTab
      defaultExtractionStatus="review_pending"
      focusAiReview
    />
  );
}
