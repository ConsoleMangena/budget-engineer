import { describe, it, expect, beforeEach } from 'vitest';
import { useCloudStore } from '@/stores/cloudStore';

describe('cloudStore', () => {
  beforeEach(() => {
    useCloudStore.setState({
      status: 'unconfigured',
      email: '',
      lastSyncAt: null,
      lastError: null,
      projectLinks: [],
    });
  });

  it('starts unconfigured', () => {
    expect(useCloudStore.getState().status).toBe('unconfigured');
  });

  it('marks signed in with an email and clears errors', () => {
    useCloudStore.getState().recordError('boom');
    useCloudStore.getState().setSignedIn('builder@example.com');
    const s = useCloudStore.getState();
    expect(s.status).toBe('signed-in');
    expect(s.email).toBe('builder@example.com');
    expect(s.lastError).toBeNull();
  });

  it('marks signed out without clearing persisted email', () => {
    useCloudStore.getState().setSignedIn('builder@example.com');
    useCloudStore.getState().markSignedOut();
    const s = useCloudStore.getState();
    expect(s.status).toBe('signed-out');
    expect(s.email).toBe('builder@example.com');
  });

  it('records sync time and error state', () => {
    useCloudStore.getState().recordSync('2026-09-07T10:00:00Z');
    expect(useCloudStore.getState().status).toBe('signed-in');
    expect(useCloudStore.getState().lastSyncAt).toBe('2026-09-07T10:00:00Z');
    useCloudStore.getState().recordError('Account pending approval.');
    expect(useCloudStore.getState().status).toBe('error');
    expect(useCloudStore.getState().lastError).toBe('Account pending approval.');
  });

  it('links a local project to a remote id idempotently', () => {
    useCloudStore.getState().linkProject('p1', 10);
    useCloudStore.getState().linkProject('p1', 11);
    const links = useCloudStore.getState().projectLinks;
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ localId: 'p1', remoteId: 11 });
  });
});