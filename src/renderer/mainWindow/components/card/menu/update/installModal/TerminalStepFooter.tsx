import {Button, Description, Popover} from '@heroui/react';
import ptyIpc from '@lynx_shared/ipc/pty';
import {ArrowRightIcon, RestartIcon} from '@solar-icons/react/bold-duotone';
import {CheckReadIcon} from '@solar-icons/react/line-duotone';
import {RefObject, useEffect, useState} from 'react';

import {XTermAPI} from '../../../../useXTerm';

export interface FooterTerminalProps {
  /** A ref containing a function to trigger a terminal restart. */
  restartTerminal: RefObject<(() => void) | null>;
  /** Callback fired when the user successfully confirms the terminal commands finished. */
  onDoneTerminal: () => void;
  cardID: string;
  xtermRef: RefObject<XTermAPI | null>;
}

/**
 * Renders the footer specifically for the terminal step in the installation modal.
 * Includes interactive popovers to verify if commands completed successfully or if a restart is needed.
 *
 * @param {FooterTerminalProps} props - The component props.
 */
export default function FooterTerminal({restartTerminal, onDoneTerminal, cardID, xtermRef}: FooterTerminalProps) {
  const [isRestartOpen, setIsRestartOpen] = useState<boolean>(false);
  const [isNextOpen, setIsNextOpen] = useState<boolean>(false);

  const [isRestartingState, setIsRestartingState] = useState<boolean>(false);

  useEffect(() => {
    const offExit = ptyIpc.onExit(id => {
      if (isRestartingState) {
        setIsRestartingState(false);
      } else if (id === cardID) {
        setIsNextOpen(true);
      }
    });
    return () => offExit();
  }, [cardID, isRestartingState]);

  const handleRestart = () => {
    restartTerminal.current?.();
    if (xtermRef.current) {
      xtermRef.current.terminal.clear();
    }
    setIsRestartingState(true);
    setIsRestartOpen(false);
  };

  const next = () => {
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
            <Button size="sm" onPress={next} className="mt-2" variant="primary" fullWidth>
              <CheckReadIcon className="size-4" />
              All good
            </Button>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </>
  );
}
