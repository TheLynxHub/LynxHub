import {Button, Input} from '@heroui/react';
import {terminalActions, useTerminalState} from '@lynx/redux/reducers/terminal';
import {AppDispatch} from '@lynx/redux/store';
import {BroomIcon} from '@solar-icons/react/bold-duotone';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Interface representing a single quick command item.
 */
type QuickCommand = {label: string; command: string};

/**
 * Settings component that allows the user to configure up to 6 quick command buttons for the terminal.
 * Updates the 'quickCommands' array state in REDUX.
 */

export default function QuickCommands() {
  const quickCommands = useTerminalState('quickCommands');
  const dispatch = useDispatch<AppDispatch>();

  const normalized: QuickCommand[] = Array.from({length: 6}, (_, index) => {
    const existing = quickCommands[index];
    if (!existing) return {label: '', command: ''};
    return {label: existing.label || '', command: existing.command || ''};
  });

  const updateQuickCommands = (index: number, patch: Partial<QuickCommand>) => {
    const next = normalized.map((item, i) => (i === index ? {...item, ...patch} : item));
    dispatch(terminalActions.setTerminalState({key: 'quickCommands', value: next}));
  };

  return (
    <SettingsFilterItem
      searchTexts={[
        'terminal',
        'quick',
        'commands',
        'shortcuts',
        'terminal quick commands',
        'terminal shortcuts',
        'macros',
        'snippets',
        'custom commands',
        'quick command',
      ]}>
      <div className="flex flex-col gap-y-2">
        {normalized.map((item, index) => {
          const slot = index + 1;
          return (
            <div
              key={`terminal_quick_command_${slot}`}
              className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)_auto] items-center">
              <Input
                value={item.label}
                placeholder={`Quick Command ${slot} Label`}
                onChange={event => updateQuickCommands(index, {label: event.target.value})}
              />
              <Input
                value={item.command}
                placeholder={`Quick Command ${slot}`}
                onChange={event => updateQuickCommands(index, {command: event.target.value})}
              />
              <Button
                size="sm"
                variant="danger-soft"
                onPress={() => updateQuickCommands(index, {label: '', command: ''})}
                isIconOnly>
                <BroomIcon />
              </Button>
            </div>
          );
        })}
      </div>
    </SettingsFilterItem>
  );
}
