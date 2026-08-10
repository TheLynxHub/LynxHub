import {Badge, Button} from '@heroui/react';
import downloadManagerIpc from '@lynx_shared/ipc/downloadManager';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {DownloadMinimalisticIcon} from '@solar-icons/react/bold-duotone';
import {memo, useEffect, useState} from 'react';

import LynxTooltip from '../../../../components/LynxTooltip';

/**
 * A button that shows the number of active downloads and opens the download manager.
 */
const BrowserDownloadManager = memo(() => {
  const [itemCount, setItemCount] = useState<number>(0);

  useEffect(() => {
    const offDownloadCount = downloadManagerIpc.on.downloadCount(count => {
      setItemCount(count);
    });

    return () => offDownloadCount();
  }, []);

  const openDownloadsWindow = () => {
    AddBreadcrumb_Renderer('Browser: Open download manager');
    downloadManagerIpc.send.openMenu();
  };

  if (itemCount === 0) return null;

  return (
    <Badge.Anchor>
      <LynxTooltip delay={1000} content="Show Downloads">
        <Button size="sm" variant="ghost" aria-label="Downloads" onPress={openDownloadsWindow} isIconOnly>
          <DownloadMinimalisticIcon className="size-4" />
        </Button>
      </LynxTooltip>

      <Badge size="sm" color="success" variant="primary">
        {itemCount}
      </Badge>
    </Badge.Anchor>
  );
});

BrowserDownloadManager.displayName = 'BrowserDownloadManager';

export default BrowserDownloadManager;
