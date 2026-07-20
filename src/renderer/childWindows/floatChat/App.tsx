import ToastProviders from '@lynx/layouts/ToastProviders';

import {FloatChatArea} from './components/FloatChatArea';
import {FloatChatContextMenu} from './components/FloatChatContextMenu';
import {FloatChatHeader} from './components/FloatChatHeader';
import {FloatChatSidebar} from './components/FloatChatSidebar';
import {useFloatChat} from './hooks/useFloatChat';

export default function FloatChatApp() {
  const {
    onlineCards,
    activeCardId,
    setActiveCardId,
    inputText,
    setInputText,
    step,
    setStep,
    scrollRef,
    contentRef,
    messagesEndRef,
    chatBridgeMaxWidth,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    sidebarWidth,
    setSidebarWidth,
    searchQuery,
    setSearchQuery,
    pinnedThreads,
    collapsedProviders,
    setCollapsedProviders,
    focusedIndex,
    setFocusedIndex,
    activeCard,
    currentCardId,
    currentCard,
    moduleState,
    messages,
    chatHistory,
    isGenerating,
    isHistoryLoading,
    isLoginRequired,
    handleScroll,
    handleKeyDown,
    handleSelectThread,
    handleNewChat,
    handleTogglePin,
    handleCopyToClipboard,
    handleSaveToFile,
  } = useFloatChat();

  return (
    <FloatChatContextMenu
      messages={messages}
      currentCard={currentCard}
      setInputText={setInputText}
      currentCardId={currentCardId}
      handleNewChat={handleNewChat}
      handleSaveToFile={handleSaveToFile}
      handleCopyToClipboard={handleCopyToClipboard}>
      {handleContextMenu => (
        <div
          className={
            'flex flex-col h-screen w-screen bg-surface overflow-hidden select-none font-Nunito text-foreground'
          }
          onContextMenu={handleContextMenu}>
          {/* Header bar */}
          <FloatChatHeader
            step={step}
            setStep={setStep}
            inputText={inputText}
            activeCard={activeCard}
            currentCard={currentCard}
            onlineCards={onlineCards}
            activeCardId={activeCardId}
            setInputText={setInputText}
            currentCardId={currentCardId}
            handleKeyDown={handleKeyDown}
            isLoginRequired={isLoginRequired}
            setActiveCardId={setActiveCardId}
          />

          {/* Main Content Area */}
          <div className="flex flex-row flex-1 overflow-hidden">
            {/* Sidebar for Recents */}
            {step !== 'login' && (
              <FloatChatSidebar
                onlineCards={onlineCards}
                chatHistory={chatHistory}
                searchQuery={searchQuery}
                sidebarWidth={sidebarWidth}
                activeCardId={activeCardId}
                focusedIndex={focusedIndex}
                pinnedThreads={pinnedThreads}
                handleNewChat={handleNewChat}
                setSearchQuery={setSearchQuery}
                setSidebarWidth={setSidebarWidth}
                setFocusedIndex={setFocusedIndex}
                handleTogglePin={handleTogglePin}
                isSidebarCollapsed={isSidebarCollapsed}
                collapsedProviders={collapsedProviders}
                handleSelectThread={handleSelectThread}
                setIsSidebarCollapsed={setIsSidebarCollapsed}
                setCollapsedProviders={setCollapsedProviders}
              />
            )}

            {/* Chat History View / Webview */}
            <FloatChatArea
              step={step}
              messages={messages}
              scrollRef={scrollRef}
              contentRef={contentRef}
              moduleState={moduleState}
              currentCard={currentCard}
              isGenerating={isGenerating}
              handleScroll={handleScroll}
              currentCardId={currentCardId}
              messagesEndRef={messagesEndRef}
              isHistoryLoading={isHistoryLoading}
              chatBridgeMaxWidth={chatBridgeMaxWidth}
            />
          </div>

          <ToastProviders />
        </div>
      )}
    </FloatChatContextMenu>
  );
}
