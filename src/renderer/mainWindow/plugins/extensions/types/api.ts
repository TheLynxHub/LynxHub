import type {AvailablePageIDs} from '@lynx_common/consts';
import type {ExtensionIpcEventsApi, RendererIpcHookMethod} from '@lynx_common/types/ipcEvents';
import type {
  ArgumentsData,
  CardData,
  CardModules,
  CardRendererMethods,
  LoadedCardData,
} from '@lynx_common/types/plugins/modules';
import type {Reducer} from '@reduxjs/toolkit';
import type {Scope} from '@sentry/browser';
import type {ComponentType, FC, ReactNode} from 'react';

import type {bottomToast, topToast} from '../../../layouts/ToastProviders';
import type {ExtensionEvents} from './events';
import {
  AddMenuType,
  AddModalType,
  FcProp,
  FcPropCard,
  FcPropCardData,
  FcPropReplaceMd,
  FcPropSearchResult,
} from './index';

/**
 * Data related to modules available to extensions.
 */
export type ModuleData = {
  /**
   * All available modules.
   */
  allModules: CardModules;

  /**
   * All available cards.
   */
  allCards: CardData[];

  /**
   * Hook to get arguments for a specific card ID.
   * @param id - The ID of the card.
   * @returns The arguments data or undefined.
   */
  useGetArgumentsByID: (id: string) => ArgumentsData | undefined;

  /**
   * Hook to get cards associated with a specific path (page).
   * @param path - The page ID.
   * @returns Array of loaded card data or undefined.
   */
  useGetCardsByPath: (path: AvailablePageIDs) => LoadedCardData[] | undefined;

  /**
   * Helper to get a specific method from a card's renderer methods.
   * @param cards - Array of card data.
   * @param id - The ID of the card.
   * @param method - The method name to retrieve.
   * @returns The method function or undefined.
   */
  getCardMethod: <T extends keyof CardRendererMethods>(
    cards: CardData[],
    id: string,
    method: T,
  ) => CardRendererMethods[T] | undefined;
};

// Type aliases for component injection functions
type CompFc = (component: FC) => void;
export type ExtensionPage = {
  id: string;
  title: string;
  icon?: ReactNode;
  component: FC;
  position?: 'top' | 'bottom' | 'hidden';
};

type CompFcProp = (component: FcProp) => void;
type CompFcPropCard = (component: FcPropCard) => void;
type CompFcPropCardData = (component: FcPropCardData) => void;
type CompFcPropSearchResult = (component: FcPropSearchResult) => void;
type CompFcPropAddCardMenu = (component: AddMenuType[]) => void;
type CompFcPropAddCardModal = (component: AddModalType[]) => void;
type CompFcPropReplaceMd = (component: FcPropReplaceMd) => void;

type ExtensionEventsApi = {
  on: <TEvent extends keyof ExtensionEvents>(
    event: TEvent,
    callback: (payload: ExtensionEvents[TEvent]) => void,
  ) => () => void;
  off: <TEvent extends keyof ExtensionEvents>(
    event: TEvent,
    callback: (payload: ExtensionEvents[TEvent]) => void,
  ) => void;
  emit: <TEvent extends keyof ExtensionEvents>(event: TEvent, payload: ExtensionEvents[TEvent]) => void;
  getListenerCount: (event: keyof ExtensionEvents) => number;
};

/**
 * Structure for adding components to a page.
 */
type PageAdd = {
  /** Add component to the top of the page. */
  top: CompFc;
  /** Add component to the bottom of the page. */
  bottom: CompFc;
  /** Add component to the top of the scrollable area. */
  scrollTop: CompFc;
  /** Add component to the bottom of the scrollable area. */
  scrollBottom: CompFc;
  /** Add component to the cards container. */
  cardsContainer: CompFc;
};

/**
 * The main API exposed to extensions in the renderer process.
 * Allows modification of the UI, handling events, and interacting with the core application.
 */
export type ExtensionRendererApi = {
  /**
   * Modify the application Title Bar.

   */
  titleBar: {
    /** Add elements to the **start** of the Title Bar (Left-aligned). */
    addStart: CompFcProp;
    /** Add elements to the **center** of the Title Bar. */
    addCenter: CompFcProp;
    /** Add elements to the **end** of the Title Bar (Right-aligned). */
    addEnd: CompFcProp;
    /**
     * Replace the **center** elements of the Title Bar.
     */
    replaceCenter: CompFcProp;
    /**
     * Replace the **end** elements of the Title Bar.
     */
    replaceEnd: CompFcProp;
  };

  /**
   * Modify the application Status Bar.

   */
  statusBar: {
    /** Add elements to the **start** of the Status Bar (Left-aligned). */
    addStart: CompFcProp;
    /** Add elements to the **center** of the Status Bar. */
    addCenter: CompFcProp;
    /** Add elements to the **end** of the Status Bar (Right-aligned). */
    addEnd: CompFcProp;
    /** Replace the entire Status Bar container. */
    replaceContainer: CompFcProp;
  };

  /**
   * Modify components within the Running AI view.

   */
  runningAI: {
    /**
     * Replace the entire Running AI container,
     * including both the Terminal and Browser views.
     */
    container: CompFc;
    /**
     * Replace the Terminal view within the Running AI container.
     */
    terminal: CompFc;
    /**
     * Replace the Browser view within the Running AI container.
     */
    browser: CompFc;
  };

  /**
   * Modify the application router and its associated pages.
   */
  router: {
    /**
     * Add a new custom page to the application router and navigation bar.
     */
    addPage: (page: ExtensionPage) => void;
    /** Replace existing pages within the router. */
    replace: {
      /** Replace the Home page component. */
      homePage: CompFc;
      /** Replace the Image Generation page component. */
      imageGenerationPage: CompFc;
      /** Replace the Text Generation page component. */
      textGenerationPage: CompFc;
      /** Replace the Audio Generation page component. */
      audioGenerationPage: CompFc;
      /** Replace the Tools page component. */
      toolsPage: CompFc;
      /** Replace the Games page component. */
      gamesPage: CompFc;
      /** Replace the Dashboard page component. */
      dashboardPage: CompFc;
      /** Replace the Modules page component. */
      modulesPage: CompFc;
      /** Replace the Extensions page component. */
      extensionsPage: CompFc;
      /** Replace the Settings page component. */
      settingsPage: CompFc;
    };
  };

  /** Modify navigation bar components and behavior. */
  navBar: {
    /**
     * Replace default components of the navigation bar.*/
    replace: {
      /** Replace the entire navigation bar container. */
      container: CompFc;
      /**
       * Replace the **content navigation bar** (Top bar),
       * which includes buttons for navigating through sections like Home, Images, etc.
       */
      contentBar: CompFc;
      /**
       * Replace the **settings navigation bar** (Bottom bar),
       * which includes buttons for navigating through sections like Settings, Modules, etc.
       */
      settingsBar: CompFc;
    };
    /** Add new buttons to the navigation bar for navigating to specific routes. */
    addButton: {
      /**
       * Add a new button to the **content navigation bar** (Top bar).  */
      contentBar: CompFc;
      /**
       * Add a new button to the **settings navigation bar** (Bottom bar).  */
      settingsBar: CompFc;
    };
  };

  /**
   * Modify or navigate tabs.
   */
  tabs: {
    /**
     * Set the active page for the current tab.
     */
    setActivePage: (pageID: string, title?: string, isTerminal?: boolean) => void;
  };

  /**
   * Add custom modal to the existing modals

   */
  addModal: CompFc;

  /**
   * Replace default modals in the application.

   */
  replaceModals: {
    /**
     * Replace the modal for updating the application.
     * This modal notifies users about app updates and helps manage the update process.*/
    updateApp: CompFc;
    /**
     * Replace the modal for managing launch configurations.
     * This modal allows customization of card launches, including commands, arguments, etc.*/
    launchConfig: CompFc;
    /**
     * Replace the modal for managing card extensions.
     * This modal facilitates installing, updating, and removing extensions for cards.*/
    cardExtensions: CompFc;
    /**
     * Replace the modal for updating notifications.
     * This modal displays the result and information about updated cards.*/
    updatingNotification: CompFc;
    /**
     * Replace the modal for displaying card information.
     * This modal shows details such as disk usage, developer info, and repository links.*/
    cardInfo: CompFc;
    /**
     * Replace the modal for installing a card.
     * This modal provides a step-by-step process for installing or locating a selected card.
     * It offers an advanced alternative to the simpler `install` modal.*/
    installUi: CompFc;
    /**
     * Replace the modal for uninstalling a card.
     * This modal manages the uninstallation process of a selected card.*/
    uninstallCard: CompFc;
    /**
     * Replace the modal for unassigning a card.
     */
    unassignCard: CompFc;
    /**
     * Replace the modal for displaying warning messages.
     * This modal is used in cases like failed installations or other critical alerts.*/
    warning: CompFc;
    /**
     * Replace the modal for viewing a card's README file.
     * This modal renders GitHub-style Markdown README files to provide users with detailed documentation.*/
    cardReadme: CompFc;
    /**
     * Replace the modal for the Git Manager.
     */
    gitManager: CompFc;
  };

  /**
   * Replace the MarkDown viewer component.
   * This component is used to render Markdown files.

   */
  replaceMarkdownViewer: CompFcPropReplaceMd;

  /**
   * Add a custom hook to the application.

   */
  addCustomHook: CompFc;

  /**
   * Replace the main background color of the application.

   */
  replaceBackground: CompFc;

  /** Customize application pages by adding or replacing elements. */
  customizePages: {
    /**
     * Customize the Home page.*/
    home: {
      /** Replace existing elements on the Home page. */
      replace: {
        /**
         * Replace the top search input and filter button.    */
        searchAndFilter: CompFc;
        /**
         * Replace the search result section.    */
        searchResult: CompFcPropSearchResult;
        /**
         * Replace the categories container.    */
        categories: CompFc;
      };
      /** Add new elements to the Home page. */
      add: {
        /**
         * Add elements to the top of the page, below the search and filter section
         * but above the scroll and categories.
         */
        top: CompFc;
        /** Add elements to the bottom of the page, below the scroll and categories. */
        bottom: CompFc;
        /** Add elements to the top of the scroll component. */
        scrollTop: CompFc;
        /** Add elements to the bottom of the scroll component. */
        scrollBottom: CompFc;
        /**
         * Add elements to the end of the pinned category section.    */
        pinCategory: CompFc;
        /**
         * Add elements to the end of the recently used category section.    */
        recentlyCategory: CompFc;
        /**
         * Add elements to the end of the "all categories" section.    */
        allCategory: CompFc;
      };
    };

    /** Customize the Audio Generation page. */
    audio: {add: PageAdd};
    /** Customize the Image Generation page. */
    image: {add: PageAdd};
    /** Customize the Text Generation page. */
    text: {add: PageAdd};
    /** Customize the Agents page. */
    agents: {add: PageAdd};
    /** Customize the Others page. */
    others: {add: PageAdd};
    /** Customize the Tools page. */
    tools: {add: PageAdd};
    /** Customize the Games page. */
    games: {add: PageAdd};

    /**
     * Customize the Settings page.*/
    settings: {
      /** Add new elements to the Settings page. */
      add: {
        /**
         * Add a new navigation button.    */
        navButton: CompFc;
        /**
         * Add new content to the page.    */
        content: CompFc;
      };
    };

    /**
     * Customize the Dashboard page.*/
    dashboard: {
      /** Add new elements to the Dashboard page. */
      add: {
        navButton: CompFc;
        content: CompFc;
      };
    };
  };

  /**
   * Add a new reducer to the Redux store.

   */

  addReducer: (reducer: {name: string; reducer: Reducer<any, any>}[]) => void;

  /** Modify card-related components and handlers. */
  cards: {
    /**
     * Replace the default cards handler.
     * This handler receives an array of cards as props and returns a component to display the cards.
     */
    replace: CompFcPropCard;
    /**
     * Replace the default card component used to display a single card.*/
    replaceComponent: CompFcPropCardData;
    /**
     * Customize various sections of the default card component.*/
    customize: {
      /** Replace the card's header section. */
      header: CompFcPropCardData;
      /** Replace the card's body section. */
      body: CompFcPropCardData;
      /** Replace the card's footer section. */
      footer: CompFcPropCardData;
      /**
       * Customize the card's menu.  */
      menu: {
        /**
         * Replace the default card menu.    */
        replace: CompFcPropCardData;
        /**
         * Add sections and items to the card menu.    */
        addSection: CompFcPropAddCardMenu;
        addModal: CompFcPropAddCardModal;
      };
    };
    /** Register a custom tools card. */
    registerToolsCard?: (card: {
      id: string;
      title: string;
      description: string;
      icon?: string | ReactNode;
      onPress?: () => void;
      component?: ComponentType;
      where?: string;
    }) => void;
  };

  /**
   * Set pre-commands for a card's terminal.
   * @param id - The ID of the card.
   * @param preCommands - Array of commands to run before the main command.
   */
  setCards_TerminalPreCommands: (id: string, preCommands: string[]) => void;

  /**
   * Core extension event bus used across renderer lifecycle hooks.
   */
  events: ExtensionEventsApi;

  /**
   * Listen to renderer IPC lifecycle hooks (before/after).
   * Includes `send`, `sendSync`, `invoke`, `on`, and `once`.
   */
  ipcEvents: ExtensionIpcEventsApi<RendererIpcHookMethod>;

  /**
   * Data related to modules.
   */
  modulesData?: ModuleData;

  /**
   * Initialize Sentry for the browser environment.
   * @param dsn - The Sentry DSN.
   * @returns The Sentry scope.
   */
  initBrowserSentry: (dsn: string) => Scope;

  toast: {top: typeof topToast; bottom: typeof bottomToast};
};
