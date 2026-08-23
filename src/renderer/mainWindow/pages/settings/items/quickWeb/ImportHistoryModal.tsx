import {Button, Checkbox, Input, Modal, ScrollShadow, Spinner} from '@heroui/react';
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
    <Modal isOpen={isOpen} onOpenChange={open => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="flex items-center gap-x-2">
                <History2Icon className="size-5 text-accent-foreground" />
                Import from Browser History & Favorites
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="flex flex-col gap-y-3 py-2">
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search history and favorites..."
              />

              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-muted">
                  {selectedUrls.size} of {filteredEntries.length} selected
                </span>
                {filteredEntries.length > 0 && (
                  <Button size="sm" variant="ghost" onPress={selectAll} className="h-6 text-xs px-2">
                    {selectedUrls.size === filteredEntries.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Spinner size="md" />
                </div>
              ) : (
                <ScrollShadow
                  className={
                    'max-h-80 min-h-48 border border-surface-tertiary rounded-lg ' + 'p-1 flex flex-col gap-y-1'
                  }>
                  {filteredEntries.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted">No browser history or favorites found.</div>
                  ) : (
                    filteredEntries.map(entry => {
                      const isChecked = selectedUrls.has(entry.url);
                      return (
                        <div
                          className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition ${
                            isChecked ? 'bg-surface-secondary' : 'hover:bg-surface-secondary/50'
                          }`}
                          key={entry.url}
                          onClick={() => toggleSelect(entry.url)}>
                          <div className="flex items-center gap-x-2.5 min-w-0 flex-1">
                            <Checkbox isSelected={isChecked} onChange={() => toggleSelect(entry.url)}>
                              <Checkbox.Control>
                                <Checkbox.Indicator />
                              </Checkbox.Control>
                            </Checkbox>

                            {entry.favIcon ? (
                              <img alt="" src={entry.favIcon} className="size-4 rounded-xs shrink-0 object-contain" />
                            ) : (
                              <EarthIcon className="size-4 shrink-0 text-muted" />
                            )}

                            <span className="text-xs font-mono truncate flex-1">{entry.url}</span>
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
              <Button size="sm" onPress={handleImport} isDisabled={selectedUrls.size === 0}>
                <ImportIcon className="size-4" />
                Import Selected ({selectedUrls.size})
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
