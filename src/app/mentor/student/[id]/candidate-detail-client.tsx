"use client";

import React, { useState } from "react";
import { CandidateProfileCard } from "@/components/mentor/candidate-profile-card";
import { ResolveDialog } from "@/components/mentor/resolve-dialog";
import type { StudentProfileRecord, UserRecord, MockExamRecord } from "@/types/models";

interface CandidateDetailClientProps {
  student: StudentProfileRecord;
  user: UserRecord;
  mockExams: MockExamRecord[];
  activeCaseId?: string;
  activeTriggerCode?: string;
}

export function CandidateDetailClient({
  student,
  user,
  mockExams,
  activeCaseId,
  activeTriggerCode,
}: CandidateDetailClientProps) {
  const [resolveModalOpen, setResolveModalOpen] = useState(false);

  return (
    <>
      <CandidateProfileCard
        student={student}
        user={user}
        mockExams={mockExams}
        onOpenResolveDialog={activeCaseId ? () => setResolveModalOpen(true) : undefined}
      />

      {activeCaseId && activeTriggerCode && (
        <ResolveDialog
          isOpen={resolveModalOpen}
          onClose={() => setResolveModalOpen(false)}
          caseId={activeCaseId}
          triggerCode={activeTriggerCode}
          candidateName={user.fullName}
        />
      )}
    </>
  );
}
