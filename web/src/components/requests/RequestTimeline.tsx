/**
 * Visual progress tracker for a product request lifecycle.
 * BX-07-014 — Timeline / Progress Tracker.
 */
import { CheckCircle2, Circle, Clock, XCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RequestStatus, SourcingStage } from '@/services/productRequestService';

interface Stage {
  key: string;
  label: string;
  match: (status: RequestStatus, stage: SourcingStage) => 'done' | 'current' | 'todo' | 'skipped';
}

const STAGES: Stage[] = [
  {
    key: 'submitted',
    label: 'Submitted',
    match: () => 'done',
  },
  {
    key: 'review',
    label: 'Under Review',
    match: (s) =>
      s === 'new' ? 'todo' :
      s === 'under_review' ? 'current' :
      'done',
  },
  {
    key: 'sourcing',
    label: 'Sourcing',
    match: (s, stage) => {
      if (s === 'rejected' || s === 'on_hold' || s === 'already_available') return 'skipped';
      if (s === 'new' || s === 'under_review') return 'todo';
      if (s === 'approved_for_sourcing') {
        if (stage === 'ready_for_verification') return 'done';
        return 'current';
      }
      return 'done';
    },
  },
  {
    key: 'verification',
    label: 'Verification',
    match: (s, stage) => {
      if (s === 'rejected' || s === 'on_hold' || s === 'already_available') return 'skipped';
      if (s === 'converted_to_listing') return 'done';
      if (s === 'approved_for_sourcing' && stage === 'ready_for_verification') return 'current';
      return 'todo';
    },
  },
  {
    key: 'listed',
    label: 'Listed',
    match: (s) => (s === 'converted_to_listing' ? 'done' : 'todo'),
  },
];

interface RequestTimelineProps {
  status: RequestStatus;
  sourcingStage: SourcingStage;
  rejectionReason?: string | null;
  className?: string;
}

export function RequestTimeline({ status, sourcingStage, rejectionReason, className }: RequestTimelineProps) {
  const isRejected = status === 'rejected';
  const isOnHold = status === 'on_hold';
  const isMatched = status === 'already_available';

  if (isRejected) {
    return (
      <div className={cn('rounded-lg border border-red-200 bg-red-50 p-4', className)}>
        <div className="flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">Request not accepted</p>
            {rejectionReason && <p className="text-sm text-red-700 mt-1">{rejectionReason}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (isOnHold) {
    return (
      <div className={cn('rounded-lg border border-amber-200 bg-amber-50 p-4', className)}>
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">On Hold</p>
            {rejectionReason && <p className="text-sm text-amber-700 mt-1">{rejectionReason}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (isMatched) {
    return (
      <div className={cn('rounded-lg border border-green-200 bg-green-50 p-4', className)}>
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-green-800">Already Available</p>
            <p className="text-sm text-green-700 mt-1">This product already exists on BazaarX. Tap below to view it.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <ol className="flex items-start justify-between gap-2 relative">
        {STAGES.map((stage, idx) => {
          const state = stage.match(status, sourcingStage);
          const Icon = state === 'done' ? CheckCircle2 : state === 'current' ? Clock : Circle;
          const color =
            state === 'done' ? 'text-green-600 bg-green-100 ring-green-600' :
            state === 'current' ? 'text-blue-600 bg-blue-100 ring-blue-600' :
            'text-gray-400 bg-gray-100 ring-gray-300';

          return (
            <li key={stage.key} className="flex flex-col items-center flex-1 relative z-10">
              <div className={cn('h-9 w-9 rounded-full flex items-center justify-center ring-2', color)}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={cn(
                'text-xs mt-2 font-medium text-center',
                state === 'done' && 'text-green-700',
                state === 'current' && 'text-blue-700',
                state === 'todo' && 'text-gray-400',
                state === 'skipped' && 'text-gray-300 line-through',
              )}>
                {stage.label}
              </span>
              {idx < STAGES.length - 1 && (
                <div className={cn(
                  'absolute top-[18px] left-1/2 right-[-50%] h-0.5 -z-0',
                  state === 'done' ? 'bg-green-400' : 'bg-gray-200',
                )} style={{ width: 'calc(100% - 0.5rem)', marginLeft: '1.25rem' }} />
              )}
            </li>
          );
        })}
      </ol>

      {status === 'approved_for_sourcing' && sourcingStage && (
        <div className="mt-4 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2 inline-block">
          Sourcing sub-stage: <strong className="capitalize">{sourcingStage.replace(/_/g, ' ')}</strong>
        </div>
      )}
    </div>
  );
}
