import {Description, Key, Label, ListBox, Select} from '@heroui/react';
import {AppDispatch} from '@lynx/redux/store';
import {showRestartModal} from '@lynx/utils';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback, useEffect, useState} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

type DiskCacheSize = 0 | 268435456 | 536870912 | 1073741824;

/**
 * Component to configure the disk cache size.
 * Saves settings directly to storage via IPC and prompts for application restart.
 */
export default function DiskCache() {
  const dispatch = useDispatch<AppDispatch>();
  const [selectedKey, setSelectedKey] = useState('0');

  useEffect(() => {
    storageIpc.get('performance').then(data => {
      setSelectedKey(String(data.diskCacheSize));
    });
  }, []);

  const onChange = useCallback(
    (key: Key | null) => {
      if (!key || typeof key === 'number') return;

      const value = Number(key) as DiskCacheSize;
      storageIpc.update('performance', {diskCacheSize: value});
      setSelectedKey(String(value));
      showRestartModal(dispatch, 'To apply performance changes, please restart the app.');
    },
    [dispatch],
  );

  const labelText = 'Disk Cache Size';
  const descriptionText = 'Amount of disk space for caching web content. Larger cache may improve loading times.';

  return (
    <SettingsFilterItem
      searchTexts={[
        labelText,
        descriptionText,
        'cache',
        'disk',
        'storage',
        'disk cache',
        'disk space',
        'web cache',
        'http cache',
        '256 mb',
        '512 mb',
        '1 gb',
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
            <ListBox.Item id="0" textValue="Default">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>Default</Label>
                <Description>
                  <SettingsSearchHighlight text="Use browser default cache size." />
                </Description>
              </div>
            </ListBox.Item>
            <ListBox.Item id="268435456" textValue="256 MB">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>256 MB</Label>
                <Description>
                  <SettingsSearchHighlight text="Small cache for limited disk space." />
                </Description>
              </div>
            </ListBox.Item>
            <ListBox.Item id="536870912" textValue="512 MB">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>512 MB</Label>
                <Description>
                  <SettingsSearchHighlight text="Medium cache for balanced usage." />
                </Description>
              </div>
            </ListBox.Item>
            <ListBox.Item id="1073741824" textValue="1 GB">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>1 GB</Label>
                <Description>
                  <SettingsSearchHighlight text="Large cache for frequently visited sites." />
                </Description>
              </div>
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
    </SettingsFilterItem>
  );
}
