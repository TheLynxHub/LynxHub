import {Button, Card, ScrollShadow, TextArea} from '@heroui/react';
import BrowserViewPlaceholder from '@lynx/features/session/browser/BrowserViewPlaceholder';
import {useAllCardDataWithPath} from '@lynx/plugins/modules';
import browserIpc from '@lynx_shared/ipc/browser';
import {ChatRound, ChatSquare, Earth} from '@solar-icons/react-perf/BoldDuotone';
import {AltArrowLeft} from '@solar-icons/react-perf/Linear';
import {Send} from 'lucide-react';
import {KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import {useTabsState} from '../../redux/reducers/tabs';

type ChatStep = 'select_module' | 'login' | 'chat';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

interface Props {
  tabID?: string;
}

export default function OnlineChatPage({tabID = 'online-chat'}: Props) {
  const activeTab = useTabsState('activeTab');
  const allCards = useAllCardDataWithPath();

  const onlineCards = useMemo(() => allCards.filter(card => card.isOnline), [allCards]);

  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [step, setStep] = useState<ChatStep>('select_module');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesCount = useRef<number>(0);

  // Scroll to bottom for new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
  }, []);

  useEffect(() => {
    if (messages.length > prevMessagesCount.current) {
      scrollToBottom();
    }
    prevMessagesCount.current = messages.length;
  }, [messages, scrollToBottom]);

  // Clean up browser if unmounting page
  useEffect(() => {
    browserIpc.send.setVisible(tabID, activeTab === tabID);
  }, [tabID, activeTab]);

  const handleSelectCard = useCallback(
    (card: any) => {
      setSelectedCard(card);
      setStep('login');
      setIsPageLoaded(false);

      // Initialize browser view
      browserIpc.send.createBrowser(tabID);
      browserIpc.send.loadURL(tabID, card.onlineConfig.url);
      browserIpc.send.setVisible(tabID, true);
    },
    [tabID],
  );

  // Auto-select card if tab ID contains a card identifier
  useEffect(() => {
    if (tabID.startsWith('online-chat-')) {
      const cardId = tabID.replace('online-chat-', '');
      const foundCard = onlineCards.find(c => c.id === cardId);
      if (foundCard && (!selectedCard || selectedCard.id !== cardId)) {
        handleSelectCard(foundCard);
      }
    }
  }, [tabID, onlineCards, selectedCard, handleSelectCard]);

  const handleBackToSelect = () => {
    browserIpc.send.removeBrowser(tabID);
    setSelectedCard(null);
    setStep('select_module');
    setMessages([]);
  };

  // Dynamic DOM scraping function
  const scrapeMessages = useCallback(async () => {
    if (!selectedCard || !selectedCard.onlineConfig) return;
    const {selectors} = selectedCard.onlineConfig;

    const script = `
      (() => {
        const userSel = ${JSON.stringify(selectors.userMessage)};
        const assistantSel = ${JSON.stringify(selectors.assistantMessage)};
        const textSel = ${JSON.stringify(selectors.messageText)};
        
        const elements = Array.from(document.querySelectorAll(\`\${userSel}, \${assistantSel}\`));
        return elements.map(el => {
          const isUser = el.matches(userSel) || el.closest(userSel) !== null;
          const textEl = textSel ? el.querySelector(textSel) : el;
          return {
            sender: isUser ? 'user' : 'assistant',
            text: textEl ? textEl.innerText || textEl.textContent : el.innerText
          };
        });
      })()
    `;

    try {
      const res = await browserIpc.invoke.executeJavaScript(tabID, script);
      if (Array.isArray(res)) {
        // Simple sanity check of contents
        const validMsgs: Message[] = res
          .map((m: any) => ({
            sender: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
            text: String(m.text || '').trim(),
          }))
          .filter(m => m.text.length > 0);

        setMessages(validMsgs);
      }
    } catch (err) {
      console.error('Failed to scrape background page:', err);
    }
  }, [selectedCard, tabID]);

  const handleGoToChat = () => {
    browserIpc.send.setVisible(tabID, false);
    setStep('chat');
    // Run initial scrape immediately
    scrapeMessages();
  };

  const handleShowWebpage = () => {
    setStep('login');
    browserIpc.send.setVisible(tabID, true);
  };

  // Monitor loading state of the browser page
  useEffect(() => {
    const offLoading = browserIpc.on.loading((id, isLoading) => {
      if (id === tabID && !isLoading) {
        setIsPageLoaded(true);
      }
    });

    const offDomReady = browserIpc.on.domReady((id, isReady) => {
      if (id === tabID && isReady) {
        setIsPageLoaded(true);
      }
    });

    return () => {
      offLoading();
      offDomReady();
    };
  }, [tabID]);

  // Polling hook when in chat mode
  useEffect(() => {
    if (step !== 'chat' || !selectedCard) return;

    // Start interval
    const interval = setInterval(scrapeMessages, 1000);

    return () => clearInterval(interval);
  }, [step, selectedCard, scrapeMessages]);

  // Send message using JS injection
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || isSending || !selectedCard) return;
    const messageToSend = inputText;
    setInputText('');
    setIsSending(true);

    // Optimistically add message locally to feel faster
    setMessages(prev => [...prev, {sender: 'user', text: messageToSend}]);

    const {selectors} = selectedCard.onlineConfig;
    const escapedMessage = messageToSend.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

    const script = `
      (() => {
        const inputSel = ${JSON.stringify(selectors.input)};
        const sendButtonSel = ${JSON.stringify(selectors.sendButton)};
        const inputEl = document.querySelector(inputSel);
        if (!inputEl) return false;
        
        inputEl.focus();
        
        if (inputEl.tagName === 'INPUT' || inputEl.tagName === 'TEXTAREA') {
          const valueSetter = Object.getOwnPropertyDescriptor(inputEl.constructor.prototype, 'value') ||
                              Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value') ||
                              Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
          if (valueSetter && valueSetter.set) {
            valueSetter.set.call(inputEl, \`\${${JSON.stringify(escapedMessage)}}\`);
          } else {
            inputEl.value = \`\${${JSON.stringify(escapedMessage)}}\`;
          }
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          inputEl.innerHTML = \`\${${JSON.stringify(escapedMessage)}}\`;
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        setTimeout(() => {
          const sendBtn = document.querySelector(sendButtonSel);
          if (sendBtn) {
            sendBtn.click();
          } else {
            const enterEvent = new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              bubbles: true,
              cancelable: true
            });
            inputEl.dispatchEvent(enterEvent);
          }
        }, 150);
        return true;
      })()
    `;

    try {
      await browserIpc.invoke.executeJavaScript(tabID, script);
      // Wait a short moment and then pull updates immediately
      setTimeout(scrapeMessages, 600);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, selectedCard, scrapeMessages, tabID]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Render TopBar
  const renderTopBar = () => {
    return (
      <div
        className={
          'h-12 inset-x-0 top-0 absolute bg-white dark:bg-LynxNearBlack ' +
          'flex flex-row px-4 py-1 items-center justify-between shadow-sm z-10'
        }>
        {step === 'select_module' ? (
          <div className="flex items-center gap-x-2">
            <ChatSquare className="size-5 text-accent" />
            <span className="font-bold text-foreground text-sm">Online Chat</span>
          </div>
        ) : (
          <div className="flex items-center gap-x-2">
            <Button size="sm" variant="ghost" className="min-w-8 p-0 h-8" onPress={handleBackToSelect}>
              <AltArrowLeft className="size-5" />
            </Button>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2 leading-none">
                <span className="font-bold text-foreground text-sm">{selectedCard.title}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          {step === 'login' && !isPageLoaded && <span className="text-xs text-default-400">Loading website...</span>}

          <Button
            size="sm"
            onPress={step === 'chat' ? handleShowWebpage : handleGoToChat}
            className="w-18 bg-accent-soft hover:bg-accent/30 text-accent-soft-foreground">
            {step === 'chat' ? <Earth className="size-4" /> : <ChatRound className="size-4" />}
          </Button>
        </div>
      </div>
    );
  };

  // Render main step content
  const renderContent = () => {
    if (step === 'select_module') {
      return (
        <div className="flex size-full flex-col items-center justify-center p-6 gap-y-6 bg-surface-secondary">
          <div className="text-center space-y-2 mb-4">
            <h2 className="text-3xl font-bold font-Nunito text-foreground">Select an Online AI Service</h2>
            <p className="text-default-500 max-w-md text-sm">
              Choose a web-based AI assistant. You will log in once via the page tab, then switch to a clean custom
              interface.
            </p>
          </div>

          {onlineCards.length === 0 ? (
            <Card className="p-8 max-w-md text-center border border-border">
              <Card.Content className="flex flex-col items-center gap-4">
                <ChatSquare className="size-16 text-default-400 opacity-60" />
                <div className="font-semibold text-lg text-foreground">No Online Modules Installed</div>
                <div className="text-sm text-default-500">
                  Install a module marked as an online background scraper to begin.
                </div>
              </Card.Content>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
              {onlineCards.map(card => (
                <Card
                  key={card.id}
                  onClick={() => handleSelectCard(card)}
                  className="hover:scale-[1.02] cursor-pointer transition-all duration-200">
                  <Card.Content className="flex flex-col gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                        <ChatSquare className="size-6" />
                      </div>
                      <div className="font-bold text-lg text-foreground">{card.title}</div>
                    </div>
                    <div className="text-sm text-default-500 line-clamp-2">{card.description}</div>
                  </Card.Content>
                </Card>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (step === 'login') {
      return (
        <div className="flex size-full flex-col overflow-hidden bg-white">
          <div className="flex-1 relative w-full bg-white">
            <BrowserViewPlaceholder />
          </div>
        </div>
      );
    }

    // step === 'chat'
    return (
      <div className="flex size-full flex-col overflow-hidden bg-white dark:bg-LynxNearBlack">
        {/* Chat Messages */}
        <ScrollShadow className="flex-1 p-6 space-y-4 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-50 py-12">
              <ChatSquare className="size-12 text-default-400" />
              <div className="font-semibold">Start a new conversation</div>
              <div className="text-xs text-default-500">Your chat history will sync here automatically.</div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => {
                const isUser = msg.sender === 'user';
                return (
                  <div key={index} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-3xl px-4 py-3 shadow-surface border text-sm ${
                        isUser
                          ? 'bg-accent/10 border-accent/25 rounded-tr-sm'
                          : 'bg-surface border-border rounded-tl-sm'
                      } transition-all duration-200`}>
                      <div className="prose dark:prose-invert max-w-none text-sm wrap-break-word leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div ref={messagesEndRef} />
        </ScrollShadow>

        {/* Message Input Box */}
        <div className="border-t border-border p-4 bg-white dark:bg-LynxNearBlack shrink-0">
          <div
            className={
              'max-w-4xl mx-auto flex items-end gap-3 bg-surface-secondary border border-border rounded-2xl' +
              ' p-2 focus-within:border-accent/50 transition-colors duration-200'
            }>
            <TextArea
              className={
                'flex-1 max-h-32 min-h-10 outline-none border-none bg-transparent py-2 px-3 text-sm' +
                ' text-foreground placeholder-default-400 resize-none overflow-y-auto scrollbar-hide' +
                ' font-Nunito shadow-none focus:bg-transparent hover:bg-transparent focus:border-none'
              }
              rows={1}
              value={inputText}
              onKeyDown={handleKeyDown}
              onChange={e => setInputText(e.target.value)}
              placeholder={`Message ${selectedCard.title}...`}
            />
            <Button
              variant="primary"
              className="shrink-0"
              onPress={handleSendMessage}
              isDisabled={!inputText.trim() || isSending}
              isIconOnly>
              <Send />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 bg-white dark:bg-LynxNearBlack overflow-hidden flex flex-col">
      {renderTopBar()}
      <div className="absolute inset-0 top-12! overflow-hidden flex flex-col">{renderContent()}</div>
    </div>
  );
}
