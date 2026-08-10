import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {CodeIcon} from '@solar-icons/react/bold-duotone';
import {memo} from 'react';

import {ActionButton, createActionHandler} from './Utils';

type PageActionsProps = {
  id: number;
  x: number;
  y: number;
};

/**
 * Component that renders page-level actions in the context menu.
 * Currently allows inspecting the element at the given coordinates.
 */
const PageActions = memo(function PageActions({id, x, y}: PageActionsProps) {
  return (
    <ActionButton
      onPress={createActionHandler(() => {
        contextMenuIpc.send.rightClickItems.inspectElement(id, x, y);
      })}
      title="Inspect Element"
      icon={<CodeIcon className="size-4" />}
    />
  );
});

export default PageActions;
