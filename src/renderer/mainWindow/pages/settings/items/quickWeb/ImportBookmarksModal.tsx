import {Button, Checkbox, Input, Modal, ScrollShadow} from '@heroui/react';
import type {BookmarkItem} from '@lynx_common/types/bookmarks';
import {BookmarkIcon, EarthIcon, ImportIcon} from '@solar-icons/react/bold-duotone';
import {useMemo, useState} from 'react';

import {useBookmarks} from '../../../../features/bookmarks/useBookmarks';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: {title: string; url: string; favIcon?: string}[]) => void;
};

export default function ImportBookmarksModal({isOpen, onClose, onImport}: Props) {
  const {all} = useBookmarks();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const bookmarksList = useMemo(() => all.filter((b): b is BookmarkItem => b.type === 'bookmark' && !!b.url), [all]);

  const filteredBookmarks = useMemo(() => {
    if (!search.trim()) return bookmarksList;
    const lower = search.toLowerCase();
    return bookmarksList.filter(
      b => b.title.toLowerCase().includes(lower) || (b.url && b.url.toLowerCase().includes(lower)),
    );
  }, [bookmarksList, search]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredBookmarks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBookmarks.map(b => b.id)));
    }
  };

  const handleImport = () => {
    const toImport = bookmarksList
      .filter(b => selectedIds.has(b.id))
      .map(b => ({
        title: b.title,
        url: b.url,
        favIcon: b.favIcon,
      }));

    if (toImport.length > 0) {
      onImport(toImport);
    }
    setSelectedIds(new Set());
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
                <BookmarkIcon className="size-5 text-accent-foreground" />
                Import from LynxHub Bookmarks
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="flex flex-col gap-y-3 py-2">
              <Input value={search} placeholder="Search bookmarks..." onChange={e => setSearch(e.target.value)} />

              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-muted">
                  {selectedIds.size} of {filteredBookmarks.length} selected
                </span>
                {filteredBookmarks.length > 0 && (
                  <Button size="sm" variant="ghost" onPress={selectAll} className="h-6 text-xs px-2">
                    {selectedIds.size === filteredBookmarks.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>

              <ScrollShadow
                className={
                  'max-h-80 min-h-48 border border-surface-tertiary rounded-lg ' + 'p-1 flex flex-col gap-y-1'
                }>
                {filteredBookmarks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted">No bookmarks found.</div>
                ) : (
                  filteredBookmarks.map(bookmark => {
                    const isChecked = selectedIds.has(bookmark.id);
                    return (
                      <div
                        className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition ${
                          isChecked ? 'bg-surface-secondary' : 'hover:bg-surface-secondary/50'
                        }`}
                        key={bookmark.id}
                        onClick={() => toggleSelect(bookmark.id)}>
                        <div className="flex items-center gap-x-2.5 min-w-0 flex-1">
                          <Checkbox isSelected={isChecked} onChange={() => toggleSelect(bookmark.id)}>
                            <Checkbox.Control>
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                          </Checkbox>

                          {bookmark.favIcon ? (
                            <img alt="" src={bookmark.favIcon} className="size-4 rounded-xs shrink-0 object-contain" />
                          ) : (
                            <EarthIcon className="size-4 shrink-0 text-muted" />
                          )}

                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-medium truncate">{bookmark.title}</span>
                            <span className="text-[10px] text-muted truncate">{bookmark.url}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </ScrollShadow>
            </Modal.Body>

            <Modal.Footer className="flex justify-end gap-x-2 pt-3">
              <Button size="sm" variant="ghost" onPress={onClose}>
                Cancel
              </Button>
              <Button size="sm" onPress={handleImport} isDisabled={selectedIds.size === 0}>
                <ImportIcon className="size-4" />
                Import Selected ({selectedIds.size})
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
