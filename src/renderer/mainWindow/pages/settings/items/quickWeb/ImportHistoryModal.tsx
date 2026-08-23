import {Button, Checkbox, Chip, Modal, ScrollShadow, SearchField, Spinner} from '@heroui/react';
import TabModal from '@lynx/components/TabModal';
import type {FavIcons} from '@lynx_common/types/ipc';
import {EarthIcon, History2Icon, ImportIcon} from '@solar-icons/react/bold-duotone';
import {useEffect, useMemo, useState} from 'react';

import {getCachedHistoryData} from '../../../../features/session/browser/utils';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: {title: string; url: string; favIcon?: string}[]) => void;
};

type HistoryEntry = {
  url: string;
  title: string;
  favIcon?: string;
  isFavorite: boolean;
};

export default function ImportHistoryModal({isOpen, onClose, onImport}: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getCachedHistoryData()
        .then(result => {
          const favIconMap = new Map<string, string>();
          (result.favIcons || []).forEach((fav: FavIcons) => {
            favIconMap.set(fav.url, fav.favIcon);
          });

          const uniqueUrls = new Set<string>();
          const list: HistoryEntry[] = [];

          (result.favoriteAddress || []).forEach((url: string) => {
            if (!uniqueUrls.has(url)) {
              uniqueUrls.add(url);
              list.push({
                url,
                title: url,
                favIcon: favIconMap.get(url),
                isFavorite: true,
              });
            }
          });

          (result.recentAddress || []).forEach((url: string) => {
            if (!uniqueUrls.has(url)) {
              uniqueUrls.add(url);
              list.push({
                url,
                title: url,
                favIcon: favIconMap.get(url),
                isFavorite: false,
              });
            }
          });

          setEntries(list);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries;
    const lower = search.toLowerCase();
    return entries.filter(e => e.url.toLowerCase().includes(lower));
  }, [entries, search]);

  const toggleSelect = (url: string) => {
    const next = new Set(selectedUrls);
    if (next.has(url)) next.delete(url);
    else next.add(url);
    setSelectedUrls(next);
  };

  const selectAll = () => {
    if (selectedUrls.size === filteredEntries.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(filteredEntries.map(e => e.url)));
    }
  };

  const handleImport = () => {
    const toImport = entries
      .filter(e => selectedUrls.has(e.url))
      .map(e => ({
        title: e.title,
        url: e.url,
        favIcon: e.favIcon,
      }));

    if (toImport.length > 0) {
      onImport(toImport);
    }
    setSelectedUrls(new Set());
    onClose();
  };

  return (
    <TabModal size="lg" isOpen={isOpen} onOpenChange={open => !open && onClose()}>
      <Modal.CloseTrigger />
      <Modal.Header>
        <Modal.Heading className="flex items-center gap-x-2">
          <History2Icon className="size-5 text-accent-foreground" />
          Import from Browser History & Favorites
        </Modal.Heading>
      </Modal.Header>

      <Modal.Body className="flex flex-col gap-y-3 py-2">
        <SearchField
          value={search}
          variant="secondary"
          onChange={setSearch}
          aria-label="Search history and favorites"
          fullWidth>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search history and favorites by URL..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-x-2">
            <span className="text-xs text-muted">
              {selectedUrls.size} of {filteredEntries.length} selected
            </span>
            {selectedUrls.size > 0 && (
              <Chip size="sm" variant="soft" color="accent" className="h-4.5 text-[10px] px-1.5 font-medium">
                {selectedUrls.size} ready to import
              </Chip>
            )}
          </div>
          {filteredEntries.length > 0 && (
            <Button size="sm" variant="ghost" onPress={selectAll} className="h-6 text-xs px-2">
              {selectedUrls.size === filteredEntries.length ? 'Deselect All' : 'Select All'}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Spinner size="md" />
          </div>
        ) : (
          <ScrollShadow
            className={
              'max-h-80 min-h-48 border border-border/70 rounded-xl p-1.5 ' +
              'flex flex-col gap-y-1 bg-surface-secondary/20'
            }>
            {filteredEntries.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted flex flex-col items-center gap-y-2">
                <History2Icon className="size-8 text-muted/50" />
                <span>No browser history or favorites found.</span>
              </div>
            ) : (
              filteredEntries.map(entry => {
                const isChecked = selectedUrls.has(entry.url);
                return (
                  <div
                    className={[
                      'flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors',
                      isChecked
                        ? 'bg-accent/10 border border-accent/30'
                        : 'hover:bg-surface-secondary/60 border border-transparent',
                    ].join(' ')}
                    key={entry.url}
                    onClick={() => toggleSelect(entry.url)}>
                    <div className="flex items-center gap-x-3 min-w-0 flex-1">
                      <Checkbox isSelected={isChecked} onChange={() => toggleSelect(entry.url)}>
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                      </Checkbox>

                      <div
                        className={
                          'size-6 rounded-md bg-surface-secondary flex items-center ' +
                          'justify-center shrink-0 border border-border/40'
                        }>
                        {entry.favIcon ? (
                          <img alt="" src={entry.favIcon} className="size-3.5 rounded-xs object-contain" />
                        ) : (
                          <EarthIcon className="size-3.5 text-muted" />
                        )}
                      </div>

                      <span className="text-xs font-JetBrainsMono text-foreground truncate flex-1">{entry.url}</span>
                    </div>
                  </div>
                );
              })
            )}
          </ScrollShadow>
        )}
      </Modal.Body>

      <Modal.Footer className="flex justify-end gap-x-2 pt-3">
        <Button size="sm" variant="ghost" onPress={onClose}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" onPress={handleImport} isDisabled={selectedUrls.size === 0}>
          <ImportIcon className="size-4" />
          Import Selected ({selectedUrls.size})
        </Button>
      </Modal.Footer>
    </TabModal>
  );
}
