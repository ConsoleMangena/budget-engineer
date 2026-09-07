import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type CloudStatus =
  | 'unconfigured'
  | 'signed-out'
  | 'signing-in'
  | 'signed-in'
  | 'syncing'
  | 'pending-approval'
  | 'error';

export interface CloudProjectLink {
  localId: string;
  remoteId: number;
  syncedAt: string;
}

interface CloudStoreState {
  status: CloudStatus;
  email: string;
  lastSyncAt: string | null;
  lastError: string | null;
  projectLinks: CloudProjectLink[];
  setStatus: (status: CloudStatus) => void;
  setSignedIn: (email: string) => void;
  markSignedOut: () => void;
  recordSync: (at: string) => void;
  recordError: (message: string) => void;
  clearError: () => void;
  linkProject: (localId: string, remoteId: number) => void;
}

export const useCloudStore = create<CloudStoreState>()(
  immer(
    persist(
      (set) => ({
        status: 'unconfigured',
        email: '',
        lastSyncAt: null,
        lastError: null,
        projectLinks: [],

        setStatus: (status) =>
          set((s) => {
            s.status = status;
          }),

        setSignedIn: (email) =>
          set((s) => {
            s.status = 'signed-in';
            s.email = email;
            s.lastError = null;
          }),

        markSignedOut: () =>
          set((s) => {
            s.status = 'signed-out';
          }),

        recordSync: (at) =>
          set((s) => {
            s.status = 'signed-in';
            s.lastSyncAt = at;
            s.lastError = null;
          }),

        recordError: (message) =>
          set((s) => {
            s.status = 'error';
            s.lastError = message;
          }),

        clearError: () =>
          set((s) => {
            s.lastError = null;
          }),

        linkProject: (localId, remoteId) =>
          set((s) => {
            const existing = s.projectLinks.find((l) => l.localId === localId);
            if (existing) {
              existing.remoteId = remoteId;
              existing.syncedAt = new Date().toISOString();
            } else {
              s.projectLinks.push({ localId, remoteId, syncedAt: new Date().toISOString() });
            }
          }),
      }),
      {
        name: 'budget-engineer-cloud',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          email: state.email,
          lastSyncAt: state.lastSyncAt,
          projectLinks: state.projectLinks,
        }),
        onRehydrateStorage: () => (state) => {
          state?.markSignedOut();
        },
      },
    ),
  ),
);