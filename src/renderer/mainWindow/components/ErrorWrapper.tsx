import {Button, ButtonGroup} from '@heroui/react';
import {isLinuxPortable} from '@lynx/utils/hooks';
import {GitHub_Icon} from '@lynx_assets/icons';
import {ISSUE_PAGE} from '@lynx_common/consts';
import {isDev} from '@lynx_common/utils';
import applicationIpc from '@lynx_shared/ipc/application';
import {DangerIcon} from '@solar-icons/react/bold-duotone';
import {useCallback, useEffect} from 'react';
import {FallbackProps} from 'react-error-boundary';

import CopyClipboard from './CopyClipboard';

/**
 * Fallback component for the global error boundary.
 * Displays the error message and provides options to retry, reload, or restart the app.
 */
export default function ErrorWrapper({error, resetErrorBoundary}: FallbackProps) {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  const handleRestart = useCallback(() => {
    applicationIpc.send.changeWinState('restart');
  }, []);

  const handleClose = useCallback(() => {
    applicationIpc.send.changeWinState('close');
  }, []);

  const openIssues = () => applicationIpc.send.openUrlDefaultBrowser(ISSUE_PAGE);

  useEffect(() => {
    if (isDev()) console.error(errorObj);
  }, [errorObj]);

  return (
    <div className="bg-surface absolute inset-0">
      <div
        className={
          'absolute inset-2 rounded-lg bg-background flex flex-col items-center justify-center' +
          ' draggable overflow-hidden p-8 gap-6'
        }>
        {/* Error Icon & Title */}
        <div className="flex flex-col items-center gap-4 text-center">
          <DangerIcon className="size-16 text-danger" />
          <h1 className="text-2xl font-bold">Oops! Something went wrong.</h1>
        </div>

        {/* Error Message & Details */}
        <div className="text-danger flex flex-col items-center justify-center gap-2 text-center max-w-lg">
          <div className="flex items-center gap-2">
            <span className="font-medium">{errorObj.message}</span>
            <CopyClipboard
              className="notDraggable"
              tooltipTitle="Copy full error message"
              contentToCopy={`Message:\n${errorObj.message}\n\n\nStack:\n${errorObj.stack}`}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-4 w-full max-w-md items-center">
          <ButtonGroup fullWidth>
            <Button size="sm" key="retry" className="notDraggable" onPress={resetErrorBoundary}>
              Retry
            </Button>
            <Button size="sm" key="reload" variant="danger-soft" onPress={handleReload} className="notDraggable">
              Reload
            </Button>
            <Button
              size="sm"
              key="restart"
              variant="danger"
              className="notDraggable"
              onPress={isLinuxPortable ? handleClose : handleRestart}>
              {isLinuxPortable ? 'Exit' : 'Restart'}
            </Button>
          </ButtonGroup>
        </div>

        <div className="flex flex-col gap-y-2 w-full text-center absolute bottom-0">
          <span className="text-warning text-sm">
            If the issue persists, please consider reporting it on GitHub issues.
          </span>
          <Button onPress={openIssues} className="notDraggable w-full rounded-none">
            <GitHub_Icon />
            GitHub Issues
          </Button>
        </div>
      </div>
    </div>
  );
}
