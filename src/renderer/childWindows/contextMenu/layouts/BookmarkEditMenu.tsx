import {Button, FieldError, Form, Input, Label, ListBox, Select, TextField} from '@heroui/react';
import {BookmarkNode} from '@lynx_common/types/bookmarks';
import {formatWebAddress} from '@lynx_common/utils';
import bookmarksIpc from '@lynx_shared/ipc/bookmarks';
import {BookmarkIcon, FolderIcon, TrashBinTrashIcon} from '@solar-icons/react/bold-duotone';
import {X} from 'lucide-react';
import {FormEvent, KeyboardEvent, memo, useCallback, useEffect, useMemo, useState} from 'react';

import {useContextState} from '../redux/reducer';
import {hideContextWindow} from './Shared';

/**
 * BookmarkEditMenu Component
 * Displays a popup context menu interface to add or edit bookmarks and folders.
 */
const BookmarkEditMenu = memo(function BookmarkEditMenu() {
  const payload = useContextState('bookmarkEditMenu');

  const mode = payload?.mode || 'add';
  const item = payload?.item;
  const parentId = payload?.parentId;

  const isFolder = item?.type === 'folder';

  const [title, setTitle] = useState(item?.title || '');
  const [url, setUrl] = useState(item?.url || '');
  const [selectedParentId, setSelectedParentId] = useState<string>(item?.parentId || parentId || 'bookmarks_bar');
  const [allFolders, setAllFolders] = useState<BookmarkNode[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadFolders = useCallback(async () => {
    try {
      const all = await bookmarksIpc.getAll();
      const folders = all.filter((b): b is BookmarkNode & {type: 'folder'} => b.type === 'folder');
      setAllFolders(folders);
    } catch (err) {
      console.error('Failed to load folders for bookmark edit menu:', err);
    }
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    if (payload) {
      setTitle(item?.title || '');
      setUrl(item?.url || '');
      setSelectedParentId(item?.parentId || parentId || 'bookmarks_bar');
    }
  }, [payload, item, parentId]);

  // Collect folder options (excluding current folder if editing to prevent cycle)
  const folderOptions = useMemo(() => {
    if (mode === 'edit' && item?.id) {
      return allFolders.filter(f => f.id !== item.id);
    }
    return allFolders;
  }, [allFolders, mode, item]);

  const isValid = useMemo(() => {
    if (!title.trim()) return false;
    if (!isFolder && !url.trim()) return false;
    return true;
  }, [title, url, isFolder]);

  const handleSubmit = useCallback(async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const formattedUrl = isFolder ? undefined : formatWebAddress(url.trim());
      if (mode === 'edit' && item?.id) {
        await bookmarksIpc.update(item.id, {
          title: title.trim(),
          url: formattedUrl,
          parentId: selectedParentId,
        });
      } else {
        await bookmarksIpc.add({
          type: isFolder ? 'folder' : 'bookmark',
          title: title.trim(),
          url: formattedUrl,
          parentId: selectedParentId,
        });
      }
      hideContextWindow();
    } catch (err) {
      console.error('Failed to save bookmark in menu:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [isValid, isSubmitting, mode, item, isFolder, title, url, selectedParentId]);

  const handleFormSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      handleSubmit();
    },
    [handleSubmit],
  );

  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hideContextWindow();
      }
    },
    [handleSubmit],
  );

  const handleDelete = useCallback(async () => {
    if (item?.id) {
      setIsSubmitting(true);
      try {
        await bookmarksIpc.remove(item.id);
        hideContextWindow();
      } catch (err) {
        console.error('Failed to delete bookmark in menu:', err);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [item?.id]);

  const menuTitle = useMemo(() => {
    if (mode === 'edit') {
      return isFolder ? 'Edit Folder' : 'Edit Bookmark';
    }
    return isFolder ? 'Add Folder' : 'Add Bookmark';
  }, [mode, isFolder]);

  const showDelete = mode === 'edit' && Boolean(item?.id);

  return (
    <div className="w-sm p-4 flex flex-col gap-y-3.5 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-2 text-foreground font-semibold text-sm">
          {isFolder ? (
            <FolderIcon className="size-5 text-amber-500 shrink-0" />
          ) : (
            <BookmarkIcon className="size-5 text-accent shrink-0" />
          )}
          <span>{menuTitle}</span>
        </div>

        <Button
          size="sm"
          variant="ghost"
          aria-label="Close"
          onPress={hideContextWindow}
          className="size-6 min-w-6 text-muted-foreground hover:text-foreground"
          isIconOnly>
          <X className="size-3.5" />
        </Button>
      </div>

      <Form onSubmit={handleFormSubmit} className="flex flex-col gap-y-3 w-full">
        <TextField value={title} variant="secondary" onChange={setTitle} fullWidth isRequired>
          <Label className="text-xs font-medium">Name</Label>
          <Input placeholder="e.g. GitHub" onKeyDown={handleInputKeyDown} autoFocus />
          <FieldError />
        </TextField>

        {!isFolder && (
          <TextField value={url} onChange={setUrl} variant="secondary" fullWidth isRequired>
            <Label className="text-xs font-medium">URL</Label>
            <Input onKeyDown={handleInputKeyDown} placeholder="https://example.com" />
            <FieldError />
          </TextField>
        )}

        <Select
          variant="secondary"
          aria-label="Folder"
          placeholder="Folder"
          selectionMode="single"
          selectedKey={selectedParentId}
          onSelectionChange={key => setSelectedParentId((key as string) || 'bookmarks_bar')}
          fullWidth>
          <Label className="text-xs font-medium">Folder</Label>
          <Select.Trigger>
            <Select.Value>
              {selectedParentId === 'bookmarks_bar'
                ? 'Bookmarks Bar'
                : folderOptions.find(f => f.id === selectedParentId)?.title || 'Bookmarks Bar'}
            </Select.Value>
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="bookmarks_bar" key="bookmarks_bar" textValue="Bookmarks Bar">
                <ListBox.ItemIndicator />
                Bookmarks Bar
              </ListBox.Item>
              {folderOptions.map(folder => (
                <ListBox.Item id={folder.id} key={folder.id} textValue={folder.title}>
                  <ListBox.ItemIndicator />
                  {folder.title}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <div className="flex justify-between items-center w-full pt-1.5">
          <div>
            {showDelete && (
              <Button
                size="sm"
                type="button"
                variant="ghost"
                onPress={handleDelete}
                isDisabled={isSubmitting}
                className="text-danger hover:bg-danger/10">
                <TrashBinTrashIcon className="size-4" />
                Delete
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button size="sm" type="button" variant="secondary" isDisabled={isSubmitting} onPress={hideContextWindow}>
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              variant="primary"
              isPending={isSubmitting}
              isDisabled={!isValid || isSubmitting}>
              Save
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
});

BookmarkEditMenu.displayName = 'BookmarkEditMenu';

export default BookmarkEditMenu;
