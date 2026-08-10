import {Button, Description, Header, Input, Label, ListBox, Spinner, Surface} from '@heroui/react';
import SettingsSection from '@lynx/components/SettingsSection';
import {hotkeysActions, useHotkeysState} from '@lynx/redux/reducers/hotkeys';
import {useSettingsState} from '@lynx/redux/reducers/settings';
import {useTerminalState} from '@lynx/redux/reducers/terminal';
import {AppDispatch} from '@lynx/redux/store';
import {formatHotkey, HotkeyLike} from '@lynx/utils';
import {
  Get_Default_Hotkeys,
  Hotkey_Desc,
  Hotkey_Names,
  Hotkey_Sections,
  Hotkey_Titles,
} from '@lynx_common/consts/hotkeys';
import {LynxHotkey} from '@lynx_common/types/ipc';
import storageIpc from '@lynx_shared/ipc/storage';
import {KeyboardIcon, RefreshIcon} from '@solar-icons/react/bold-duotone';
import {compact} from 'lodash-es';
import {KeyboardEvent, useCallback, useMemo, useRef, useState} from 'react';
import {useDispatch} from 'react-redux';

import {canSettingItemShow} from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

export const SettingsHotkeysId = 'settings_hotkeys_elem';

const isModifierKey = (key: string): boolean => {
  return ['control', 'shift', 'alt', 'meta', 'os'].includes(key.toLowerCase());
};

/**
 * Renders the "Hotkeys" settings section.
 * Allows the user to view, edit, and reset application shortcuts.
 */
export default function SettingsHotkeys() {
  const hotkeys = useHotkeysState('hotkeys');
  const quickCommands = useTerminalState('quickCommands');
  const [recordingName, setRecordingName] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const dispatch = useDispatch<AppDispatch>();
  const searchValue = useSettingsState('searchValue');

  const quickCommandLabelMap = useMemo(() => {
    const labels: Partial<Record<string, string>> = {};

    const hotkeyToIndex: Record<string, number> = {
      [Hotkey_Names.terminalQuick1]: 0,
      [Hotkey_Names.terminalQuick2]: 1,
      [Hotkey_Names.terminalQuick3]: 2,
      [Hotkey_Names.terminalQuick4]: 3,
      [Hotkey_Names.terminalQuick5]: 4,
      [Hotkey_Names.terminalQuick6]: 5,
    };

    Object.entries(hotkeyToIndex).forEach(([name, index]) => {
      const quick = quickCommands[index];
      if (!quick) return;

      const baseTitle = Hotkey_Titles[name as keyof typeof Hotkey_Titles];
      const hasLabel = quick.label && quick.label.trim().length > 0;
      const hasCommand = quick.command && quick.command.trim().length > 0;

      if (!hasLabel && !hasCommand) return;

      if (hasLabel) {
        labels[name] = `${baseTitle} (${quick.label})`;
      } else if (hasCommand) {
        const preview = quick.command.length > 24 ? `${quick.command.slice(0, 24)}…` : quick.command;
        labels[name] = `${baseTitle} (${preview})`;
      }
    });

    return labels;
  }, [quickCommands]);

  const handleRecordClick = useCallback((name: string) => {
    setRecordingName(name);
    inputRefs.current[name]?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>, name: string) => {
      event.preventDefault();

      const {key, ctrlKey, shiftKey, altKey, metaKey} = event;
      const lowerCaseKey = key.toLowerCase();

      if (lowerCaseKey === 'escape') {
        setRecordingName(null);
        inputRefs.current[name]?.blur();
        return;
      }

      if (isModifierKey(lowerCaseKey)) {
        if (inputRefs.current[name]) {
          // It's just a modifier
        }
        return;
      }

      const newHotkey: HotkeyLike = {
        key: lowerCaseKey,
        control: ctrlKey,
        shift: shiftKey,
        alt: altKey,
        meta: metaKey,
      };

      const result: LynxHotkey[] = hotkeys.map(item => {
        if (item.name !== name) return item;

        return {
          name: item.name,
          key: newHotkey.key || '',
          control: !!newHotkey.control,
          shift: !!newHotkey.shift,
          alt: !!newHotkey.alt,
          meta: !!newHotkey.meta,
        };
      });

      dispatch(hotkeysActions.setHotkeys(result));
      storageIpc.update('app', {hotkeys: result});

      setRecordingName(null);
      inputRefs.current[name]?.blur();
    },
    [dispatch, hotkeys],
  );

  const handleBlur = useCallback((name: string) => {
    setTimeout(() => {
      setRecordingName(prev => (prev === name ? null : prev));
    }, 100);
  }, []);

  const resetToDefault = useCallback(() => {
    const result = Get_Default_Hotkeys();
    dispatch(hotkeysActions.setHotkeys(result));
    storageIpc.update('app', {hotkeys: result});
  }, [dispatch]);

  const renderItems = useCallback(
    (include: string[]) => {
      const config = hotkeys.map(hot => {
        const {name, ...hotkey} = hot;
        const baseLabel = Hotkey_Titles[name];
        const dynamicLabel = quickCommandLabelMap[name];

        return {
          hotkey,
          name,
          description: Hotkey_Desc[name],
          label: dynamicLabel || baseLabel,
        };
      });

      return compact(
        config.map(item => {
          const {label, hotkey, description, name} = item;
          const isRecording = recordingName === name;
          const canShow = canSettingItemShow(searchValue, [label, description, formatHotkey(hotkey)]);

          if (!canShow || !include.includes(name)) return null;

          return (
            <ListBox.Item
              textValue={label}
              key={`${name}_hotkey`}
              className="justify-between cursor-default hover:bg-background">
              <div className="flex flex-col">
                <Label>
                  <SettingsSearchHighlight text={label} />
                </Label>
                <Description>
                  <SettingsSearchHighlight text={description} />
                </Description>
              </div>
              <div className="flex flex-row gap-x-2 items-center">
                <Button
                  size="sm"
                  variant="secondary"
                  className="shrink-0"
                  isPending={isRecording}
                  isDisabled={isRecording}
                  onPress={() => handleRecordClick(name)}
                  isIconOnly>
                  {isRecording ? <Spinner size="sm" color="current" /> : <KeyboardIcon className="size-5" />}
                </Button>
                <Input
                  ref={el => {
                    inputRefs.current[name] = el;
                  }}
                  onBlur={() => handleBlur(name)}
                  variant={isRecording ? 'primary' : 'secondary'}
                  value={isRecording ? 'Press keys...' : formatHotkey(hotkey)}
                  onKeyDown={isRecording ? e => handleKeyDown(e, name) : undefined}
                  placeholder={isRecording ? 'Press keys...' : formatHotkey(hotkey)}
                  readOnly
                />
              </div>
            </ListBox.Item>
          );
        }),
      );
    },
    [hotkeys, quickCommandLabelMap, recordingName, searchValue, handleRecordClick, handleBlur, handleKeyDown],
  );

  return (
    <SettingsSection title="Hotkeys" id={SettingsHotkeysId} icon={<KeyboardIcon className="size-5" />}>
      <Surface className="rounded-3xl p-1">
        <ListBox aria-label="hotkeys_list">
          {Hotkey_Sections.map(section => {
            return (
              <ListBox.Section key={section.kind}>
                <Header>{section.title}</Header>
                {renderItems(section.includes)}
              </ListBox.Section>
            );
          })}
        </ListBox>
      </Surface>
      <Button variant="danger-soft" onPress={resetToDefault} fullWidth>
        <RefreshIcon />
        Reset to Defaults
      </Button>
    </SettingsSection>
  );
}
