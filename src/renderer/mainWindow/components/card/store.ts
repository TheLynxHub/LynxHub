import {CardState} from '@lynx_common/types';
import {LoadedCardData} from '@lynx_common/types/plugins/modules';
import {validateGitRepoUrl} from '@lynx_common/utils';
import {createContext, useContext} from 'react';
import {create, StoreApi, UseBoundStore} from 'zustand';

/**
 * Type definition for the Card Store.
 */
export type CardStore = UseBoundStore<StoreApi<CardState>>;

/**
 * Creates a Zustand store for a specific card instance.
 * @param initialData The initial data for the card.
 * @returns A Zustand store.
 */
export const createCardStore = (
  initialData: LoadedCardData & {isInstalled: boolean; hasArguments: boolean},
): CardStore => {
  return create<CardState>((set, get) => ({
    // Static Info from props
    title: initialData.title,
    id: initialData.id,
    description: initialData.description,
    repoUrl: initialData.repoUrl ? validateGitRepoUrl(initialData.repoUrl) : '',
    extensionsDir: initialData.extensionsDir,
    haveArguments: initialData.hasArguments,
    type: initialData.type || 'unknown',

    // Component State
    menuIsOpen: false,
    checkingForUpdate: false,
    installed: initialData.isInstalled,

    // Actions that modify the state
    setMenuIsOpen: isOpen => {
      set({menuIsOpen: isOpen});
    },
    setCheckingForUpdate: isChecking => set({checkingForUpdate: isChecking}),

    overlayStates: {},

    addOverlayState: (key, initialOpen = false) =>
      set(state => ({
        overlayStates: {...state.overlayStates, [key]: initialOpen},
      })),
    removeOverlayState: key =>
      set(state => {
        const {[key]: _, ...rest} = state.overlayStates;
        return {overlayStates: rest};
      }),
    setOverlay: (key, isOpen) => {
      set(state => ({
        overlayStates: {...state.overlayStates, [key]: isOpen},
      }));
    },
    openOverlay: key => {
      set(state => ({
        overlayStates: {...state.overlayStates, [key]: true},
      }));
    },
    closeOverlay: key => {
      set(state => ({
        overlayStates: {...state.overlayStates, [key]: false},
      }));
    },
    toggleOverlay: key => {
      const nextVal = !get().overlayStates[key];
      set(state => ({
        overlayStates: {
          ...state.overlayStates,
          [key]: nextVal,
        },
      }));
    },
    isOverlayOpen: key => get().overlayStates[key] ?? false,
  }));
};

/**
 * Context for providing the Card Store to child components.
 */
export const CardStoreContext = createContext<CardStore | null>(null);

/**
 * Custom hook to access the Card Store.
 * @param selector A selector function to pick a slice of the state.
 * @returns The selected state slice.
 * @throws Error if used outside of a CardStoreContext.Provider.
 */
export const useCardStore = <T>(selector: (state: CardState) => T): T => {
  const store = useContext(CardStoreContext);
  if (!store) {
    throw new Error('Missing CardStoreContext.Provider');
  }
  return store(selector);
};
