import {Button} from '@heroui/react';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {Forward2Icon, RestartIcon} from '@solar-icons/react/bold-duotone';
import {memo} from 'react';

import {useContextState} from '../../redux/reducer';
import {hideContextWindow} from '../Shared';
import ConfirmElement from './ConfirmElement';

/**
 * Component for the "Force Reload" confirmation dialog.
 * Used when reloading a page with unsaved changes.
 */
const ForceReload = memo(() => {
  const id = useContextState('targetID');

  const onForceReload = () => {
    contextMenuIpc.send.forceReload(id);
    hideContextWindow();
  };

  return (
    <ConfirmElement
      buttons={
        <>
          <Button size="sm" className="w-22" variant="secondary" onPress={hideContextWindow}>
            <Forward2Icon className="rotate-180 shrink-0 size-3.5" />
            Stay
          </Button>
          <Button size="sm" variant="danger" className="w-32" onPress={onForceReload} autoFocus>
            <RestartIcon className="shrink-0 size-3.5" />
            Force Reload
          </Button>
        </>
      }
      title="Confirm Force Reload"
      confirmName="forceReloadConfirm"
      enabledTitle="Always force reload without confirmation"
    />
  );
});

export default ForceReload;
