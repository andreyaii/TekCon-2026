import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Calendar, ChevronRight, FlaskConical, MapPin, Rocket, Sparkles, Trophy } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { EmptyState, ErrorState, Loading } from '../../components/Feedback';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { getFinalists, getPublishedProjects } from '../../services/finalistService';
import { getProjects } from '../../services/projectService';
import { basePathFor } from '../../utils/roles';
import { getProjectLogoUrl } from '../../utils/projectLogo';

const competitions = [
  {
    id: 'pitchPerfect',
    label: 'Pitch Perfect',
    icon: Rocket,
    emptyMessage: 'No Pitch Perfect finalists are available yet.',
  },
  {
    id: 'research',
    label: 'Research Conference',
    icon: FlaskConical,
    emptyMessage: 'No Research Conference finalists are available yet.',
  },
  {
    id: 'publishedProjects',
    label: 'Published Projects',
    icon: BookOpen,
    emptyMessage: 'No Published Projects are available yet.',
  },
  {
    id: 'psc',
    label: 'PSC Finalist',
    icon: Trophy,
    emptyMessage: 'No PSC finalists are available yet.',
  },
];

function ProjectLogoThumb({ logoUrl, title }) {
  const [imgError, setImgError] = useState(false);
  const initials = String(title || 'P')
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-surface p-1 shadow-xs overflow-hidden">
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt=""
          className="h-full w-full object-contain rounded-lg"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-lg bg-primary-light font-bold text-xs text-primary">
          {initials || <Sparkles className="h-4 w-4" />}
        </div>
      )}
    </div>
  );
}

export default function FinalistsPage() {
  const { user } = useAuth();
  const [activeCompetition, setActiveCompetition] = useState(competitions[0].id);

  const { data, loading, error, reload } = useAsync(
    async (force) => {
      const [finalistsResult, projectsResult, publishedResult] = await Promise.all([
        getFinalists(),
        getProjects({ refresh: force }).catch(() => []),
        getPublishedProjects().catch(() => []),
      ]);

      const publishedList = (finalistsResult?.publishedProjects && finalistsResult.publishedProjects.length > 0)
        ? finalistsResult.publishedProjects
        : publishedResult;

      return {
        finalists: {
          ...finalistsResult,
          publishedProjects: publishedList || [],
        },
        projects: projectsResult,
      };
    },
    [],
    'finalists-page-data',
  );

  const projectsByCode = useMemo(() => {
    const map = new Map();
    (data?.projects || []).forEach((p) => {
      const code = String(p.groupId || p.id || p.groupCode || '').trim().toLowerCase();
      if (code) map.set(code, p);
    });
    return map;
  }, [data?.projects]);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const competition = competitions.find(({ id }) => id === activeCompetition);
  const isPublishedTab = activeCompetition === 'publishedProjects';

  // Filter out empty rows from the backend
  const rawFinalists = isPublishedTab
    ? (data?.finalists?.publishedProjects || [])
    : (data?.finalists?.[activeCompetition] || []);

  const items = rawFinalists.filter((item) => {
    if (isPublishedTab) {
      return Boolean(item.projectTitle?.trim() || item.paperTitle?.trim() || item.groupCode?.trim());
    }
    return Boolean(item.projectName?.trim() || item.groupCode?.trim());
  });

  const basePath = basePathFor(user);

  return (
    <div className="relative isolate">
      {/* Ambient Background Atmosphere (Adapts seamlessly to light and dark modes) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        {/* Soft atmospheric radial glow */}
        <div
          className="absolute -top-24 left-1/2 h-[420px] w-[750px] -translate-x-1/2 blur-3xl opacity-30 dark:opacity-40"
          style={{
            background: 'radial-gradient(circle at center, rgb(var(--color-primary) / 0.18) 0%, rgb(var(--color-primary) / 0.04) 50%, transparent 75%)',
          }}
        />

        {/* Floating isometric wireframe shape */}
        <svg
          className="absolute right-4 top-10 h-20 w-20 text-primary/15 dark:text-primary/25"
          viewBox="0 0 120 120"
          fill="none"
          style={{ animation: 'login-wireframe-float 10s ease-in-out infinite' }}
        >
          <path d="M60 7 105 33v53L60 112 15 86V33L60 7Z" stroke="currentColor" strokeWidth="1.2" />
          <path d="m15 33 45 27 45-27M60 60v52M38 20l45 27v27L38 47V20Z" stroke="currentColor" strokeWidth="1" />
        </svg>

        {/* Floating tech badge */}
        <div
          className="absolute -left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-xl border border-line bg-surface/50 font-mono text-[11px] font-bold text-primary opacity-30 dark:opacity-40 shadow-xs"
          style={{ animation: 'login-wireframe-float 12s ease-in-out infinite reverse' }}
        >
          &lt;/&gt;
        </div>
      </div>

      <PageHeader title="Finalists" subtitle="Explore the selected projects from both TekCon competitions and published research." />

      {/* Segmented Control & Counter */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Segmented Control Bar (Pitch Perfect | Research Conference | Published Projects) */}
        <div
          className="inline-flex items-center rounded-xl bg-surface p-1 border border-line shadow-card gap-1"
          role="tablist"
          aria-label="Finalist competitions and publications"
        >
          {competitions.map(({ id, label, icon: Icon }) => {
            const isSelected = activeCompetition === id;
            return (
              <button
                key={id}
                id={`finalists-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={`finalists-panel-${id}`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setActiveCompetition(id)}
                className={`relative flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm transition-all duration-150 ${
                  isSelected
                    ? 'bg-white text-primary font-bold shadow-xs border border-line'
                    : 'text-muted hover:text-ink hover:bg-surface/80 font-semibold'
                }`}
                onKeyDown={(event) => {
                  const currentIndex = competitions.findIndex((item) => item.id === activeCompetition);
                  let nextIndex;
                  if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % competitions.length;
                  if (event.key === 'ArrowLeft') nextIndex = (currentIndex + competitions.length - 1) % competitions.length;
                  if (event.key === 'Home') nextIndex = 0;
                  if (event.key === 'End') nextIndex = competitions.length - 1;
                  if (nextIndex !== undefined) {
                    event.preventDefault();
                    const nextId = competitions[nextIndex].id;
                    setActiveCompetition(nextId);
                    event.currentTarget.parentElement
                      .querySelector(`#finalists-tab-${nextId}`)
                      ?.focus();
                  }
                }}
              >
                <Icon className={`h-4 w-4 transition-colors ${isSelected ? 'text-primary' : 'text-muted'}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {items.length > 0 && (
          <span className="text-sm font-medium text-muted">
            Showing <strong className="text-ink font-semibold">{items.length}</strong> {isPublishedTab ? 'published projects' : 'finalists'}
          </span>
        )}
      </div>

      <section
        id={`finalists-panel-${activeCompetition}`}
        role="tabpanel"
        aria-labelledby={`finalists-tab-${activeCompetition}`}
        tabIndex={0}
      >
        {items.length === 0 ? (
          <div className="card">
            <EmptyState title="No items available" message={competition.emptyMessage} />
          </div>
        ) : isPublishedTab ? (
          /* ========================================================= */
          /* PUBLISHED PROJECTS TABLE VIEW                             */
          /* Columns: Project Title, Paper Title, Publication, Date & Place */
          /* ========================================================= */
          <div className="card overflow-hidden divide-y divide-line">
            {/* Table Header (Desktop) */}
            <div className="hidden lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,.75fr)] lg:gap-7 px-8 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted bg-surface/70 border-b border-line">
              <div>Project Title</div>
              <div>Paper Title</div>
              <div>Publication</div>
              <div>Date & Place</div>
            </div>

            {/* Published Project Rows */}
            {items.map((item, index) => {
              const projectLink = `${basePath}/projects/${encodeURIComponent(item.groupCode || item.projectTitle || '')}`;
              const matchedProject = projectsByCode.get(String(item.groupCode || '').trim().toLowerCase());
              const logoUrl = matchedProject ? getProjectLogoUrl(matchedProject) : '';

              return (
                <Link
                  key={`${item.groupCode || item.projectTitle || item.paperTitle}-${index}`}
                  to={projectLink}
                  state={{
                    from: `${basePath}/finalists`,
                    finalist: {
                      ...item,
                      projectName: item.projectTitle,
                      description: item.paperTitle || item.publication,
                    },
                    project: matchedProject,
                  }}
                  className="group block px-8 py-5 sm:py-5 transition-colors duration-150 ease-out hover:bg-surface/60 text-inherit no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                >
                  <div className="lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,.75fr)] lg:gap-7 lg:items-center">
                    {/* 1. Project Title (with Logo) */}
                    <div className="min-w-0 pr-2 flex items-center gap-3.5">
                      <ProjectLogoThumb logoUrl={logoUrl} title={item.projectTitle} />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-base text-ink group-hover:text-primary transition-colors leading-snug whitespace-normal break-words">
                          {item.projectTitle || 'Untitled Project'}
                        </h3>
                      </div>
                    </div>

                    {/* 2. Paper Title */}
                    <div className="min-w-0 pr-2 mt-2.5 lg:mt-0">
                      <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block lg:hidden mb-0.5">
                        Paper Title
                      </span>
                      <p className="text-sm font-medium text-ink leading-relaxed whitespace-normal break-words">
                        {item.paperTitle || '–'}
                      </p>
                    </div>

                    {/* 3. Publication */}
                    <div className="min-w-0 pr-2 mt-2 lg:mt-0">
                      <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block lg:hidden mb-0.5">
                        Publication
                      </span>
                      <span className="inline-block rounded-md bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary max-w-full whitespace-normal break-words">
                        {item.publication || '–'}
                      </span>
                    </div>

                    {/* 4. Date & Place */}
                    <div className="min-w-0 flex items-center justify-between gap-3 mt-2.5 lg:mt-0">
                      <div className="min-w-0 text-xs">
                        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block lg:hidden mb-0.5">
                          Date & Place
                        </span>
                        {item.date && (
                          <p className="font-semibold text-ink flex items-start gap-1.5 whitespace-normal break-words">
                            <Calendar className="h-3.5 w-3.5 text-muted shrink-0" />
                            <span>{item.date}</span>
                          </p>
                        )}
                        {item.place && (
                          <p className="text-muted text-[11px] flex items-start gap-1.5 whitespace-normal break-words mt-0.5">
                            <MapPin className="h-3 w-3 text-muted shrink-0" />
                            <span>{item.place}</span>
                          </p>
                        )}
                        {!item.date && !item.place && <p className="text-muted">–</p>}
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-muted transition-all duration-150 group-hover:bg-primary-light group-hover:text-primary group-hover:translate-x-1">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* ========================================================= */
          /* PITCH PERFECT & RESEARCH CONFERENCE FINALISTS VIEW        */
          /* Columns: Project (Logo + Title + Category), Description   */
          /* (No Adviser column as requested)                          */
          /* ========================================================= */
          <div className="card overflow-hidden divide-y divide-line">
            {/* Table Header (Desktop) */}
            <div className="hidden md:grid md:grid-cols-12 md:gap-6 px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted bg-surface/70 border-b border-line">
              <div className="col-span-5 lg:col-span-4">Project</div>
              <div className="col-span-7 lg:col-span-8">Description</div>
            </div>

            {/* Finalist Rows */}
            {items.map((finalist, index) => {
              const projectLink = `${basePath}/projects/${encodeURIComponent(finalist.groupCode || '')}`;
              const matchedProject = projectsByCode.get(String(finalist.groupCode || '').trim().toLowerCase());
              const logoUrl = matchedProject ? getProjectLogoUrl(matchedProject) : '';

              return (
                <Link
                  key={`${finalist.groupCode || finalist.projectName}-${index}`}
                  to={projectLink}
                  state={{ from: `${basePath}/finalists`, finalist, project: matchedProject }}
                  className="group block px-6 py-4.5 sm:py-5 transition-colors duration-150 ease-out hover:bg-surface/60 text-inherit no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                >
                  <div className="md:grid md:grid-cols-12 md:gap-6 md:items-center">
                    {/* Project Column with Logo & Name */}
                    <div className="md:col-span-5 lg:col-span-4 min-w-0 pr-3 flex items-center gap-3.5">
                      <ProjectLogoThumb logoUrl={logoUrl} title={finalist.projectName} />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-base text-ink group-hover:text-primary transition-colors leading-snug whitespace-normal break-words">
                          {finalist.projectName || 'Untitled Project'}
                        </h3>
                        {finalist.category && (
                          <p className="mt-0.5 text-xs text-muted font-medium truncate">
                            {finalist.category}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Description Column & Action Arrow (No Adviser) */}
                    <div className="md:col-span-7 lg:col-span-8 min-w-0 flex items-center justify-between gap-4 mt-2 md:mt-0">
                      <p className="text-sm leading-relaxed text-muted whitespace-normal break-words flex-1">
                        {finalist.description || 'No description provided.'}
                      </p>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-muted transition-all duration-150 group-hover:bg-primary-light group-hover:text-primary group-hover:translate-x-1">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
