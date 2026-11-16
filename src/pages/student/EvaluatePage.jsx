import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import StarRating from '../../components/StarRating';
import ConfirmDialog from '../../components/ConfirmDialog';
import EvaluationCounter from '../../components/EvaluationCounter';
import { Loading, ErrorState, EmptyState } from '../../components/Feedback';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import { invalidateAsyncCache, useAsync } from '../../hooks/useAsync';
import { evaluationRubric } from '../../data/evaluationRubric';
import { getProjectById } from '../../services/projectService';
import { getEligibility, getEvaluationStatus, submitEvaluation } from '../../services/evaluationService';
import { hasCriterionSubmission } from '../../utils/evaluationResources';
import { isStudent } from '../../utils/roles';

export default function EvaluatePage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();
  const navigate = useNavigate();
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [refreshedStatus, setRefreshedStatus] = useState(null);
  const [statusRefreshError, setStatusRefreshError] = useState('');

  const { data, loading, error, reload } = useAsync(async (force) => {
    const project = await getProjectById(projectId, { refresh: force });
    if (!project) return { project: null };
    const eligibility = await getEligibility(user.id, project.groupId);
    return { project, eligibility, status: eligibility };
  }, [projectId, user.id], `student-evaluate:${user.id}:${projectId}`);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const { project, eligibility, status } = data;
  const studentUser = isStudent(user);
  const back = studentUser ? `/student/projects/${projectId}` : `/faculty/projects/${projectId}`;

  if (!project) return <EmptyState title="Project not found" action={<Link to={studentUser ? "/student/explore" : "/faculty/all-projects"} className="btn-secondary">Back to Projects</Link>} />;

  if (submissionComplete) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="card space-y-3 p-6 text-center">
          <h1 className="text-xl font-bold">Evaluation submitted</h1>
          <p className="text-sm text-muted">Your evaluation of {project.group?.groupName || 'this group'} was saved successfully.</p>
        </div>
        {studentUser && <EvaluationCounter status={refreshedStatus || status} />}
        {statusRefreshError && <p className="text-center text-sm text-red-600">{statusRefreshError}</p>}
        <div className="flex justify-center">
          <Link to={studentUser ? "/student/evaluations" : "/faculty/all-projects"} className="btn-primary">
            {studentUser ? "View My Evaluations" : "Back to All Projects"}
          </Link>
        </div>
      </div>
    );
  }

  if (!eligibility.canEvaluate) {
    return (
      <div className="space-y-4">
        <Link to={back} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back to project</Link>
        <div className="card p-8 text-center">
          <Lock className="mx-auto mb-3 h-10 w-10 text-muted" />
          <h1 className="text-xl font-bold">Evaluation unavailable</h1>
          <p className="mt-1 text-sm text-muted">{eligibility.reason}</p>
        </div>
      </div>
    );
  }

  const ratingFields = evaluationRubric.flatMap((category) => category.subcriteria.map((subcriterion) => ({
    id: subcriterion.id,
    available: hasCriterionSubmission(project, category.resourceCriterionId),
  })));
  const availableCriteria = ratingFields.filter((field) => field.available);
  const complete = availableCriteria.length > 0 && ratingFields.every((field) => (
    !field.available
    || Number.isInteger(ratings[field.id]) && ratings[field.id] >= 1 && ratings[field.id] <= 5
  ));

  const submit = async () => {
    setBusy(true);
    try {
      await submitEvaluation({ evaluatorId: user.id, evaluatedGroupId: project.groupId, ratings, comments });
    } catch (e) {
      toast.error(e.message || 'Could not submit the evaluation. Please try again.');
      setConfirming(false);
      setBusy(false);
      reload();
      return;
    }

    invalidateAsyncCache();
    setSubmissionComplete(true);
    setConfirming(false);
    toast.success('Evaluation submitted.');
    if (studentUser) {
      try {
        const nextStatus = await getEvaluationStatus(user.id);
        setRefreshedStatus(nextStatus);
        navigate('/student/evaluations', { replace: true });
      } catch (e) {
        setStatusRefreshError(e.message || 'Could not refresh your evaluation status.');
      } finally {
        setBusy(false);
      }
    } else {
      setBusy(false);
      navigate('/faculty/all-projects', { replace: true });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to={back} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back to project</Link>

      <header className="border-b border-line pb-4">
        <p className="mb-1 text-xs font-semibold text-primary">Project evaluation · {project.group?.groupName || 'Group'}</p>
        <h1 className="text-2xl font-bold leading-snug">{project.title}</h1>
        <p className="mt-1 text-sm text-muted">Rate each submitted Project Logo, Project Poster, and Video Pitch subcriterion from 1 to 5. Categories without a submission are disabled; comments are optional.</p>
      </header>
      {studentUser && <EvaluationCounter status={status} />}

      <form className="card p-5 sm:p-7" onSubmit={(e) => { e.preventDefault(); if (complete) setConfirming(true); }}>
        <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">Rate each subcriterion independently. Each category score is the average of its three subcriteria.</p>

        <div className="divide-y divide-line">
          {evaluationRubric.map((category) => {
            const categoryAvailable = hasCriterionSubmission(project, category.resourceCriterionId);
            return (
              <section
                key={category.id}
                className={`my-4 rounded-xl border border-primary/20 p-4 sm:p-5 ${!categoryAvailable ? 'opacity-50' : ''}`}
              >
                <h2 className="mb-3 border-b border-line pb-3 text-lg font-extrabold tracking-tight text-primary sm:text-xl">
                  {category.criterion}
                </h2>
                {!categoryAvailable && (
                  <p className="mb-3 text-xs text-muted">Not submitted — this category cannot be rated.</p>
                )}
                <div className="divide-y divide-line">
                  {category.subcriteria.map((subcriterion) => (
                    <fieldset
                      key={subcriterion.id}
                      disabled={busy || !categoryAvailable}
                      aria-disabled={!categoryAvailable}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 last:pb-1"
                    >
                      <legend className="sr-only">{subcriterion.label}</legend>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{subcriterion.label}</p>
                        <p className="mt-0.5 text-xs leading-5 text-muted">{subcriterion.guide}</p>
                      </div>
                      <StarRating
                        value={ratings[subcriterion.id] || 0}
                        label={`${category.criterion}: ${subcriterion.label}`}
                        disabled={busy || !categoryAvailable}
                        onChange={(value) => setRatings((current) => ({
                          ...current,
                          [subcriterion.id]: value,
                        }))}
                      />
                    </fieldset>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div>
          <label className="form-label" htmlFor="comments">Comments (optional)</label>
          <textarea id="comments" rows={4} maxLength={settings.commentMaxLength} className="form-input resize-y" value={comments} onChange={(e) => setComments(e.target.value)} disabled={busy} placeholder="Share constructive feedback for this group…" />
          <p className="mt-1 text-right text-xs text-muted">{comments.length}/{settings.commentMaxLength}</p>
        </div>

        {!complete && <p className="text-sm text-muted">{availableCriteria.length ? 'Rate every subcriterion for each submitted category to enable submission.' : 'No Logo, Poster, or Video Pitch resources have been submitted to evaluate.'}</p>}
        <div className="flex flex-col-reverse justify-end gap-2 border-t border-line pt-4 sm:flex-row">
          <Link to={back} className="btn-secondary">Cancel</Link>
          <button className="btn-primary" disabled={!complete || busy}>{busy ? 'Submitting…' : 'Submit Evaluation'}</button>
        </div>
      </form>

      <ConfirmDialog open={confirming} busy={busy} onCancel={() => setConfirming(false)} onConfirm={submit}
        title="Submit evaluation?" confirmLabel="Submit Evaluation"
        message={`Your evaluation of ${project.group.groupName} cannot be edited or resubmitted.`} />
    </div>
  );
}
