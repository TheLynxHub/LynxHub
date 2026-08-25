import {Description, Key, Label, ListBox, Select} from '@heroui/react';
import {AppDispatch} from '@lynx/redux/store';
import {showRestartModal} from '@lynx/utils';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback, useEffect, useState} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

type ColorProfile = 'default' | 'srgb' | 'display-p3' | 'color-spin-gamma24';

/**
 * Component to configure the forced color output profile.
 * Saves settings directly to storage via IPC and prompts for application restart.
 */
export default function ColorProfile() {
  const dispatch = useDispatch<AppDispatch>();
  const [selectedKey, setSelectedKey] = useState('default');

  useEffect(() => {
    storageIpc.get('performance').then(data => {
      setSelectedKey(data.forceColorProfile);
    });
  }, []);

  const onChange = useCallback(
    (key: Key | null) => {
      if (!key || typeof key === 'number') return;

      const value = key as ColorProfile;
      storageIpc.update('performance', {forceColorProfile: value});
      setSelectedKey(value);
      showRestartModal(dispatch, 'To apply performance changes, please restart the app.');
    },
    [dispatch],
  );

  const labelText = 'Force Color Profile';
  const descriptionText = 'Forces a specific color output profile. Use sRGB for standard displays.';

  return (
    <SettingsFilterItem
      searchTexts={[
        labelText,
        descriptionText,
        'color',
        'profile',
        'srgb',
        'display',
        'display-p3',
        'display p3',
        'hdr',
        'gamma',
        'color space',
        'wide color gamut',
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
            <ListBox.Item id="default" textValue="Default">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>Default</Label>
                <Description>
                  <SettingsSearchHighlight text="Use system default color profile." />
                </Description>
              </div>
            </ListBox.Item>
            <ListBox.Item id="srgb" textValue="sRGB">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>sRGB</Label>
                <Description>
                  <SettingsSearchHighlight text="Standard color profile for most displays." />
                </Description>
              </div>
            </ListBox.Item>
            <ListBox.Item id="display-p3" textValue="Display P3">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>Display P3</Label>
                <Description>
                  <SettingsSearchHighlight text="Wide color gamut for compatible displays." />
                </Description>
              </div>
            </ListBox.Item>
            <ListBox.Item id="color-spin-gamma24" textValue="Color Spin (Gamma 2.4)">
              <ListBox.ItemIndicator />
              <div className="flex flex-col">
                <Label>Color Spin (Gamma 2.4)</Label>
                <Description>
                  <SettingsSearchHighlight text="Alternative gamma curve." />
                </Description>
              </div>
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
    </SettingsFilterItem>
  );
}
