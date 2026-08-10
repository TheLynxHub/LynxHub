import {Button, Chip} from '@heroui/react';
import downloadManagerIpc from '@lynx_shared/ipc/downloadManager';
import {BroomIcon, DownloadMinimalisticIcon} from '@solar-icons/react/bold-duotone';
import {memo, useCallback} from 'react';
import {useDispatch} from 'react-redux';

import {contextActions, useContextState} from '../../redux/reducer';
import DownloadItem from './Item';

/**
 * DownloadMenu component displays a list of active and completed downloads.
 * It allows clearing all downloads and managing individual items.
 */
const DownloadMenu = memo(() => {
  const downloads = useContextState('downloads');
  const dispatch = useDispatch();

  const handleClearAll = useCallback(() => {
    dispatch(contextActions.clearAllDownloads());
    downloadManagerIpc.send.clearAll();
  }, [dispatch]);

  return (
    <div className="flex flex-col w-100">
      {/* Header */}
      <div className="px-4 py-4 flex flex-row items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <DownloadMinimalisticIcon className="size-5" />
          Downloads
        </h2>
        <div className="flex items-center gap-3">
          <Chip size="sm" variant="soft">
            {downloads.length} {downloads.length > 1 ? 'items' : 'item'}
          </Chip>
          {downloads.length > 0 && (
            <Button size="sm" variant="danger-soft" onPress={handleClearAll}>
              <BroomIcon />
              Cancel & Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Download List */}
      <div className="px-3 py-1 pb-4 gap-y-2 flex flex-col justify-start max-h-200 overflow-y-auto overflow-x-hidden">
        {downloads.map(item => (
          <DownloadItem item={item} key={item.name} />
        ))}
      </div>
    </div>
  );
});

export default DownloadMenu;
