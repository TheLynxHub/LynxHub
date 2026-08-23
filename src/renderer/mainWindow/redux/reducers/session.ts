import {RecentlyClosedTab, SessionRestoreConfig, SessionSnapshot} from '@lynx_common/types';
import sessionIpc from '@lynx_shared/ipc/session';
import storageIpc from '@lynx_shared/ipc/storage';
import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {useSelector} from 'react-redux';

import {RootState} from '../store';

export type SessionState = {
  recentlyClosedTabs: RecentlyClosedTab[];
  crashedSession: SessionSnapshot | null;
  showCrashBanner: boolean;
  config: SessionRestoreConfig;
};

type SessionStateTypes = {
  [K in keyof SessionState]: SessionState[K];
};

export const defaultSessionRestoreConfig: SessionRestoreConfig = {
  startupBehavior: 'home',
  restoreOnCrash: 'ask',
  restoreBrowserTabs: true,
  restoreTerminalTabs: true,
  restoreAiCardTabs: true,
  restoreStaticPages: true,
  restorePinnedTabsOnly: false,
  maxClosedTabsHistory: 25,
};

const initialState: SessionState = {
  recentlyClosedTabs: [],
  crashedSession: null,
  showCrashBanner: false,
  config: defaultSessionRestoreConfig,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    pushClosedTab: (state, action: PayloadAction<Omit<RecentlyClosedTab, 'closedAt'> & {closedAt?: number}>) => {
      const entry: RecentlyClosedTab = {
        ...action.payload,
        closedAt: action.payload.closedAt || Date.now(),
      };
      state.recentlyClosedTabs.unshift(entry);
      const maxHistory = state.config.maxClosedTabsHistory || 25;
      if (state.recentlyClosedTabs.length > maxHistory) {
        state.recentlyClosedTabs = state.recentlyClosedTabs.slice(0, maxHistory);
      }
    },
    popClosedTab: state => {
      state.recentlyClosedTabs.shift();
    },
    clearClosedTabs: state => {
      state.recentlyClosedTabs = [];
    },
    setCrashedSession: (state, action: PayloadAction<SessionSnapshot | null>) => {
      state.crashedSession = action.payload;
      state.showCrashBanner = Boolean(action.payload);
    },
    dismissCrashBanner: state => {
      state.showCrashBanner = false;
      sessionIpc.clearCrashedSession();
    },
    setConfig: (state, action: PayloadAction<SessionRestoreConfig>) => {
      state.config = action.payload;
      storageIpc.update('app', {sessionRestore: action.payload});
    },
    updateConfig: (state, action: PayloadAction<Partial<SessionRestoreConfig>>) => {
      state.config = {...state.config, ...action.payload};
      storageIpc.update('app', {sessionRestore: state.config});
    },
  },
});

/**
 * Hook to access session reducer state by key with inferred return type.
 */
export const useSessionState = <K extends keyof SessionState>(key: K): SessionStateTypes[K] =>
  useSelector((state: RootState) => state.session[key]);

export const sessionActions = sessionSlice.actions;

export default sessionSlice.reducer;
