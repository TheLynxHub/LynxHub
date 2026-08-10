import SettingsSection from '@lynx/components/SettingsSection';
import {WidgetIcon} from '@solar-icons/react/bold-duotone';
import {WindowFrameIcon} from '@solar-icons/react/bold-duotone';

import BridgeDefaultView from './BridgeDefaultView';
import ChatBridgeMaxWidth from './ChatBridgeMaxWidth';
import DisableFloatChat from './DisableFloatChat';
import FloatChatAlwaysOnTop from './FloatChatAlwaysOnTop';
import FloatChatKeepInBackground from './FloatChatKeepInBackground';
import FloatChatRememberPosition from './FloatChatRememberPosition';
import FloatChatRememberSize from './FloatChatRememberSize';
import FloatChatShowTaskbar from './FloatChatShowTaskbar';
import FloatDefaultView from './FloatDefaultView';

export const SettingsChatBridgeId = 'settings_chat_bridge_elem';

/**
 * Settings section for Chat Bridge configurations.
 * Aggregates various configurations for native chat bridge wrappers and float quick chat window.
 */
export default function SettingsChatBridge() {
  return (
    <>
      <SettingsSection title="Interface" icon={<WidgetIcon className="size-5" />}>
        <ChatBridgeMaxWidth />
        <BridgeDefaultView />
      </SettingsSection>
      <SettingsSection title="Float Chat" id={SettingsChatBridgeId} icon={<WindowFrameIcon className="size-5" />}>
        <DisableFloatChat />
        <FloatChatKeepInBackground />
        <FloatChatAlwaysOnTop />
        <FloatChatShowTaskbar />
        <FloatChatRememberSize />
        <FloatChatRememberPosition />
        <FloatDefaultView />
      </SettingsSection>
    </>
  );
}
