import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {
  CopyIcon,
  GalleryCircleIcon,
  GalleryDownloadIcon,
  GalleryWideIcon,
  LinkIcon,
} from '@solar-icons/react/bold-duotone';
import {memo, useCallback} from 'react';

import Separator from './Separator';
import {ActionButton, createActionHandler} from './Utils';

type ImageProps = {
  /** The ID of the target window/contents */
  id: number;
  /** The URL of the image */
  url: string;
};

/**
 * Image component renders actions related to image context menus (Open, Copy, Save, Search).
 */
export const Image = memo(({id, url}: ImageProps) => {
  // Handlers
  const onOpenImageTab = useCallback(
    () => createActionHandler(() => contextMenuIpc.send.rightClickItems.newTab(url)),
    [url],
  );

  const onCopyImage = useCallback(
    () => createActionHandler(() => contextMenuIpc.send.rightClickItems.copyImage(url)),
    [url],
  );

  const onSaveImage = useCallback(
    () => createActionHandler(() => contextMenuIpc.send.rightClickItems.downloadImage(id, url)),
    [id, url],
  );

  const onCopyImageAddress = useCallback(
    () =>
      createActionHandler(async () => {
        try {
          await navigator.clipboard.writeText(url);
        } catch (e) {
          console.error('Failed to copy image address:', e);
        }
      }),
    [url],
  );

  const onSearchImage = useCallback(
    () =>
      createActionHandler(() => {
        contextMenuIpc.send.rightClickItems.newTab(
          `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)}`,
        );
      }),
    [url],
  );

  if (!url) return null;

  return (
    <>
      <ActionButton
        onPress={onOpenImageTab()}
        key="context_openImageTab"
        title="Open Image in New Tab"
        icon={<GalleryWideIcon className="size-4" />}
      />
      <ActionButton
        title="Copy Image"
        onPress={onCopyImage()}
        key="context_copyImage"
        icon={<CopyIcon className="size-4" />}
      />
      <ActionButton
        title="Save Image"
        onPress={onSaveImage()}
        key="context_saveImage"
        icon={<GalleryDownloadIcon className="size-4" />}
      />
      <ActionButton
        title="Copy Image Address"
        onPress={onCopyImageAddress()}
        key="context_copyImageAddress"
        icon={<LinkIcon className="size-4" />}
      />
      <ActionButton
        onPress={onSearchImage()}
        key="context_searchImage"
        title="Search Web for Image"
        icon={<GalleryCircleIcon className="size-4" />}
      />
      <Separator />
    </>
  );
});
