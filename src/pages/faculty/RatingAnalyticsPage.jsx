import { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { ErrorState } from '../../components/Feedback';
import { RatingAnalyticsSkeleton } from '../../components/skeletons/PageSkeletons';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { getAdminRatingAnalytics } from '../../services/evaluationService';
import { getProjects } from '../../services/projectService';
import { evaluationCriteria } from '../../data/settings';
import { formatScore } from '../../utils/ratings';
import { sortOverallGroups, summarizeRatings } from '../../utils/ratingAnalytics';

const GROUPS_PER_PAGE = 10;

export default function RatingAnalyticsPage() {
  const { user } = useAuth();
  const [source, setSource] = useState('both');
  const [categoryId, setCategoryId] = useState('all');
  const [groupId, setGroupId] = useState('all');
  const [overallSortBy, setOverallSortBy] = useState('average');
  const [currentPage, setCurrentPage] = useState(1);
  const [openCategories, setOpenCategories] = useState(
    () => new Set(evaluationCriteria.map((criterion) => criterion.id)),
  );
  const { data, loading, error, reload } = useAsync(
    async (refresh) => {
      const [evaluations, projects] = await Promise.all([
        getAdminRatingAnalytics(user),
        getProjects({ refresh }),
      ]);
      return { evaluations, projects };
    },
    [user?.id],
    `rating-analytics:${user?.id}`,
  );
  const summary = useMemo(
    () => data
      ? summarizeRatings(data.evaluations, data.projects, { source, categoryId, groupId })
      : null,
    [data, source, categoryId, groupId],
  );
  const overallGroups = useMemo(
    () => summary ? sortOverallGroups(summary.overallGroups, overallSortBy) : [],
    [summary, overallSortBy],
  );

  if (loading) return <RatingAnalyticsSkeleton />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const pageCount = Math.max(1, Math.ceil(overallGroups.length / GROUPS_PER_PAGE));
  const page = Math.min(currentPage, pageCount);
  const visibleGroups = overallGroups.slice((page - 1) * GROUPS_PER_PAGE, page * GROUPS_PER_PAGE);
  const firstGroup = overallGroups.length ? (page - 1) * GROUPS_PER_PAGE + 1 : 0;
  const lastGroup = Math.min(page * GROUPS_PER_PAGE, overallGroups.length);
  const selectedCategory = evaluationCriteria.find((criterion) => criterion.id === categoryId);
  const topPerformer = summary?.overallGroups[0];
  const toggleCategory = (categoryIdToToggle) => {
    setOpenCategories((currentOpenCategories) => {
      const nextOpenCategories = new Set(currentOpenCategories);
      if (nextOpenCategories.has(categoryIdToToggle)) {
        nextOpenCategories.delete(categoryIdToToggle);
      } else {
        nextOpenCategories.add(categoryIdToToggle);
      }
      return nextOpenCategories;
    });
  };

  return (
    <>
      <PageHeader
        title="Rating Analytics / Summary"
        subtitle="Compare group performance using evaluation ratings recorded in the system."
      />

      <section
        className="card mb-6 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
        aria-label="System rating summary"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Filtered evaluations</p>
          <p className="mt-1 text-xl font-bold">{summary.evaluationCount.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Top performer</p>
          {topPerformer ? (
            <span className="badge-primary mt-1 inline-flex">
              {topPerformer.groupName} · {formatScore(topPerformer.average)}
            </span>
          ) : (
            <p className="mt-1 text-sm text-muted">No rated groups match these filters.</p>
          )}
        </div>
      </section>

      <section className="card mb-6 overflow-hidden">
        <div className="border-b border-line px-4 py-4 sm:px-5">
          <h2 className="text-lg font-bold">Evaluation category breakdown</h2>
          <p className="mt-1 text-sm text-muted">
            Category and subcriterion averages use a 1–5 scale.
          </p>
        </div>
        {summary.categories.length === 0 ? (
          <p className="p-5 text-sm text-muted">No rubric subcriteria match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[40%]" />
                <col className="w-[25%]" />
                <col className="w-[35%]" />
              </colgroup>
              <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 sm:px-5">Category / subcriterion</th>
                  <th scope="col" className="px-4 py-3">Overall average (1–5)</th>
                  <th scope="col" className="px-4 py-3">Top group</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {summary.categories.map(({ criterion, leaders }) => {
                  const categoryAverage = summary.categoryAverages.find((item) => item.criterion.id === criterion.id);
                  const categorySubcriteria = summary.subcriteria.filter((item) => item.categoryId === criterion.id);
                  const isOpen = openCategories.has(criterion.id);
                  const subcriteriaId = `${criterion.id}-subcriteria`;
                  return [
                    <tr
                      key={criterion.id}
                      className="cursor-pointer bg-surface/60 hover:bg-surface"
                      onClick={() => toggleCategory(criterion.id)}
                    >
                      <th scope="row" className="px-4 py-3 font-bold text-primary sm:px-5">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 text-left"
                          aria-expanded={isOpen}
                          aria-controls={subcriteriaId}
                        >
                          {isOpen
                            ? <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
                            : <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />}
                          {criterion.label}
                        </button>
                      </th>
                      <td className="px-4 py-3 font-bold">
                        {categoryAverage?.average === null || categoryAverage?.average === undefined
                          ? '–'
                          : formatScore(categoryAverage.average)}
                      </td>
                      <td className="px-4 py-3">
                        {leaders.length ? (
                          <div className="flex flex-wrap gap-2">
                            {leaders.map((leader) => (
                              <span key={leader.groupId} className="badge-primary">
                                {leader.groupName} · {formatScore(leader.average)}
                              </span>
                            ))}
                          </div>
                        ) : <span className="text-muted">–</span>}
                      </td>
                    </tr>,
                    <tr key={subcriteriaId} id={subcriteriaId} aria-hidden={!isOpen}>
                      <td colSpan={3} className="p-0">
                        <div
                          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                        >
                          <div className="min-h-0 overflow-hidden">
                            <table className="w-full table-fixed text-left text-sm">
                              <colgroup>
                                <col className="w-[40%]" />
                                <col className="w-[25%]" />
                                <col className="w-[35%]" />
                              </colgroup>
                              <caption className="sr-only">{criterion.label} subcriteria</caption>
                              <thead className="sr-only">
                                <tr>
                                  <th scope="col">Subcriterion</th>
                                  <th scope="col">Average score</th>
                                  <th scope="col">Top group</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-line">
                                {categorySubcriteria.map((subcriterion) => (
                                  <tr key={subcriterion.id}>
                                    <td className="py-3 pl-10 pr-4 text-muted sm:pl-12">{subcriterion.label}</td>
                                    <td className="px-4 py-3 font-semibold">
                                      {subcriterion.average === null ? '–' : formatScore(subcriterion.average)}
                                    </td>
                                    <td aria-hidden="true" />
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>,
                  ];
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-line px-4 py-4 sm:px-5">
          <h2 className="text-lg font-bold">Overall group comparison</h2>
          <p className="mt-1 text-sm text-muted">
            {overallSortBy === 'average'
              ? `Groups ranked by average rating across ${selectedCategory ? selectedCategory.label : 'the selected categories'} (higher is better).`
              : 'Groups ranked by the number of evaluations received (more is better).'}
            {' '}Scores use a 1–5 scale.
          </p>
          <section className="mt-4 rounded-lg border border-line bg-white p-3 sm:p-4" aria-label="Rating analytics filters">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm font-semibold">
                Submitted by
                <span className="relative mt-1.5 block">
                  <select className="form-input appearance-none pr-10" value={source} onChange={(event) => { setSource(event.target.value); setCurrentPage(1); }}>
                    <option value="both">Both (combined)</option>
                    <option value="faculty">Faculty</option>
                    <option value="student">Students</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                </span>
              </label>
              <label className="block text-sm font-semibold">
                Evaluation category
                <span className="relative mt-1.5 block">
                  <select className="form-input appearance-none pr-10" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setCurrentPage(1); }}>
                    <option value="all">All categories</option>
                    {evaluationCriteria.map((criterion) => (
                      <option key={criterion.id} value={criterion.id}>{criterion.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                </span>
              </label>
              <label className="block text-sm font-semibold">
                Software name
                <span className="relative mt-1.5 block">
                  <select className="form-input appearance-none pr-10" value={groupId} onChange={(event) => { setGroupId(event.target.value); setCurrentPage(1); }}>
                    <option value="all">All groups</option>
                    {data.projects.map((project) => (
                      <option key={project.groupId} value={project.groupId}>
                        {project.title || project.groupId}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                </span>
              </label>
            </div>
          </section>
        </div>
        {summary.overallGroups.length === 0 ? (
          <p className="p-5 text-sm text-muted">No ratings match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 sm:px-5">Rank / software</th>
                  {summary.categories.map(({ criterion }) => (
                    <th scope="col" key={criterion.id} className="px-4 py-3">{criterion.label}</th>
                  ))}
                  <th scope="col" className="px-4 py-3">Overall (1–5)</th>
                  <th scope="col" className="px-4 py-3">Evaluations received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visibleGroups.map((group, index) => (
                  <tr key={group.groupId}>
                    <th scope="row" className="px-4 py-3 font-semibold sm:px-5">
                      <span className="mr-2 text-muted">{(page - 1) * GROUPS_PER_PAGE + index + 1}.</span>{group.groupName}
                    </th>
                    {group.categories.map((category) => (
                      <td key={category.criterionId} className="px-4 py-3">
                        {category.average === null ? '–' : formatScore(category.average)}
                      </td>
                    ))}
                    <td className="px-4 py-3 font-bold">{formatScore(group.average)}</td>
                    <td className="px-4 py-3 text-muted">{group.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-col gap-3 border-t border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <label className="flex items-center gap-2 text-sm font-semibold">
            Rank groups by
            <span className="relative block sm:w-56">
              <select
                className="form-input appearance-none pr-10"
                value={overallSortBy}
                onChange={(event) => { setOverallSortBy(event.target.value); setCurrentPage(1); }}
              >
                <option value="average">Average rating</option>
                <option value="evaluations">Evaluations received</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            </span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted">
              Showing {firstGroup}–{lastGroup} of {overallGroups.length} groups
            </span>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setCurrentPage(page - 1)}
              disabled={page === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setCurrentPage(page + 1)}
              disabled={page === pageCount}
              aria-label="Next page"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
