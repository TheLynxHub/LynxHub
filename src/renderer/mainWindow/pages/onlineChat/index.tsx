import BrowserViewPlaceholder from '@lynx/features/session/browser/BrowserViewPlaceholder';
import {memo, useCallback, useRef, useState} from 'react';

import Page from '../Page';
import ChatArea from './ChatArea';
import ChatSidebar from './ChatSidebar';
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
    isGenerating,
    onlineCards,
    chatHistory,
    handleSelectCard,
    handleSelectHistoryItem,
    handleBackToSelect,
    handleGoToChat,
    handleShowWebpage,
    handleRefresh,
    handleSendMessage,
    handleCopyToClipboard,
    handleSaveToFile,
    handleNewChat,
  } = useOnlineChat(tabID);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const chatAreaRef = useRef<{scrollToTop: () => void; scrollToBottom: () => void}>(null);

  const handleScrollStateChange = useCallback((showTop: boolean, showBottom: boolean) => {
    setShowScrollTop(showTop);
    setShowScrollBottom(showBottom);
  }, []);

  const handleScrollTop = useCallback(() => {
    chatAreaRef.current?.scrollToTop();
  }, []);

  const handleScrollBottom = useCallback(() => {
    chatAreaRef.current?.scrollToBottom();
  }, []);

  return (
    <Page>
      <div className="absolute inset-0 bg-surface overflow-hidden flex flex-col">
        <ChatTopBar
          step={step}
          messages={messages}
          onRefresh={handleRefresh}
          onNewChat={handleNewChat}
          selectedCard={selectedCard}
          isPageLoaded={isPageLoaded}
          onGoToChat={handleGoToChat}
          showScrollTop={showScrollTop}
          onScrollTop={handleScrollTop}
          onSaveToFile={handleSaveToFile}
          onShowWebpage={handleShowWebpage}
          onBackToSelect={handleBackToSelect}
          showScrollBottom={showScrollBottom}
          onScrollBottom={handleScrollBottom}
          onCopyToClipboard={handleCopyToClipboard}
        />
        <div className="absolute inset-0 top-12! overflow-hidden flex flex-row">
          {step === 'chat' && selectedCard?.onlineConfig?.selectors?.chatItem && (
            <ChatSidebar chatHistory={chatHistory} onSelectHistoryItem={handleSelectHistoryItem} />
          )}
          <div className="flex-1 h-full relative overflow-hidden flex flex-col">
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
                chatAreaRef={chatAreaRef}
                isGenerating={isGenerating}
                selectedCard={selectedCard}
                onSendMessage={handleSendMessage}
                onScrollStateChange={handleScrollStateChange}
              />
            )}
          </div>
        </div>
      </div>
    </Page>
  );
});

OnlineChatPage.displayName = 'OnlineChatPage';

export default OnlineChatPage;
