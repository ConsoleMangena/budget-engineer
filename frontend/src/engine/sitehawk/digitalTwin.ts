import type { InspectionCategory } from '@/domain/sitehawk';

export interface PhotoCheckpoint {
  id: string;
  zone: string;
  photoUrl: string;
  uploadedAt: string;
  gpsLat?: number;
  gpsLng?: number;
  verifiedBy?: string;
  verifiedAt?: string;
  status: 'uploaded' | 'approved' | 'rejected';
  notes?: string;
}

export interface ProgressEntry {
  id: string;
  zone: string;
  trade: string;
  phase: string;
  plannedProgressPct: number;
  actualProgressPct: number;
  deviationPct: number;
  recordedAt: string;
  recordedBy?: string;
  photoCheckpoints: PhotoCheckpoint[];
  milestoneId?: string;
  milestoneReleased: boolean;
}

export interface ZoneProgress {
  zone: string;
  totalPlannedPct: number;
  totalActualPct: number;
  entries: ProgressEntry[];
  photoCount: number;
  approvedPhotoCount: number;
  deviationPct: number;
}

export interface VerificationGate {
  id: string;
  milestoneId: string;
  gateType: 'progress' | 'photo' | 'financial' | 'safety';
  required: boolean;
  passed: boolean;
  checkedBy?: string;
  checkedAt?: string;
  reason?: string;
}

export interface TwinSnapshot {
  id: string;
  projectId: string;
  milestoneId: string | null;
  capturedAt: string;
  geoLat: number | null;
  geoLng: number | null;
  note: string;
  progressPct: number;
  status: 'verified' | 'pending' | 'rejected';
  photoDataUrl?: string;
  photoName?: string;
  thumbnailUrl?: string;
  is360?: boolean;
}

export interface VerificationReport {
  id: string;
  projectId: string;
  milestoneId: string | null;
  method: 'ai-vision' | 'drone' | 'manual' | 'structural-engineer';
  verdict: 'pass' | 'fail' | 'inconclusive';
  confidence: number;
  details: string;
  createdAt: string;
}

export function trackProgress(entries: ProgressEntry[]): {
  zones: ZoneProgress[];
  overallActualPct: number;
  overallPlannedPct: number;
  overallDeviationPct: number;
  totalPhotos: number;
  approvedPhotos: number;
  releasedMilestones: number;
  totalMilestones: number;
} {
  const zoneMap = new Map<string, ProgressEntry[]>();
  for (const e of entries) {
    const existing = zoneMap.get(e.zone) ?? [];
    existing.push(e);
    zoneMap.set(e.zone, existing);
  }

  const zones: ZoneProgress[] = [...zoneMap.entries()].map(([zone, zoneEntries]) => {
    const totalPlannedPct = Math.round(zoneEntries.reduce((s, e) => s + e.plannedProgressPct, 0) / zoneEntries.length);
    const totalActualPct = Math.round(zoneEntries.reduce((s, e) => s + e.actualProgressPct, 0) / zoneEntries.length);
    const photoCount = zoneEntries.reduce((s, e) => s + e.photoCheckpoints.length, 0);
    const approvedPhotoCount = zoneEntries.reduce((s, e) => s + e.photoCheckpoints.filter((p) => p.status === 'approved').length, 0);
    return {
      zone,
      totalPlannedPct,
      totalActualPct,
      entries: zoneEntries,
      photoCount,
      approvedPhotoCount,
      deviationPct: totalActualPct - totalPlannedPct,
    };
  });

  const overallActualPct = entries.length > 0 ? Math.round(entries.reduce((s, e) => s + e.actualProgressPct, 0) / entries.length) : 0;
  const overallPlannedPct = entries.length > 0 ? Math.round(entries.reduce((s, e) => s + e.plannedProgressPct, 0) / entries.length) : 0;
  const totalPhotos = entries.reduce((s, e) => s + e.photoCheckpoints.length, 0);
  const approvedPhotos = entries.reduce((s, e) => s + e.photoCheckpoints.filter((p) => p.status === 'approved').length, 0);
  const releasedMilestones = entries.filter((e) => e.milestoneReleased && e.milestoneId).length;
  const totalMilestones = entries.filter((e) => e.milestoneId).length;

  return {
    zones,
    overallActualPct,
    overallPlannedPct,
    overallDeviationPct: overallActualPct - overallPlannedPct,
    totalPhotos,
    approvedPhotos,
    releasedMilestones,
    totalMilestones,
  };
}

export function checkVerificationGates(gates: VerificationGate[]): {
  total: number;
  passed: number;
  pending: number;
  failed: number;
  allPassed: boolean;
  blockedGates: VerificationGate[];
} {
  const passed = gates.filter((g) => g.passed).length;
  const pending = gates.filter((g) => !g.passed && !g.reason).length;
  const failed = gates.filter((g) => !g.passed && g.reason).length;
  const blockedGates = gates.filter((g) => g.required && !g.passed);
  return { total: gates.length, passed, pending, failed, allPassed: blockedGates.length === 0, blockedGates };
}

export function photoQualityCheck(checkpoints: PhotoCheckpoint[]): {
  approved: PhotoCheckpoint[];
  rejected: PhotoCheckpoint[];
  pending: PhotoCheckpoint[];
  geoTaggedPct: number;
} {
  const approved = checkpoints.filter((p) => p.status === 'approved');
  const rejected = checkpoints.filter((p) => p.status === 'rejected');
  const pending = checkpoints.filter((p) => p.status === 'uploaded');
  const geoTagged = checkpoints.filter((p) => p.gpsLat !== undefined && p.gpsLng !== undefined);
  return { approved, rejected, pending, geoTaggedPct: checkpoints.length > 0 ? Math.round(geoTagged.length / checkpoints.length * 100) : 0 };
}

export function photoTimeline(
  entries: (ProgressEntry | TwinSnapshot)[]
): Array<{ date: string; zone: string; photos: PhotoCheckpoint[] } | { date: string; geoLabel: string; hasPhoto: boolean }> {
  if (entries.length === 0) return [];
  const isTwin = 'geoLat' in entries[0];

  if (isTwin) {
    const twins = entries as TwinSnapshot[];
    return twins.map((e) => ({
      date: e.capturedAt.slice(0, 10),
      geoLabel: `${e.geoLat?.toFixed(1) ?? '0'}, ${e.geoLng?.toFixed(1) ?? '0'}`,
      hasPhoto: !!e.photoDataUrl,
    }));
  }

  // ProgressEntry path
  const map = new Map<string, { zone: string; photos: PhotoCheckpoint[] }>();
  for (const e of entries as ProgressEntry[]) {
    for (const p of e.photoCheckpoints ?? []) {
      const key = p.uploadedAt.slice(0, 10);
      const existing = map.get(key) ?? { zone: e.zone, photos: [] };
      existing.photos.push(p);
      map.set(key, existing);
    }
  }
  return [...map.entries()].map(([date, v]) => ({ date, zone: v.zone, photos: v.photos }));
}

function clampCoord(coord: number): number | null {
  if (!Number.isFinite(coord)) return null;
  return Math.round(coord * 1_000_000) / 1_000_000;
}

function toISO(input: string | Date | undefined): string {
  if (input instanceof Date) return input.toISOString();
  if (typeof input === 'string') return input;
  return new Date().toISOString();
}

export function createTwinSnapshot(input: {
  projectId: string;
  milestoneId?: string | null;
  geoLat: number;
  geoLng: number;
  note: string;
  progressPct: number;
  now?: string | Date;
}): TwinSnapshot | null {
  const lat = clampCoord(input.geoLat);
  const lng = clampCoord(input.geoLng);
  if (lat === null || lng === null) return null;
  const progressPct = Math.min(Math.max(input.progressPct, 0), 100);
  return {
    id: `ts-${input.projectId}-${Date.now()}`,
    projectId: input.projectId,
    milestoneId: input.milestoneId ?? null,
    capturedAt: toISO(input.now),
    geoLat: lat,
    geoLng: lng,
    note: input.note,
    progressPct,
    status: 'pending',
  };
}

export function createVerificationReport(input: {
  projectId: string;
  milestoneId: string | null;
  method: 'ai-vision' | 'drone' | 'manual' | 'structural-engineer';
  verdict: 'pass' | 'fail' | 'inconclusive';
  confidence: number;
  details: string;
  now?: string;
}): VerificationReport {
  const confidence = Math.max(0, Math.min(100, Math.round(input.confidence)));
  return {
    id: `vr-${input.projectId}-${Date.now()}`,
    projectId: input.projectId,
    milestoneId: input.milestoneId,
    method: input.method,
    verdict: input.verdict,
    confidence,
    details: input.details,
    createdAt: input.now ?? new Date().toISOString(),
  };
}

export function twinSummary(state: { snapshots: TwinSnapshot[]; reports: VerificationReport[] }): {
  snapshots: number;
  verified: number;
  avgConfidence: number;
  latestProgressPct: number;
} {
  const verified = state.reports.filter((r) => r.verdict === 'pass').length;
  const avgConfidence = state.reports.length > 0
    ? Math.round(state.reports.reduce((s, r) => s + r.confidence, 0) / state.reports.length)
    : 0;
  const latestProgressPct = state.snapshots.length > 0
    ? Math.max(...state.snapshots.map((s) => s.progressPct))
    : 0;
  return { snapshots: state.snapshots.length, verified, avgConfidence, latestProgressPct };
}

export function milestoneProgressFor(
  split: Array<{ name: string; pct: number }>,
  state: { snapshots: TwinSnapshot[]; reports: VerificationReport[] }
): Array<{ name: string; pct: number; progressPct: number; verified: boolean }> {
  const allPassed = state.reports.length > 0 && state.reports.every((r) => r.verdict === 'pass');
  const hasSnapshots = state.snapshots.length > 0;

  // Build map of milestoneId -> progressPct from snapshots
  const snapshotProgress = new Map<string, number>();
  for (const s of state.snapshots) {
    if (s.milestoneId && s.progressPct !== undefined) {
      snapshotProgress.set(s.milestoneId, s.progressPct);
    }
  }

  return split.map((s, i) => {
    // Try to find matching snapshot by index or name
    const milestoneId = `m${i + 1}`; // heuristic: m1, m2, etc.
    const snapshotPct = snapshotProgress.get(milestoneId);
    return {
      ...s,
      progressPct: snapshotPct ?? (hasSnapshots ? s.pct : 0),
      verified: allPassed,
    };
  });
}

export function evaluateEscrowTrigger(
  input:
    | ProgressEntry[]
    | { milestoneName: string; verificationPassed: boolean; checklistSignedOff: boolean; photosCount: number; photosVerified: number },
  milestoneId?: string
): { release: boolean; reason: string } | string {
  // New signature: ProgressEntry[] + milestoneId
  if (Array.isArray(input)) {
    const entries = input;
    if (!milestoneId) return { release: false, reason: 'No milestoneId provided' };
    const milestoneEntries = entries.filter((e) => e.milestoneId === milestoneId);
    if (milestoneEntries.length === 0) return { release: false, reason: 'No progress entries for milestone' };
    const avgActual = milestoneEntries.reduce((s, e) => s + e.actualProgressPct, 0) / milestoneEntries.length;
    const allPhotosApproved = milestoneEntries.every((e) => e.photoCheckpoints.every((p) => p.status === 'approved'));
    if (avgActual >= 95 && allPhotosApproved) return { release: true, reason: 'Milestone complete and verified' };
    return { release: false, reason: `Progress ${avgActual.toFixed(1)}%, photos ${allPhotosApproved ? 'approved' : 'pending'}` };
  }

  // Old signature: object with milestoneName, verificationPassed, etc.
  const { verificationPassed, checklistSignedOff, photosCount, photosVerified } = input;
  if (!verificationPassed) return 'awaiting-verification';
  if (!checklistSignedOff) return 'awaiting-checklist';
  if (photosCount === 0) return 'insufficient-photos';
  if (photosVerified < photosCount) return 'blocked';
  return 'release-ready';
}

export function buildInspectionChecklist(
  input:
    | string
    | { projectId: string; category: InspectionCategory; items?: string[]; milestoneName?: string; now?: string | Date }
): Array<{ id: string; item: string; completed: boolean }> | { items: Array<{ id: string; checked: boolean }>; projectId: string; category: InspectionCategory; milestoneName: string; createdAt: string; signedOff: boolean; signedOffBy: string | null; signedOffAt: string | null } {
  // Old signature: object with items array
  if (typeof input === 'object' && input !== null && 'items' in input) {
    const { projectId, category, items, milestoneName, now } = input;
    const createdAt = (now instanceof Date ? now : new Date(now ?? Date.now())).toISOString();
    return {
      projectId,
      category,
      milestoneName: milestoneName ?? '',
      items: (items ?? []).map((_item, i) => ({ id: `${category}-${i}`, checked: false })),
      signedOff: false,
      signedOffBy: null,
      signedOffAt: null,
      createdAt,
    };
  }

  // New signature: zone string
  const zone = typeof input === 'string' ? input : input.category;
  const base = [
    { id: `${zone}-st-1`, item: 'Structural integrity check', completed: false },
    { id: `${zone}-el-1`, item: 'Electrical inspection', completed: false },
    { id: `${zone}-pl-1`, item: 'Plumbing inspection', completed: false },
    { id: `${zone}-fi-1`, item: 'Finishes quality check', completed: false },
  ];
  return base.map((b) => ({ ...b, completed: false }));
}

export function toggleChecklistItem(
  checklist: Array<{ id: string; completed: boolean }> | { items: Array<{ id: string; checked: boolean }>; projectId: string; category: InspectionCategory; milestoneName: string; createdAt: string; signedOff: boolean; signedOffBy: string | null; signedOffAt: string | null },
  itemId: string
): Array<{ id: string; completed: boolean }> | { items: Array<{ id: string; checked: boolean }>; projectId: string; category: InspectionCategory; milestoneName: string; createdAt: string; signedOff: boolean; signedOffBy: string | null; signedOffAt: string | null } {
  const isArray = Array.isArray(checklist);
  const items = isArray ? checklist : checklist.items;
  const toggled = items.map((item) => {
    if (isArray) {
      const arrItem = item as { id: string; completed: boolean };
      return arrItem.id === itemId ? { ...arrItem, completed: !arrItem.completed } : arrItem;
    } else {
      const objItem = item as { id: string; checked: boolean };
      return objItem.id === itemId ? { ...objItem, checked: !objItem.checked } : objItem;
    }
  });
  if (isArray) {
    return toggled as Array<{ id: string; completed: boolean }>;
  }
  return { ...checklist, items: toggled as Array<{ id: string; checked: boolean }> };
}

export function signOffChecklist(
  checklist: Array<{ id: string; completed: boolean }> | { items: Array<{ id: string; checked: boolean }>; projectId: string; category: InspectionCategory; milestoneName: string; createdAt: string; signedOff: boolean; signedOffBy: string | null; signedOffAt: string | null },
  signedBy: string,
  signedAt?: string
): { signed: boolean; signedAt: string; signedBy: string } | { signed: boolean; itemsSignedOff: number; allComplete: boolean; signedAt: string; signedOff: boolean; signedOffBy: string } | null {
  const items = Array.isArray(checklist) ? checklist : checklist.items;
  const allComplete = items.every((i) => 'completed' in i ? i.completed : i.checked);
  const itemsSignedOff = items.filter((i) => 'completed' in i ? i.completed : i.checked).length;

  if (!allComplete) return null;

  if (Array.isArray(checklist)) {
    return { signed: allComplete, signedAt: new Date().toISOString(), signedBy };
  }

  return { signed: allComplete, itemsSignedOff, allComplete, signedAt: signedAt ?? new Date().toISOString(), signedOff: true, signedOffBy: signedBy };
}

export function checklistCompletionPct(
  checklist: Array<{ completed: boolean }> | { items: Array<{ completed: boolean } | { checked: boolean }> }
): number {
  const items = Array.isArray(checklist) ? checklist : checklist.items;
  if (items.length === 0) return 0;
  const completed = items.filter((i) => 'completed' in i ? i.completed : i.checked).length;
  return Math.round(completed / items.length * 100);
}