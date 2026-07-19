import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {useSelector} from 'react-redux';

import {RootState} from '../store';

export interface ChatBridgeMessage {
  sender: 'user' | 'assistant';
  text: string;
}

export interface ScrapedChatHistoryItem {
  index: number;
  title: string;
  active: boolean;
}

export interface ChatBridgeModuleState {
  chatHistory: ScrapedChatHistoryItem[];
  messages: ChatBridgeMessage[];
  isGenerating: boolean;
  isPageLoaded: boolean;
  isHistoryLoading: boolean;
  isSending: boolean;
  pendingActiveIndex?: number | null;
  activeWindow?: 'main' | 'float' | null;
}

export interface ChatBridgeState {
  modules: {
    [cardId: string]: ChatBridgeModuleState;
  };
  bgChatEnabledCards: string[];
  activeUnifiedCardId: string | null;
  visibleModuleIds: string[];
}

const initialModuleState: ChatBridgeModuleState = {
  chatHistory: [],
  messages: [],
  isGenerating: false,
  isPageLoaded: false,
  isHistoryLoading: false,
  isSending: false,
  pendingActiveIndex: null,
  activeWindow: null,
};

const initialState: ChatBridgeState = {
  modules: {},
  bgChatEnabledCards: [],
  activeUnifiedCardId: null,
  visibleModuleIds: [],
};

const chatBridgeSlice = createSlice({
  name: 'chatBridge',
  initialState,
  reducers: {
    setBgChatEnabledCards: (state, action: PayloadAction<string[]>) => {
      state.bgChatEnabledCards = action.payload;
    },
    setActiveUnifiedCardId: (state, action: PayloadAction<string | null>) => {
      state.activeUnifiedCardId = action.payload;
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
    setModuleState: (state, action: PayloadAction<{cardId: string; updates: Partial<ChatBridgeModuleState>}>) => {
      const {cardId, updates} = action.payload;
      if (!state.modules[cardId]) {
        state.modules[cardId] = {...initialModuleState};
      }
      state.modules[cardId] = {
        ...state.modules[cardId],
        ...updates,
      };
    },
    setModuleMessages: (state, action: PayloadAction<{cardId: string; messages: ChatBridgeMessage[]}>) => {
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

export const useChatBridgeSelector = <T>(selector: (state: ChatBridgeState) => T): T =>
  useSelector((state: RootState) => selector(state.chatBridge));

export const chatBridgeActions = chatBridgeSlice.actions;

export default chatBridgeSlice.reducer;
