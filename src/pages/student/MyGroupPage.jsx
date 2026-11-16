
import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import GroupProjectPanel from '../../components/GroupProjectPanel';
import Modal from '../../components/Modal';
import { ErrorState, EmptyState } from '../../components/Feedback';
import { useAuth } from '../../context/AuthContext';
import { invalidateAsyncCache, useAsync } from '../../hooks/useAsync';
import {
  getProjectByGroupId,
  updateGroupDescription
} from '../../services/projectService';
import { ArrowRight } from 'lucide-react';
import { getAggregates, getEvaluationStatus } from '../../services/evaluationService';
import { Link } from 'react-router-dom';
import { DashboardSkeleton } from '../../components/skeletons/PageSkeletons';

export default function MyGroupPage() {
  const { user } = useAuth();
  const [logoPreview, setLogoPreview] = useState(null);

  const { data, loading, error, reload } = useAsync(
    async (force) => {
      const [project, aggregates, status] = await Promise.all([
        getProjectByGroupId(user.groupId, { refresh: force }),
        getAggregates(user),
        getEvaluationStatus(user.id),
      ]);

      return { project, aggregates, status };
    },
    [user.groupId, user.id],
    `student-my-group:${user.id}:${user.groupId}`,
  );

  const handleDescriptionSave = async (description) => {
    await updateGroupDescription(description);
    invalidateAsyncCache();
    reload();
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(' ')[0]}`}
        subtitle="Your team’s showcase and evaluation progress."
        actions={
          <Link to="/student/explore" className="btn-primary">
            Explore projects <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-emerald-200 bg-emerald-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink">Evaluation progress</p>
          <p className="mt-0.5 text-xs text-muted">
            Evaluate as many projects from other groups as you like. Your group is excluded.
          </p>
        </div>

        <p className="text-sm font-semibold text-emerald-800">
          {data.status.submitted} evaluation(s) submitted
        </p>
      </section>

      <h2 className="mb-3 text-lg font-bold">Your project</h2>

      {data.project ? (
        <GroupProjectPanel
          project={data.project}
          aggregate={data.aggregates[user.groupId]}
          onDescriptionSave={handleDescriptionSave}
          onLogoClick={(url) => setLogoPreview({ url, title: data.project.title })}
        />
      ) : (
        <EmptyState
          title="No group assigned"
          message="You have not been assigned to a group yet."
        />
      )}

      <Modal open={Boolean(logoPreview)} title={`${logoPreview?.title || 'Project'} logo`} onClose={() => setLogoPreview(null)} size="wide">
        <div className="flex max-h-[70vh] min-h-48 items-center justify-center rounded-xl bg-[#0D0D12] p-4">
          <img src={logoPreview?.url} alt={`${logoPreview?.title || 'Project'} logo`} className="max-h-[65vh] max-w-full object-contain" />
        </div>
      </Modal>
    </>
  );
}
