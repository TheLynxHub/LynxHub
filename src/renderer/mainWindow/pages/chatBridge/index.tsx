import BrowserViewPlaceholder from '@lynx/features/session/browser/BrowserViewPlaceholder';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {memo, MouseEvent, useCallback, useEffect, useMemo, useRef, useState} from 'react';

import Page from '../Page';
import ChatArea from './ChatArea';
import ChatSidebar from './ChatSidebar';
import ChatTopBar from './ChatTopBar';
import ModuleSelector from './ModuleSelector';
import {useChatBridge} from './useChatBridge';

interface Props {
  tabID?: string;
}

const ChatBridgePage = memo(({tabID = 'chat-bridge'}: Props) => {
  const {
    selectedCard,
    step,
    messages,
    isSending,
    isPageLoaded,
    isGenerating,
    onlineCards,
    chatHistory,
    isHistoryLoading,
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
    activeUnifiedCardId,
    bgChatEnabledCards,
    visibleModuleIds,
    toggleBgChat,
    setVisibleModuleIds,
    setActiveUnifiedCardId,
  } = useChatBridge(tabID);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const chatAreaRef = useRef<{scrollToTop: () => void; scrollToBottom: () => void}>(null);

  const [initialInputText, setInitialInputText] = useState('');

  const activeCard = useMemo(() => {
    return onlineCards.find(c => c.id === activeUnifiedCardId);
  }, [onlineCards, activeUnifiedCardId]);

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      const selectionText = window.getSelection()?.toString().trim() || '';

      if (step === 'select_module' && !selectionText) {
        e.preventDefault();
        return;
      }
      e.preventDefault();

      contextMenuIpc.send.openChatBridgeMenu(
        tabID,
        {
          step,
          hasMessages: messages.length > 0,
          hasNewChat: !!selectedCard?.onlineConfig?.newChat || selectedCard?.id === 'unified',
          selectionText,
        },
        {x: e.clientX, y: e.clientY},
      );
    },
    [tabID, step, messages.length, selectedCard],
  );

  useEffect(() => {
    const offAction = contextMenuIpc.on.chatBridgeAction((targetTabID, action, payload) => {
      if (targetTabID !== tabID) return;

      switch (action) {
        case 'reload':
          handleRefresh();
          break;
        case 'back':
          handleBackToSelect();
          break;
        case 'toggle-webpage':
          if (step === 'chat') {
            handleShowWebpage();
          } else if (step === 'login') {
            handleGoToChat();
          }
          break;
        case 'new-chat':
          handleNewChat();
          break;
        case 'copy-markdown':
          handleCopyToClipboard('markdown');
          break;
        case 'copy-text':
          handleCopyToClipboard('text');
          break;
        case 'save-markdown':
          handleSaveToFile('markdown');
          break;
        case 'save-text':
          handleSaveToFile('text');
          break;
        case 'start-chat-with-selection':
          if (payload) {
            setInitialInputText(payload);
            handleNewChat();
          }
          break;
      }
    });

    return () => offAction();
  }, [
    tabID,
    step,
    handleRefresh,
    handleBackToSelect,
    handleShowWebpage,
    handleGoToChat,
    handleNewChat,
    handleCopyToClipboard,
    handleSaveToFile,
  ]);

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
      <div onContextMenu={handleContextMenu} className="absolute inset-0 bg-surface overflow-hidden flex flex-col">
        <ChatTopBar
          step={step}
          messages={messages}
          onRefresh={handleRefresh}
          onlineCards={onlineCards}
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
          bgChatEnabledCards={bgChatEnabledCards}
          onCopyToClipboard={handleCopyToClipboard}
          activeUnifiedCardId={activeUnifiedCardId}
          onSelectActiveCard={setActiveUnifiedCardId}
          showBackButton={!tabID.startsWith('chat-bridge-')}
        />
        <div className="absolute inset-0 top-12! overflow-hidden flex flex-row">
          {step === 'chat' && (selectedCard?.id === 'unified' || selectedCard?.onlineConfig?.selectors?.chatItem) && (
            <ChatSidebar
              onNewChat={
                selectedCard?.id === 'unified' || selectedCard?.onlineConfig?.newChat ? handleNewChat : undefined
              }
              chatHistory={chatHistory}
              onlineCards={onlineCards}
              selectedCard={selectedCard}
              visibleModuleIds={visibleModuleIds}
              onSetVisibleModuleIds={setVisibleModuleIds}
              onSelectHistoryItem={handleSelectHistoryItem}
            />
          )}
          <div className="flex-1 h-full relative overflow-hidden flex flex-col">
            {step === 'select_module' && (
              <ModuleSelector
                onlineCards={onlineCards}
                onToggleBgChat={toggleBgChat}
                onSelectCard={handleSelectCard}
                bgChatEnabledCards={bgChatEnabledCards}
              />
            )}

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
                activeCard={activeCard}
                chatAreaRef={chatAreaRef}
                isGenerating={isGenerating}
                selectedCard={selectedCard}
                initialInput={initialInputText}
                onSendMessage={handleSendMessage}
                isHistoryLoading={isHistoryLoading}
                onScrollStateChange={handleScrollStateChange}
                onConsumedInitialInput={() => setInitialInputText('')}
              />
            )}
          </div>
        </div>
      </div>
    </Page>
  );
});

ChatBridgePage.displayName = 'ChatBridgePage';

export default ChatBridgePage;
