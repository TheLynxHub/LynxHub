import {Description, Key, Label, ListBox, Select} from '@heroui/react';
import {terminalActions, useTerminalState} from '@lynx/redux/reducers/terminal';
import {AppDispatch} from '@lynx/redux/store';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';
import SettingsSearchHighlight from '../../SettingsSearchHighlight';

/**
 * Settings component that allows the user to select the font family of the terminal.
 * Updates the 'fontFamily' state in REDUX.
 */
export default function FontFamily() {
  const fontFamily = useTerminalState('fontFamily') || 'JetBrainsMonoTerminal';
  const dispatch = useDispatch<AppDispatch>();

  const onChange = useCallback(
    (key: Key | null) => {
      if (!key || typeof key === 'number') return;

      const value = key as string;
      dispatch(terminalActions.setTerminalState({key: 'fontFamily', value}));
    },
    [dispatch],
  );

  const labelText = 'Font Family';
  const descriptionText = 'Select the font family for the terminal.';

  const fontOptions = [
    {
      id: 'JetBrainsMonoTerminal',
      name: 'JetBrains Mono',
      support: 'Latin, Cyrillic, Greek (English, Western Europe, Russian, Greek, etc.)',
    },
    {
      id: 'NotoSansMonoArabic',
      name: 'Noto Sans Mono Arabic',
      support: 'Arabic script',
    },
    {
      id: 'NotoSansMonoHebrew',
      name: 'Noto Sans Mono Hebrew',
      support: 'Hebrew script',
    },
    {
      id: 'NotoSansMonoThai',
      name: 'Noto Sans Mono Thai',
      support: 'Thai script',
    },
    {
      id: 'NotoSansMonoDevanagari',
      name: 'Noto Sans Mono Devanagari',
      support: 'Devanagari script (Hindi, Marathi, Nepali, etc.)',
    },
    {
      id: 'Noto Sans Mono CJK SC',
      name: 'Noto Sans Mono CJK SC',
      support: 'Chinese Simplified (system fallback)',
    },
    {
      id: 'Noto Sans Mono CJK TC',
      name: 'Noto Sans Mono CJK TC',
      support: 'Chinese Traditional (system fallback)',
    },
    {
      id: 'Noto Sans Mono CJK JP',
      name: 'Noto Sans Mono CJK JP',
      support: 'Japanese (system fallback)',
    },
    {
      id: 'Noto Sans Mono CJK KR',
      name: 'Noto Sans Mono CJK KR',
      support: 'Korean (system fallback)',
    },
  ];

  const currentSelection = fontOptions.find(opt => opt.id === fontFamily) || fontOptions[0];

  return (
    <SettingsFilterItem searchTexts={[labelText, descriptionText, 'font', 'family', 'terminal', 'language']}>
      <Select value={fontFamily} onChange={onChange}>
        <Label>
          <SettingsSearchHighlight text={labelText} />
        </Label>
        <Select.Trigger>
          <Select.Value>{currentSelection.name}</Select.Value>
          <Select.Indicator />
        </Select.Trigger>
        <Description>
          <SettingsSearchHighlight text={descriptionText} />
        </Description>
        <Select.Popover>
          <ListBox>
            {fontOptions.map(opt => (
              <ListBox.Item id={opt.id} key={opt.id} textValue={opt.name}>
                <ListBox.ItemIndicator />
                <div className="flex flex-col">
                  <Label>{opt.name}</Label>
                  <span className="text-[10px] text-muted">{opt.support}</span>
                </div>
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </SettingsFilterItem>
  );
}
