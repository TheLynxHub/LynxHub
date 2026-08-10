import {Button} from '@heroui/react';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {BroomIcon} from '@solar-icons/react/bold-duotone';
import {memo, RefObject, useCallback} from 'react';

import LynxTooltip from '../../../../components/LynxTooltip';

type Props = {
  /**
   * Reference to the clear terminal function.
   */
  clearTerminal: RefObject<(() => void) | undefined>;
};

/**
 * A button to clear the terminal content.
 */
const TerminalClearAll = memo(({clearTerminal}: Props) => {
  const clearTerm = useCallback(() => {
    if (clearTerminal.current) {
      AddBreadcrumb_Renderer('Terminal: Clear scrollback');
      clearTerminal.current();
    }
  }, [clearTerminal]);

  return (
    <LynxTooltip delay={500} content="Clear all">
      <Button size="sm" variant="ghost" onPress={clearTerm} aria-label="Clear all" isIconOnly>
        <BroomIcon className="size-3.5" />
      </Button>
    </LynxTooltip>
  );
});

TerminalClearAll.displayName = 'TerminalClearAll';

export default TerminalClearAll;
