import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Calendar,
  ChevronDown,
  ChevronRight,
  Crown,
  GraduationCap,
  Medal,
  Rocket,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { getWinners } from '../../services/winnerService';
import { getProjects } from '../../services/projectService';
import { basePathFor } from '../../utils/roles';
import { getProjectLogoUrl } from '../../utils/projectLogo';
import { groupWinnersByGroup } from '../../utils/winnerAwards';

const EVENTS = [
  {
    id: 'TEKCON',
    label: 'TEKCON Showcase',
    icon: Trophy,
  },
  {
    id: 'PITCHPERFECT',
    label: 'PITCHPERFECT',
    icon: Rocket,
  },
];

function normalizeCode(val) {
  return String(val || '').trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function normalizeEvent(val) {
  return String(val || '').toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
}

function ProjectLogoThumb({ logoUrl, title, size = 'md' }) {
  const [imgError, setImgError] = useState(false);
  const initials = String(title || 'P')
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  const dimensionClasses = size === 'lg' ? 'h-16 w-16' : 'h-12 w-12';

  return (
    <div
      className={`relative flex ${dimensionClasses} shrink-0 items-center justify-center rounded-2xl border border-line bg-surface p-1 shadow-xs overflow-hidden`}
    >
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt=""
          className="h-full w-full object-contain rounded-xl"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#FF5500]/15 to-surface font-bold text-xs text-[#FF5500]">
          {initials || <Sparkles className="h-4 w-4" />}
        </div>
      )}
    </div>
  );
}

function PodiumCard({ place, winner, project, basePath }) {
  const groupCode = winner.groupCode || project?.groupCode || '';
  const projectTitle = project?.title || winner.awardTitle || groupCode || 'Untitled Project';
  const description = project?.description || '';
  const adviser = project?.facultyId || project?.adviser || '';
  const logoUrl = project ? getProjectLogoUrl(project) : '';
  const projectLink = `${basePath}/projects/${encodeURIComponent(groupCode)}`;

  const isGold = place === 1;

  const config = {
    1: {
      orderClass: 'order-1 md:order-2',
      badgeBg: 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-stone-950 font-extrabold',
      badgeBorder: 'border-amber-300 shadow-xs',
      badgeLabel: '1st Place',
      pedestalHeight: 'h-14 md:h-28',
      pedestalLabel: 'CHAMPION',
      rankTextSize: 'text-4xl md:text-5xl',
      cardBorder: 'border-2 border-amber-400 dark:border-amber-400/80 shadow-xl shadow-amber-500/20 ring-1 ring-amber-300/50',
      cardBg: 'bg-gradient-to-b from-amber-50/70 via-surface to-surface dark:from-[#1c1712] dark:via-[#121218] dark:to-[#121218]',
      pedestalBg: 'bg-gradient-to-b from-amber-400/25 via-amber-400/10 to-transparent dark:from-amber-500/20 dark:to-transparent border-t-2 border-amber-400',
      stepTextColor: 'text-amber-600 dark:text-amber-400/60',
      emphasisClass: 'md:-translate-y-3 md:scale-105 md:z-10',
      icon: Crown,
      stepNumber: '1',
      scaleHover: 'hover:-translate-y-1.5',
    },
    2: {
      orderClass: 'order-2 md:order-1',
      badgeBg: 'bg-gradient-to-r from-slate-100 via-slate-300 to-slate-400 text-slate-950 font-extrabold',
      badgeBorder: 'border-slate-300 shadow-md',
      badgeLabel: '2nd Place',
      pedestalHeight: 'h-12 md:h-20',
      pedestalLabel: 'RUNNER-UP',
      rankTextSize: 'text-3xl md:text-4xl',
      cardBorder: 'border-2 border-slate-300 dark:border-slate-500 shadow-lg shadow-slate-500/10',
      cardBg: 'bg-gradient-to-b from-slate-50/80 via-surface to-surface dark:from-[#16171d] dark:via-[#121218] dark:to-[#121218]',
      pedestalBg: 'bg-gradient-to-b from-slate-200 via-slate-100 to-transparent dark:from-slate-400/15 dark:to-transparent border-t border-slate-300 dark:border-slate-500',
      stepTextColor: 'text-slate-700 dark:text-slate-300',
      emphasisClass: 'md:-translate-y-1',
      icon: Medal,
      stepNumber: '2',
      scaleHover: 'hover:-translate-y-1',
    },
    3: {
      orderClass: 'order-3 md:order-3',
      badgeBg: 'bg-gradient-to-r from-[#C98243] via-[#A85F32] to-[#7A401E] text-white font-extrabold',
      badgeBorder: 'border-[#B96A35] shadow-md',
      badgeLabel: '3rd Place',
      pedestalHeight: 'h-10 md:h-14',
      pedestalLabel: '2ND RUNNER-UP',
      rankTextSize: 'text-3xl md:text-4xl',
      cardBorder: 'border-2 border-[#B87333]/60 dark:border-[#B87333]/80 shadow-lg shadow-[#B87333]/10',
      cardBg: 'bg-gradient-to-b from-[#B87333]/10 via-surface to-surface dark:from-[#1a1310] dark:via-[#121218] dark:to-[#121218]',
      pedestalBg: 'bg-gradient-to-b from-[#B87333]/30 via-[#8C4A20]/15 to-transparent dark:from-[#B87333]/20 dark:to-transparent border-t border-[#8C4A20]/70',
      stepTextColor: 'text-[#8C4A20] dark:text-[#C47A3A]',
      emphasisClass: 'md:-translate-y-1',
      icon: Medal,
      stepNumber: '3',
      scaleHover: 'hover:-translate-y-1',
    },
  }[place];

  const Icon = config.icon;

  return (
    <div className={`flex flex-col ${config.orderClass} ${config.emphasisClass} w-full flex-1 max-w-sm mx-auto transition-transform`}>
      <Link
        to={projectLink}
        state={{ from: `${basePath}/hall-of-fame`, project }}
        aria-label={`${config.badgeLabel}: ${projectTitle}`}
        className={`group relative flex flex-col justify-between rounded-2xl p-6 transition-all duration-200 ${config.scaleHover} ${config.cardBorder} ${config.cardBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500]`}
      >
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm tracking-wide border ${config.badgeBg} ${config.badgeBorder}`}
          >
            <Icon className="h-4 w-4" />
            {config.badgeLabel}
          </span>
          {groupCode && (
            <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-lg border border-line bg-surface/80 text-muted">
              {groupCode}
            </span>
          )}
        </div>

        {/* Project Logo & Info */}
        <div className="space-y-3">
          <div className="flex items-start gap-3.5">
            <ProjectLogoThumb logoUrl={logoUrl} title={projectTitle} size={isGold ? 'lg' : 'md'} />
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF5500] block mb-0.5 truncate">
                {(winner.awardTitles?.length ? winner.awardTitles : [winner.awardTitle || config.badgeLabel]).join(' • ')}
              </span>
              <h4 className="font-bold text-base sm:text-lg text-ink leading-snug group-hover:text-[#FF5500] transition-colors line-clamp-2">
                {projectTitle}
              </h4>
            </div>
          </div>

          {/* Description */}
          {description && (
            <p className="text-xs sm:text-sm text-muted leading-relaxed line-clamp-3">
              {description}
            </p>
          )}

          {/* Adviser */}
          {adviser && (
            <div className="flex items-center gap-1.5 pt-2.5 border-t border-line text-xs font-medium text-muted">
              <GraduationCap className="h-3.5 w-3.5 text-[#FF5500] shrink-0" />
              <span className="truncate">Adviser: <strong className="text-ink font-semibold">{adviser}</strong></span>
            </div>
          )}
        </div>

        {/* Action Link Footer */}
        <div className="mt-4 flex items-center justify-end text-xs font-semibold text-[#FF5500] group-hover:translate-x-0.5 transition-transform">
          <span>View Project</span>
          <ChevronRight className="h-4 w-4 ml-0.5" />
        </div>
      </Link>

      {/* Podium Pedestal Base */}
      <div
        className={`flex flex-col items-center justify-center rounded-b-xl ${config.pedestalBg} ${config.pedestalHeight} transition-all duration-300 mt-1 shadow-xs`}
      >
        <span className={`font-black leading-none ${config.rankTextSize} ${config.stepTextColor}`}>
          {config.stepNumber}
        </span>
        <span className={`mt-1 text-[9px] md:text-[10px] font-black tracking-[0.18em] ${config.stepTextColor}`}>
          {config.pedestalLabel}
        </span>
      </div>
    </div>
  );
}

function AwardCard({ winner, project, basePath }) {
  const groupCode = winner.groupCode || project?.groupCode || '';
  const projectTitle = project?.title || winner.awardTitle || groupCode || 'Untitled Project';
  const description = project?.description || '';
  const adviser = project?.facultyId || project?.adviser || '';
  const logoUrl = project ? getProjectLogoUrl(project) : '';
  const projectLink = `${basePath}/projects/${encodeURIComponent(groupCode)}`;
  const awardTitles = winner.awardTitles?.length
    ? winner.awardTitles
    : [winner.awardTitle || 'Special Award'];
  const awardCategories = winner.awardCategories?.length
    ? winner.awardCategories
    : [winner.awardCategory || 'Recognition'];

  return (
    <Link
      to={projectLink}
      state={{ from: `${basePath}/hall-of-fame`, project }}
      aria-label={`Award winner: ${projectTitle}`}
      className="group relative flex min-h-[190px] w-full flex-col justify-between overflow-hidden rounded-2xl border border-amber-300/50 bg-gradient-to-br from-amber-100/45 via-[#FF5500]/5 to-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-amber-400/70 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5500] dark:border-amber-400/25 dark:from-amber-400/10 dark:via-[#FF5500]/8"
    >
      <div className="pointer-events-none absolute right-[-28px] top-[-28px] h-24 w-24 rounded-full border border-amber-300/30 bg-amber-300/10" aria-hidden="true" />
      <div className="pointer-events-none absolute right-[-12px] top-[-12px] h-14 w-14 rounded-full border border-amber-400/30" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-amber-400/80 via-[#FF5500]/60 to-transparent" aria-hidden="true" />

      <div>
        {/* Award Title Badge & Group Code */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {awardTitles.map((title) => (
              <span key={title} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/70 bg-gradient-to-r from-amber-300 to-amber-400 px-2.5 py-1.5 text-xs font-extrabold text-amber-950 shadow-sm shadow-amber-400/20">
                <Trophy className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate max-w-[220px]">{title}</span>
              </span>
            ))}
          </div>
          {groupCode && (
            <span className="rounded-lg border border-[#FF5500]/20 bg-surface/90 px-2.5 py-1 font-mono text-[11px] font-bold text-ink shadow-xs">
              {groupCode}
            </span>
          )}
        </div>

        {/* Project Logo & Title */}
        <div className="flex items-start gap-3.5">
          <div className="rounded-2xl ring-2 ring-[#FF5500]/15 ring-offset-2 ring-offset-surface">
            <ProjectLogoThumb logoUrl={logoUrl} title={projectTitle} size="md" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.16em] text-[#FF5500]">
              Award Winner
            </span>
            <h4 className="font-bold text-base sm:text-lg text-ink leading-snug group-hover:text-[#FF5500] transition-colors line-clamp-2">
              {projectTitle}
            </h4>
            {adviser && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                <GraduationCap className="h-3 w-3 text-[#FF5500] shrink-0" />
                <span className="truncate">Adviser: <strong className="text-ink font-semibold">{adviser}</strong></span>
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="mt-3 text-xs text-muted leading-relaxed line-clamp-2">
            {description}
          </p>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between text-xs text-muted">
        <span className="text-[11px] text-muted truncate max-w-[70%]">{awardCategories.join(', ')}</span>
        <span className="font-semibold text-[#FF5500] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
          Details <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

export default function HallOfFamePage() {
  const { user } = useAuth();
  const basePath = basePathFor(user);

  const [activeEvent, setActiveEvent] = useState(EVENTS[0].id);
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [collapsedAwardCategories, setCollapsedAwardCategories] = useState({});

  const { data, loading, error, reload } = useAsync(
    async (force) => {
      const [winnersResult, projectsResult] = await Promise.all([
        getWinners(),
        getProjects({ refresh: force }).catch(() => []),
      ]);

      return {
        winners: winnersResult || [],
        projects: projectsResult || [],
      };
    },
    [],
    'hall-of-fame-data',
  );

  const projectsByCode = useMemo(() => {
    const map = new Map();
    (data?.projects || []).forEach((p) => {
      const rawCode = p.groupId || p.id || p.groupCode || '';
      const norm = normalizeCode(rawCode);
      if (norm) map.set(norm, p);
    });
    return map;
  }, [data?.projects]);

  const rawWinners = useMemo(() => {
    return Array.isArray(data?.winners) ? data.winners : [];
  }, [data?.winners]);

  // Dynamically extract available years from actual published records
  const availableYears = useMemo(() => {
    const years = new Set();
    rawWinners.forEach((w) => {
      const y = String(w.awardYear || '').trim();
      if (y) years.add(y);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  }, [rawWinners]);

  // Filter winners by selected Event & Year
  const filteredWinners = useMemo(() => {
    const normActiveEvent = normalizeEvent(activeEvent);
    return rawWinners.filter((winner) => {
      const winnerEvent = normalizeEvent(winner.event);
      const eventMatches =
        winnerEvent === normActiveEvent ||
        winnerEvent.includes(normActiveEvent) ||
        normActiveEvent.includes(winnerEvent);

      if (!eventMatches) return false;

      if (selectedYear !== 'ALL') {
        const winnerYear = String(winner.awardYear || '').trim();
        if (winnerYear !== selectedYear) return false;
      }

      return true;
    });
  }, [rawWinners, activeEvent, selectedYear]);

  // Group filtered winners by award category
  const categories = useMemo(() => {
    const isPitchPerfect = normalizeEvent(activeEvent) === 'PITCHPERFECT';
    const deduplicate = normalizeEvent(activeEvent) === 'TEKCON';
    const categoryMap = new Map();
    const groupedWinners = groupWinnersByGroup(filteredWinners, { deduplicate, isPitchPerfect });

    groupedWinners.forEach((winner) => {
      const cat = String(winner.awardCategory || '').trim() || 'Major Awards';
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, []);
      }
      categoryMap.get(cat).push(winner);
    });

    const result = [];
    categoryMap.forEach((winners, catName) => {
      winners.sort((a, b) => (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999));

      let first = null;
      let second = null;
      let third = null;
      const others = [];

      winners.forEach((winner) => {
        if (winner.podiumPlace === 1 && !first) {
          first = winner;
        } else if (winner.podiumPlace === 2 && !second) {
          second = winner;
        } else if (winner.podiumPlace === 3 && !third) {
          third = winner;
        } else {
          others.push(winner);
        }
      });

      const hasPodium = isPitchPerfect && Boolean(first || second || third);

      result.push({
        name: catName,
        hasPodium,
        podium: { first, second, third },
        others,
        total: winners.length,
      });
    });

    return result;
  }, [filteredWinners, activeEvent]);

  const totalHonorees = categories.reduce((total, category) => total + category.total, 0);

  return (
    <div className="relative isolate">
      {/* Ambient background atmosphere (adapts gracefully to light and dark modes) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-40 dark:opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(currentColor 1px, transparent 1px),
              linear-gradient(90deg, currentColor 1px, transparent 1px)
            `,
            backgroundSize: '44px 44px',
            color: 'rgba(120, 120, 130, 0.12)',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          }}
        />

        {/* Soft atmospheric orange glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 h-[380px] w-[650px] -z-10 rounded-full blur-3xl opacity-20 dark:opacity-30"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, #FF5500 0%, rgba(255, 85, 0, 0.12) 50%, transparent 75%)',
          }}
        />

        {/* Floating tech badge */}
        <div
          className="absolute -left-3 top-48 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface/50 font-mono text-[11px] font-bold text-[#FF5500] opacity-30 shadow-xs"
          style={{ animation: 'login-wireframe-float 13s ease-in-out infinite reverse' }}
        >
          <Award className="h-5 w-5 text-[#FF5500]" />
        </div>
      </div>

      {/* Header Section: Harmonized with website typography and PageHeader feel */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          {/* Badge */}
          

          {/* Heading */}
          <h1 className="text-2xl font-bold leading-tight sm:text-[1.75rem] text-ink">
            Hall of Fame
          </h1>

          {/* Subtitle */}
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">
            Showcasing the distinguished winners, grand champions, and breakthrough innovators of TEKCON and PITCHPERFECT.
          </p>
        </div>

        {/* Dynamic Total Honorees Counter */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface px-4 py-2.5 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF5500] to-[#E04400] text-white shadow-sm shadow-[#FF5500]/25">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Total Honorees</p>
            <p className="text-xl font-bold text-ink leading-tight">
              {totalHonorees}
            </p>
          </div>
        </div>
      </div>

      {/* Filters: Segmented Tabs + Dynamic Award Year */}
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        {/* Segmented Tabs (TEKCON Showcase | PITCHPERFECT) */}
        <div
          className="inline-flex items-center rounded-xl bg-surface p-1 border border-line shadow-card gap-1"
          role="tablist"
          aria-label="Hall of Fame competition switch"
        >
          {EVENTS.map(({ id, label, icon: Icon }) => {
            const isSelected = activeEvent === id;
            return (
              <button
                key={id}
                id={`event-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={`event-panel-${id}`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setActiveEvent(id)}
                className={`relative flex items-center gap-2 rounded-lg px-4 sm:px-5 py-2 text-xs sm:text-sm transition-all duration-150 ${
                  isSelected
                    ? 'bg-[#FF5500] text-white font-bold shadow-xs'
                    : 'text-muted hover:text-ink hover:bg-surface/80 font-semibold'
                }`}
                onKeyDown={(event) => {
                  const currentIndex = EVENTS.findIndex((item) => item.id === activeEvent);
                  let nextIndex;
                  if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % EVENTS.length;
                  if (event.key === 'ArrowLeft') nextIndex = (currentIndex + EVENTS.length - 1) % EVENTS.length;
                  if (event.key === 'Home') nextIndex = 0;
                  if (event.key === 'End') nextIndex = EVENTS.length - 1;
                  if (nextIndex !== undefined) {
                    event.preventDefault();
                    const nextId = EVENTS[nextIndex].id;
                    setActiveEvent(nextId);
                    event.currentTarget.parentElement
                      .querySelector(`#event-tab-${nextId}`)
                      ?.focus();
                  }
                }}
              >
                <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-muted'}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Year Filter Dropdown */}
        <div className="flex items-center gap-3">
          <label htmlFor="hof-year-filter" className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Calendar className="h-4 w-4 text-[#FF5500]" />
            <span>Award Year:</span>
          </label>
          <div className="relative">
            <select
              id="hof-year-filter"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="appearance-none rounded-xl border border-line bg-surface py-1.5 pl-3 pr-10 text-xs sm:text-sm font-semibold text-ink shadow-xs focus:border-[#FF5500] focus:outline-none focus:ring-1 focus:ring-[#FF5500]"
            >
              <option value="ALL">All Years</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          </div>
        </div>
      </div>

      {/* Main Winners Display or Empty State */}
      <section
        id={`event-panel-${activeEvent}`}
        role="tabpanel"
        aria-labelledby={`event-tab-${activeEvent}`}
        tabIndex={0}
      >
        {loading ? (
          <div className="py-24 text-center">
            <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF5500]/10 text-[#FF5500]">
              <Trophy className="h-8 w-8 animate-pulse" />
            </div>
            <p className="text-sm font-semibold text-muted">Loading Hall of Fame records…</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-sm text-red-500">{error?.message || 'Failed to load Hall of Fame records.'}</p>
            <button
              type="button"
              onClick={reload}
              className="mt-4 inline-flex items-center rounded-xl bg-[#FF5500] px-4 py-2 text-xs font-bold text-white hover:bg-[#E04400]"
            >
              Retry
            </button>
          </div>
        ) : filteredWinners.length === 0 ? (
          /* Empty State - Adapts cleanly to light and dark modes */
          <div className="rounded-2xl border border-line bg-surface p-8 sm:p-12 text-center max-w-lg mx-auto shadow-card my-6">
            <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#FF5500]/30 bg-[#FF5500]/10 text-[#FF5500] shadow-sm">
              <Trophy className="h-8 w-8 text-[#FF5500]" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-ink">
              No Hall of Fame Records Yet
            </h3>
            <p className="mt-2 text-sm text-muted leading-relaxed max-w-md mx-auto">
              Official competition winners and honorees will be showcased here once the awarding results are finalized.
            </p>
            <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <span>🔒</span>
              <span>Awaiting Final Awarding Results</span>
            </div>
          </div>
        ) : (
          /* Winners Grouped by Category */
          <div className="space-y-12">
            {categories.map((category, categoryIndex) => {
              const { name, hasPodium, podium, others } = category;
              const isAwardsCollapsed = Boolean(collapsedAwardCategories[name]);
              const awardsPanelId = `special-awards-${categoryIndex}`;

              return (
                <div key={name} className="space-y-6">
                  {/* Category Header */}
                  <div className="flex items-center gap-3 border-b border-line pb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF5500]/15 text-[#FF5500]">
                      <Award className="h-4 w-4" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-ink">
                      {name}
                    </h2>
                    <span className="ml-auto rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted border border-line">
                      {category.total} {category.total === 1 ? 'winner' : 'winners'}
                    </span>
                  </div>

                  {/* Podium Layout for 1st, 2nd, 3rd place */}
                  {hasPodium && (
                    <div className="pt-4 pb-6">
                      <div className="flex flex-col md:flex-row items-end justify-center gap-4 lg:gap-6">
                        {podium.second && (
                          <PodiumCard
                            place={2}
                            winner={podium.second}
                            project={projectsByCode.get(normalizeCode(podium.second.groupCode))}
                            basePath={basePath}
                          />
                        )}
                        {podium.first && (
                          <PodiumCard
                            place={1}
                            winner={podium.first}
                            project={projectsByCode.get(normalizeCode(podium.first.groupCode))}
                            basePath={basePath}
                          />
                        )}
                        {podium.third && (
                          <PodiumCard
                            place={3}
                            winner={podium.third}
                            project={projectsByCode.get(normalizeCode(podium.third.groupCode))}
                            basePath={basePath}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Other Awards / Special Citations in this category */}
                  {others.length > 0 && (
                    <div>
                      <button
                        type="button"
                        aria-expanded={!isAwardsCollapsed}
                        aria-controls={awardsPanelId}
                        onClick={() =>
                          setCollapsedAwardCategories((current) => ({
                            ...current,
                            [name]: !current[name],
                          }))
                        }
                        className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted transition-colors hover:text-ink"
                      >
                        <ChevronRight className={`h-4 w-4 transition-transform ${isAwardsCollapsed ? '' : 'rotate-90'}`} />
                        <span>Award Winners</span>
                        <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] normal-case tracking-normal">
                          {others.length}
                        </span>
                      </button>
                      <div
                        id={awardsPanelId}
                        className={`${isAwardsCollapsed ? 'hidden' : 'grid w-full grid-cols-1 gap-4'}`}
                      >
                        {others.map((winner, idx) => (
                          <AwardCard
                            key={`${winner.winnerId || winner.groupCode}-${idx}`}
                            winner={winner}
                            project={projectsByCode.get(normalizeCode(winner.groupCode))}
                            basePath={basePath}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
