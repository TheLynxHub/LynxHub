import {Description, Key, Label, ListBox, Select} from '@heroui/react';
import {AppDispatch} from '@lynx/redux/store';
import {showRestartModal} from '@lynx/utils';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback, useEffect, useState} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

type JsMemorySize = 2048 | 4096 | 8192;

/**
 * Component to configure the maximum heap size for the JavaScript engine.
 * Saves settings directly to storage via IPC and prompts for application restart.
 */
export default function JsMemory() {
  const dispatch = useDispatch<AppDispatch>();
  const [selectedKey, setSelectedKey] = useState('4096');

  useEffect(() => {
    storageIpc.get('performance').then(data => {
      setSelectedKey(String(data.jsMaxOldSpaceSize));
    });
  }, []);

  const onChange = useCallback(
    (key: Key | null) => {
      if (!key || typeof key === 'number') return;

      const value = Number(key) as JsMemorySize;
      storageIpc.update('performance', {jsMaxOldSpaceSize: value});
      setSelectedKey(String(value));
      showRestartModal(dispatch, 'To apply performance changes, please restart the app.');
    },
    [dispatch],
  );

  const labelText = 'JavaScript Memory Limit';
  const descriptionText =
    'Maximum heap size for the JavaScript engine. Higher values may improve performance with large web applications.';

  return (
    <SettingsFilterItem
      searchTexts={[
        labelText,
        descriptionText,
        'js',
        'memory',
        'heap',
        'ram',
        'v8 heap',
        'max old space size',
        'javascript memory limit',
        '2 gb',
        '4 gb',
        '8 gb',
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
            <ListBox.Item id="2048" textValue="2 GB">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>
                  <SettingsSearchHighlight text="2 GB" />
                </Label>
                <Description>
                  <SettingsSearchHighlight text="Lower memory usage, suitable for most use cases." />
                </Description>
              </div>
            </ListBox.Item>
            <ListBox.Item id="4096" textValue="4 GB (Default)">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>
                  <SettingsSearchHighlight text="4 GB (Default)" />
                </Label>
                <Description>
                  <SettingsSearchHighlight text="Balanced memory allocation for standard usage." />
                </Description>
              </div>
            </ListBox.Item>
            <ListBox.Item id="8192" textValue="8 GB">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>
                  <SettingsSearchHighlight text="8 GB" />
                </Label>
                <Description>
                  <SettingsSearchHighlight text="High memory limit for heavy workloads and multiple tabs." />
                </Description>
              </div>
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
    </SettingsFilterItem>
  );
}
