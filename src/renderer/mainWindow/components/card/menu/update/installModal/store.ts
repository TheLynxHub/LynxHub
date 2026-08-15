import {DownloadProgress} from '@lynx_common/types/ipc';
import {InitialSteps, InstallationMethod, UserInputField, UserInputResult} from '@lynx_common/types/plugins/modules';
import {isEmpty, isNil} from 'lodash-es';
import {create} from 'zustand';

import {InstallState} from './types';

export interface ProgressBarState {
  isIndeterminate: boolean;
  title?: string;
  percentage?: number;
  description?: {label: string; value: string}[];
}

export interface InstallStoreState extends InstallState {
  cardId: string;
  type: 'install' | 'update';
  steps: InitialSteps;
  currentStep: number;
  progressInfo?: DownloadProgress;
  urlToDownload?: string;
  userInputElements: {elements: UserInputField[]; title?: string};
  userElementsReturn: UserInputResult[];
  extensionsToInstall?: {urls: string[]; dir: string};
  progressBarState: ProgressBarState;
  locateWarnIsOpen: boolean;
  cloneDirValid: boolean;

  // Promise resolvers for stepper interactions
  starterResolver: ((result: InstallationMethod) => void) | null;
  cloneResolver: ((dir: string) => void) | null;
  terminalResolver: (() => void) | null;
  userInputResolver: ((result: UserInputResult[]) => void) | null;
  extensionsResolver: (() => void) | null;
  downloadResolver: ((path: string) => void) | null;
  restartTerminalFn: (() => void) | null;
  removeProgressListenerFn: (() => void) | null;

  // Actions
  resetStore: () => void;
  initializeStore: (cardId: string, type: 'install' | 'update') => void;
  updateState: (newState: Partial<InstallState> | ((prev: InstallState) => Partial<InstallState>)) => void;
  setSteps: (steps: InitialSteps | ((prev: InitialSteps) => InitialSteps)) => void;
  setCurrentStep: (step: number | ((prev: number) => number)) => void;
  setProgressInfo: (progressInfo: DownloadProgress | undefined) => void;
  setUrlToDownload: (url: string | undefined) => void;
  setUserInputElements: (userInputElements: {elements: UserInputField[]; title?: string}) => void;
  setUserElementsReturn: (
    userElementsReturn: UserInputResult[] | ((prev: UserInputResult[]) => UserInputResult[]),
  ) => void;
  updateUserElementResult: (id: string, value: string | boolean) => void;
  setExtensionsToInstall: (extensionsToInstall: {urls: string[]; dir: string} | undefined) => void;
  setProgressBarState: (progressBarState: ProgressBarState) => void;
  setLocateWarnIsOpen: (isOpen: boolean | ((prev: boolean) => boolean)) => void;
  setCloneDirValid: (valid: boolean) => void;

  setStarterResolver: (resolver: ((result: InstallationMethod) => void) | null) => void;
  setCloneResolver: (resolver: ((dir: string) => void) | null) => void;
  setTerminalResolver: (resolver: (() => void) | null) => void;
  setUserInputResolver: (resolver: ((result: UserInputResult[]) => void) | null) => void;
  setExtensionsResolver: (resolver: (() => void) | null) => void;
  setDownloadResolver: (resolver: ((path: string) => void) | null) => void;
  setRestartTerminalFn: (fn: (() => void) | null) => void;
  setRemoveProgressListenerFn: (fn: (() => void) | null) => void;

  resolveStarter: (result: InstallationMethod) => void;
  resolveClone: (dir: string) => void;
  resolveTerminal: () => void;
  resolveUserInput: () => void;
  resolveExtensions: () => void;
  resolveDownload: (path: string) => void;
  triggerRestartTerminal: () => void;
}

const initialInstallState: InstallState = {
  body: '',
  cloneUrl: '',
  doneAll: {
    title: '',
    description: '',
    type: 'success',
  },
  startClone: false,
  disableSelectDir: false,
  extensionCustomContent: undefined,
  extensionUserInput: undefined,
  terminalKey: 0,
};

const initialStoreState = {
  ...initialInstallState,
  cardId: '',
  type: 'install' as const,
  steps: [],
  currentStep: 0,
  progressInfo: undefined,
  urlToDownload: undefined,
  userInputElements: {elements: [], title: ''},
  userElementsReturn: [],
  extensionsToInstall: undefined,
  progressBarState: {title: '', isIndeterminate: true},
  locateWarnIsOpen: false,
  cloneDirValid: true,

  starterResolver: null,
  cloneResolver: null,
  terminalResolver: null,
  userInputResolver: null,
  extensionsResolver: null,
  downloadResolver: null,
  restartTerminalFn: null,
  removeProgressListenerFn: null,
};

export const useInstallStore = create<InstallStoreState>((set, get) => ({
  ...initialStoreState,

  resetStore: () => {
    const {removeProgressListenerFn} = get();
    if (removeProgressListenerFn) removeProgressListenerFn();
    set(initialStoreState);
  },

  initializeStore: (cardId, type) => {
    get().resetStore();
    set({cardId, type});
  },

  updateState: newState => {
    set(prev => ({
      ...(typeof newState === 'function' ? newState(prev) : newState),
    }));
  },

  setSteps: steps => {
    set(prev => ({
      steps: typeof steps === 'function' ? steps(prev.steps) : steps,
    }));
  },

  setCurrentStep: step => {
    set(prev => ({
      currentStep: typeof step === 'function' ? step(prev.currentStep) : step,
    }));
  },

  setProgressInfo: progressInfo => set({progressInfo}),
  setUrlToDownload: urlToDownload => set({urlToDownload}),
  setUserInputElements: userInputElements => set({userInputElements}),

  setUserElementsReturn: userElementsReturn => {
    set(prev => ({
      userElementsReturn:
        typeof userElementsReturn === 'function' ? userElementsReturn(prev.userElementsReturn) : userElementsReturn,
    }));
  },

  updateUserElementResult: (id, value) => {
    set(prev => {
      const newResult = [...prev.userElementsReturn];
      const existingIndex = newResult.findIndex(item => item.id === id);
      if (existingIndex !== -1) {
        newResult[existingIndex] = {id, result: value};
      } else {
        newResult.push({id, result: value});
      }
      return {userElementsReturn: newResult};
    });
  },

  setExtensionsToInstall: extensionsToInstall => set({extensionsToInstall}),
  setProgressBarState: progressBarState => set({progressBarState}),
  setLocateWarnIsOpen: locateWarnIsOpen => {
    set(prev => ({
      locateWarnIsOpen:
        typeof locateWarnIsOpen === 'function' ? locateWarnIsOpen(prev.locateWarnIsOpen) : locateWarnIsOpen,
    }));
  },
  setCloneDirValid: cloneDirValid => set({cloneDirValid}),

  setStarterResolver: starterResolver => set({starterResolver}),
  setCloneResolver: cloneResolver => set({cloneResolver}),
  setTerminalResolver: terminalResolver => set({terminalResolver}),
  setUserInputResolver: userInputResolver => set({userInputResolver}),
  setExtensionsResolver: extensionsResolver => set({extensionsResolver}),
  setDownloadResolver: downloadResolver => set({downloadResolver}),
  setRestartTerminalFn: restartTerminalFn => set({restartTerminalFn}),
  setRemoveProgressListenerFn: removeProgressListenerFn => set({removeProgressListenerFn}),

  resolveStarter: result => {
    const {starterResolver} = get();
    if (starterResolver) {
      starterResolver(result);
      set({starterResolver: null});
    }
  },

  resolveClone: dir => {
    const {cloneResolver} = get();
    if (cloneResolver) {
      cloneResolver(dir);
      set({cloneResolver: null});
    }
  },

  resolveTerminal: () => {
    const {terminalResolver} = get();
    if (terminalResolver) {
      terminalResolver();
      set({terminalResolver: null});
    }
  },

  resolveUserInput: () => {
    const {userInputResolver, userElementsReturn} = get();
    if (userInputResolver) {
      userInputResolver(userElementsReturn);
      set({userInputResolver: null});
    }
  },

  resolveExtensions: () => {
    const {extensionsResolver} = get();
    if (extensionsResolver) {
      extensionsResolver();
      set({extensionsResolver: null});
    }
  },

  resolveDownload: path => {
    const {downloadResolver} = get();
    if (downloadResolver) {
      downloadResolver(path);
      set({downloadResolver: null});
    }
  },

  triggerRestartTerminal: () => {
    const {restartTerminalFn} = get();
    if (restartTerminalFn) {
      restartTerminalFn();
    }
  },
}));

export const selectCanContinue = (state: InstallStoreState): boolean => {
  if (state.body === 'clone') {
    return state.cloneDirValid;
  }
  if (state.body === 'user-input') {
    for (const field of state.userInputElements.elements) {
      if (field.isRequired) {
        const correspondingResult = state.userElementsReturn.find(result => result.id === field.id);
        if (!correspondingResult) return false;
        if (
          typeof correspondingResult.result === 'string' &&
          (isEmpty(correspondingResult.result) || isNil(correspondingResult.result))
        ) {
          return false;
        }
      }
    }
  }
  return true;
};
