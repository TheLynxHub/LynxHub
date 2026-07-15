import {TerminalState} from '@lynx/types/reducers';
import storageIpc from '@lynx_shared/ipc/storage';
import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {useSelector} from 'react-redux';

import {RootState} from '../store';

type TerminalStateTypes = {
  [K in keyof TerminalState]: TerminalState[K];
};

const createDefaultTerminalState = (): TerminalState => ({
  outputColor: true,
  useConpty: 'auto',
  scrollBack: 5000,
  fontSize: 14,
  cursorStyle: 'bar',
  cursorInactiveStyle: 'outline',
  blinkCursor: true,
  resizeDelay: 100,
  fontLoadTimeout: 3000,
  closeTabOnExit: false,
  enableLigatures: false,
  cdHistory: [],
  quickCommands: [],
  sendYWithExit: false,
  openLinkNewTab: false,
});

// Default initial state - actual values come from preloadedState in Store.ts
const initialState: TerminalState = createDefaultTerminalState();

const terminalSlice = createSlice({
  initialState,
  name: 'terminal',
  reducers: {
    initState: (_state: TerminalState, action: PayloadAction<TerminalState>) => {
      return action.payload;
    },
    setTerminalState: <K extends keyof TerminalState>(
      state: TerminalState,
      action: PayloadAction<{
        key: K;
        value: TerminalState[K];
      }>,
    ) => {
      const {key, value} = action.payload;
      state[key] = value;
      storageIpc.update('terminal', {[key]: value});
    },

    resetToDefaults: (_state: TerminalState) => {
      const nextState = createDefaultTerminalState();
      storageIpc.update('terminal', nextState);
      return nextState;
    },
  },
});

/**
 * Hook to access terminal reducer state by key with inferred return type.
 */
export const useTerminalState = <T extends keyof TerminalState>(name: T): TerminalStateTypes[T] =>
  useSelector((state: RootState) => state.terminal[name]);

export const useTerminalStat = () => useSelector((state: RootState) => state.terminal);

export const terminalActions = terminalSlice.actions;

export default terminalSlice.reducer;
