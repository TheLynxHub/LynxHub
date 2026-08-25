import LynxSwitch from '@lynx/components/LynxSwitch';
import {terminalActions, useTerminalState} from '@lynx/redux/reducers/terminal';
import {AppDispatch} from '@lynx/redux/store';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import SettingsFilterItem from '../../SettingsFilterItem';

/**
 * Settings component that toggles whether URLs clicked in the terminal open in a new tab.
 * Updates the 'openLinkNewTab' terminal setting in REDUX state.
 */
export default function OpenLinks() {
  const openLinkNewTab = useTerminalState('openLinkNewTab');
  const dispatch = useDispatch<AppDispatch>();

  const onEnabledChange = useCallback(
    (value: boolean) => {
      dispatch(terminalActions.setTerminalState({key: 'openLinkNewTab', value}));
    },
    [dispatch],
  );

  const titleText = 'Open Links in New Tab';
  const descriptionText =
    'Whether open links in new tab when clicking on url.\n(Middle click to always open links in new tab)';

  return (
    <SettingsFilterItem
      searchTexts={[
        titleText,
        descriptionText,
        'terminal',
        'open links in new tab',
        'links',
        'url',
        'hyperlinks',
        'middle click',
        'browser tab',
        'clickable links',
      ]}>
      <LynxSwitch
        title={titleText}
        enabled={openLinkNewTab}
        description={descriptionText}
        onEnabledChange={onEnabledChange}
      />
    </SettingsFilterItem>
  );
}
