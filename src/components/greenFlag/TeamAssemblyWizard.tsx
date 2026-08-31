import { useState } from 'react';
import { Users, CheckCircle2, ArrowRight, FileText } from 'lucide-react';
import type { TeamAssembly, ServiceMode, TeamMember } from '@/engine/greenflag/teamAssembly';
import { matchContractor, buildTeamAssembly, generateContractTerms } from '@/engine/greenflag/teamAssembly';
import type { Resource } from '@/engine/greenflag/resourceHub';

interface TeamAssemblyWizardProps {
  resources: Resource[];
  projectId: string;
  onComplete?: (team: TeamAssembly) => void;
}

const STEPS = ['Select Mode', 'Match Professionals', 'Review Team', 'Contract'];

export default function TeamAssemblyWizard({ resources, projectId, onComplete }: TeamAssemblyWizardProps) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<ServiceMode>('do-it-together');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [team, setTeam] = useState<TeamAssembly | null>(null);

  const matchModeLabel = (m: ServiceMode) => m === 'do-it-together' ? 'DIY' : m === 'do-it-for-them' ? 'Managed' : 'Independent';

  const handleMatch = () => {
    const requiredRoles = ['architect', 'qs', 'engineer'];
    const matched = matchContractor(resources, { requiredRoles, siteDistanceKm: 20 }, 8);
    const costs = new Map(matched.map((m) => [m.resource.id, Math.round(m.resource.reliabilityScore * 50000)]));
    const assembled = buildTeamAssembly(projectId, mode, matched, costs, new Date().toISOString().split('T')[0]);
    setTeam(assembled);
    setStep(2);
  };

  const handleApprove = () => {
    if (!team) return;
    const approved = { ...team, members: team.members.map((m) => ({ ...m, approved: selectedIds.has(m.resourceId) })), contractGenerated: true };
    setTeam(approved);
    setStep(3);
  };

  const handleGenerateContract = () => {
    if (!team) return;
    generateContractTerms(team);
    onComplete?.({ ...team, contractGenerated: true });
  };

  const toggleMember = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-[var(--brand-accent)]" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Team Assembly</h3>
      </div>

      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <div className={`h-6 w-6 rounded-full text-xs flex items-center justify-center ${i <= step ? 'bg-[var(--brand-accent)] text-black' : 'bg-stone-800 text-stone-500'}`}>
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-xs ${i === step ? 'text-[var(--text-primary)]' : 'text-stone-500'}`}>{s}</span>
            {i < STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-stone-600 mx-1" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-stone-400">How do you want to work with your team?</p>
          {(['do-it-together', 'do-it-for-them', 'do-it-alone'] as ServiceMode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`w-full p-4 rounded-lg border text-left transition-colors ${mode === m ? 'border-[var(--brand-accent)] bg-[var(--bg-secondary)]' : 'border-stone-700 bg-[var(--bg-secondary)]'}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-[var(--text-primary)]">{matchModeLabel(m)}</span>
                {mode === m && <CheckCircle2 className="h-5 w-5 text-[var(--brand-accent)]" />}
              </div>
              <p className="text-xs text-stone-400 mt-1">
                {m === 'do-it-together' && 'Coordinate professionals yourself with DzeNhare tools'}
                {m === 'do-it-for-them' && 'Let DzeNhare Curator match and manage your team'}
                {m === 'do-it-alone' && 'Hire individual professionals directly'}
              </p>
            </button>
          ))}
          <button onClick={() => setStep(1)} className="w-full py-2 bg-[var(--brand-accent)] text-black rounded-lg font-medium text-sm">Next</button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-stone-400">Matching professionals based on your criteria...</p>
          <button onClick={handleMatch} className="w-full py-2 bg-[var(--brand-accent)] text-black rounded-lg font-medium text-sm">Match Professionals</button>
          <button onClick={() => setStep(0)} className="w-full py-2 text-stone-400 text-sm">Back</button>
        </div>
      )}

      {step === 2 && team && (
        <div className="space-y-3">
          <p className="text-sm text-stone-400">Review your team ({team.members.length} professionals matched)</p>
          {team.members.map((m) => (
            <button key={m.resourceId} onClick={() => toggleMember(m.resourceId)}
              className={`w-full p-3 rounded-lg border text-left flex items-center justify-between ${selectedIds.has(m.resourceId) ? 'border-emerald-500 bg-emerald-500/10' : 'border-stone-700'}`}>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs font-bold text-[var(--text-primary)]">
                  {m.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">{m.name}</div>
                  <div className="text-xs text-stone-400">{m.role} · {m.company}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Star className="h-3 w-3 text-[var(--brand-accent)]" />
                <span className="text-[var(--text-primary)] tabular-nums">{m.rating.toFixed(1)}</span>
              </div>
            </button>
          ))}
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="flex-1 py-2 text-stone-400 text-sm border border-stone-700 rounded-lg">Back</button>
            <button onClick={handleApprove} disabled={selectedIds.size === 0}
              className="flex-1 py-2 bg-[var(--brand-accent)] text-black rounded-lg font-medium text-sm disabled:opacity-40">Approve & Generate Contract</button>
          </div>
        </div>
      )}

      {step === 3 && team && (
        <div className="space-y-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Team Assembled & Contract Generated
            </div>
          </div>
          <div className="p-3 bg-[var(--bg-secondary)] border border-stone-700 rounded-lg text-sm space-y-2">
            <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium"><FileText className="h-4 w-4 text-stone-400" />Contract Terms</div>
            <div className="text-xs text-stone-400">
              <p>Payment Schedule: 35% Foundation → 40% Shell → 25% Finishes</p>
              <p>Contingency: Escrow-gated with Digital Twin verification</p>
            </div>
          </div>
          <button onClick={handleGenerateContract} className="w-full py-2 bg-[var(--brand-accent)] text-black rounded-lg font-medium text-sm">Finalize</button>
        </div>
      )}
    </div>
  );
}
