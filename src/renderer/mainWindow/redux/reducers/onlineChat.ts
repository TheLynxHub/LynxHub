import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {useSelector} from 'react-redux';

import {RootState} from '../store';

export interface OnlineChatMessage {
  sender: 'user' | 'assistant';
  text: string;
}

export interface ScrapedChatHistoryItem {
  index: number;
  title: string;
  active: boolean;
}

export interface OnlineChatModuleState {
  chatHistory: ScrapedChatHistoryItem[];
  messages: OnlineChatMessage[];
  isGenerating: boolean;
  isPageLoaded: boolean;
  isHistoryLoading: boolean;
  isSending: boolean;
}

export interface OnlineChatState {
  modules: {
    [cardId: string]: OnlineChatModuleState;
  };
  bgChatEnabledCards: string[];
  activeUniversalCardId: string | null;
  visibleModuleIds: string[];
}

const initialModuleState: OnlineChatModuleState = {
  chatHistory: [],
  messages: [],
  isGenerating: false,
  isPageLoaded: false,
  isHistoryLoading: false,
  isSending: false,
};

const initialState: OnlineChatState = {
  modules: {},
  bgChatEnabledCards: [],
  activeUniversalCardId: null,
  visibleModuleIds: [],
};

const onlineChatSlice = createSlice({
  name: 'onlineChat',
  initialState,
  reducers: {
    setBgChatEnabledCards: (state, action: PayloadAction<string[]>) => {
      state.bgChatEnabledCards = action.payload;
    },
    setActiveUniversalCardId: (state, action: PayloadAction<string | null>) => {
      state.activeUniversalCardId = action.payload;
    },
    setVisibleModuleIds: (state, action: PayloadAction<string[]>) => {
      state.visibleModuleIds = action.payload;
    },
    initModule: (state, action: PayloadAction<string>) => {
      const cardId = action.payload;
      if (!state.modules[cardId]) {
        state.modules[cardId] = {...initialModuleState};
      }
    },
    setModuleState: (state, action: PayloadAction<{cardId: string; updates: Partial<OnlineChatModuleState>}>) => {
      const {cardId, updates} = action.payload;
      if (!state.modules[cardId]) {
        state.modules[cardId] = {...initialModuleState};
      }
      state.modules[cardId] = {
        ...state.modules[cardId],
        ...updates,
      };
    },
    setModuleMessages: (state, action: PayloadAction<{cardId: string; messages: OnlineChatMessage[]}>) => {
      const {cardId, messages} = action.payload;
      if (!state.modules[cardId]) {
        state.modules[cardId] = {...initialModuleState};
      }
      state.modules[cardId].messages = messages;
    },
    setModuleChatHistory: (state, action: PayloadAction<{cardId: string; chatHistory: ScrapedChatHistoryItem[]}>) => {
      const {cardId, chatHistory} = action.payload;
      if (!state.modules[cardId]) {
        state.modules[cardId] = {...initialModuleState};
      }
      state.modules[cardId].chatHistory = chatHistory;
    },
    setModuleGenerating: (state, action: PayloadAction<{cardId: string; isGenerating: boolean}>) => {
      const {cardId, isGenerating} = action.payload;
      if (!state.modules[cardId]) {
        state.modules[cardId] = {...initialModuleState};
      }
      state.modules[cardId].isGenerating = isGenerating;
    },
    setModulePageLoaded: (state, action: PayloadAction<{cardId: string; isPageLoaded: boolean}>) => {
      const {cardId, isPageLoaded} = action.payload;
      if (!state.modules[cardId]) {
        state.modules[cardId] = {...initialModuleState};
      }
      state.modules[cardId].isPageLoaded = isPageLoaded;
    },
    setModuleHistoryLoading: (state, action: PayloadAction<{cardId: string; isHistoryLoading: boolean}>) => {
      const {cardId, isHistoryLoading} = action.payload;
      if (!state.modules[cardId]) {
        state.modules[cardId] = {...initialModuleState};
      }
      state.modules[cardId].isHistoryLoading = isHistoryLoading;
    },
    setModuleSending: (state, action: PayloadAction<{cardId: string; isSending: boolean}>) => {
      const {cardId, isSending} = action.payload;
      if (!state.modules[cardId]) {
        state.modules[cardId] = {...initialModuleState};
      }
      state.modules[cardId].isSending = isSending;
    },
  },
});

export const useOnlineChatSelector = <T>(selector: (state: OnlineChatState) => T): T =>
  useSelector((state: RootState) => selector(state.onlineChat));

export const onlineChatActions = onlineChatSlice.actions;

export default onlineChatSlice.reducer;
