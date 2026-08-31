import { useState, useMemo } from 'react';
import { Search, MapPin, Star, ShieldCheck, Award, Users, ChevronRight } from 'lucide-react';
import type { Resource, ResourceFilter } from '@/engine/greenflag/resourceHub';
import { filterResources, rankResources, greenFlagScore } from '@/engine/greenflag/resourceHub';

interface GreenFlagResourceHubProps {
  resources: Resource[];
  onSelect?: (resource: Resource) => void;
  filters?: ResourceFilter;
}

export default function GreenFlagResourceHub({ resources, onSelect, filters: externalFilters }: GreenFlagResourceHubProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<Resource['type'] | ''>('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const filtered = useMemo(() => {
    const base = externalFilters ? filterResources(resources, externalFilters) : resources;
    const withSearch = searchQuery
      ? base.filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.specialization.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())))
      : base;
    const withRole = roleFilter ? withSearch.filter((r) => r.type === roleFilter) : withSearch;
    return rankResources(withRole);
  }, [resources, searchQuery, roleFilter, externalFilters]);

  const roles = useMemo(() => {
    const set = new Set(resources.map((r) => r.type));
    return [...set];
  }, [resources]);

  const tierIcon = (tier: string) => {
    if (tier === 'platinum') return <Award className="h-4 w-4 text-cyan-400" />;
    if (tier === 'gold') return <Star className="h-4 w-4 text-[var(--brand-accent)]" />;
    return <ShieldCheck className="h-4 w-4 text-emerald-400" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--brand-accent)]" />
            Resource Hub
          </h3>
          <p className="text-sm text-stone-400 mt-0.5">Find trusted professionals in your area</p>
        </div>
        <span className="text-xs text-stone-400 tabular-nums">{filtered.length} results</span>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
          <input
            type="text"
            placeholder="Search by name or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--bg-secondary)] border border-stone-700 rounded-lg text-[var(--text-primary)] placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as Resource['type'] | '')}
          className="px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-stone-700 rounded-lg text-[var(--text-primary)]"
        >
          <option value="">All roles</option>
          {roles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="px-3 py-2 text-sm text-stone-400 hover:text-[var(--text-primary)] border border-stone-700 rounded-lg"
        >
          Filters
        </button>
      </div>

      {showAdvanced && (
        <div className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-stone-700 text-sm text-stone-400">
          Advanced filters coming soon — location radius, WIPAA health, availability window
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map((resource) => {
          const { score, tier } = greenFlagScore(resource);
          return (
            <button
              key={resource.id}
              onClick={() => onSelect?.(resource)}
              className="w-full text-left p-4 bg-[var(--bg-secondary)] border border-stone-700 rounded-lg hover:border-[var(--brand-accent)] transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-sm font-bold text-[var(--text-primary)]">
                    {resource.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--text-primary)]">{resource.name}</span>
                      {tierIcon(tier)}
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-stone-400">{resource.role}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-stone-400">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{resource.locationLabel}</span>
                      <span className="flex items-center gap-1"><Star className="h-3 w-3" />{resource.rating.toFixed(1)}</span>
                      <span>{resource.totalProjects} projects</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-medium tabular-nums" style={{ color: score >= 75 ? 'var(--success-color, #10b981)' : score >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {score}%
                  </span>
                  <ChevronRight className="h-4 w-4 text-stone-500 group-hover:text-[var(--brand-accent)]" />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-stone-500">On-time</span>
                  <span className="ml-1 text-[var(--text-primary)] tabular-nums">{resource.onTimeDeliveryPct}%</span>
                </div>
                <div>
                  <span className="text-stone-500">WIPAA</span>
                  <span className="ml-1 tabular-nums" style={{ color: resource.wipaaHealthPct >= 85 ? '#10b981' : '#f59e0b' }}>{resource.wipaaHealthPct}%</span>
                </div>
                <div>
                  <span className="text-stone-500">Defects</span>
                  <span className="ml-1 text-[var(--text-primary)] tabular-nums">{resource.defectRatePct}%</span>
                </div>
              </div>

              {resource.specialization.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {resource.specialization.slice(0, 4).map((s) => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">{s}</span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-stone-500 text-sm">
          No resources match your search. Try broadening your filters.
        </div>
      )}
    </div>
  );
}
