import {Button, ButtonGroup, Card, Label, ProgressBar, Separator, Tooltip} from '@heroui/react';
import {DownloadItemInfo} from '@lynx_common/types/downloadManager';
import downloadManagerIpc from '@lynx_shared/ipc/downloadManager';
import {PauseIcon, PlayIcon, RestartIcon} from '@solar-icons/react/bold';
import {FileDownloadIcon, FolderOpenIcon, TrashBin2Icon} from '@solar-icons/react/bold-duotone';
import {X} from 'lucide-react';
import {memo, useCallback} from 'react';
import {useDispatch} from 'react-redux';

import {contextActions} from '../../redux/reducer';
import {formatBytes, formatETA, formatSpeed, getProgress, getStatusColor} from './utils';

type DownloadItemProps = {
  item: DownloadItemInfo;
};

/**
 * DownloadItem component displays a single download item with progress and actions.
 */
const DownloadItem = memo(({item}: DownloadItemProps) => {
  const dispatch = useDispatch();

  const handleAction = useCallback(
    (name: string, action: 'pause' | 'resume' | 'cancel' | 'open' | 'openFolder' | 'clear') => {
      switch (action) {
        case 'open':
        case 'openFolder':
          downloadManagerIpc.send.openItem(name, action);
          break;
        case 'clear':
          dispatch(contextActions.removeDownload(name));
          downloadManagerIpc.send.clear(name);
          break;
        case 'pause':
          downloadManagerIpc.send.pause(name);
          dispatch(contextActions.updateDownloadProgress({name, status: 'paused', bytesPerSecond: 0}));
          break;
        case 'resume':
          downloadManagerIpc.send.resume(name);
          dispatch(contextActions.updateDownloadProgress({name, status: 'downloading', bytesPerSecond: 524288})); // Why 524288?
          break;
        case 'cancel':
          downloadManagerIpc.send.cancel(name);
          dispatch(contextActions.updateDownloadProgress({name, status: 'cancelled', bytesPerSecond: 0}));
          break;
      }
    },
    [dispatch],
  );

  const onOpen = useCallback(() => handleAction(item.name, 'open'), [item.name, handleAction]);
  const onOpenFolder = useCallback(() => handleAction(item.name, 'openFolder'), [item.name, handleAction]);
  const onClear = useCallback(() => handleAction(item.name, 'clear'), [item.name, handleAction]);
  const onPause = useCallback(() => handleAction(item.name, 'pause'), [item.name, handleAction]);
  const onResume = useCallback(() => handleAction(item.name, 'resume'), [item.name, handleAction]);
  const onCancel = useCallback(() => handleAction(item.name, 'cancel'), [item.name, handleAction]);

  return (
    <Card variant="secondary" className="shrink-0">
      <Card.Header>
        {/* Item Header */}
        <div className="flex items-start justify-between w-full">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <Tooltip delay={300}>
                <Tooltip.Trigger>
                  <span className="font-medium text-sm truncate">{item.name}</span>
                </Tooltip.Trigger>
                <Tooltip.Content className="max-w-[90%]" showArrow>
                  <Tooltip.Arrow />
                  {item.name}
                </Tooltip.Content>
              </Tooltip>
              {item.status === 'completed' && (
                <span className="font-medium text-xs truncate shrink-0 ml-2">{formatBytes(item.totalBytes)}</span>
              )}
            </div>
          </div>
        </div>
      </Card.Header>

      {item.status !== 'completed' && (
        <Card.Content>
          <ProgressBar
            size="sm"
            aria-label="Downloading Progress"
            color={getStatusColor(item.status)}
            value={getProgress(item.receivedBytes, item.totalBytes)}>
            <Label className="flex flex-row gap-x-2 items-center">
              <span>
                {formatBytes(item.receivedBytes)} / {formatBytes(item.totalBytes)}
              </span>
              {item.status === 'downloading' && (
                <>
                  <Separator className="my-2" orientation="vertical" />
                  {formatSpeed(item.bytesPerSecond)}

                  <Separator className="my-2" orientation="vertical" />
                  {formatETA(item.totalBytes, item.receivedBytes, item.bytesPerSecond)}
                </>
              )}
            </Label>
            <ProgressBar.Output />
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
        </Card.Content>
      )}

      <Card.Footer>
        {/* Action Buttons */}
        <ButtonGroup className="flex" fullWidth>
          {item.status === 'completed' ? (
            <>
              <Button size="sm" onPress={onOpen} variant="secondary" fullWidth>
                <FileDownloadIcon className="size-3.5" />
                Open File
              </Button>

              <Button size="sm" variant="secondary" onPress={onOpenFolder} fullWidth>
                <FolderOpenIcon className="size-3.5" />
                Open Path
              </Button>

              <Button size="sm" onPress={onClear} variant="secondary" fullWidth>
                <TrashBin2Icon className="size-3.5" />
                Clear
              </Button>
            </>
          ) : (
            <>
              {item.status === 'downloading' ? (
                <Button size="sm" onPress={onPause} className="w-full" variant="danger-soft">
                  <PauseIcon className="size-3.5" />
                  Pause
                </Button>
              ) : item.status === 'paused' ? (
                <Button size="sm" className="w-full" onPress={onResume}>
                  <PlayIcon className="size-3.5" />
                  Resume
                </Button>
              ) : null}

              {item.status === 'cancelled' && item.receivedBytes > 0 ? (
                // Show both clear and retry for cancelled downloads with partial progress
                <>
                  <Button size="sm" className="w-full" onPress={onResume} variant="secondary" fullWidth>
                    <RestartIcon className="size-3.5" />
                    Retry
                  </Button>
                  <Button size="sm" onPress={onClear} className="w-full" variant="danger-soft" fullWidth>
                    <TrashBin2Icon className="size-3.5" />
                    Clear
                  </Button>
                </>
              ) : item.status === 'cancelled' ? (
                <Button size="sm" onPress={onClear} className="w-full" fullWidth>
                  <TrashBin2Icon className="size-3.5" />
                  Clear
                </Button>
              ) : (
                <Button size="sm" variant="danger" onPress={onCancel} className={`w-full`}>
                  <X className="size-3.5" />
                  Cancel
                </Button>
              )}
            </>
          )}
        </ButtonGroup>
      </Card.Footer>
    </Card>
  );
});

export default DownloadItem;
