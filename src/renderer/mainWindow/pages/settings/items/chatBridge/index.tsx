import SettingsSection from '@lynx/components/SettingsSection';
import {Widget} from '@solar-icons/react-perf/BoldDuotone';
import {WindowFrame} from '@solar-icons/react-perf/BoldDuotone';

import ChatBridgeMaxWidth from './ChatBridgeMaxWidth';
import DisableFloatChat from './DisableFloatChat';
import FloatChatAlwaysOnTop from './FloatChatAlwaysOnTop';
import FloatChatKeepInBackground from './FloatChatKeepInBackground';
import FloatChatRememberPosition from './FloatChatRememberPosition';
import FloatChatRememberSize from './FloatChatRememberSize';
import FloatChatShowTaskbar from './FloatChatShowTaskbar';

export const SettingsChatBridgeId = 'settings_chat_bridge_elem';

/**
 * Settings section for Chat Bridge configurations.
 * Aggregates various configurations for native chat bridge wrappers and float quick chat window.
 */
export default function SettingsChatBridge() {
  return (
    <>
      <SettingsSection title="Interface" icon={<Widget className="size-5" />}>
        <ChatBridgeMaxWidth />
      </SettingsSection>
      <SettingsSection title="Float Chat" id={SettingsChatBridgeId} icon={<WindowFrame className="size-5" />}>
        <DisableFloatChat />
        <FloatChatKeepInBackground />
        <FloatChatAlwaysOnTop />
        <FloatChatShowTaskbar />
        <FloatChatRememberSize />
        <FloatChatRememberPosition />
      </SettingsSection>
    </>
  );
}
