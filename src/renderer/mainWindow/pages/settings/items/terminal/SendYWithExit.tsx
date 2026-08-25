import LynxSwitch from '@lynx/components/LynxSwitch';
import {terminalActions, useTerminalState} from '@lynx/redux/reducers/terminal';
import {AppDispatch} from '@lynx/redux/store';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Settings component that toggles whether to automatically send 'Y' confirmation after exit button is pressed.
 * Updates the 'sendYWithExit' terminal setting in REDUX state.
 */
export default function SendYWithExit() {
  const sendYWithExit = useTerminalState('sendYWithExit');
  const dispatch = useDispatch<AppDispatch>();

  const onEnabledChange = useCallback(
    (value: boolean) => {
      dispatch(terminalActions.setTerminalState({key: 'sendYWithExit', value}));
    },
    [dispatch],
  );

  const titleText = 'Send "Y" with exit';
  const descriptionText =
    'Whether auto send the "Y" after exit button pressed.\n(When CTRL held or confirm is disabled)';

  return (
    <SettingsFilterItem
      searchTexts={[
        titleText,
        descriptionText,
        'terminal',
        'exit',
        'y',
        'send y with exit',
        'auto confirm exit',
        'yes exit',
      ]}>
      <LynxSwitch
        title={titleText}
        enabled={sendYWithExit}
        description={descriptionText}
        onEnabledChange={onEnabledChange}
      />
    </SettingsFilterItem>
  );
}
