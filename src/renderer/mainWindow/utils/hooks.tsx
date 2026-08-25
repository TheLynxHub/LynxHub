import {useCardsState} from '@lynx/redux/reducers/cards';
import {useSettingsState} from '@lynx/redux/reducers/settings';
import {ChangelogItem, type ElementResizeData} from '@lynx_common/types';
import {InstalledCard} from '@lynx_common/types/storage';
import {isEmpty, isNil} from 'lodash-es';
import {Fragment, useEffect, useState} from 'react';

/**
 * Hook to get an installed card by its ID.
 * @param cardId - The ID of the card to find
 * @returns The installed card or undefined if not found
 */
export function useInstalledCard(cardId: string): InstalledCard | undefined {
  const installedCards = useCardsState('installedCards');
  return installedCards.find(card => card.id === cardId);
}

/**
 * Hook to get an updating card by its ID.
 * @param cardId - The ID of the card to find
 * @returns The updating card or undefined if not found
 */
export function useUpdatingCard(cardId: string): boolean {
  const updatingCards = useCardsState('updatingCards');
  return updatingCards.some(card => card.id === cardId);
}

/**
 * Hook to check if an update is available for a card.
 * @param cardId - The ID of the card to check
 * @returns Boolean indicating if an update is available
 */
export function useUpdateAvailable(cardId: string): boolean {
  const updateAvailable = useCardsState('updateAvailable');
  return updateAvailable.includes(cardId);
}

/**
 * Hook to check if a card is set for auto-update.
 * @param cardId - The ID of the card to check
 * @returns Boolean indicating if the card is set for auto-update
 */
export function useIsAutoUpdateCard(cardId: string): boolean {
  const autoUpdate = useCardsState('autoUpdate');
  return autoUpdate.includes(cardId);
}

/**
 * Hook to check if a card's extensions are set for auto-update.
 * @param cardId - The ID of the card to check
 * @returns Boolean indicating if the card's extensions are set for auto-update
 */
export function useIsAutoUpdateExtensions(cardId: string): boolean {
  const autoUpdate = useCardsState('autoUpdateExtensions');
  return autoUpdate.includes(cardId);
}

/**
 * Hook to check if a card is pinned.
 * @param cardId - The ID of the card to check
 * @returns Boolean indicating if the card is pinned
 */
export function useIsPinnedCard(cardId: string): boolean {
  const pinnedCards = useCardsState('pinnedCards');
  return pinnedCards.includes(cardId);
}

/**
 * Hook to determine if tooltips should be disabled based on settings.
 * @param isEssential - Whether the tooltip is essential (always shown in 'essential' mode)
 * @returns Boolean indicating if the tooltip should be disabled
 */
export function useDisableTooltip(isEssential: boolean = false): boolean {
  const tooltipLevel = useSettingsState('tooltipLevel');

  // Disable All
  if (tooltipLevel === 'none') return true;

  // Show All
  if (tooltipLevel === 'full') return false;

  // Show if tooltip set to essential
  return !isEssential;
}

/**
 * Recursively renders changelog items as a nested list.
 * @param items - Array of changelog items
 * @param parentKey - Parent key for React keys
 * @returns JSX element or null
 */
export function RenderSubItems(items?: ChangelogItem[], parentKey: string = '') {
  if (isNil(items) || isEmpty(items)) return null;

  return (
    <ul style={{listStyleType: 'disc', paddingLeft: '20px'}}>
      {items.map((item, index) => {
        const currentKey = `${parentKey}_${index}`;
        return (
          <Fragment key={currentKey}>
            <li>{item.label}</li>
            {item.subitems && RenderSubItems(item.subitems, currentKey)}
          </Fragment>
        );
      })}
    </ul>
  );
}

/**
 * Checks if the app is running as a Linux portable version.
 */
export const isLinuxPortable = window.isPortable === 'linux';

export function useElementResizing(onResize: (data: ElementResizeData) => void) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!element) return;

    const sendSize = () => {
      const rect = element.getBoundingClientRect();
      const width = Math.max(Math.ceil(element.scrollWidth), Math.ceil(rect.width));
      const height = Math.max(Math.ceil(element.scrollHeight), Math.ceil(rect.height));

      if (width < 1 || height < 1) return;

      const dpr = window.devicePixelRatio || 1;
      onResize({width, height, dpr, x: rect.x, y: rect.y});
    };

    const resizeObserver = new ResizeObserver(() => {
      sendSize();
    });

    resizeObserver.observe(element);
    sendSize();

    return () => {
      resizeObserver.disconnect();
    };
  }, [element, onResize]);

  return setElement;
}

export function useHasScroll() {
  const [hasScroll, setHasScroll] = useState<boolean>(false);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef) setHasScroll(containerRef.scrollWidth > containerRef.clientWidth);
  }, [containerRef]);

  return {hasScroll, containerRef, setContainerRef};
}
