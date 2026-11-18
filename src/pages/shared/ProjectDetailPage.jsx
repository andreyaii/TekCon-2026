import { Link, useLocation, useParams } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Lock } from 'lucide-react';
import Modal from '../../components/Modal';
import MemberList from '../../components/MemberList';
import ResourceLinks from '../../components/ResourceLinks';
import RatingSummary from '../../components/RatingSummary';
import EvaluationCounter from '../../components/EvaluationCounter';
import { ErrorState, EmptyState } from '../../components/Feedback';
import { ProjectDetailsSkeleton } from '../../components/skeletons/PageSkeletons';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useAsync } from '../../hooks/useAsync';
import { getProjectById } from '../../services/projectService';
import { getAggregates, getEligibility, getEvaluationsForGroup } from '../../services/evaluationService';
import { isStudent, isFaculty, isGuest, isAdmin, basePathFor } from '../../utils/roles';
import { formatDate, formatScore } from '../../utils/ratings';
import { getProjectLogoUrl } from '../../utils/projectLogo';

function EvaluateBox({ eligibility, status, projectId, isStudent }) {
  if (!eligibility) return null;
  if (eligibility.code === 'duplicate') {
    return <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-5 w-5" /> You have submitted an evaluation for this group.</p>;
  }
  const evaluatePath = isStudent ? `/student/projects/${projectId}/evaluate` : `/faculty/projects/${projectId}/evaluate`;
  return (
    <div className="space-y-3">
      {isStudent && <EvaluationCounter status={status} />}
      {eligibility.canEvaluate ? (
        <Link to={evaluatePath} className="btn-primary">Evaluate Project</Link>
      ) : (
        <>
          <button className="btn-primary" disabled><Lock className="h-4 w-4" /> Evaluate Project</button>
          <p className="text-sm text-muted">{eligibility.reason}</p>
        </>
      )}
    </div>
  );
}

function ReceivedEvaluations({ evaluations }) {
  return (
    <section className="card p-5">
      <h2 className="mb-3 text-lg font-bold">Evaluations Received ({evaluations.length})</h2>
      {evaluations.length === 0 ? <p className="text-sm text-muted">No evaluations yet.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead><tr className="border-b border-line text-xs text-muted"><th className="py-2 pr-3">Evaluator</th><th className="pr-3">Overall</th><th className="pr-3">Comments</th><th>Date</th></tr></thead>
            <tbody>
              {evaluations.map((evaluation) => (
                <tr key={evaluation.id} className="border-b border-line last:border-0 align-top">
                  <td className="py-2 pr-3"><span className="font-semibold">{evaluation.evaluatorName}</span><span className="block text-xs text-muted">{evaluation.evaluatorGroup}</span></td>
                  <td className="pr-3 font-bold text-star">{formatScore(evaluation.overallScore)}</td>
                  <td className="pr-3 text-muted">{evaluation.comments || '–'}</td>
                  <td className="whitespace-nowrap text-muted">{formatDate(evaluation.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// Shared by /student/projects/:id and /faculty/projects/:id.
export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const { ratingsShown } = useSettings();
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const student = isStudent(user);
  const faculty = isFaculty(user);
  const admin = isAdmin(user);
  const guest = isGuest(user);
  const base = basePathFor(user);

  const { data, loading, error, reload } = useAsync(async (force) => {
    const project = await getProjectById(projectId, { refresh: force });
    if (!project) return { project: null };
    const [aggregates, eligibility, received] = await Promise.all([
      getAggregates(user),
      !guest ? getEligibility(user.id, project.groupId) : null,
      admin ? getEvaluationsForGroup(project.groupId, user) : null,
    ]);
    return {
      project,
      aggregate: aggregates[project.groupId],
      eligibility,
      status: eligibility,
      received,
    };
  }, [projectId, user.id], `project-detail:${guest ? 'guest' : admin ? 'admin' : student ? 'student' : 'faculty'}:${user.id}:${projectId}`);

  if (loading) return <ProjectDetailsSkeleton />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const { project, aggregate, eligibility, status, received } = data;

  const projectsPath = student ? `${base}/explore` : `${base}/all-projects`;
  const returnPath = location.state?.from;
  const backToProjects = typeof returnPath === 'string'
    && (returnPath === projectsPath || returnPath.startsWith(`${projectsPath}?`))
    ? returnPath
    : projectsPath;
  const back = (
    <Link to={backToProjects} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
      <ArrowLeft className="h-4 w-4" /> Back to projects
    </Link>
  );
  if (!project) return <>{back}<EmptyState title="Project not found" message="This project does not exist or was removed." /></>;

  const isOwn = student && project.groupId === user.groupId;
  const logoUrl = getProjectLogoUrl(project);

  return (
    <div className="space-y-6">
      {back}
      <section className="overflow-hidden rounded-card border border-line bg-surface text-ink">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          {logoUrl && (
            <button type="button" onClick={() => setLogoPreviewUrl(logoUrl)}
              className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl border border-line bg-[#fff] p-1.5 sm:h-32 sm:w-32"
              aria-label={`Preview ${project.title} logo`}>
              <img src={logoUrl} alt="" className="h-full w-full object-contain" />
            </button>
          )}
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-primary">{project.group?.groupName || 'Group information unavailable'}</p>
              {isOwn && <span className="badge-primary">My Group</span>}
            </div>
            <h1 className="text-2xl font-bold leading-snug sm:text-3xl">{project.title}</h1>
            <p className="max-w-4xl text-sm leading-6 text-muted">{project.description}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3 p-5 sm:p-6"><h2 className="text-lg font-bold">Team members</h2><MemberList members={project.group?.members || []} /></section>
        <section className="card space-y-3 p-5 sm:p-6"><h2 className="text-lg font-bold">Project resources</h2><ResourceLinks project={project} onLogoClick={setLogoPreviewUrl} /></section>
      </div>

      {ratingsShown && <section className="card space-y-3 p-5 sm:p-6"><h2 className="text-lg font-bold">Rating</h2><RatingSummary aggregate={aggregate} /></section>}

      {!guest && (
        <section className="card space-y-3 p-5 sm:p-6">
          <h2 className="text-lg font-bold">Evaluate this project</h2>
          <EvaluateBox eligibility={eligibility} status={status} projectId={project.id} isStudent={student} />
        </section>
      )}
      {admin && <ReceivedEvaluations evaluations={received || []} />}
      <Modal open={Boolean(logoPreviewUrl)} title={`${project.title} logo`} onClose={() => setLogoPreviewUrl('')} size="wide">
        <div className="flex max-h-[70vh] min-h-48 items-center justify-center rounded-xl bg-[#0D0D12] p-4">
          <img src={logoPreviewUrl} alt={`${project.title} logo`} className="max-h-[65vh] max-w-full object-contain" />
        </div>
      </Modal>
    </div>
  );
}
