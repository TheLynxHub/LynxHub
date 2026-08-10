import {SettingState} from '@lynx/types/reducers';
import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {useSelector} from 'react-redux';

import {RootState} from '../store';

type SettingStateValueByKey = {
  [K in keyof SettingState]: SettingState[K];
};

// Default initial state - actual values come from preloadedState in Store.ts
const initialState: SettingState = {
  tooltipLevel: 'essential',
  closeConfirm: true,
  closeTabConfirm: true,
  terminateAIConfirm: true,
  exitSignalConfirm: true,
  openLastSize: false,
  updatedModules: [],
  newModules: [],
  updateAvailable: false,
  dynamicAppTitle: false,
  openLinkExternal: false,
  hardwareAcceleration: true,
  disableLoadingAnimations: false,
  checkCustomUpdate: false,

  searchValue: '',
  searchWords: [],
  selectedSection: '',
};

const settingsSlice = createSlice({
  initialState,
  name: 'settings',
  reducers: {
    setSettingsState: <K extends keyof SettingState>(
      state: SettingState,
      action: PayloadAction<{key: K; value: SettingState[K]}>,
    ) => {
      state[action.payload.key] = action.payload.value;
    },
    setSearchValue: (state, action: PayloadAction<string>) => {
      const searchValue = action.payload;
      state.searchValue = searchValue;
      state.searchWords = searchValue ? searchValue.split(/\s+/) : [];
    },
  },
});

/**
 * Hook to access a single settings state field with key-safe typing.
 */
export const useSettingsState = <T extends keyof SettingState>(name: T): SettingStateValueByKey[T] =>
  useSelector((state: RootState) => state.settings[name]);

export const settingsActions = settingsSlice.actions;

export default settingsSlice.reducer;
