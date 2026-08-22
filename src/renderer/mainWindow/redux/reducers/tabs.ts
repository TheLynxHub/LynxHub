import {defaultTabItem} from '@lynx/utils/constants';
import {TabInfo} from '@lynx_common/types';
import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {useSelector} from 'react-redux';

import {RootState} from '../store';

type TabState = {
  tabs: TabInfo[];
  activeTab: string;
  activePage: string;
  prevTab: string;
};

type TabStateTypes = {
  [K in keyof TabState]: TabState[K];
};

const findUniqueTabId = (baseId: string, tabs: TabInfo[]): string => {
  let idNumber = 1;
  let candidateId = baseId;
  while (tabs.some(tab => tab.id === candidateId)) {
    candidateId = `${baseId}_${idNumber}`;
    idNumber += 1;
  }
  return candidateId;
};

const updateTabById = (tabs: TabInfo[], tabID: string, updater: (tab: TabInfo) => TabInfo): TabInfo[] =>
  tabs.map(tab => (tab.id === tabID ? updater(tab) : tab));

const initialState: TabState = {
  tabs: [defaultTabItem],
  activeTab: defaultTabItem.id,
  activePage: defaultTabItem.pageID,
  prevTab: '',
};

const tabsSlice = createSlice({
  name: 'tabs',
  initialState,
  reducers: {
    setTabState: <K extends keyof TabState>(state: TabState, action: PayloadAction<{key: K; value: TabState[K]}>) => {
      state[action.payload.key] = action.payload.value;
    },
    addTab: (state: TabState, action: PayloadAction<TabInfo & {background?: boolean}>) => {
      const {background, ...nextTabPayload} = action.payload;
      const newID = findUniqueTabId(nextTabPayload.id, state.tabs);
      state.tabs.push({...nextTabPayload, id: newID});

      // Only switch to new tab if not opening in background
      if (!background) {
        state.activeTab = newID;
        state.activePage = nextTabPayload.pageID;
      }
    },
    removeTab: (state: TabState, action: PayloadAction<string>) => {
      const tabIdToRemove = action.payload;
      const tabIndexToRemove = state.tabs.findIndex(tab => tab.id === tabIdToRemove);

      state.tabs = state.tabs.filter(tab => tab.id !== tabIdToRemove);

      if (state.activeTab === tabIdToRemove) {
        if (state.tabs.length > 0) {
          const newActiveTabIndex = Math.min(tabIndexToRemove, state.tabs.length - 1);
          state.activeTab = state.tabs[newActiveTabIndex].id;
          state.activePage = state.tabs[newActiveTabIndex].pageID;
        } else {
          state.activeTab = defaultTabItem.id;
          state.activePage = defaultTabItem.pageID;
        }
      }

      if (state.tabs.length <= 0) {
        state.tabs = [defaultTabItem];
      }
    },
    setActiveTab: (state: TabState, action: PayloadAction<string>) => {
      state.prevTab = state.activeTab;
      state.activeTab = action.payload;
      state.activePage = state.tabs.find(tab => tab.id === action.payload)?.pageID || defaultTabItem.pageID;
    },
    switchTab: (state: TabState, action: PayloadAction<{direction: 'next' | 'prev'} | undefined>) => {
      if (state.tabs.length <= 1) return;

      const currentIndex = state.tabs.findIndex(tab => tab.id === state.activeTab);
      if (currentIndex === -1) return;

      const direction = action.payload?.direction || 'next';

      let nextIndex: number;
      if (direction === 'next') {
        nextIndex = (currentIndex + 1) % state.tabs.length;
      } else {
        nextIndex = (currentIndex - 1 + state.tabs.length) % state.tabs.length;
      }

      state.prevTab = state.activeTab;
      state.activeTab = state.tabs[nextIndex].id;
      state.activePage = state.tabs[nextIndex].pageID;
    },
    setTabLoading: (state: TabState, action: PayloadAction<{isLoading: boolean; tabID: string}>) => {
      const {tabID, isLoading} = action.payload;
      state.tabs = updateTabById(state.tabs, tabID, tab => ({...tab, isLoading}));
    },
    setActiveTabLoading: (state: TabState, action: PayloadAction<boolean>) => {
      state.tabs = updateTabById(state.tabs, state.activeTab, tab => ({...tab, isLoading: action.payload}));
    },
    setTabTitle: (state: TabState, action: PayloadAction<{tabID: string; title: string}>) => {
      const {tabID, title} = action.payload;
      state.tabs = updateTabById(state.tabs, tabID, tab => ({...tab, title}));
    },
    setTabIsTerminal: (state: TabState, action: PayloadAction<{tabID: string; isTerminal: boolean}>) => {
      const {tabID, isTerminal} = action.payload;
      state.tabs = updateTabById(state.tabs, tabID, tab => ({...tab, isTerminal}));
    },
    setActiveTabTitle: (state: TabState, action: PayloadAction<string>) => {
      state.tabs = updateTabById(state.tabs, state.activeTab, tab => ({...tab, title: action.payload}));
    },
    setTabFavIcon: (
      state: TabState,
      action: PayloadAction<{
        show: boolean;
        url: string;
        tabID: string;
      }>,
    ) => {
      const {tabID, ...favIcon} = action.payload;
      state.tabs = updateTabById(state.tabs, tabID, tab => ({...tab, favIcon}));
    },
    setTabProgress: (
      state: TabState,
      action: PayloadAction<{tabID: string; progress: {state: 0 | 1 | 2 | 3 | 4; value: number} | undefined}>,
    ) => {
      const {tabID, progress} = action.payload;
      state.tabs = updateTabById(state.tabs, tabID, tab => ({...tab, progress}));
    },
    setActivePage: (
      state: TabState,
      action: PayloadAction<{
        pageID: string;
        title: string;
        isTerminal?: boolean;
      }>,
    ) => {
      const index = state.tabs.findIndex(tab => tab.id === state.activeTab);
      if (index !== -1) {
        const {pageID, title, isTerminal} = action.payload;
        state.tabs[index] = {
          ...state.tabs[index],
          pageID,
          title,
          isTerminal: isTerminal ?? false,
          favIcon: {show: false, url: ''},
        };
      }
      state.activePage = action.payload.pageID;
    },
    togglePinTab: (state: TabState, action: PayloadAction<string>) => {
      const tabId = action.payload;
      const tabIndex = state.tabs.findIndex(t => t.id === tabId);
      if (tabIndex === -1) return;

      const currentTab = state.tabs[tabIndex];
      const nextPinned = !currentTab.isPinned;
      state.tabs[tabIndex] = {...currentTab, isPinned: nextPinned};

      // Keep pinned tabs at the front
      const pinned = state.tabs.filter(t => t.isPinned);
      const unpinned = state.tabs.filter(t => !t.isPinned);
      state.tabs = [...pinned, ...unpinned];
    },
    toggleTabIconOnly: (state: TabState, action: PayloadAction<string>) => {
      const tabId = action.payload;
      state.tabs = updateTabById(state.tabs, tabId, tab => ({
        ...tab,
        showIconOnly: !tab.showIconOnly,
      }));
    },
    reorderTabs: (state: TabState, action: PayloadAction<TabInfo[]>) => {
      const pinned = action.payload.filter(t => t.isPinned);
      const unpinned = action.payload.filter(t => !t.isPinned);
      state.tabs = [...pinned, ...unpinned];
    },
  },
});

/**
 * Hook to access tabs reducer state by key with inferred return type.
 */
export const useTabsState = <K extends keyof TabState>(key: K): TabStateTypes[K] =>
  useSelector((state: RootState) => state.tabs[key]);

export const tabsActions = tabsSlice.actions;

export default tabsSlice.reducer;
