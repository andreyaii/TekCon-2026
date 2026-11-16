import {
  SkeletonAvatar,
  SkeletonBlock,
  SkeletonCard,
  SkeletonImage,
  SkeletonPageHeader,
  SkeletonStatus,
  SkeletonTableRow,
  SkeletonText,
} from './SkeletonPrimitives';

function ProjectCardSkeleton() {
  return (
    <SkeletonCard className="h-full">
      <SkeletonImage className="aspect-[16/10]" />
      <div className="space-y-3 p-5">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="h-5 w-3/4" />
        <SkeletonText lines={3} />
        <div className="flex justify-between border-t border-line pt-4">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-9 w-28 rounded-lg" />
        </div>
      </div>
    </SkeletonCard>
  );
}

function ProjectFiltersSkeleton() {
  return (
    <SkeletonCard className="mb-5 p-4">
      <SkeletonBlock className="mb-4 h-4 w-40" />
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <SkeletonBlock className="h-10" />
        <SkeletonBlock className="h-10 w-36" />
        <SkeletonBlock className="h-10 w-36" />
      </div>
    </SkeletonCard>
  );
}

function ProjectPanelSkeleton() {
  return (
    <SkeletonCard className="grid md:grid-cols-[280px_1fr]">
      <SkeletonImage className="aspect-[4/3] md:h-full md:min-h-[300px] md:aspect-auto" />
      <div className="space-y-5 p-5 sm:p-6">
        <SkeletonBlock className="h-3 w-28" />
        <SkeletonBlock className="h-6 w-3/4" />
        <SkeletonText lines={2} />
        <div className="border-t border-line pt-4">
          <SkeletonBlock className="mb-3 h-4 w-28" />
          <div className="grid gap-2 sm:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-[10px] bg-surface px-3 py-2">
                <SkeletonAvatar size="h-8 w-8" />
                <div className="min-w-0 flex-1 space-y-2">
                  <SkeletonBlock className="h-3 w-3/4" />
                  <SkeletonBlock className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-line pt-4">
          <SkeletonBlock className="mb-3 h-4 w-32" />
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3].map((item) => <SkeletonBlock key={item} className="h-10 w-32 rounded-lg" />)}
          </div>
        </div>
        <SkeletonBlock className="h-4 w-44" />
      </div>
    </SkeletonCard>
  );
}

export function DashboardSkeleton() {
  return (
    <div aria-busy="true">
      <SkeletonStatus label="Loading your dashboard" />
      <SkeletonPageHeader />
      <SkeletonCard className="mb-5 flex items-center justify-between gap-4 p-4">
        <div className="space-y-2">
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="h-3 w-72 max-w-full" />
        </div>
        <SkeletonBlock className="h-5 w-28" />
      </SkeletonCard>
      <div className="mb-3 flex justify-between">
        <SkeletonBlock className="h-6 w-36" />
        <SkeletonBlock className="h-10 w-36" />
      </div>
      <ProjectPanelSkeleton />
    </div>
  );
}

export function AllProjectsSkeleton() {
  return (
    <div aria-busy="true">
      <SkeletonStatus label="Loading projects" />
      <SkeletonPageHeader />
      <ProjectFiltersSkeleton />
      <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => <ProjectCardSkeleton key={index} />)}
      </div>
    </div>
  );
}

export function MyTeamsSkeleton() {
  return (
    <div aria-busy="true">
      <SkeletonStatus label="Loading your teams" />
      <SkeletonPageHeader />
      <SkeletonBlock className="mb-5 h-11 w-full rounded-[10px]" />
      <div className="space-y-6">
        <ProjectPanelSkeleton />
        <ProjectPanelSkeleton />
      </div>
    </div>
  );
}

export function ProjectDetailsSkeleton() {
  return (
    <div aria-busy="true" className="space-y-6">
      <SkeletonStatus label="Loading project details" />
      <SkeletonBlock className="h-4 w-36" />
      <SkeletonCard className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <SkeletonImage className="h-28 w-28 shrink-0 rounded-xl sm:h-32 sm:w-32" />
          <div className="min-w-0 flex-1 space-y-3">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-8 w-2/3" />
            <SkeletonText lines={2} />
          </div>
        </div>
      </SkeletonCard>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((item) => (
          <SkeletonCard key={item} className="space-y-4 p-5 sm:p-6">
            <SkeletonBlock className="h-6 w-36" />
            {[0, 1, 2].map((row) => <SkeletonBlock key={row} className="h-10 w-full rounded-lg" />)}
          </SkeletonCard>
        ))}
      </div>
      <SkeletonCard className="space-y-4 p-5">
        <SkeletonBlock className="h-6 w-24" />
        <SkeletonBlock className="h-20 w-full" />
      </SkeletonCard>
      <SkeletonCard className="space-y-4 p-5">
        <SkeletonBlock className="h-6 w-40" />
        <SkeletonBlock className="h-10 w-40 rounded-lg" />
      </SkeletonCard>
    </div>
  );
}

export function RatingAnalyticsSkeleton() {
  return (
    <div aria-busy="true">
      <SkeletonStatus label="Loading rating analytics" />
      <SkeletonPageHeader />
      <SkeletonCard className="mb-6 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="space-y-2">
              <SkeletonBlock className="h-4 w-32" />
              <SkeletonBlock className="h-10 w-full" />
            </div>
          ))}
        </div>
        <SkeletonBlock className="mt-4 h-3 w-64 max-w-full" />
      </SkeletonCard>
      <SkeletonCard className="mb-6 overflow-hidden">
        <div className="space-y-3 border-b border-line px-4 py-4 sm:px-5">
          <SkeletonBlock className="h-6 w-48" />
          <SkeletonBlock className="h-4 w-72 max-w-full" />
        </div>
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="flex items-center justify-between gap-4 border-b border-line px-4 py-4 sm:px-5">
            <SkeletonBlock className="h-4 w-36" />
            <SkeletonBlock className="h-7 w-48 max-w-[50%] rounded-full" />
          </div>
        ))}
      </SkeletonCard>
      <SkeletonCard className="overflow-hidden">
        <div className="space-y-3 border-b border-line px-4 py-4 sm:px-5">
          <SkeletonBlock className="h-6 w-56" />
          <SkeletonBlock className="h-4 w-80 max-w-full" />
        </div>
        <div className="py-2">
          {[0, 1, 2, 3, 4].map((item) => <SkeletonTableRow key={item} columns={6} />)}
        </div>
      </SkeletonCard>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div aria-busy="true">
      <SkeletonStatus label="Loading profile" />
      <SkeletonPageHeader withSubtitle={false} />
      <SkeletonCard className="p-6">
        <div className="mb-5 flex items-center gap-4">
          <SkeletonAvatar size="h-14 w-14" />
          <SkeletonBlock className="h-6 w-40" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="space-y-2">
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="h-4 w-40 max-w-full" />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}
