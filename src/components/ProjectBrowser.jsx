import { useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react';
import ProjectCard from './ProjectCard';
import { EmptyState } from './Feedback';
import { useSettings } from '../context/SettingsContext';

// Search + category filter + sort over project cards. Shared by Explore and All Projects.
export default function ProjectBrowser({ projects, aggregates = {}, linkFor, badgeFor, fullCardLink = false, paginate = false }) {
  const { ratingsShown } = useSettings();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('default');
  const [pageSize, setPageSize] = useState(6);
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);

  const setPage = (nextPage, { replace = false } = {}) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextPage === 1) nextParams.delete('page');
    else nextParams.set('page', String(nextPage));
    setSearchParams(nextParams, { replace });
  };

  const categories = useMemo(
    () => [...new Set(projects.map((project) => project.category).filter(Boolean))].sort(),
    [projects]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = projects.filter((p) =>
      (category === 'all' || p.category === category) &&
      (!q || [p.title, p.description, p.category, p.group?.groupName].some((f) => String(f || '').toLowerCase().includes(q))));
    const sorters = {
      default: () => 0,
      'title-asc': (a, b) => a.title.localeCompare(b.title),
      'title-desc': (a, b) => b.title.localeCompare(a.title),
      'top-rated': (a, b) => (aggregates[b.groupId]?.average ?? 0) - (aggregates[a.groupId]?.average ?? 0),
    };
    return [...list].sort(sorters[sort === 'top-rated' && !ratingsShown ? 'default' : sort]);
  }, [projects, aggregates, query, category, sort, ratingsShown]);

  const pageCount = paginate ? Math.max(1, Math.ceil(visible.length / pageSize)) : 1;
  const currentPage = Math.min(page, pageCount);
  const pageProjects = paginate
    ? visible.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : visible;
  const firstProject = visible.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastProject = Math.min(currentPage * pageSize, visible.length);

  return (
    <>
      <section className="mb-5 rounded-card border border-line bg-white p-3 sm:p-4" aria-label="Project filters">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
          <SlidersHorizontal className="h-4 w-4" /> Discover projects
          <span className="ml-auto normal-case tracking-normal">{visible.length} {visible.length === 1 ? 'project' : 'projects'}</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input className="form-input pl-9" placeholder="Search title, description, category, or group" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1, { replace: true }); }} aria-label="Search projects" />
          </div>
          <label className="relative block min-w-0">
            <select className="form-input min-w-0 appearance-none pr-9 sm:w-auto" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1, { replace: true }); }} aria-label="Filter by category">
              <option value="all">All Categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          </label>
          <label className="relative block min-w-0">
            <select className="form-input min-w-0 appearance-none pr-9 sm:w-auto" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1, { replace: true }); }} aria-label="Sort projects">
              <option value="default">Group order</option>
              <option value="title-asc">Title A–Z</option>
              <option value="title-desc">Title Z–A</option>
              {ratingsShown && <option value="top-rated">Top rated</option>}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          </label>
        </div>
      </section>

      <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.length === 0 ? (
          <EmptyState title="No projects found" message="Try a different search term or category." />
        ) : pageProjects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            to={linkFor(p)}
            state={{ from: `${location.pathname}${location.search}` }}
            aggregate={aggregates[p.groupId]}
            badge={badgeFor?.(p)}
            fullCardLink={fullCardLink}
          />
        ))}
      </div>
      {paginate && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            <span>Cards per page</span>
            <span className="relative block">
            <select
              className="form-input w-auto appearance-none pr-9"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1, { replace: true });
              }}
              aria-label="Cards per page"
            >
              {[6, 12, 18, 24].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            </span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted">
              Showing {firstProject}–{lastProject} of {visible.length}
            </span>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage === pageCount}
              aria-label="Next page"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
