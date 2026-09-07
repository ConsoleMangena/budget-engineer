import { ApiError } from '@/lib/api/types';
import type { Project, Region, ProjectStatus, BOQ } from '@/types';
import type { CloudApiClient } from './cloudApi';

export interface CloudProjectDto {
  id?: number;
  title: string;
  location?: string;
  budget?: string;
  status?: string;
  building_type?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CloudBoqLineDto {
  id?: number;
  description: string;
  specification?: string;
  unit: string;
  quantity: number;
  rate: number;
  bill_no?: string;
  is_ai_generated?: boolean;
}

export interface RemotePaginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const DJANGO_STATUS: Record<ProjectStatus, string> = {
  draft: 'PLANNING',
  concept: 'PLANNING',
  design: 'PLANNING',
  engineering: 'PLANNING',
  costing: 'IN_PROGRESS',
  tender: 'IN_PROGRESS',
};

const LOCAL_STATUS: Record<string, ProjectStatus> = {
  PLANNING: 'concept',
  IN_PROGRESS: 'engineering',
  COMPLETED: 'tender',
  ON_HOLD: 'draft',
};

const KNOWN_REGIONS: Region[] = ['zimbabwe', 'south-africa', 'zambia', 'botswana', 'other'];

export function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function localProjectToDto(project: Project): CloudProjectDto {
  return {
    title: project.name,
    location: project.region,
    budget: '0.00',
    status: DJANGO_STATUS[project.status] ?? 'PLANNING',
    building_type: project.profile,
  };
}

export function dtoToLocalProject(dto: CloudProjectDto): Partial<Project> {
  const region: Region =
    dto.location && (KNOWN_REGIONS as string[]).includes(dto.location)
      ? (dto.location as Region)
      : 'other';
  return {
    name: dto.title,
    region,
    status: dto.status ? (LOCAL_STATUS[dto.status.toUpperCase()] ?? 'concept') : 'concept',
  };
}

export function boqToDtos(boq: BOQ): CloudBoqLineDto[] {
  return boq.sections.flatMap((section) =>
    section.items.map((item) => ({
      bill_no: item.id,
      description: item.description,
      specification: section.code,
      unit: item.unit,
      quantity: item.quantity,
      rate: Number(centsToDecimal(item.rateCents)),
      is_ai_generated: item.source === 'ai-suggested',
    })),
  );
}

export interface LocalBoqLineSummary {
  description: string;
  unit: string;
  quantity: number;
  rateCents: number;
  totalCents: number;
}

export function dtosToBoqLines(dtos: CloudBoqLineDto[]): LocalBoqLineSummary[] {
  return dtos.map((dto) => {
    const rateCents = Math.round(dto.rate * 100);
    return {
      description: dto.description,
      unit: dto.unit,
      quantity: dto.quantity,
      rateCents,
      totalCents: Math.round(dto.quantity * dto.rate * 100),
    };
  });
}

export async function pushProject(
  client: CloudApiClient,
  project: Project,
  existingRemoteId?: number,
): Promise<CloudProjectDto> {
  const body = localProjectToDto(project);
  if (existingRemoteId) {
    return client.request<CloudProjectDto>(`/projects/${existingRemoteId}/`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }
  return client.request<CloudProjectDto>('/projects/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function listRemoteProjects(client: CloudApiClient): Promise<CloudProjectDto[]> {
  const data = await client.request<RemotePaginated<CloudProjectDto>>('/projects/');
  return data.results;
}

export async function pushBoq(
  client: CloudApiClient,
  remoteProjectId: number,
  boq: BOQ,
): Promise<CloudBoqLineDto[]> {
  const created: CloudBoqLineDto[] = [];
  for (const line of boqToDtos(boq)) {
    const createdLine = await client.request<CloudBoqLineDto>('/boq-building-items/', {
      method: 'POST',
      body: JSON.stringify({ project: remoteProjectId, ...line }),
    });
    created.push(createdLine);
  }
  return created;
}

export async function pullBoq(
  client: CloudApiClient,
  remoteProjectId: number,
): Promise<CloudBoqLineDto[]> {
  const data = await client.request<RemotePaginated<CloudBoqLineDto>>(
    `/boq-building-items/?project=${remoteProjectId}&budget_kind=preliminary`,
  );
  return data.results;
}

export interface SyncResult {
  links: { localId: string; remoteId: number }[];
  projectsRemotely: number;
  boqLinesPushed: number;
}

export async function syncAll(
  client: CloudApiClient,
  projects: { local: Project; boq?: BOQ }[],
  existingLinks: { localId: string; remoteId: number }[] = [],
): Promise<SyncResult> {
  const remoteIdByLocal = new Map(existingLinks.map((l) => [l.localId, l.remoteId]));
  const links: { localId: string; remoteId: number }[] = [];
  let boqLinesPushed = 0;

  for (const { local, boq } of projects) {
    const dto = await pushProject(client, local, remoteIdByLocal.get(local.id));
    if (typeof dto.id !== 'number') {
      throw new ApiError(500, 'sync_error', `Remote project id missing for ${local.name}`);
    }
    links.push({ localId: local.id, remoteId: dto.id });
    if (boq) boqLinesPushed += (await pushBoq(client, dto.id, boq)).length;
  }

  const remote = await listRemoteProjects(client);
  return { links, projectsRemotely: remote.length, boqLinesPushed };
}