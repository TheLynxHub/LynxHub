import {useAllCardDataWithPath} from '@lynx/plugins/modules';
import {toolsCardRegistry} from '@lynx/plugins/modules/toolsRegistry';
import {useCardsState} from '@lynx/redux/reducers/cards';
import {storageUtilsIpc} from '@lynx_shared/ipc/storage';
import {isEmpty, isEqual} from 'lodash-es';
import {useEffect} from 'react';

/**
 * Ensures that pinned cards list is consistent with installed cards.
 * Removes any pinned cards that are no longer installed.
 */
export function useFilterPinnedCards() {
  const installedCards = useCardsState('installedCards');
  const pinnedCards = useCardsState('pinnedCards');
  const allCards = useAllCardDataWithPath();

  useEffect(() => {
    if (isEmpty(installedCards) || isEmpty(pinnedCards)) {
      return; // Exit early if either array is empty
    }

    const installedCardIds = new Set(installedCards.map(card => card.id));
    const registeredToolsIds = new Set(toolsCardRegistry.getAll().map(t => t.id));
    const onlineCardIds = new Set(allCards.filter(card => card.isOnline).map(card => card.id));

    // Filter pinned cards based on whether their ID exists in the installed cards, registered tools cards, or online cards
    const filteredPins = pinnedCards.filter(
      pCard => installedCardIds.has(pCard) || registeredToolsIds.has(pCard) || onlineCardIds.has(pCard),
    );

    if (!isEqual(filteredPins, pinnedCards)) {
      storageUtilsIpc.invoke.pinnedCards('set', '', filteredPins);
    }
  }, [installedCards, pinnedCards, allCards]);
}
