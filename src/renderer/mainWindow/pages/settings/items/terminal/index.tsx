import SettingsSection from '@lynx/components/SettingsSection';
import {Terminal_Icon} from '@lynx_assets/icons';

import BlinkCursor from './BlinkCursor';
import CloseOnExit from './CloseOnExit';
import Conpty from './Conpty';
import CursorInactiveStyle from './CursorInactiveStyle';
import CursorStyle from './CursorStyle';
import FontLoadTimeout from './FontLoadTimeout';
import FontSize from './FontSize';
import Ligatures from './Ligatures';
import OpenLinks from './OpenLinks';
import OutputColor from './OutputColor';
import QuickCommands from './QuickCommands';
import Reset from './Reset';
import ResizeDelay from './ResizeDelay';
import ScrollBack from './ScrollBack';
import SendYWithExit from './SendYWithExit';

/**
 * The DOM ID assigned to the terminal settings wrapper.
 */
export const SettingsTerminalId = 'settings_terminal_elem';

/**
 * Main wrapper component for the Terminal Settings page section.
 * Aggregates all specific configuration sub-components for terminal behavior.
 */
export default function SettingsTerminal() {
  return (
    <SettingsSection title="Terminal" id={SettingsTerminalId} icon={<Terminal_Icon className="size-5" />}>
      <Conpty />
      <ScrollBack />
      <ResizeDelay />
      <FontLoadTimeout />
      <FontSize />
      <Ligatures />
      <CursorStyle />
      <CursorInactiveStyle />
      <BlinkCursor />
      <OutputColor />
      <CloseOnExit />
      <SendYWithExit />
      <OpenLinks />

      <div className="mt-1" />
      <QuickCommands />

      <Reset />
    </SettingsSection>
  );
}
