import {Avatar} from '@heroui/react';
import {getCacheUrl, getFallbackString} from '@lynx_common/utils';
import {ChatRoundIcon, PinIcon} from '@solar-icons/react/bold-duotone';
import {motion} from 'framer-motion';
import {memo} from 'react';

import {ChatHistoryItem} from '../hooks/useSidebarNavigation';

interface ChatThreadItemProps {
  item: ChatHistoryItem;
  selectedCard: any;
  onlineCards: any[];
  pinnedThreads: string[];
  focusedIndex: number;
  visibleItemsFlat: ChatHistoryItem[];
  onSelectHistoryItem: (index: number, cardId?: string) => void;
  onTogglePin: (cardId: string, title: string) => void;
}

export const ChatThreadItem = memo(
  ({
    item,
    selectedCard,
    onlineCards,
    pinnedThreads,
    focusedIndex,
    visibleItemsFlat,
    onSelectHistoryItem,
    onTogglePin,
  }: ChatThreadItemProps) => {
    const isSelected = item.active;
    const cId = item.cardId || selectedCard?.id;
    const card = onlineCards.find(c => c.id === cId);
    const pinKey = `${cId}::${item.title}`;
    const isPinned = pinnedThreads.includes(pinKey);
    const isFocused =
      focusedIndex >= 0 &&
      visibleItemsFlat[focusedIndex]?.index === item.index &&
      visibleItemsFlat[focusedIndex]?.cardId === item.cardId;

    return (
      <button
        className={
          'relative w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left shrink-0 ' +
          'transition duration-200 cursor-pointer overflow-hidden group ' +
          'focus-visible:outline-none focus:outline-none ' +
          `${isFocused || isSelected ? 'ring-2 ring-accent/30' : ''}`
        }
        key={`${cId}-${item.index}`}
        id={`cb-thread-${cId}-${item.index}`}
        onClick={() => onSelectHistoryItem(item.index, item.cardId)}>
        {isSelected && (
          <motion.div
            layoutId="active_chat_indicator"
            className="absolute inset-0 bg-accent-soft z-0"
            transition={{duration: 0.35, type: 'spring', stiffness: 380, damping: 30}}
          />
        )}

        {!isSelected && (
          <div
            className={
              'absolute inset-0 bg-foreground/5 opacity-0 ' +
              'group-hover:opacity-100 transition-opacity duration-150 rounded-xl'
            }
          />
        )}

        <div className="relative z-10 flex items-center gap-2 w-full overflow-hidden">
          {selectedCard?.id === 'unified' && card ? (
            <Avatar className="size-4 shrink-0 rounded-md">
              <Avatar.Image alt={card.title} src={getCacheUrl(card.logoUrl)} />
              <Avatar.Fallback className="text-[8px]">{getFallbackString(card.title)}</Avatar.Fallback>
            </Avatar>
          ) : (
            <ChatRoundIcon className={`size-4 shrink-0 ${isSelected ? 'text-accent-soft-foreground' : 'text-muted'}`} />
          )}
          <span
            className={
              'text-xs font-medium truncate transition-colors duration-150 flex-1 ' +
              `${isSelected ? 'text-accent-soft-foreground' : 'text-foreground'}`
            }>
            {item.title}
          </span>

          {/* Pin Toggle Action on Hover */}
          <button
            onClick={e => {
              e.stopPropagation();
              onTogglePin(cId, item.title);
            }}
            className={
              'opacity-0 group-hover:opacity-100 hover:text-accent p-0.5 ' +
              `transition-opacity duration-150 cursor-pointer shrink-0 z-20 ${
                isPinned ? 'opacity-100 text-accent' : 'text-semi-muted'
              }`
            }
            aria-label={isPinned ? 'Unpin' : 'Pin'}>
            <PinIcon className={`size-3 ${isPinned ? 'fill-accent' : ''}`} />
          </button>
        </div>
      </button>
    );
  },
);

ChatThreadItem.displayName = 'ChatThreadItem';
