import LynxSwitch from '@lynx/components/LynxSwitch';
import {terminalActions, useTerminalState} from '@lynx/redux/reducers/terminal';
import {AppDispatch} from '@lynx/redux/store';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Settings component that toggles whether the terminal tab should automatically close
 * when its assigned process exits.
 */
export default function CloseOnExit() {
  const closeTabOnExit = useTerminalState('closeTabOnExit');
  const dispatch = useDispatch<AppDispatch>();

  const onEnabledChange = useCallback(
    (value: boolean) => {
      dispatch(terminalActions.setTerminalState({key: 'closeTabOnExit', value}));
    },
    [dispatch],
  );

  const titleText = 'Close Tab on Terminal Exit';
  const descriptionText = 'Automatically close the tab containing the terminal when its assigned process exits.';

  return (
    <SettingsFilterItem
      searchTexts={[
        titleText,
        descriptionText,
        'terminal',
        'close tab',
        'process exit',
        'auto close',
        'close on exit',
        'auto terminate tab',
      ]}>
      <LynxSwitch
        title={titleText}
        enabled={closeTabOnExit}
        description={descriptionText}
        onEnabledChange={onEnabledChange}
      />
    </SettingsFilterItem>
  );
}
