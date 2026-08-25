import {Description, Key, Label, ListBox, Select} from '@heroui/react';
import {TaskbarStatus} from '@lynx_common/types/ipc';
import {isLinux, isMac} from '@lynx_common/utils';
import applicationIpc from '@lynx_shared/ipc/application';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback, useEffect, useState} from 'react';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

/**
 * Component to configure how the app integrates with the OS taskbar, dock, and system tray.
 */
export default function Taskbar() {
  const [selectedKey, setSelectedKey] = useState<TaskbarStatus>('taskbar-tray');

  const onChange = useCallback((key: Key | null) => {
    if (!key || typeof key === 'number') return;

    const value = key as TaskbarStatus;
    applicationIpc.send.setTaskBarStatus(value);
    setSelectedKey(value);
  }, []);

  useEffect(() => {
    storageIpc.get('app').then(result => {
      setSelectedKey(result.taskbarStatus);
    });
  }, []);

  const labelText = isMac ? 'Dock Options' : 'Taskbar Options';
  const descriptionText = isMac
    ? 'Select how the app should appear in the dock and system tray.'
    : 'Select how the app should appear in the taskbar and system tray.';

  return (
    <SettingsFilterItem
      searchTexts={[
        labelText,
        descriptionText,
        'taskbar',
        'dock',
        'tray',
        'system tray',
        'minimize to tray',
        'dock options',
        'taskbar options',
        'tray icon',
      ]}>
      <Select value={selectedKey} onChange={onChange}>
        <Label>
          <SettingsSearchHighlight text={labelText} />
        </Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Description>
          <SettingsSearchHighlight text={descriptionText} />
        </Description>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="taskbar-tray" textValue={isMac ? 'Dock & Tray' : 'Taskbar & Tray'}>
              <ListBox.ItemIndicator />
              <Label>
                <SettingsSearchHighlight text={isMac ? 'Dock & Tray' : 'Taskbar & Tray'} />
              </Label>
            </ListBox.Item>
            <ListBox.Item id="taskbar" textValue={isMac ? 'Dock Only' : 'Taskbar Only'}>
              <ListBox.ItemIndicator />
              <Label>
                <SettingsSearchHighlight text={isMac ? 'Dock Only' : 'Taskbar Only'} />
              </Label>
            </ListBox.Item>
            {!isLinux && (
              <ListBox.Item id="tray" textValue={isMac ? 'Tray Only' : 'Tray Only'}>
                <ListBox.ItemIndicator />
                <Label>
                  <SettingsSearchHighlight text={isMac ? 'Tray Only' : 'Tray Only'} />
                </Label>
              </ListBox.Item>
            )}
            <ListBox.Item id="tray-minimized" textValue={isMac ? 'Tray Only' : 'Tray Only'}>
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>
                  <SettingsSearchHighlight
                    text={
                      isMac ? 'Dock when focused, Tray when minimized' : 'Taskbar when focused, Tray when minimized'
                    }
                  />
                </Label>
                <Description>
                  <SettingsSearchHighlight
                    text={
                      isMac
                        ? 'Show in the dock when focused, move to tray when minimized.'
                        : 'Show in the taskbar when focused, move to tray when minimized.'
                    }
                  />
                </Description>
              </div>
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
    </SettingsFilterItem>
  );
}
