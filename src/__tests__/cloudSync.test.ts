import { describe, it, expect } from 'vitest';
import type { Project, BOQ } from '@/types';
import type { CloudApiClient } from '@/services/cloudApi';
import {
  centsToDecimal,
  localProjectToDto,
  dtoToLocalProject,
  boqToDtos,
  dtosToBoqLines,
  syncAll,
} from '@/services/cloudSync';

const project: Project = {
  id: 'p1',
  slug: 'avondale-house',
  name: 'Avondale House',
  ownerId: 'local-user',
  profile: 'aspirational',
  region: 'zimbabwe',
  currency: 'USD',
  status: 'draft',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-02T00:00:00Z',
  version: 1,
};

const boq: BOQ = {
  id: 'b1',
  projectId: 'p1',
  designId: 'd1',
  sections: [
    {
      id: 's1',
      code: 'SUBSTRUCTURE',
      title: 'Substructure',
      subtotalCents: 450000,
      items: [
        {
          id: 'i1',
          description: 'Strip footings',
          quantity: 30,
          unit: 'm',
          rateCents: 1500,
          totalCents: 45000,
          elementIds: [],
          source: 'auto',
          aiConfidence: 0,
        },
      ],
    },
  ],
  totalCents: 450000,
  contingencyCents: 0,
  currency: 'USD',
  generatedAt: '2026-09-02T00:00:00Z',
};

function recordCall(
  records: { path: string; init?: RequestInit }[],
  respond: (path: string, init?: RequestInit) => unknown,
): CloudApiClient {
  return {
    request: async (path: string, init: RequestInit = {}) => {
      const out = respond(path, init);
      records.push({ path, init });
      return out;
    },
  };
}

describe('cloudSync mappers', () => {
  it('converts cents to a 2-dp decimal', () => {
    expect(centsToDecimal(1500)).toBe('15.00');
    expect(centsToDecimal(5)).toBe('0.05');
  });

  it('maps a local project to a Django project DTO', () => {
    const dto = localProjectToDto(project);
    expect(dto).toMatchObject({
      title: 'Avondale House',
      location: 'zimbabwe',
      budget: '0.00',
      status: 'PLANNING',
      building_type: 'aspirational',
    });
  });

  it('maps tender status to IN_PROGRESS', () => {
    expect(localProjectToDto({ ...project, status: 'tender' }).status).toBe('IN_PROGRESS');
  });

  it('round-trips a remote DTO to a local project patch', () => {
    const local = dtoToLocalProject({
      id: 5,
      title: 'Borrowdale Villa',
      location: 'south-africa',
      status: 'PLANNING',
    });
    expect(local).toMatchObject({ name: 'Borrowdale Villa', region: 'south-africa', status: 'concept' });
  });

  it('falls back to other for unknown regions', () => {
    expect(dtoToLocalProject({ id: 5, title: 'X', location: 'mars' }).region).toBe('other');
  });

  it('flattens BOQ sections to Django BOQ lines with decimal rates', () => {
    const lines = boqToDtos(boq);
    expect(lines).toEqual([
      {
        bill_no: 'i1',
        description: 'Strip footings',
        specification: 'SUBSTRUCTURE',
        unit: 'm',
        quantity: 30,
        rate: 15,
        is_ai_generated: false,
      },
    ]);
  });

  it('converts remote BOQ lines back to local cents', () => {
    const local = dtosToBoqLines([{ description: 'Walls', unit: 'm2', quantity: 20, rate: 25 }]);
    expect(local[0]).toMatchObject({
      description: 'Walls',
      quantity: 20,
      rateCents: 2500,
      totalCents: 50000,
    });
  });
});

describe('cloudSync actions', () => {
  function fakeClient(
    respond: (path: string, init?: RequestInit) => unknown,
  ): { client: CloudApiClient; calls: { path: string; init?: RequestInit }[] } {
    const calls: { path: string; init?: RequestInit }[] = [];
    const client = recordCall(calls, respond);
    return { client, calls };
  }

  it('POSTs a project when no remote id exists', async () => {
    const { client, calls } = fakeClient((path, init) => {
      if (init?.method === 'POST') return { id: 42, title: 'Avondale House' };
      return { count: 1, next: null, previous: null, results: [{ id: 42 }] };
    });
    const result = await syncAll(client, [{ local: project }]);
    expect(result.links).toEqual([{ localId: 'p1', remoteId: 42 }]);
    expect(calls).toEqual([
      { path: '/projects/', init: { method: 'POST', body: JSON.stringify(localProjectToDto(project)) } },
      { path: '/projects/', init: {} },
    ]);
  });

  it('PATCHes when an existing remote id is provided and pushes BOQ', async () => {
    const methods: string[] = [];
    const { client } = fakeClient((path, init) => {
      methods.push(init?.method ?? 'GET');
      if (path === '/projects/1/') return { id: 1, title: 'Avondale House' };
      if (path === '/boq-building-items/') return { id: 9, description: 'Strip footings' };
      return { count: 2, next: null, previous: null, results: [{ id: 1 }, { id: 2 }] };
    });
    const res = await syncAll(client, [{ local: project, boq }], [{ localId: 'p1', remoteId: 1 }]);
    expect(methods).toEqual(['PATCH', 'POST', 'GET']);
    expect(res.links).toEqual([{ localId: 'p1', remoteId: 1 }]);
    expect(res.boqLinesPushed).toBe(1);
    expect(res.projectsRemotely).toBe(2);
  });
});