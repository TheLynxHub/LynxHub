import {DownloadItemInfo} from '@lynx_common/types/downloadManager';
import {createSlice, current, PayloadAction} from '@reduxjs/toolkit';
import {cloneDeep} from 'lodash-es';
import {useSelector} from 'react-redux';

import {MenuTypes} from '../consts';
import {ContextState, RightClickParams} from '../types';
import {RootState} from './store';

type ContextStateTypes = {
  [K in keyof ContextState]: ContextState[K];
};

/**
 * Initial state for the context menu.
 */
const initialState: ContextState = {
  activeLayout: undefined,
  selectedText: '',

  browserScale: {id: '', factor: 100},
  targetID: '',
  rightClick: {
    contextMenuParams: undefined,
    navigationHistory: {
      canGoBack: false,
      canGoForward: false,
    },
    id: 0,
  },
  rightClickParams: {
    hasLinkItems: false,
    hasImageItems: false,
    hasTextSelection: false,
    hasEditItems: false,
    isActionsAvailable: false,
  },
  browserVolume: {
    id: '',
    tabId: '',
    volume: 0,
    muted: false,
    globalMuted: false,
  },
  promptWindow: {
    message: '',
    defaultValue: undefined,
  },
  alertWindow: {
    message: '',
  },
  confirmWindow: {
    message: '',
  },
  downloads: [],
};

const appSlice = createSlice({
  name: 'context',
  initialState,
  reducers: {
    /**
     * Sets a specific key in the context state.
     */
    setContextState: <K extends keyof ContextState>(
      state: ContextState,
      action: PayloadAction<{key: K; value: ContextState[K]}>,
    ) => {
      state[action.payload.key] = action.payload.value;
    },

    /**
     * Prepares the state for showing a specific layout.
     * Note: This reducer is pure and does NOT show the window itself.
     * The side effect of showing the window must be handled by the caller.
     */
    showLayout: <K extends keyof ContextState>(
      state: ContextState,
      action: PayloadAction<{key: K; value: ContextState[K]; layout?: MenuTypes}>,
    ) => {
      const {layout, key, value} = action.payload;

      // Reset state but keep downloads
      const downloads = current(state).downloads;
      const newState = cloneDeep(initialState);
      newState.downloads = downloads;

      if (layout) {
        newState.activeLayout = layout;
      }
      newState[key] = value;

      return newState;
    },

    updateZoomFactor: (state: ContextState, action: PayloadAction<number>) => {
      state.browserScale.factor = action.payload;
    },

    updateRightClickParams: (state: ContextState, action: PayloadAction<RightClickParams>) => {
      state.rightClickParams = action.payload;
    },

    updateVolume: (state: ContextState, action: PayloadAction<number>) => {
      state.browserVolume.volume = action.payload;
    },

    updateMuted: (state: ContextState, action: PayloadAction<boolean>) => {
      state.browserVolume.muted = action.payload;
    },

    // Download actions
    addDownload: (state: ContextState, action: PayloadAction<DownloadItemInfo>) => {
      state.downloads = [action.payload, ...state.downloads];
    },

    updateDownloadProgress: (
      state: ContextState,
      action: PayloadAction<Partial<DownloadItemInfo> & {name: string}>,
    ) => {
      const index = state.downloads.findIndex(item => item.name === action.payload.name);
      if (index !== -1) {
        state.downloads[index] = {...state.downloads[index], ...action.payload};
      }
    },

    updateDownloadStatus: (
      state: ContextState,
      action: PayloadAction<{name: string; status: DownloadItemInfo['status']}>,
    ) => {
      const index = state.downloads.findIndex(item => item.name === action.payload.name);
      if (index !== -1) {
        state.downloads[index].status = action.payload.status;
      }
    },

    removeDownload: (state: ContextState, action: PayloadAction<string>) => {
      state.downloads = state.downloads.filter(item => item.name !== action.payload);
    },

    clearAllDownloads: (state: ContextState) => {
      state.downloads = [];
    },
  },
});

/**
 * Custom hook to select a specific part of the context state.
 */
export const useContextState = <K extends keyof ContextState>(key: K): ContextStateTypes[K] =>
  useSelector((state: RootState) => state.context[key]);

export const contextActions = appSlice.actions;
export default appSlice.reducer;
