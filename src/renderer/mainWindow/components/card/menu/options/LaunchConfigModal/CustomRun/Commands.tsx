import {Button, Dropdown, Label} from '@heroui/react';
import {Tooltip} from '@heroui/react';
import {Terminal_Icon} from '@lynx_assets/icons';
import filesIpc from '@lynx_shared/ipc/files';
import {InboxIcon, MoveToFolderIcon} from '@solar-icons/react/bold-duotone';
import {AnimatePresence, Reorder} from 'framer-motion';
import {isEmpty} from 'lodash-es';
import {Plus} from 'lucide-react';
import {useCallback} from 'react';

import EmptyStateCard from '../../../../../EmptyStateCard';
import {useTerminalCommands} from '../hooks/useTerminalCommands';
import LaunchConfigSection from '../LaunchConfigSection';
import TerminalCommandItem from '../TerminalCommandItem';

type Props = {id: string};
export default function Commands({id}: Props) {
  const {commands, addCommand, editCommand, removeCommand, reorderCommands, saveReorder} = useTerminalCommands(
    id,
    'customRun',
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
          <Dropdown.Trigger>
            <Tooltip delay={300}>
              <Tooltip.Trigger>
                <Button size="sm" variant="ghost" isIconOnly>
                  <Plus className="size-4" />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content showArrow>
                <Tooltip.Arrow />
                <p>Add New Command</p>
              </Tooltip.Content>
            </Tooltip>
          </Dropdown.Trigger>
          <Dropdown.Popover>
            <Dropdown.Menu onAction={key => console.log(`Selected: ${key}`)}>
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
      addTooltipTitle="Add New Command"
      title="AI Execution (Terminal Commands)"
      description="Execute these commands when launching AI, overriding default settings">
      {isEmpty(commands) ? (
        <EmptyStateCard
          bodyClassName="py-8"
          icon={<InboxIcon size={40} />}
          description="No custom command available to execute!"
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
