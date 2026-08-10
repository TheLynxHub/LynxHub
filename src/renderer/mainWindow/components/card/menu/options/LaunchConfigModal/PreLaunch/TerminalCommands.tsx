import {Button, Dropdown, Label} from '@heroui/react';
import {Terminal_Icon} from '@lynx_assets/icons';
import filesIpc from '@lynx_shared/ipc/files';
import {InboxIcon, MoveToFolderIcon} from '@solar-icons/react/bold-duotone';
import {AnimatePresence, Reorder} from 'framer-motion';
import {isEmpty} from 'lodash-es';
import {Plus} from 'lucide-react';
import {useCallback} from 'react';

import EmptyStateCard from '../../../../../EmptyStateCard';
import LynxTooltip from '../../../../../LynxTooltip';
import {useTerminalCommands} from '../hooks/useTerminalCommands';
import LaunchConfigSection from '../LaunchConfigSection';
import TerminalCommandItem from '../TerminalCommandItem';

type Props = {id: string};
export default function PreTerminalCommands({id}: Props) {
  const {commands, addCommand, editCommand, removeCommand, reorderCommands, saveReorder} = useTerminalCommands(
    id,
    'preCommands',
  );

  const cdFolder = useCallback(() => {
    filesIpc.openDlg({properties: ['openDirectory']}).then(result => {
      if (result) {
        const command = `cd "${result}"`;
        addCommand(command);
      }
    });
  }, [addCommand]);

  return (
    <LaunchConfigSection
      customButton={
        <Dropdown>
          <LynxTooltip delay={300} content="Add New Command">
            <Button size="sm" variant="ghost" isIconOnly>
              <Plus className="size-4" />
            </Button>
          </LynxTooltip>
          <Dropdown.Popover>
            <Dropdown.Menu>
              <Dropdown.Item textValue="Command" onPress={() => addCommand()}>
                <Terminal_Icon />
                <Label>Command</Label>
              </Dropdown.Item>
              <Dropdown.Item onPress={cdFolder} textValue="Cd Folder">
                <MoveToFolderIcon className="size-3.5" />
                <Label>Cd Folder</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      }
      title="Terminal Commands"
      addTooltipTitle="Add New Command"
      description="Execute these terminal commands before launching the AI.">
      {isEmpty(commands) ? (
        <EmptyStateCard
          bodyClassName="py-8"
          icon={<InboxIcon size={40} />}
          description="No commands available to execute"
        />
      ) : (
        <AnimatePresence>
          <Reorder.Group axis="y" values={commands} onReorder={reorderCommands} className="space-y-2 overflow-hidden">
            {commands.map((command, index) => (
              <TerminalCommandItem
                index={index}
                key={command}
                onEdit={editCommand}
                initialValue={command}
                onRemove={removeCommand}
                onDoneReorder={saveReorder}
              />
            ))}
          </Reorder.Group>
        </AnimatePresence>
      )}
    </LaunchConfigSection>
  );
}
