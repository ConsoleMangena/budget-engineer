import { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useCloudStore } from '@/stores/cloudStore';
import { useProjectStore } from '@/stores/projectStore';
import { createCloudApiClient } from '@/services/cloudApi';
import { createSupabaseCloudAuth } from '@/services/cloudAuth';
import { syncAll } from '@/services/cloudSync';
import { CloudLoginDialog } from '@/components/cloud/CloudLoginDialog';

const CLOUD_CONFIGURED = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const STATUS_LABEL: Record<string, string> = {
  unconfigured: 'Cloud off',
  'signed-out': 'Sign in to sync',
  'signing-in': 'Signing in…',
  'signed-in': 'Synced',
  syncing: 'Syncing…',
  'pending-approval': 'Approval pending',
  error: 'Sync error',
};

export function SyncIndicator() {
  const store = useCloudStore();
  const projects = useProjectStore((s) => s.projects);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!CLOUD_CONFIGURED) return;
    const auth = createSupabaseCloudAuth({
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    });
    void auth.getSession().then((session) => {
      if (!active) return;
      if (session) store.setSignedIn(session.email);
      else store.markSignedOut();
    });
    return () => {
      active = false;
    };
  }, [store]);

  async function handleClick() {
    if (!CLOUD_CONFIGURED) {
      setDialogOpen(true);
      return;
    }
    const auth = createSupabaseCloudAuth({
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    });
    const session = await auth.getSession();
    if (!session) {
      setDialogOpen(true);
      return;
    }
    setBusy(true);
    store.setStatus('syncing');
    try {
      const client = createCloudApiClient({
        apiBaseUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1',
        getAccessToken: async () => session.accessToken,
      });
      const result = await syncAll(
        client,
        projects.map((p) => ({ local: p })),
        store.projectLinks,
      );
      result.links.forEach((link) => store.linkProject(link.localId, link.remoteId));
      store.recordSync(new Date().toISOString());
    } catch (err) {
      if (err instanceof Error) {
        const pendingApproval = /approval|role|permission/i.test(err.message);
        store.setStatus(pendingApproval ? 'pending-approval' : 'error');
        store.recordError(
          pendingApproval
            ? 'Account pending approval — an admin must approve this user first.'
            : err.message,
        );
      } else {
        store.setStatus('error');
      }
    } finally {
      setBusy(false);
    }
  }

  const Icon =
    store.status === 'unconfigured' || store.status === 'signed-out'
      ? CloudOff
      : store.status === 'syncing' || busy
        ? RefreshCw
        : Cloud;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title={store.lastError ?? STATUS_LABEL[store.status]}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)]/80 px-4 py-2 text-sm shadow-lg backdrop-blur-md hover:bg-[var(--bg-secondary)]"
      >
        <Icon size={16} className={store.status === 'syncing' || busy ? 'animate-spin' : ''} />
        <span>
          {STATUS_LABEL[store.status] ?? store.status}
          {store.lastSyncAt && store.status === 'signed-in'
            ? ` · ${new Date(store.lastSyncAt).toLocaleTimeString()}`
            : ''}
        </span>
      </button>
      <CloudLoginDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}