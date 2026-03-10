import React, { useEffect, useState } from 'react';
import { adminFlashSaleService } from '@/services/adminFlashSaleService';

export default function AdminFlashSaleSubmissions({ slotId }: { slotId: string }) {
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    adminFlashSaleService.getFlashSaleSubmissions(slotId).then(setSubmissions);
  }, [slotId]);

  const handleApprove = (submissionId: string) => {
    adminFlashSaleService.approveFlashSaleSubmission(submissionId).then(() => {
      // ... update UI
    });
  };

  const handleReject = (submissionId: string) => {
    adminFlashSaleService.rejectFlashSaleSubmission(submissionId).then(() => {
      // ... update UI
    });
  };

  // ... UI for viewing and managing submissions

  return (
    <div>
      <h1>Flash Sale Submissions</h1>
      {/* ... */}
    </div>
  );
}
