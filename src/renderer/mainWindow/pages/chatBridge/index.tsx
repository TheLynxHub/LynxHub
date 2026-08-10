import {Button} from '@heroui/react';
import BrowserViewPlaceholder from '@lynx/features/session/browser/BrowserViewPlaceholder';
import browserIpc from '@lynx_shared/ipc/browser';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import storageIpc from '@lynx_shared/ipc/storage';
import {EarthIcon} from '@solar-icons/react/bold-duotone';
import {memo, MouseEvent, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useDispatch} from 'react-redux';

import {settingsActions, useSettingsState} from '../../redux/reducers/settings';
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
    activeWindow,
  } = useChatBridge(tabID);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const chatAreaRef = useRef<{scrollToTop: () => void; scrollToBottom: () => void}>(null);

  const [initialInputText, setInitialInputText] = useState('');

  const dispatch = useDispatch();
  const chatSidebarCollapsed = useSettingsState('chatSidebarCollapsed') ?? false;
  const chatSidebarWidth = useSettingsState('chatSidebarWidth') ?? 240;
  const pinnedThreads = useSettingsState('pinnedThreads') ?? [];

  const handleToggleSidebar = useCallback(() => {
    const nextVal = !chatSidebarCollapsed;
    dispatch(settingsActions.setSettingsState({key: 'chatSidebarCollapsed', value: nextVal}));
    storageIpc.update('app', {chatSidebarCollapsed: nextVal});
  }, [chatSidebarCollapsed, dispatch]);

  const handleResizeSidebar = useCallback(
    (newWidth: number) => {
      dispatch(settingsActions.setSettingsState({key: 'chatSidebarWidth', value: newWidth}));
      storageIpc.update('app', {chatSidebarWidth: newWidth});
    },
    [dispatch],
  );

  const handleTogglePinThread = useCallback(
    (cardId: string, title: string) => {
      const pinKey = `${cardId}::${title}`;
      const isPinned = pinnedThreads.includes(pinKey);
      const nextPinned = isPinned ? pinnedThreads.filter(k => k !== pinKey) : [...pinnedThreads, pinKey];

      dispatch(settingsActions.setSettingsState({key: 'pinnedThreads', value: nextPinned}));
      storageIpc.update('app', {pinnedThreads: nextPinned});
    },
    [pinnedThreads, dispatch],
  );

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
              pinnedThreads={pinnedThreads}
              onResize={handleResizeSidebar}
              sidebarWidth={chatSidebarWidth}
              isCollapsed={chatSidebarCollapsed}
              visibleModuleIds={visibleModuleIds}
              onTogglePin={handleTogglePinThread}
              onToggleSidebar={handleToggleSidebar}
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
                  {activeWindow === 'float' ? (
                    <div
                      className={
                        'absolute inset-0 flex flex-col items-center ' + 'justify-center p-6 bg-surface text-center'
                      }>
                      <EarthIcon className="size-12 text-semi-muted mb-4 animate-pulse" />
                      <h3 className="text-base font-semibold mb-2">Webview is Active in Float Chat</h3>
                      <p className="text-xs text-semi-muted max-w-sm mb-6">
                        The interactive webview for this AI module is currently docked in the Float Chat window.
                      </p>
                      <Button
                        onPress={() => {
                          if (selectedCard?.id) {
                            browserIpc.send.setVisible(`online-bg-${selectedCard.id}`, true);
                          }
                        }}
                        size="sm"
                        variant="primary">
                        Bring Webview Here
                      </Button>
                    </div>
                  ) : (
                    <BrowserViewPlaceholder />
                  )}
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
