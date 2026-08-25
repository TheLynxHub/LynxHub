import LynxSwitch from '@lynx/components/LynxSwitch';
import {terminalActions, useTerminalState} from '@lynx/redux/reducers/terminal';
import {AppDispatch} from '@lynx/redux/store';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Settings component that toggles whether to colorize specific output text (errors, warnings, etc.) in the terminal.
 * Updates the 'outputColor' state in REDUX.
 */
export default function OutputColor() {
  const outputColor = useTerminalState('outputColor');
  const dispatch = useDispatch<AppDispatch>();

  const onEnabledChange = useCallback(
    (value: boolean) => {
      dispatch(terminalActions.setTerminalState({key: 'outputColor', value}));
    },
    [dispatch],
  );

  return (
    <SettingsFilterItem
      searchTexts={[
        'Colorize Output Text',
        'colorize output',
        'terminal colors',
        'errors',
        'warnings',
        'success',
        'info',
        'debug',
        'ansi colors',
        'syntax highlighting',
        'terminal theme colors',
      ]}>
      <LynxSwitch
        description={
          <span>
            Whether colorize output of terminal text based on: <span className="text-red-600">Errors </span>
            <span className="text-[#ff9900]">Warnings </span> <span className="text-[#00ff00]">Success </span>
            <span className="text-[#0099ff]">Info </span> <span className="text-[#00cccc]">Debug </span> .
          </span>
        }
        enabled={outputColor}
        title="Colorize Output Text"
        onEnabledChange={onEnabledChange}
      />
    </SettingsFilterItem>
  );
}
