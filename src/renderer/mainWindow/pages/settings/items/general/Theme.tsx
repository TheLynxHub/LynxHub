import {Description, Key, Label, ListBox, Select} from '@heroui/react';
import {appActions, useAppState} from '@lynx/redux/reducers/app';
import {AppDispatch} from '@lynx/redux/store';
import {DarkModeTypes} from '@lynx_common/types/ipc';
import applicationIpc from '@lynx_shared/ipc/application';
import storageIpc from '@lynx_shared/ipc/storage';
import {DisplayIcon, MoonIcon, Sun2Icon} from '@solar-icons/react/bold-duotone';
import {useCallback, useEffect, useState} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';
import useModeAnimation, {ThemeAnimationType} from './themeSwitch';

/**
 * Component to select the application appearance theme (Dark, Light, or System).
 * Includes an elegant transition animation when switching themes.
 */
export default function Theme() {
  const dispatch = useDispatch<AppDispatch>();

  const darkMode = useAppState('darkMode');

  const {ref, toggleSwitchTheme} = useModeAnimation({
    animationType: ThemeAnimationType.QR_SCAN,
    isDarkMode: darkMode,
    duration: 1000,
    easing: 'cubic-bezier(0.17, 0.67, 0.83, 0.67)',
  });

  const [selectedTheme, setSelectedTheme] = useState<DarkModeTypes>('system');

  useEffect(() => {
    storageIpc.get('app').then(({darkMode}) => {
      setSelectedTheme(darkMode);
    });
  }, []);

  const onThemeChange = useCallback(
    async (key: Key | null) => {
      if (!key || typeof key === 'number') return;

      const newSelectedTheme = key as DarkModeTypes;

      let nextEffectiveMode: 'dark' | 'light';
      if (newSelectedTheme === 'system') {
        nextEffectiveMode = await applicationIpc.invoke.getSystemDarkMode();
      } else {
        nextEffectiveMode = newSelectedTheme;
      }

      const newIsDarkMode = nextEffectiveMode === 'dark';

      const themeIsChanging = newIsDarkMode !== darkMode;

      const applyThemeChanges = () => {
        dispatch(appActions.setAppState({key: 'darkMode', value: newIsDarkMode}));

        applicationIpc.send.setDarkMode(newSelectedTheme);
        setSelectedTheme(newSelectedTheme);
      };

      if (themeIsChanging) {
        await toggleSwitchTheme();
        applyThemeChanges();
      } else {
        applyThemeChanges();
      }
    },
    [dispatch, darkMode, toggleSwitchTheme],
  );

  const labelText = 'Theme';
  const descriptionText = 'Select the appearance theme.';

  return (
    <SettingsFilterItem searchTexts={[labelText, descriptionText, 'theme', 'dark', 'light', 'system']}>
      <Select ref={ref} value={selectedTheme} onChange={onThemeChange}>
        <Label>
          <SettingsSearchHighlight text={labelText} />
        </Label>
        <Select.Trigger>
          <Select.Value className="flex flex-row items-center gap-x-2" />
          <Select.Indicator />
        </Select.Trigger>
        <Description>{descriptionText}</Description>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="dark" textValue="dark">
              <ListBox.ItemIndicator />
              <MoonIcon />
              <Label>Dark</Label>
            </ListBox.Item>
            <ListBox.Item id="light" textValue="light">
              <ListBox.ItemIndicator />
              <Sun2Icon />
              <Label>Light</Label>
            </ListBox.Item>
            <ListBox.Item id="system" textValue="system">
              <ListBox.ItemIndicator />
              <DisplayIcon />

              <div className="flex flex-col">
                <Label>System Default</Label>
                <Description>Automatically switch theme based on system settings.</Description>
              </div>
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
    </SettingsFilterItem>
  );
}
