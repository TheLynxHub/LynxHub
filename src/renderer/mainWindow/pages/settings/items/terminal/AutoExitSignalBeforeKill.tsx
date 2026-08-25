import LynxSwitch from '@lynx/components/LynxSwitch';
import {terminalActions, useTerminalState} from '@lynx/redux/reducers/terminal';
import {AppDispatch} from '@lynx/redux/store';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Settings component that toggles whether to automatically send an exit signal (Ctrl+C)
 * to the terminal process before terminating/killing it.
 */
export default function AutoExitSignalBeforeKill() {
  const autoExitSignalBeforeKill = useTerminalState('autoExitSignalBeforeKill');
  const dispatch = useDispatch<AppDispatch>();

  const onEnabledChange = useCallback(
    (value: boolean) => {
      dispatch(terminalActions.setTerminalState({key: 'autoExitSignalBeforeKill', value}));
    },
    [dispatch],
  );

  const titleText = 'Auto Send Exit Signal Before Killing';
  const descriptionText =
    'Automatically send an exit signal (Ctrl+C) to the terminal process before terminating or killing it.';

  return (
    <SettingsFilterItem
      searchTexts={[
        titleText,
        descriptionText,
        'terminal',
        'exit signal',
        'kill process',
        'terminate',
        'ctrl+c',
        'auto exit',
        'sigint',
        'sigterm',
        'auto send exit signal before killing',
      ]}>
      <LynxSwitch
        title={titleText}
        description={descriptionText}
        onEnabledChange={onEnabledChange}
        enabled={autoExitSignalBeforeKill}
      />
    </SettingsFilterItem>
  );
}
