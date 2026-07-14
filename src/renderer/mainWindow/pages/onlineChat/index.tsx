import {Avatar, Button, Card, InputGroup, ScrollShadow, TextField} from '@heroui/react';
import BrowserViewPlaceholder from '@lynx/features/session/browser/BrowserViewPlaceholder';
import {useAllCardDataWithPath} from '@lynx/plugins/modules';
import {getCacheUrl, getFallbackString} from '@lynx_common/utils';
import browserIpc from '@lynx_shared/ipc/browser';
import {ChatRound, Earth} from '@solar-icons/react-perf/BoldDuotone';
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
  console.log('cc');
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
    const visible = activeTab === tabID && step === 'login';
    browserIpc.send.setVisible(tabID, visible);
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
      <div className="h-12 inset-x-0 top-0 absolute bg-surface flex pl-4 pr-2 py-1 items-center justify-between z-10">
        {step === 'select_module' ? (
          <div className="flex items-center gap-x-2">
            <ChatRound className="size-5" />
            <span className="font-bold text-foreground text-sm">Online Chat</span>
          </div>
        ) : (
          <div className="flex items-center gap-x-2">
            <Button size="sm" variant="ghost" className="shrink-0" onPress={handleBackToSelect} isIconOnly>
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
          {step === 'login' && !isPageLoaded && <span className="text-xs text-muted">Loading website...</span>}

          {step !== 'select_module' && (
            <Button
              size="sm"
              onPress={step === 'chat' ? handleShowWebpage : handleGoToChat}
              className="w-18 bg-accent-soft hover:bg-accent/30 text-accent-soft-foreground">
              {step === 'chat' ? <Earth className="size-4" /> : <ChatRound className="size-4" />}
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Render main step content
  const renderContent = () => {
    if (step === 'select_module') {
      return (
        <div className="flex size-full flex-col items-center justify-center p-6 gap-y-6 bg-surface-secondary">
          {onlineCards.length === 0 ? (
            <Card className="p-8 max-w-md text-center border border-border">
              <Card.Content className="flex flex-col items-center gap-4">
                <ChatRound className="size-16 text-muted opacity-60" />
                <div className="font-semibold text-lg text-foreground">No Online Modules Installed</div>
                <div className="text-sm text-muted">
                  Install a module marked as an online background scraper to begin.
                </div>
              </Card.Content>
            </Card>
          ) : (
            <div className="flex flex-wrap gap-4 size-full">
              {onlineCards.map(card => {
                const avatarUrl = getCacheUrl(card.logoUrl || card.iconUrl);

                return (
                  <Card
                    className={
                      'hover:scale-[1.02] cursor-pointer transition-all duration-200 w-77 h-42' +
                      ' border border-border'
                    }
                    key={card.id}
                    onClick={() => handleSelectCard(card)}>
                    <Card.Content className="flex flex-col gap-4 p-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-12 shrink-0">
                          <Avatar.Image src={avatarUrl} alt={card.title} />
                          <Avatar.Fallback>{getFallbackString(card.title)}</Avatar.Fallback>
                        </Avatar>
                        <div className="font-bold text-base text-foreground">{card.title}</div>
                      </div>
                      <div className="text-xs text-muted line-clamp-3">{card.description}</div>
                    </Card.Content>
                  </Card>
                );
              })}
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
      <div className="flex size-full flex-col overflow-hidden bg-surface">
        {/* Chat Messages */}
        <ScrollShadow className="flex-1 p-6 gap-y-4">
          {messages.length === 0 ? (
            <div className={'flex flex-col text-semi-muted items-center justify-center h-full text-center gap-y-2'}>
              <ChatRound className="size-12" />
              <div className="font-semibold">Start a new conversation</div>
              <div className="text-xs text-muted">Your chat history will sync here automatically.</div>
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
        <div className="p-4 bg-surface shrink-0">
          <TextField name="message" aria-label="Message input" className="max-w-4xl mx-auto w-full">
            <InputGroup className="p-2" variant="secondary" fullWidth>
              <InputGroup.TextArea
                rows={1}
                value={inputText}
                className="max-h-32"
                onKeyDown={handleKeyDown}
                onChange={e => setInputText(e.target.value)}
                placeholder={`Message ${selectedCard.title}...`}
              />
              <InputGroup.Suffix className="p-0.5 shrink-0 self-end">
                <Button
                  variant="primary"
                  className="shrink-0"
                  onPress={handleSendMessage}
                  isDisabled={!inputText.trim() || isSending}
                  isIconOnly>
                  <Send />
                </Button>
              </InputGroup.Suffix>
            </InputGroup>
          </TextField>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 bg-surface overflow-hidden flex flex-col">
      {renderTopBar()}
      <div className="absolute inset-0 top-12! overflow-hidden flex flex-col">{renderContent()}</div>
    </div>
  );
}
