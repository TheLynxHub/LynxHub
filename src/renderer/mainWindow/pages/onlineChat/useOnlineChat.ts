import {useAllCardDataWithPath} from '@lynx/plugins/modules';
import browserIpc from '@lynx_shared/ipc/browser';
import filesIpc from '@lynx_shared/ipc/files';
import {useCallback, useEffect, useMemo, useState} from 'react';

import {topToast} from '../../layouts/ToastProviders';
import {useTabsState} from '../../redux/reducers/tabs';

export type ChatStep = 'select_module' | 'login' | 'chat';

export interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, block => block.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, ''))
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/([*_])(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatChatToMarkdown(messages: Message[], cardTitle: string): string {
  const header = `# Chat with ${cardTitle}\n\n`;
  const body = messages
    .map(msg => {
      const sender = msg.sender === 'user' ? 'User' : cardTitle || 'Assistant';
      return `**${sender}**:\n${msg.text}`;
    })
    .join('\n\n---\n\n');
  return header + body;
}

function formatChatToPlainText(messages: Message[], cardTitle: string): string {
  const header = `Chat with ${cardTitle}\n\n`;
  const body = messages
    .map(msg => {
      const sender = msg.sender === 'user' ? 'User' : cardTitle || 'Assistant';
      const plainText = markdownToPlainText(msg.text);
      return `${sender}:\n${plainText}`;
    })
    .join('\n\n' + '-'.repeat(50) + '\n\n');
  return header + body;
}

export function useOnlineChat(tabID = 'online-chat') {
  const activeTab = useTabsState('activeTab');
  const allCards = useAllCardDataWithPath();

  const onlineCards = useMemo(() => allCards.filter(card => card.isOnline), [allCards]);

  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [step, setStep] = useState<ChatStep>('select_module');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  // Clean up browser if unmounting page
  useEffect(() => {
    const visible = activeTab === tabID && step === 'login';
    browserIpc.send.setVisible(tabID, visible);
  }, [tabID, activeTab, step]);

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

  const handleBackToSelect = useCallback(() => {
    browserIpc.send.removeBrowser(tabID);
    setSelectedCard(null);
    setStep('select_module');
    setMessages([]);
  }, [tabID]);

  // Dynamic DOM scraping function
  const scrapeMessages = useCallback(async () => {
    if (!selectedCard || !selectedCard.onlineConfig) return;
    const {selectors} = selectedCard.onlineConfig;

    const script = `
      (() => {
        const userSel = ${JSON.stringify(selectors.userMessage)};
        const assistantSel = ${JSON.stringify(selectors.assistantMessage)};
        const textSel = ${JSON.stringify(selectors.messageText)};
        
        const htmlToMarkdown = (el) => {
          if (!el) return '';
          
          const walk = (node) => {
            if (node.nodeType === 3) {
              return node.nodeValue || '';
            }
            if (node.nodeType !== 1) {
              return '';
            }
            const tag = node.tagName.toLowerCase();
            
            // Handle code blocks specially to avoid grabbing extra copy-button text
            if (tag === 'pre') {
              const codeEl = node.querySelector('code');
              if (codeEl) {
                const langClass = Array.from(codeEl.classList).find(c => c.startsWith('language-'));
                const lang = langClass ? langClass.replace('language-', '') : '';
                return '\\n\`\`\`' + lang + '\\n' + (codeEl.textContent || '') + '\\n\`\`\`\\n';
              }
              return '\\n\`\`\`\\n' + (node.textContent || '') + '\\n\`\`\`\\n';
            }
            
            let children = '';
            for (let i = 0; i < node.childNodes.length; i++) {
              const child = node.childNodes[i];
              if ((tag === 'ul' || tag === 'ol') && child.nodeType === 3 && !child.nodeValue.trim()) {
                continue;
              }
              children += walk(child);
            }
            
            switch (tag) {
              case 'p': {
                let isInsideLi = false;
                let pNode = node.parentNode;
                while (pNode) {
                  if (pNode.tagName && pNode.tagName.toLowerCase() === 'li') {
                    isInsideLi = true;
                    break;
                  }
                  pNode = pNode.parentNode;
                }
                if (isInsideLi) {
                  return children.trim();
                }
                return '\\n\\n' + children.trim() + '\\n\\n';
              }
              case 'h1': return '\\n\\n# ' + children.trim() + '\\n\\n';
              case 'h2': return '\\n\\n## ' + children.trim() + '\\n\\n';
              case 'h3': return '\\n\\n### ' + children.trim() + '\\n\\n';
              case 'h4': return '\\n\\n#### ' + children.trim() + '\\n\\n';
              case 'h5': return '\\n\\n##### ' + children.trim() + '\\n\\n';
              case 'h6': return '\\n\\n###### ' + children.trim() + '\\n\\n';
              case 'strong':
              case 'b':
                return ' **' + children.trim() + '** ';
              case 'em':
              case 'i':
                return ' *' + children.trim() + '* ';
              case 'code':
                return ' \`' + children.trim() + '\` ';
              case 'ul':
                return '\\n' + children + '\\n';
              case 'ol':
                return '\\n' + children + '\\n';
              case 'li': {
                const isOrdered = node.parentNode && node.parentNode.tagName.toLowerCase() === 'ol';
                if (isOrdered) {
                  const lis = Array.from(node.parentNode.children).filter(c => c.tagName.toLowerCase() === 'li');
                  const index = lis.indexOf(node) + 1;
                  return '\\n' + index + '. ' + children.trim();
                }
                return '\\n- ' + children.trim();
              }
              case 'a':
                return ' [' + children.trim() + '](' + (node.getAttribute('href') || '') + ') ';
              case 'blockquote':
                return (
                  '\\n\\n> ' +
                  children.trim().replace(/\\n/g, '\\n> ') +
                  '\\n\\n'
                );
              case 'hr':
                return '---';
              case 'br':
                return '\\n';
              default:
                return children;
            }
          };
          
          return walk(el)
            .replace(/\\n{3,}/g, '\\n\\n')
            .trim();
        };

        const elements = Array.from(document.querySelectorAll(\`\${userSel}, \${assistantSel}\`));
        return elements.map(el => {
          const isUser = el.matches(userSel) || el.closest(userSel) !== null;
          const textEl = textSel ? el.querySelector(textSel) : el;
          return {
            sender: isUser ? 'user' : 'assistant',
            text: htmlToMarkdown(textEl)
          };
        });
      })()
    `;

    try {
      const res = await browserIpc.invoke.executeJavaScript(tabID, script);
      if (Array.isArray(res)) {
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

  const handleGoToChat = useCallback(() => {
    browserIpc.send.setVisible(tabID, false);
    setStep('chat');
    scrapeMessages();
  }, [tabID, scrapeMessages]);

  const handleShowWebpage = useCallback(() => {
    setStep('login');
    browserIpc.send.setVisible(tabID, true);
  }, [tabID]);

  const handleRefresh = useCallback(() => {
    setIsPageLoaded(false);
    browserIpc.send.reload(tabID);
  }, [tabID]);

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

    const interval = setInterval(scrapeMessages, 1000);
    return () => clearInterval(interval);
  }, [step, selectedCard, scrapeMessages]);

  // Send message using JS injection
  const handleSendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || isSending || !selectedCard) return;
      setIsSending(true);

      // Optimistically add message locally to feel faster
      setMessages(prev => [...prev, {sender: 'user', text: messageText}]);

      const {selectors} = selectedCard.onlineConfig;
      const escapedMessage = messageText.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

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
        setTimeout(scrapeMessages, 600);
      } catch (err) {
        console.error('Failed to send message:', err);
      } finally {
        setIsSending(false);
      }
    },
    [isSending, selectedCard, scrapeMessages, tabID],
  );

  const handleCopyToClipboard = useCallback(
    async (format: 'markdown' | 'text') => {
      if (messages.length === 0) return;
      const formatted =
        format === 'markdown'
          ? formatChatToMarkdown(messages, selectedCard?.title)
          : formatChatToPlainText(messages, selectedCard?.title);
      try {
        await navigator.clipboard.writeText(formatted);
        topToast.success(`Copied chat as ${format}`, {timeout: 1500});
      } catch (err) {
        console.error('Failed to copy chat:', err);
        topToast.danger('Failed to copy chat', {timeout: 2000});
      }
    },
    [messages, selectedCard],
  );

  const handleSaveToFile = useCallback(
    async (format: 'markdown' | 'text') => {
      if (messages.length === 0) return;
      const formatted =
        format === 'markdown'
          ? formatChatToMarkdown(messages, selectedCard?.title)
          : formatChatToPlainText(messages, selectedCard?.title);

      const dateStr = new Date().toISOString().slice(0, 10);
      const cardName = selectedCard?.title?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'chat';
      const defaultFilename = `chat-${cardName}-${dateStr}.${format === 'markdown' ? 'md' : 'txt'}`;

      try {
        const result = await filesIpc.saveToFile(formatted, defaultFilename);
        if (result) {
          topToast.success('Saved chat successfully', {timeout: 1500});
        }
      } catch (err) {
        console.error('Failed to save chat:', err);
        topToast.danger('Failed to save chat', {timeout: 2000});
      }
    },
    [messages, selectedCard],
  );

  return {
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
    handleCopyToClipboard,
    handleSaveToFile,
  };
}
