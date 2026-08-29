export interface GanttTask {
  id: string;
  name: string;
  wbsCode?: string;
  phase: string;
  startDate: string;
  endDate: string;
  progressPct: number;
  dependencies: string[];
  critical: boolean;
  assignedTo?: string;
}

export interface CriticalPath {
  tasks: GanttTask[];
  totalDurationDays: number;
  criticalPathIds: string[];
  floatDays: Map<string, number>;
  projectFinishDate: string;
}

export interface WbsDictionaryEntry {
  id: string;
  projectId: string;
  code: string;
  level: number;
  name: string;
  category: string;
  parent: string | null;
}

export interface RiskRegisterEntry {
  id: string;
  projectId: string;
  code: string;
  category: string;
  description: string;
  probability: 'low' | 'medium' | 'high' | 'critical';
  impact: 'negligible' | 'minor' | 'moderate' | 'major' | 'severe';
  score: number;
  status: 'open' | 'mitigated' | 'closed' | 'accepted';
  owner: string;
  mitigation: string;
  contingencyCents: number;
  createdAt: string;
}

export interface SovLineItem {
  id: string;
  projectId: string;
  wbsCode: string;
  description: string;
  unit: string;
  quantity: number;
  rateCents: number;
  amountCents: number;
  schedulePct: number;
  earnedCents: number;
  retainedCents: number;
}

export interface CashflowProjectionMonth {
  monthKey: string;
  label: string;
  plannedInflowCents: number;
  plannedOutflowCents: number;
  netCents: number;
  cumulativeNetCents: number;
}

export interface CashflowProjectionResult {
  months: CashflowProjectionMonth[];
  totalInflowCents: number;
  totalOutflowCents: number;
  nextCashflowDate: string;
  nextCashflowCents: number;
}

export interface CriticalPathResult {
  schedule: ScheduleRecord[];
  criticalPath: string[];
  totalDurationDays: number;
}

export interface ScheduleRecord {
  id: string;
  projectId: string;
  task: string;
  wbsCode: string;
  startDate: string;
  durationDays: number;
  predecessors: string[];
  critical: boolean;
  costCents: number;
}

function daysBetween(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}

export function buildScheduleFromMilestones(
  milestones: { id: string; title: string; plannedDays: number; category: string; dependencies?: string[] }[],
): GanttTask[] {
  let dayOffset = 0;
  return milestones.map((m, i) => {
    const start = dayOffset;
    const duration = Math.max(m.plannedDays, 1);
    dayOffset += duration;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + start);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + start + duration);
    return {
      id: m.id,
      name: m.title,
      phase: m.category,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      progressPct: 0,
      dependencies: m.dependencies ?? (i > 0 ? [milestones[i - 1].id] : []),
      critical: false,
    };
  });
}

export function computeCriticalPath(tasks: GanttTask[]): CriticalPath {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const earliest = new Map<string, number>();
  const duration = (id: string) => {
    const t = taskMap.get(id);
    return t ? daysBetween(t.startDate, t.endDate) : 0;
  };

  for (const t of tasks) {
    const deps = t.dependencies.filter((d) => taskMap.has(d));
    const maxDepEnd = deps.length > 0 ? Math.max(...deps.map((d) => (earliest.get(d) ?? 0) + duration(d))) : 0;
    earliest.set(t.id, maxDepEnd);
  }

  const latest = new Map<string, number>();
  const maxEarliestEnd = Math.max(...tasks.map((t) => (earliest.get(t.id) ?? 0) + duration(t.id)));
  for (const t of [...tasks].reverse()) {
    const dependents = tasks.filter((tt) => tt.dependencies.includes(t.id));
    const minDepStart = dependents.length > 0
      ? Math.min(...dependents.map((d) => latest.get(d.id) ?? maxEarliestEnd))
      : maxEarliestEnd;
    latest.set(t.id, minDepStart - duration(t.id));
  }

  const criticalPathIds: string[] = [];
  const floatDays = new Map<string, number>();
  for (const t of tasks) {
    const float = (latest.get(t.id) ?? 0) - (earliest.get(t.id) ?? 0);
    floatDays.set(t.id, Math.max(0, float));
    const isCritical = Math.abs(float) < 1;
    if (isCritical) criticalPathIds.push(t.id);
  }

  const criticalTasks = tasks.map((t) => ({ ...t, critical: criticalPathIds.includes(t.id) }));
  const finishDate = new Date();
  finishDate.setDate(finishDate.getDate() + maxEarliestEnd);

  return {
    tasks: criticalTasks,
    totalDurationDays: maxEarliestEnd,
    criticalPathIds,
    floatDays,
    projectFinishDate: finishDate.toISOString().split('T')[0],
  };
}

export function findCriticalPath(
  ids: string[],
  predMap: Map<string, string[]>,
  totalDurationDays: number
): string[] {
  if (ids.length === 0 || totalDurationDays === 0) return [];

  const taskMap = new Map(ids.map((id) => [id, { id, duration: 1 }]));
  const earliest = new Map<string, number>();
  const latest = new Map<string, number>();

  for (const id of ids) {
    const preds = predMap.get(id) ?? [];
    const maxPredEnd = preds.length > 0 ? Math.max(...preds.map((p) => (earliest.get(p) ?? 0) + (taskMap.get(p)?.duration ?? 1))) : 0;
    earliest.set(id, maxPredEnd);
  }

  const maxEarliestEnd = Math.max(...ids.map((id) => (earliest.get(id) ?? 0) + (taskMap.get(id)?.duration ?? 1)));

  for (const id of [...ids].reverse()) {
    const succs = ids.filter((other) => predMap.get(other)?.includes(id));
    const minSuccStart = succs.length > 0
      ? Math.min(...succs.map((s) => latest.get(s) ?? maxEarliestEnd))
      : maxEarliestEnd;
    latest.set(id, minSuccStart - (taskMap.get(id)?.duration ?? 1));
  }

  const critical: string[] = [];
  for (const id of ids) {
    const float = (latest.get(id) ?? 0) - (earliest.get(id) ?? 0);
    if (Math.abs(float) < 1) critical.push(id);
  }

  return critical;
}

export function buildCriticalPath(tasks: ScheduleRecord[]): CriticalPathResult {
  if (tasks.length === 0) {
    return { schedule: [], criticalPath: [], totalDurationDays: 0 };
  }

  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const earliestStart = new Map<string, number>();

  for (const t of tasks) {
    const preds = t.predecessors.filter((p) => taskMap.has(p));
    const maxPredEnd = preds.length > 0
      ? Math.max(...preds.map((p) => (earliestStart.get(p) ?? 0) + (taskMap.get(p)?.durationDays ?? 0)))
      : 0;
    earliestStart.set(t.id, maxPredEnd);
  }

  const earliestFinish = new Map<string, number>();
  for (const t of tasks) {
    earliestFinish.set(t.id, (earliestStart.get(t.id) ?? 0) + t.durationDays);
  }

  const totalDurationDays = Math.max(...earliestFinish.values());

  const latestStart = new Map<string, number>();
  for (const t of [...tasks].reverse()) {
    const succs = tasks.filter((other) => other.predecessors.includes(t.id));
    const minSuccStart = succs.length > 0
      ? Math.min(...succs.map((s) => latestStart.get(s.id) ?? totalDurationDays))
      : totalDurationDays;
    latestStart.set(t.id, minSuccStart - t.durationDays);
  }

  const criticalPath: string[] = [];
  for (const t of tasks) {
    const float = (latestStart.get(t.id) ?? 0) - (earliestStart.get(t.id) ?? 0);
    if (Math.abs(float) < 1) criticalPath.push(t.id);
  }

  const schedule: ScheduleRecord[] = tasks.map((t) => ({
    ...t,
    startDays: earliestStart.get(t.id) ?? 0,
    endDays: earliestFinish.get(t.id) ?? 0,
    critical: criticalPath.includes(t.id),
  }));

  return { schedule, criticalPath, totalDurationDays };
}

export function toGanttRows(
  schedule: (ScheduleRecord & { startDays?: number; endDays?: number })[],
  progressMap?: Record<string, number>
): Array<{ id: string; name: string; startDays: number; endDays: number; progressPct: number; critical: boolean }> {
  return schedule.map((t) => ({
    id: t.id,
    name: t.task,
    startDays: (t as any).startDays ?? 0,
    endDays: (t as any).endDays ?? 0,
    progressPct: progressMap?.[t.id] ?? 0,
    critical: t.critical ?? false,
  }));
}

export function buildWbsDictionary(projectId: string, tasks: ScheduleRecord[]): WbsDictionaryEntry[] {
  const seen = new Set<string>();
  const entries: WbsDictionaryEntry[] = [];

  for (const t of tasks) {
    if (seen.has(t.wbsCode)) continue;
    seen.add(t.wbsCode);

    const firstSegment = t.wbsCode.split('.')[0];
    const parent = firstSegment ? `wbs-${firstSegment}` : null;

    entries.push({
      id: `wbs-${t.wbsCode}`,
      projectId,
      code: t.wbsCode,
      level: 1,
      name: t.task,
      category: 'section',
      parent,
    });
  }

  return entries;
}

type RiskProbability = 'low' | 'medium' | 'high' | 'critical';

export function buildRiskRegister(
  projectId: string,
  _tasks: ScheduleRecord[],
  baseline: { totalCents: number },
  volatility: number = 0.25
): RiskRegisterEntry[] {
  const categories = [
    { cat: 'Schedule', desc: 'Critical path delay', impact: 'severe' as const, score: 4 + Math.round(volatility * 10), prob: (volatility > 0.3 ? 'critical' : 'high') as RiskProbability },
    { cat: 'Cost', desc: 'Budget overrun', impact: 'major' as const, score: 4 + Math.round(volatility * 10), prob: (volatility > 0.3 ? 'critical' : 'high') as RiskProbability },
    { cat: 'Quality', desc: 'Non-conformance to spec', impact: 'moderate' as const, score: 4 + Math.round(volatility * 5), prob: (volatility > 0.3 ? 'critical' : 'medium') as RiskProbability },
    { cat: 'Safety', desc: 'Site accident', impact: 'severe' as const, score: 3 + Math.round(volatility * 5), prob: (volatility > 0.3 ? 'high' : 'medium') as RiskProbability },
    { cat: 'Procurement', desc: 'Material delivery delay', impact: 'moderate' as const, score: 3 + Math.round(volatility * 5), prob: (volatility > 0.3 ? 'high' : 'medium') as RiskProbability },
    { cat: 'Weather', desc: 'Adverse weather delay', impact: 'minor' as const, score: 2 + Math.round(volatility * 5), prob: 'medium' as RiskProbability },
    { cat: 'Labour', desc: 'Skilled labour shortage', impact: 'moderate' as const, score: 3 + Math.round(volatility * 5), prob: (volatility > 0.3 ? 'high' : 'medium') as RiskProbability },
    { cat: 'Scope', desc: 'Scope creep', impact: 'major' as const, score: 4 + Math.round(volatility * 5), prob: (volatility > 0.3 ? 'critical' : 'high') as RiskProbability },
  ];

  return categories.map((c, i) => ({
    id: `risk-${projectId}-${i}`,
    projectId,
    code: `R-${i + 1}`,
    category: c.cat,
    description: c.desc,
    probability: c.prob,
    impact: c.impact,
    score: c.score,
    status: 'open' as const,
    owner: 'Project Manager',
    mitigation: `Mitigation for ${c.desc.toLowerCase()}`,
    contingencyCents: Math.round(baseline.totalCents * 0.02),
    createdAt: new Date().toISOString(),
  }));
}

export function buildScheduleOfValues(
  projectId: string,
  schedule: ScheduleRecord[],
  _baseline: { totalCents: number }
): SovLineItem[] {
  const grouped = new Map<string, { wbsCode: string; tasks: ScheduleRecord[]; totalCost: number }>();
  for (const t of schedule) {
    const existing = grouped.get(t.wbsCode) ?? { wbsCode: t.wbsCode, tasks: [], totalCost: 0 };
    existing.tasks.push(t);
    existing.totalCost += t.costCents;
    grouped.set(t.wbsCode, existing);
  }

  const lines: SovLineItem[] = [];
  let totalAmount = 0;
  for (const [wbsCode, group] of grouped) {
    const amountCents = group.totalCost;
    totalAmount += amountCents;
    lines.push({
      id: `sov-${wbsCode}`,
      projectId,
      wbsCode,
      description: group.tasks[0]?.task ?? wbsCode,
      unit: 'lot',
      quantity: 1,
      rateCents: amountCents,
      amountCents,
      schedulePct: 0,
      earnedCents: 0,
      retainedCents: 0,
    });
  }

  return lines;
}

export function monthlyCashflowProjection(
  baseline: { totalCents: number } | null,
  tasks: ScheduleRecord[],
  startMonth: string = '2026-07-01',
  months: number = 12
): CashflowProjectionResult {
  if (!baseline || tasks.length === 0) {
    return { months: [], totalInflowCents: 0, totalOutflowCents: 0, nextCashflowDate: '', nextCashflowCents: 0 };
  }

  const result = buildCriticalPath(tasks);
  const totalDuration = result.totalDurationDays;

  const monthsArr: CashflowProjectionMonth[] = [];
  const [startYear, startMonthNum] = startMonth.split('-').map(Number);
  let totalInflow = 0;
  let totalOutflow = 0;
  let cumulativeNet = 0;

  for (let i = 0; i < months; i++) {
    const monthNum = startMonthNum + i;
    const year = startYear + Math.floor((monthNum - 1) / 12);
    const month = ((monthNum - 1) % 12) + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const label = new Date(year, month - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });

    const dayStart = i * Math.max(1, Math.floor(totalDuration / months));
    const dayEnd = dayStart + Math.max(1, Math.floor(totalDuration / months));
    const progressStart = totalDuration > 0 ? dayStart / totalDuration : 0;
    const progressEnd = totalDuration > 0 ? dayEnd / totalDuration : 1;
    const progress = (progressStart + progressEnd) / 2;

    const plannedInflowCents = Math.round(baseline.totalCents * progress * 1.15);
    const plannedOutflowCents = Math.round(baseline.totalCents * progress * 0.85);
    const netCents = plannedInflowCents - plannedOutflowCents;
    cumulativeNet += netCents;

    totalInflow += plannedInflowCents;
    totalOutflow += plannedOutflowCents;

    monthsArr.push({
      monthKey,
      label,
      plannedInflowCents,
      plannedOutflowCents,
      netCents,
      cumulativeNetCents: cumulativeNet,
    });
  }

  const nextMonth = monthsArr.find((m) => m.plannedInflowCents > 0);
  return {
    months: monthsArr,
    totalInflowCents: totalInflow,
    totalOutflowCents: totalOutflow,
    nextCashflowDate: nextMonth?.monthKey ?? '',
    nextCashflowCents: nextMonth?.plannedInflowCents ?? 0,
  };
}

export function cashflowCurve(
  baseline: { totalCents: number } | null,
  schedule: ScheduleRecord[]
): Array<{ day: number; cumulativeCents: number }> {
  if (!baseline || schedule.length === 0) return [];

  const result = buildCriticalPath(schedule);
  const totalDuration = result.totalDurationDays;
  if (totalDuration === 0) return [];

  const points: Array<{ day: number; cumulativeCents: number }> = [];
  for (let day = 0; day <= totalDuration; day++) {
    const progress = day / totalDuration;
    const cumulativeCents = Math.round(baseline.totalCents * progress);
    points.push({ day, cumulativeCents });
  }

  return points;
}

export function ganttProgress(tasks: GanttTask[]): { overallPct: number; byPhase: Map<string, number>; overdueCount: number; completedCount: number } {
  const today = new Date().toISOString().split('T')[0];
  let overdueCount = 0;
  let completedCount = 0;
  const phaseProgress = new Map<string, number[]>();

  for (const t of tasks) {
    if (t.progressPct >= 100) completedCount++;
    else if (today > t.endDate && t.progressPct < 100) overdueCount++;

    const existing = phaseProgress.get(t.phase) ?? [];
    existing.push(t.progressPct);
    phaseProgress.set(t.phase, existing);
  }

  const byPhase = new Map<string, number>();
  for (const [phase, progs] of phaseProgress) {
    byPhase.set(phase, Math.round(progs.reduce((s, p) => s + p, 0) / progs.length));
  }

  const overallPct = tasks.length > 0 ? Math.round(tasks.reduce((s, t) => s + t.progressPct, 0) / tasks.length) : 0;
  return { overallPct, byPhase, overdueCount, completedCount };
}