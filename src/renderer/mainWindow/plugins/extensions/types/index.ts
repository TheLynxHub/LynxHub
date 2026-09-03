import type {CardState} from '@lynx_common/types';
import type {LoadedCardData} from '@lynx_common/types/plugins/modules';
import type {Reducer} from '@reduxjs/toolkit';
import type {ComponentProps, FC} from 'react';

import {useCardOverlayState} from '../../../components/card/useCardOverlayState';
import {ExtensionPage, ExtensionRendererApi} from './api';
import {RendererIpcApi} from './ipcWrapper';

/**
 * Hook to access the card store.
 * @param selector - Selector function to retrieve specific data from the state.
 */
export type UseCardStoreType = <T>(selector: (state: CardState) => T) => T;

// -----------------------------------------------> Elements & Props

/**
 * Standard props for a div element.
 */
export type ElementProps = ComponentProps<'div'>;

/**
 * Props for a component that receives a list of cards.
 */
export type CardElementProps = ComponentProps<'div'> & {cards: LoadedCardData[]};

/**
 * Props for a search result component.
 */
export type SearchResultProps = ComponentProps<'div'> & {searchValue: string};

/**
 * Props for a component that needs access to the card store.
 */
export type CardDataProps = ComponentProps<'div'> & {
  useCardStore?: UseCardStoreType;
  useCardOverlayState?: typeof useCardOverlayState;
  startIndex?: number;
};

/**
 * Props for the Markdown replacement component.
 */
export type ReplaceMdProps = ComponentProps<'div'> & {repoPath: string; rounded?: boolean};

/**
 * Functional Component with standard div props.
 */
export type FcProp = FC<ElementProps>;

/**
 * Functional Component with card data store access.
 */
export type FcPropCardData = FC<CardDataProps>;

/**
 * Functional Component with card list props.
 */
export type FcPropCard = FC<CardElementProps>;

/**
 * Functional Component for search results.
 */
export type FcPropSearchResult = FC<SearchResultProps>;

/**
 * Functional Component for Markdown replacement.
 */
export type FcPropReplaceMd = FC<ReplaceMdProps>;

/**
 * Definition for a menu addition type.
 */
export type AddMenuType = {
  /** The index where the menu item should be added. */
  index: number;
  /** The components to add to the menu. */
  components: FcPropCardData[];
};
export type AddModalType = {
  key: string;
  /** The components to add to the menu. */
  component: FcPropCardData;
};

/**
 * Structure for page additions (top, bottom, scroll areas).
 */
export type PageAdd = {
  /** Components added to the top of the page. */
  top: FC[];
  /** Components added to the bottom of the page. */
  bottom: FC[];
  /** Components added to the top of the scrollable area. */
  scrollTop: FC[];
  /** Components added to the bottom of the scrollable area. */
  scrollBottom: FC[];
  /** Components added to the cards container. */
  cardsContainer: FC[];
};

// -----------------------------------------------> Extension Renderer API

/**
 * Data structure holding the active extensions' modifications to the renderer.
 * This mirrors the structure of `ExtensionRendererApi` but holds the actual components/values.
 */
export type ExtensionData_Renderer = {
  /** Title Bar modifications. */
  titleBar: {
    addStart: FcProp[];
    addCenter: FcProp[];
    addEnd: FcProp[];
    replaceCenter: FcProp | undefined;
    replaceEnd: FcProp | undefined;
  };

  /** Status Bar modifications. */
  statusBar: {
    addStart: FcProp[];
    addCenter: FcProp[];
    addEnd: FcProp[];
    replaceContainer: FcProp | undefined;
  };

  /** Running AI view modifications. */
  runningAI: {
    container: FC | undefined;
    terminal: FC | undefined;
    browser: FC | undefined;
  };

  /** Router modifications. */
  router: {
    /** Added pages. */
    pages: ExtensionPage[];
    /** Replaced page components. */
    replace: {
      homePage: FC | undefined;
      imageGenerationPage: FC | undefined;
      textGenerationPage: FC | undefined;
      audioGenerationPage: FC | undefined;
      toolsPage: FC | undefined;
      gamesPage: FC | undefined;
      dashboardPage: FC | undefined;
      modulesPage: FC | undefined;
      extensionsPage: FC | undefined;
      settingsPage: FC | undefined;
    };
  };

  /** Navigation Bar modifications. */
  navBar: {
    replace: {
      container: FC | undefined;
      contentBar: FC | undefined;
      settingsBar: FC | undefined;
    };
    addButton: {
      contentBar: FC[];
      settingsBar: FC[];
    };
  };

  /** Replaced modals. */
  replaceModals: {
    updateApp: FC | undefined;
    launchConfig: FC | undefined;
    cardExtensions: FC | undefined;
    updatingNotification: FC | undefined;
    cardInfo: FC | undefined;
    installUi: FC | undefined;
    uninstallCard: FC | undefined;
    unassignCard: FC | undefined;
    warning: FC | undefined;
    cardReadme: FC | undefined;
    gitManager: FC | undefined;
  };

  /** Replaced Markdown viewer. */
  replaceMarkdownViewer: FcPropReplaceMd | undefined;

  /** Added modals. */
  addModal: FC[];

  /** Added custom hooks. */
  addCustomHook: FC[];

  /** Replaced background component. */
  replaceBackground: FC | undefined;

  /** Page customizations. */
  customizePages: {
    home: {
      replace: {
        searchAndFilter: FC | undefined;
        searchResult: FcPropSearchResult | undefined;
        categories: FC | undefined;
      };
      add: {
        top: FC[];
        bottom: FC[];
        scrollTop: FC[];
        scrollBottom: FC[];
        pinCategory: FC[];
        recentlyCategory: FC[];
        allCategory: FC[];
      };
    };
    audio: {add: PageAdd};
    image: {add: PageAdd};
    text: {add: PageAdd};
    agents: {add: PageAdd};
    others: {add: PageAdd};
    tools: {add: PageAdd};
    games: {add: PageAdd};
    settings: {
      add: {
        navButton: FC[];
        content: FC[];
      };
    };
    dashboard: {
      add: {
        navButton: FC[];
        content: FC[];
      };
    };
  };

  /** Added Redux reducers. */

  addReducer: {name: string; reducer: Reducer<any, any>}[];

  /** Card modifications. */
  cards: {
    replace: FcPropCard | undefined;
    replaceComponent: FcPropCardData | undefined;
    customize: {
      header: FcPropCardData | undefined;
      body: FcPropCardData | undefined;
      footer: FcPropCardData | undefined;
      menu: {replace: FcPropCardData | undefined; addSection: AddMenuType[]; addModal: AddModalType[]};
    };
  };
};

/**
 * Interface for the extension entry point.
 */
export type ExtensionImport_Renderer = {
  /**
   * Function called to initialize the extension.
   * @param lynxAPI - The API provided to the extension.
   * @param extensionId - The ID of the extension.
   */
  InitialExtensions: (lynxAPI: ExtensionRendererApi, rendererIpc: RendererIpcApi, extensionId: string) => void;
};
