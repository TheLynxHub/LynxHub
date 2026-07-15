import BrowserViewPlaceholder from '@lynx/features/session/browser/BrowserViewPlaceholder';
import {memo} from 'react';

import Page from '../Page';
import ChatArea from './ChatArea';
import ChatTopBar from './ChatTopBar';
import ModuleSelector from './ModuleSelector';
import {useOnlineChat} from './useOnlineChat';

interface Props {
  tabID?: string;
}

const OnlineChatPage = memo(({tabID = 'online-chat'}: Props) => {
  const {
    selectedCard,
    step,
    messages,
    isSending,
    isPageLoaded,
    onlineCards,
    handleSelectCard,
    handleBackToSelect,
    handleGoToChat,
    handleShowWebpage,
    handleRefresh,
    handleSendMessage,
  } = useOnlineChat(tabID);

  return (
    <Page>
      <div className="absolute inset-0 bg-surface overflow-hidden flex flex-col">
        <ChatTopBar
          step={step}
          selectedCard={selectedCard}
          isPageLoaded={isPageLoaded}
          onGoToChat={handleGoToChat}
          onShowWebpage={handleShowWebpage}
          onBackToSelect={handleBackToSelect}
          onRefresh={handleRefresh}
        />
        <div className="absolute inset-0 top-12! overflow-hidden flex flex-col">
          {step === 'select_module' && <ModuleSelector onlineCards={onlineCards} onSelectCard={handleSelectCard} />}

          {step === 'login' && (
            <div className="flex size-full flex-col overflow-hidden bg-white">
              <div className="flex-1 relative w-full bg-white">
                <BrowserViewPlaceholder />
              </div>
            </div>
          )}

          {step === 'chat' && (
            <ChatArea
              messages={messages}
              isSending={isSending}
              selectedCard={selectedCard}
              onSendMessage={handleSendMessage}
            />
          )}
        </div>
      </div>
    </Page>
  );
});

OnlineChatPage.displayName = 'OnlineChatPage';

export default OnlineChatPage;
