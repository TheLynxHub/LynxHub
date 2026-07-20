import {useCallback, useEffect, useMemo, useState} from 'react';

export interface ChatHistoryItem {
  index: number;
  title: string;
  active: boolean;
  cardId?: string;
}

interface UseSidebarNavigationParams {
  chatHistory: ChatHistoryItem[];
  selectedCard: any;
  onlineCards: any[];
  pinnedThreads: string[];
  onSelectHistoryItem: (index: number, cardId?: string) => void;
}

export function useSidebarNavigation({
  chatHistory,
  selectedCard,
  onlineCards,
  pinnedThreads,
  onSelectHistoryItem,
}: UseSidebarNavigationParams) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedProviders, setCollapsedProviders] = useState<Record<string, boolean>>({});
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Search and grouping logic
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return chatHistory;
    const q = searchQuery.toLowerCase();
    return chatHistory.filter(item => item.title.toLowerCase().includes(q));
  }, [chatHistory, searchQuery]);

  const groupedHistory = useMemo(() => {
    const pinned: ChatHistoryItem[] = [];
    const unpinned: ChatHistoryItem[] = [];

    filteredHistory.forEach(item => {
      const cId = item.cardId || selectedCard?.id;
      const pinKey = `${cId}::${item.title}`;
      if (pinnedThreads.includes(pinKey)) {
        pinned.push(item);
      } else {
        unpinned.push(item);
      }
    });

    const groups: Record<string, ChatHistoryItem[]> = {};
    if (selectedCard?.id === 'unified') {
      unpinned.forEach(item => {
        const cId = item.cardId || 'unknown';
        if (!groups[cId]) groups[cId] = [];
        groups[cId].push(item);
      });
    }

    return {pinned, unpinned, groups};
  }, [filteredHistory, selectedCard, pinnedThreads]);

  // Flat list of display items for keyboard navigation index mapping
  const visibleItemsFlat = useMemo(() => {
    const flat: ChatHistoryItem[] = [];
    groupedHistory.pinned.forEach(item => flat.push(item));
    if (selectedCard?.id === 'unified') {
      onlineCards
        .filter(c => c.id !== 'unified')
        .forEach(card => {
          const isProviderCollapsed = collapsedProviders[card.id];
          const items = groupedHistory.groups[card.id] || [];
          if (!isProviderCollapsed && items.length > 0) {
            items.forEach(item => flat.push(item));
          }
        });
    } else {
      groupedHistory.unpinned.forEach(item => flat.push(item));
    }
    return flat;
  }, [groupedHistory, selectedCard, onlineCards, collapsedProviders]);

  // Sync focusedIndex focus to DOM element
  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < visibleItemsFlat.length) {
      const item = visibleItemsFlat[focusedIndex];
      const cId = item.cardId || selectedCard?.id;
      const el = document.getElementById(`cb-thread-${cId}-${item.index}`);
      el?.focus({preventScroll: false});
    }
  }, [focusedIndex, visibleItemsFlat, selectedCard]);

  // Keyboard handlers
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const isSearchFocused = document.activeElement?.getAttribute('placeholder') === 'Search chats...';

      if (isSearchFocused) {
        if (e.key === 'ArrowDown' && visibleItemsFlat.length > 0) {
          e.preventDefault();
          setFocusedIndex(0);
        }
        return;
      }

      if (visibleItemsFlat.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => (prev + 1) % visibleItemsFlat.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => {
          if (prev <= 0) {
            const searchInput = document.querySelector('input[placeholder="Search chats..."]') as HTMLInputElement;
            searchInput?.focus();
            return -1;
          }
          return prev - 1;
        });
      } else if (e.key === 'Enter') {
        if (focusedIndex >= 0 && focusedIndex < visibleItemsFlat.length) {
          e.preventDefault();
          const item = visibleItemsFlat[focusedIndex];
          onSelectHistoryItem(item.index, item.cardId);
        }
      }
    },
    [visibleItemsFlat, focusedIndex, onSelectHistoryItem],
  );

  const toggleProviderCollapse = useCallback((cardId: string) => {
    setCollapsedProviders(prev => ({...prev, [cardId]: !prev[cardId]}));
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    collapsedProviders,
    focusedIndex,
    filteredHistory,
    groupedHistory,
    visibleItemsFlat,
    handleKeyDown,
    toggleProviderCollapse,
  };
}
