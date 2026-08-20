import {Button, FieldError, Input, Label, ListBox, Modal, Select, TextField} from '@heroui/react';
import {BookmarkNode} from '@lynx_common/types/bookmarks';
import {BookmarkIcon, FolderIcon, TrashBinTrashIcon} from '@solar-icons/react/bold-duotone';
import {memo, useCallback, useEffect, useMemo, useState} from 'react';

import TabModal from '../../components/TabModal';
import {useBookmarks} from './useBookmarks';

const BookmarkEditModal = memo(function BookmarkEditModal() {
  const {editModal, all, addBookmark, updateBookmark, removeBookmark, closeModal} = useBookmarks();
  const {isOpen, mode, item, parentId} = editModal;

  const isFolder = item?.type === 'folder';

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string>('bookmarks_bar');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(item?.title || '');
      setUrl(item?.url || '');
      setSelectedParentId(item?.parentId || parentId || 'bookmarks_bar');
    }
  }, [isOpen, item, parentId]);

  // Collect list of folders (excluding current folder if editing to prevent cycle)
  const folderOptions = useMemo(() => {
    const folders = all.filter((b): b is BookmarkNode & {type: 'folder'} => b.type === 'folder');
    if (mode === 'edit' && item?.id) {
      return folders.filter(f => f.id !== item.id);
    }
    return folders;
  }, [all, mode, item]);

  const isValid = useMemo(() => {
    if (!title.trim()) return false;
    if (!isFolder && !url.trim()) return false;
    return true;
  }, [title, url, isFolder]);

  const handleSubmit = useCallback(async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (mode === 'edit' && item?.id) {
        await updateBookmark(item.id, {
          title: title.trim(),
          url: isFolder ? undefined : url.trim(),
          parentId: selectedParentId,
        });
      } else {
        await addBookmark({
          type: isFolder ? 'folder' : 'bookmark',
          title: title.trim(),
          url: isFolder ? undefined : url.trim(),
          parentId: selectedParentId,
        });
      }
      closeModal();
    } catch (err) {
      console.error('Failed to save bookmark:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isValid,
    isSubmitting,
    mode,
    item,
    isFolder,
    title,
    url,
    selectedParentId,
    updateBookmark,
    addBookmark,
    closeModal,
  ]);

  const handleDelete = useCallback(async () => {
    if (mode === 'edit' && item?.id) {
      setIsSubmitting(true);
      try {
        await removeBookmark(item.id);
        closeModal();
      } catch (err) {
        console.error('Failed to delete bookmark:', err);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [mode, item, removeBookmark, closeModal]);

  const modalTitle = useMemo(() => {
    if (mode === 'edit') {
      return isFolder ? 'Edit Folder' : 'Edit Bookmark';
    }
    return isFolder ? 'Add Folder' : 'Add Bookmark';
  }, [mode, isFolder]);

  return (
    <TabModal size="md" isOpen={isOpen} onOpenChange={open => !open && closeModal()}>
      <Modal.Header>
        <Modal.Heading className="flex items-center gap-x-2 text-foreground font-semibold">
          {isFolder ? (
            <FolderIcon className="size-5 text-amber-500 shrink-0" />
          ) : (
            <BookmarkIcon className="size-5 text-primary shrink-0" />
          )}
          <span>{modalTitle}</span>
        </Modal.Heading>
      </Modal.Header>

      <Modal.Body className="space-y-4 py-2">
        <TextField value={title} onChange={setTitle} fullWidth isRequired>
          <Label>Name</Label>
          <Input placeholder="e.g. GitHub" autoFocus />
          <FieldError />
        </TextField>

        {!isFolder && (
          <TextField value={url} onChange={setUrl} fullWidth isRequired>
            <Label>URL</Label>
            <Input placeholder="https://example.com" />
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
          <Label>Folder</Label>
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
      </Modal.Body>

      <Modal.Footer className="flex justify-between items-center w-full">
        <div>
          {mode === 'edit' && (
            <Button
              variant="ghost"
              onPress={handleDelete}
              isDisabled={isSubmitting}
              className="text-danger hover:bg-danger/10">
              <TrashBinTrashIcon className="size-4" />
              Delete
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="tertiary" onPress={closeModal} isDisabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onPress={handleSubmit}
            isPending={isSubmitting}
            isDisabled={!isValid || isSubmitting}>
            Save
          </Button>
        </div>
      </Modal.Footer>
    </TabModal>
  );
});

BookmarkEditModal.displayName = 'BookmarkEditModal';

export default BookmarkEditModal;
