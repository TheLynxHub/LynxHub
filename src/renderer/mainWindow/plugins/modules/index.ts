import {AvailablePageIDs} from '@lynx_common/consts';
import {
  ArgumentsData,
  CardData,
  CardModules,
  CardRendererMethods,
  LoadedArguments,
  LoadedCardData,
  LoadedMethods,
  RendererModuleImportType,
} from '@lynx_common/types/plugins/modules';
import {extractGitUrl, isDev} from '@lynx_common/utils';
import pluginsIpc from '@lynx_shared/ipc/plugins';
import storageIpc from '@lynx_shared/ipc/storage';
import {captureException} from '@sentry/electron/renderer';
import Fuse from 'fuse.js';
import {compact} from 'lodash-es';
import {useMemo, useSyncExternalStore} from 'react';

import {addRendererFailure} from '../failures';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Flat list of pre-extracted search tokens per card, used for fast text search. */
type CardSearchIndex = {id: string; tokens: string[]}[];

// ─── Module-level State ───────────────────────────────────────────────────────
// All state lives at module scope so it persists across React render cycles
// and can be shared freely between hooks (via useSyncExternalStore) and
// imperative mutation functions (duplicateCard, removeDuplicatedCard, etc.).

let allModules: CardModules = [];
let allCards: CardData[] = [];

let allCardDataWithPath: LoadedCardData[] = [];
let allCardArguments: LoadedArguments[] = [];
let allCardMethods: LoadedMethods[] = [];
let cardSearchIndex: CardSearchIndex = [];

/**
 * Set of card IDs that have arguments defined.
 * Kept as a `Set` for O(1) membership checks in render-hot paths.
 */
let hasArguments: Set<string> = new Set([]);

// ─── External Store Subscribe/Notify ─────────────────────────────────────────
// React's `useSyncExternalStore` requires a stable `subscribe` function and
// a way to notify all subscribers when state changes. We implement this with
// a simple listener Set — whenever module-level state mutates, `notifyListeners`
// iterates and calls every registered callback.

const changeListeners = new Set<() => void>();

/** Registers a React subscriber; returns the cleanup (unsubscribe) function. */
function subscribe(listener: () => void) {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

/** Notifies all `useSyncExternalStore` subscribers that state has changed. */
function notifyListeners() {
  for (const listener of changeListeners) {
    listener();
  }
}

// ─── React Hooks (useSyncExternalStore wrappers) ──────────────────────────────
// Each hook subscribes to the shared module-level state via `useSyncExternalStore`.
// This gives React a way to schedule re-renders whenever `notifyListeners` fires
// after a mutation (e.g. after loadModules or duplicateCard completes).

/** @returns All loaded module groups (grouped by page route). */
const useAllModules = (): CardModules => useSyncExternalStore(subscribe, () => allModules);

/** @returns All loaded cards with their associated route path. */
const useAllCardDataWithPath = (): LoadedCardData[] => useSyncExternalStore(subscribe, () => allCardDataWithPath);

/** @returns All loaded card argument definitions. */
const useAllCardArguments = (): LoadedArguments[] => useSyncExternalStore(subscribe, () => allCardArguments);

/** @returns All loaded card renderer methods. */
const useAllCardMethods = (): LoadedMethods[] => useSyncExternalStore(subscribe, () => allCardMethods);

/** @internal Used by `useSearchCards` to reactively access the search index. */
const useCardSearchIndex = (): CardSearchIndex => useSyncExternalStore(subscribe, () => cardSearchIndex);

/** @returns The set of card IDs that have arguments configured. */
const useHasArguments = (): Set<string> => useSyncExternalStore(subscribe, () => hasArguments);

// ─── Derived / Selector Hooks ─────────────────────────────────────────────────

/**
 * Returns the argument definitions for a given card ID.
 *
 * @param id - The unique card ID to look up.
 * @returns The card's `ArgumentsData`, or `undefined` if it has none.
 */
const useGetArgumentsByID = (id: string): ArgumentsData | undefined =>
  useAllCardArguments().find(card => card.id === id)?.arguments;

const useSupportCustomArg = (id: string) => useAllCardArguments().find(card => card.id === id)?.supportCustomArguments;

/**
 * Searches all loaded cards by title, description, and repository owner/name.
 *
 * @param searchValue - The user-entered search string.
 * @returns Cards whose search tokens match the given value.
 */
const useSearchCards = (searchValue: string) => {
  const index = useCardSearchIndex();
  return useMemo(() => {
    if (!searchValue) return allCardDataWithPath;

    const cardsWithTokens = allCardDataWithPath.map(card => {
      const entry = index.find(e => e.id === card.id);
      return {
        card,
        tokens: entry ? entry.tokens : [],
      };
    });

    const fuse = new Fuse(cardsWithTokens, {
      keys: ['tokens'],
      threshold: 0.4,
    });

    return fuse.search(searchValue).map(r => r.item.card);
  }, [searchValue, allCardDataWithPath, index]);
};

/**
 * Returns all cards that belong to the given page route.
 *
 * @param path - The page identifier (e.g. `'imageGen_page'`).
 * @returns Filtered array of `LoadedCardData` for that route.
 */
const useGetCardsByPath = (path: AvailablePageIDs): LoadedCardData[] =>
  useAllCardDataWithPath().filter(card => card.routePath === path);

/**
 * Non-reactive check for whether any cards exist on a given route.
 * Use this in non-React contexts (e.g. at nav-bar initialization time).
 *
 * @param path - The page identifier to check.
 * @returns `true` if at least one card is registered on that route.
 */
const hasCardsByPath = (path: AvailablePageIDs | string): boolean =>
  allCardDataWithPath.some(card => card.routePath === path);

const getTitleById = (id: string): string | undefined => allCards.find(card => card.id === id)?.title;

/**
 * Retrieves a specific renderer method from a card's method collection.
 *
 * @param cardMethods - The full list of loaded card methods.
 * @param id - The card ID to look up.
 * @param method - The method name to retrieve.
 * @returns The typed method, or `undefined` if not present.
 */
const getCardMethod = <T extends keyof CardRendererMethods>(
  cardMethods: LoadedMethods[],
  id: string,
  method: T,
): CardRendererMethods[T] | undefined => {
  const targetMethods = Array.isArray(cardMethods) ? cardMethods : allCardMethods;
  return targetMethods.find(card => card.id === id)?.methods?.[method] as CardRendererMethods[T] | undefined;
};

/**
 * Returns the installation type for a card.
 * Defaults to `'others'` if the card is not found or has no install type set.
 *
 * @param id - The card ID.
 */
const useGetInstallType = (id: string) =>
  useAllCardDataWithPath().find(card => card.id === id)?.installationType ?? 'others';

/**
 * Returns the uninstall type for a card.
 * Defaults to `'removeFolder'` if the card is not found or has no uninstall type set.
 *
 * @param id - The card ID.
 */
const useGetUninstallType = (id: string) =>
  useAllCardDataWithPath().find(card => card.id === id)?.uninstallType ?? 'removeFolder';

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Builds the search token array for a single card.
 * Tokens include: description, title, repo owner, and repo name.
 */
function buildCardSearchTokens(card: CardData): string[] {
  if (!card.repoUrl) {
    return [card.description, card.title, 'Online', 'online'];
  }
  const {owner, repo} = extractGitUrl(card.repoUrl);
  return [card.description, card.title, owner, repo];
}

/**
 * Inserts or appends the derived data for a single card (path info, arguments,
 * methods, search tokens) into the four parallel arrays.
 *
 * When inserting a **duplicate** card, it is placed immediately after its
 * original in every array so that UI ordering stays consistent.
 *
 * @param card - The card whose data to insert.
 * @param routePath - The page route the card belongs to.
 * @param originalCardId - ID of the card this was duplicated from (used to
 *   determine insertion position). Pass the card's own `id` for non-duplicates.
 */
function insertCardData(card: CardData, routePath: AvailablePageIDs, originalCardId: string) {
  const {arguments: args, methods, supportCustomArguments, ...cardWithoutInternals} = card;

  const insertAfterIndex = allCardDataWithPath.findIndex(c => c.id === originalCardId);

  if (insertAfterIndex !== -1) {
    // Insert immediately after the original card in every parallel array.
    const pos = insertAfterIndex + 1;

    allCardDataWithPath = [
      ...allCardDataWithPath.slice(0, pos),
      {...cardWithoutInternals, routePath},
      ...allCardDataWithPath.slice(pos),
    ];
    allCardArguments = [
      ...allCardArguments.slice(0, pos),
      {id: card.id, arguments: args, supportCustomArguments},
      ...allCardArguments.slice(pos),
    ];
    allCardMethods = [...allCardMethods.slice(0, pos), {id: card.id, methods}, ...allCardMethods.slice(pos)];
    cardSearchIndex = [
      ...cardSearchIndex.slice(0, pos),
      {id: card.id, tokens: buildCardSearchTokens(card)},
      ...cardSearchIndex.slice(pos),
    ];
  } else {
    // Original not found — append to the end of every array.
    allCardDataWithPath = [...allCardDataWithPath, {...cardWithoutInternals, routePath}];
    allCardArguments = [...allCardArguments, {id: card.id, arguments: args, supportCustomArguments}];
    allCardMethods = [...allCardMethods, {id: card.id, methods}];
    cardSearchIndex = [...cardSearchIndex, {id: card.id, tokens: buildCardSearchTokens(card)}];
  }

  if (args) hasArguments.add(card.id);
}

// ─── Card Duplication ─────────────────────────────────────────────────────────

/**
 * Generates the next available unique ID for a duplicated card.
 * Appends `_2`, `_3`, etc. until a non-colliding ID is found.
 */
function generateUniqueCardId(baseId: string): string {
  let counter = 2;
  let candidate = `${baseId}_${counter}`;
  while (allCards.some(card => card.id === candidate)) {
    candidate = `${baseId}_${++counter}`;
  }
  return candidate;
}

/**
 * Generates the next available unique title for a duplicated card.
 * Appends ` (2)`, ` (3)`, etc. until a non-colliding title is found.
 */
function generateUniqueCardTitle(originalTitle: string): string {
  let counter = 2;
  let candidate = `${originalTitle} (${counter})`;
  while (allCards.some(card => card.title === candidate)) {
    candidate = `${originalTitle} (${++counter})`;
  }
  return candidate;
}

/**
 * Creates a copy of an existing card and inserts it immediately after the
 * original across all module-level state arrays.
 *
 * @param originalId - The ID of the card to duplicate.
 * @param overrideId - Optional explicit ID for the new card (used when
 *   restoring a duplication from persisted storage).
 * @param overrideTitle - Optional explicit title for the new card.
 * @returns An object `{id, title, routePath}` describing the new card,
 *   or `undefined` if `originalId` was not found.
 */
const duplicateCard = (
  originalId: string,
  overrideId?: string,
  overrideTitle?: string,
): {id: string; title: string; routePath: AvailablePageIDs} | undefined => {
  let newId = '';
  let newTitle = '';
  let routePath: AvailablePageIDs = 'imageGen_page';
  let duplicatedCard: CardData | undefined;

  const updatedModules = allModules.map(page => {
    const cardIndex = page.cards.findIndex(card => card.id === originalId);
    if (cardIndex === -1) return page;

    const originalCard = page.cards[cardIndex];
    newId = overrideId ?? generateUniqueCardId(originalCard.id);
    newTitle = overrideTitle ?? generateUniqueCardTitle(originalCard.title);
    routePath = page.routePath;

    duplicatedCard = {...originalCard, id: newId, title: newTitle};
    const updatedCards = [...page.cards];
    updatedCards.splice(cardIndex + 1, 0, duplicatedCard);

    return {...page, cards: updatedCards};
  });

  if (!duplicatedCard) return undefined;

  allModules = updatedModules;
  allCards = [...allCards, duplicatedCard];
  insertCardData(duplicatedCard, routePath, originalId);
  notifyListeners();

  return {id: newId, title: newTitle, routePath};
};

/**
 * Removes a previously duplicated card from all module-level state arrays.
 * Does nothing and emits no change if the card ID is not found.
 *
 * @param id - The ID of the duplicated card to remove.
 */
const removeDuplicatedCard = (id: string) => {
  let cardWasFound = false;

  const updatedModules = allModules.map(page => {
    const cardIndex = page.cards.findIndex(card => card.id === id);
    if (cardIndex === -1) return page;

    cardWasFound = true;
    const updatedCards = [...page.cards];
    updatedCards.splice(cardIndex, 1);
    return {...page, cards: updatedCards};
  });

  const previousLength = allCards.length;
  allCards = allCards.filter(card => card.id !== id);
  if (allCards.length !== previousLength) cardWasFound = true;

  if (!cardWasFound) return;

  allModules = updatedModules;
  allCardDataWithPath = allCardDataWithPath.filter(card => card.id !== id);
  allCardArguments = allCardArguments.filter(arg => arg.id !== id);
  allCardMethods = allCardMethods.filter(method => method.id !== id);
  cardSearchIndex = cardSearchIndex.filter(entry => entry.id !== id);
  hasArguments.delete(id);
  notifyListeners();
};

/**
 * Globally updates a card's title across module state, search index, custom storage,
 * and duplicated card entries (if applicable).
 *
 * @param id - The unique ID of the card to rename.
 * @param newTitle - The new title for the card.
 */
const updateCardTitle = async (id: string, newTitle: string) => {
  await storageIpc.setCustom(`${id}_title_edited`, newTitle);

  const card = allCards.find(c => c.id === id);
  if (card) {
    card.title = newTitle;
  }

  const cardWithPath = allCardDataWithPath.find(c => c.id === id);
  if (cardWithPath) {
    cardWithPath.title = newTitle;
  }

  const searchEntry = cardSearchIndex.find(s => s.id === id);
  if (searchEntry && card) {
    searchEntry.tokens = buildCardSearchTokens(card);
  }

  for (const page of allModules) {
    const pageCard = page.cards.find(c => c.id === id);
    if (pageCard) {
      pageCard.title = newTitle;
    }
  }

  const {duplicated} = await storageIpc.get('cards');
  const dupIndex = duplicated.findIndex(d => d.id === id);
  if (dupIndex !== -1) {
    const updatedDuplicated = [...duplicated];
    updatedDuplicated[dupIndex] = {...updatedDuplicated[dupIndex], title: newTitle};
    await storageIpc.update('cards', {duplicated: updatedDuplicated});
  }

  notifyListeners();
};

// ─── State Commit ─────────────────────────────────────────────────────────────

/**
 * Atomically writes a freshly built set of module data into the module-level
 * state, then replays any persisted card duplications before notifying React.
 *
 * **Why async?** It needs to fetch the `duplicated` list from storage via IPC
 * before committing, ensuring duplicates are restored on every reload.
 */
async function commitModuleState(
  newAllModules: CardModules,
  newAllCards: CardData[],
  newCardDataWithPath: LoadedCardData[],
  newCardArguments: LoadedArguments[],
  newCardMethods: LoadedMethods[],
  newCardSearchIndex: CardSearchIndex,
) {
  const {duplicated} = await storageIpc.get('cards');

  allModules = newAllModules;
  allCards = newAllCards;
  allCardDataWithPath = newCardDataWithPath;
  allCardArguments = newCardArguments;
  allCardMethods = newCardMethods;
  cardSearchIndex = newCardSearchIndex;
  // Rebuild the hasArguments Set from loaded data to clear any stale entries.
  hasArguments = new Set(newCardArguments.filter(arg => !!arg.arguments).map(item => item.id));

  // Restore previously duplicated cards (e.g. from a previous session).
  for (const item of duplicated) {
    const customTitle = await storageIpc.getCustom<string | null>(`${item.id}_title_edited`);
    duplicateCard(item.ogID, item.id, customTitle || item.title);
  }

  // Re-apply any edited titles for original & duplicated cards across module-level state
  for (let i = 0; i < allCards.length; i++) {
    const card = allCards[i];
    const customTitle = await storageIpc.getCustom<string | null>(`${card.id}_title_edited`);
    if (customTitle && customTitle !== card.title) {
      card.title = customTitle;
      const dataWithPath = allCardDataWithPath.find(c => c.id === card.id);
      if (dataWithPath) dataWithPath.title = customTitle;
      const searchItem = cardSearchIndex.find(s => s.id === card.id);
      if (searchItem) searchItem.tokens = buildCardSearchTokens(card);
    }
  }

  notifyListeners();
}

// ─── Module Loader ────────────────────────────────────────────────────────────

/**
 * Discovers, imports, and registers all plugin modules and their associated
 * cards into the renderer's module-level state.
 *
 * **Dev mode**: Attempts a single import of the local `@lynx_module/renderer`
 * alias. Skips silently if not configured.
 *
 * **Production mode**: Fetches plugin server addresses via IPC, filters to
 * `module` type, then imports each module's renderer entry concurrently.
 * Individual import failures are captured to Sentry and nulled out so the
 * remaining modules can still load.
 *
 * After all imports resolve, cards are aggregated across modules (de-duplicated
 * by ID and filtered against the user's disabled-cards list), then
 * `commitModuleState` is called to write the result to module-level state and
 * trigger a React re-render.
 */
const loadModules = async () => {
  try {
    let importedModules: ({path: string; module: RendererModuleImportType} | null)[];

    const pluginStorage = await storageIpc.get('plugin');
    const disabledCards = new Set(pluginStorage.disabledCards ?? []);

    if (isDev()) {
      // ── Dev shortcut ───────────────────────────────────────────────────────
      try {
        const devImport = await import(/* @vite-ignore */ '@lynx_module/renderer');
        importedModules = [{path: 'dev', module: devImport}];
      } catch {
        console.log('No dev module found, skipping...');
        importedModules = [];
      }
    } else {
      // ── Production: load from live plugin servers ──────────────────────────
      const pluginAddresses = await pluginsIpc.getAddresses();
      const moduleAddresses = pluginAddresses.filter(item => item.type === 'module').map(item => item.address);

      importedModules = await Promise.all(
        moduleAddresses.map(async serverAddress => {
          try {
            // Cache-bust with a timestamp so updated modules are always fetched.
            const module = await import(/* @vite-ignore */ `${serverAddress}/scripts/renderer.mjs?${Date.now()}`);
            return {path: serverAddress, module};
          } catch (error: any) {
            console.error('Failed to load module renderer entry:', serverAddress, error);
            captureException(error);
            const folderName = serverAddress.replace('lynxplugin://', '');
            addRendererFailure(folderName, `Renderer load error: ${error?.message || error}`);
            return null;
          }
        }),
      );
    }

    // ── Aggregate cards from all loaded modules ─────────────────────────────
    const newAllModules: CardModules = [];
    const newAllCards: CardData[] = [];
    const newCardDataWithPath: LoadedCardData[] = [];
    const newCardArguments: LoadedArguments[] = [];
    const newCardMethods: LoadedMethods[] = [];
    const newCardSearchIndex: CardSearchIndex = [];

    compact(importedModules).forEach(({module}) => {
      (module as RendererModuleImportType).default.forEach(mod => {
        const enabledCards = mod.cards.filter(card => !disabledCards.has(card.id));
        if (enabledCards.length === 0) return;

        const existingModuleIndex = newAllModules.findIndex(m => m.routePath === mod.routePath);

        if (existingModuleIndex !== -1) {
          // Merge into an existing module page — skip cards already registered.
          const existingModule = newAllModules[existingModuleIndex];
          enabledCards.forEach(card => {
            if (!existingModule.cards.some(c => c.id === card.id)) {
              existingModule.cards.push(card);
              newAllCards.push(card);
            }
          });
        } else {
          // First time seeing this route — create a new module entry.
          newAllModules.push({...mod, cards: enabledCards});
          newAllCards.push(...enabledCards);

          enabledCards.forEach(card => {
            const {arguments: args, methods, supportCustomArguments, ...cardWithoutInternals} = card;
            newCardDataWithPath.push({...cardWithoutInternals, routePath: mod.routePath});
            newCardArguments.push({id: card.id, arguments: args, supportCustomArguments});
            newCardMethods.push({id: card.id, methods});
            newCardSearchIndex.push({id: card.id, tokens: buildCardSearchTokens(card)});
          });
        }
      });
    });

    await commitModuleState(
      newAllModules,
      newAllCards,
      newCardDataWithPath,
      newCardArguments,
      newCardMethods,
      newCardSearchIndex,
    );
  } catch (error) {
    console.error('Error loading plugin modules:', error);
  }
};

// ─── Exports ──────────────────────────────────────────────────────────────────

export {
  allCardMethods,
  allCards,
  allModules,
  duplicateCard,
  getCardMethod,
  getTitleById,
  hasCardsByPath,
  loadModules,
  removeDuplicatedCard,
  updateCardTitle,
  useAllCardArguments,
  useAllCardDataWithPath,
  useAllCardMethods,
  useAllModules,
  useGetArgumentsByID,
  useGetCardsByPath,
  useGetInstallType,
  useGetUninstallType,
  useHasArguments,
  useSearchCards,
  useSupportCustomArg,
};

export default loadModules;
