import {Button} from '@heroui/react';
import {Power_Icon} from '@lynx_assets/icons';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {Forward2Icon} from '@solar-icons/react/bold-duotone';
import {memo} from 'react';

import {useContextState} from '../../redux/reducer';
import {hideContextWindow} from '../Shared';
import ConfirmElement from './ConfirmElement';

/**
 * Component for the "Terminate Multiple Tabs" confirmation dialog.
 * Used when closing multiple tabs where some have running processes.
 */
const TerminateMultipleTabs = memo(() => {
  const payload = useContextState('terminateMultipleTabs');
  const count = payload?.count ?? 0;
  const tabIds = payload?.tabIds ?? [];

  const onRemoveAll = () => {
    if (tabIds.length > 0) {
      contextMenuIpc.send.removeMultipleTabs(tabIds);
    }
    hideContextWindow();
  };

  return (
    <ConfirmElement
      buttons={
        <>
          <Button size="sm" className="w-22" variant="secondary" onPress={hideContextWindow}>
            <Forward2Icon className="rotate-180 shrink-0 size-3.5" />
            Cancel
          </Button>
          <Button size="sm" variant="danger" className="w-32" onPress={onRemoveAll}>
            <Power_Icon className="shrink-0 size-3.5" />
            Terminate All
          </Button>
        </>
      }
      confirmName="closeTabConfirm"
      title={`Confirm Terminate ${count} Tabs`}
      enabledTitle="Always terminate without confirmation"
    />
  );
});

export default TerminateMultipleTabs;
