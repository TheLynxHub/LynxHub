import {Button, Dropdown, Label} from '@heroui/react';
import filesIpc from '@lynx_shared/ipc/files';
import {FileIcon, FolderIcon, InboxIcon} from '@solar-icons/react/bold-duotone';
import {isEmpty} from 'lodash-es';
import {Plus} from 'lucide-react';
import {useCallback} from 'react';

import EmptyStateCard from '../../../../../EmptyStateCard';
import LynxTooltip from '../../../../../LynxTooltip';
import {usePreOpenPath} from '../hooks/usePreOpenPath';
import LaunchConfigSection from '../LaunchConfigSection';
import PreOpenPathItem from './OpenPathItem';

type Props = {id: string};
export default function PreOpenPath({id}: Props) {
  const {items, addPath, removePath} = usePreOpenPath(id);

  const selectFolder = useCallback(() => {
    filesIpc.openDlg({properties: ['openDirectory']}).then(result => {
      if (result) {
        addPath(result, 'folder');
      }
    });
  }, [addPath]);

  const selectFile = useCallback(() => {
    filesIpc.openDlg({properties: ['openFile']}).then(result => {
      if (result) {
        addPath(result, 'file');
      }
    });
  }, [addPath]);

  return (
    <LaunchConfigSection
      customButton={
        <Dropdown>
          <LynxTooltip delay={300} content="Add New Path">
            <Button size="sm" variant="ghost" isIconOnly>
              <Plus className="size-4" />
            </Button>
          </LynxTooltip>
          <Dropdown.Popover>
            <Dropdown.Menu>
              <Dropdown.Item textValue="Folder" onPress={selectFolder}>
                <FolderIcon />
                <Label>Folder</Label>
              </Dropdown.Item>
              <Dropdown.Item textValue="File" onPress={selectFile}>
                <FileIcon />
                <Label>File</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      }
      title="Open"
      description="Launch AI after opening selected files or folders">
      {isEmpty(items) ? (
        <EmptyStateCard
          bodyClassName="py-8"
          icon={<InboxIcon size={40} />}
          description="No file or folder available to open!"
        />
      ) : (
        <div className="space-y-2">
          {items.map((open, index) => {
            const icon = open.type === 'folder' ? <FolderIcon /> : <FileIcon />;
            return (
              <PreOpenPathItem
                icon={icon}
                index={index}
                path={open.path}
                onRemove={removePath}
                key={`${index}_openThing`}
              />
            );
          })}
        </div>
      )}
    </LaunchConfigSection>
  );
}
