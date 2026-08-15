import {Button, Description, Popover} from '@heroui/react';
import ptyIpc from '@lynx_shared/ipc/pty';
import {ArrowRightIcon, RestartIcon} from '@solar-icons/react/bold-duotone';
import {CheckReadIcon} from '@solar-icons/react/line-duotone';
import {memo, RefObject, useEffect, useRef, useState} from 'react';

import {XTermAPI} from '../../../../../../useXTerm';

export interface TerminalFooterProps {
  cardID: string;
  xtermRef: RefObject<XTermAPI | null>;
  onDoneTerminal: () => void;
  restartTerminal: RefObject<(() => void) | null>;
}

/**
 * Terminal-specific footer actions containing restart and completion confirmation popovers.
 */
function TerminalFooter({cardID, xtermRef, onDoneTerminal, restartTerminal}: TerminalFooterProps) {
  const [isRestartOpen, setIsRestartOpen] = useState<boolean>(false);
  const [isNextOpen, setIsNextOpen] = useState<boolean>(false);

  const isRestartingRef = useRef<boolean>(false);

  useEffect(() => {
    const offExit = ptyIpc.onExit(id => {
      if (isRestartingRef.current) {
        isRestartingRef.current = false;
      } else if (id === cardID) {
        setIsNextOpen(true);
      }
    });
    return () => offExit();
  }, [cardID]);

  const handleRestart = () => {
    isRestartingRef.current = true;
    restartTerminal.current?.();
    if (xtermRef.current) {
      xtermRef.current.terminal.clear();
    }
    setIsRestartOpen(false);
  };

  const handleNext = () => {
    setIsNextOpen(false);
    onDoneTerminal();
  };

  return (
    <>
      <Popover isOpen={isRestartOpen} onOpenChange={setIsRestartOpen}>
        <Button variant="danger" className="flex-1">
          <RestartIcon className="size-4" />
          Restart Terminal
        </Button>
        <Popover.Content placement="top" className="max-w-xs gap-y-2">
          <Popover.Dialog>
            <Popover.Arrow />
            <Popover.Heading>Confirm Terminal Restart</Popover.Heading>
            <Description className="mt-2">
              Are you sure you want to restart the terminal and run commands again?
            </Description>
            <Button size="sm" className="mt-2" variant="danger" onPress={handleRestart} fullWidth>
              <RestartIcon className="size-3.5" />
              Restart
            </Button>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>

      <Popover isOpen={isNextOpen} onOpenChange={setIsNextOpen}>
        <Button variant="primary" className="flex-1">
          Next
          <ArrowRightIcon className="size-4" />
        </Button>
        <Popover.Content placement="top" className="max-w-xs gap-y-2">
          <Popover.Dialog>
            <Popover.Arrow />
            <Popover.Heading>Installation complete?</Popover.Heading>
            <Description className="mt-2">
              Please confirm that all commands finished successfully without any errors.
            </Description>
            <Button size="sm" className="mt-2" variant="primary" onPress={handleNext} fullWidth>
              <CheckReadIcon className="size-4" />
              All good
            </Button>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </>
  );
}

export default memo(TerminalFooter);
