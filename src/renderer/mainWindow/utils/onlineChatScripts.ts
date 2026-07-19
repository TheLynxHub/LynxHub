import {CardData} from '../../../common/types/plugins/modules';

export const DEFAULT_ONLINE_SCRIPTS = {
  scrapeMessages: `
    (() => {
      const userSel = {{selectors.userMessage}};
      const assistantSel = {{selectors.assistantMessage}};
      const textSel = {{selectors.messageText}};
      
      const htmlToMarkdown = (el) => {
        if (!el) return '';
        
        const walk = (node) => {
          if (node.nodeType === 3) {
            return node.nodeValue || '';
          }
          if (node.nodeType !== 1) {
            return '';
          }
          if (node.matches('.sr-only, .visually-hidden, [class*="sr-only"], [class*="visually-hidden"]')) {
            return '';
          }
          const tag = node.tagName.toLowerCase();
          
          if (tag === 'pre') {
            const codeEl = node.querySelector('code');
            if (codeEl) {
              const langClass = Array.from(codeEl.classList).find(c => c.startsWith('language-'));
              const lang = langClass ? langClass.replace('language-', '') : '';
              return '\\\\n\`\`\`' + lang + '\\\\n' + (codeEl.textContent || '') + '\\\\n\`\`\`\\\\n';
            }
            return '\\\\n\`\`\`\\\\n' + (node.textContent || '') + '\\\\n\`\`\`\\\\n';
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
              return '\\\\n\\\\n' + children.trim() + '\\\\n\\\\n';
            }
            case 'h1': return '\\\\n\\\\n# ' + children.trim() + '\\\\n\\\\n';
            case 'h2': return '\\\\n\\\\n## ' + children.trim() + '\\\\n\\\\n';
            case 'h3': return '\\\\n\\\\n### ' + children.trim() + '\\\\n\\\\n';
            case 'h4': return '\\\\n\\\\n#### ' + children.trim() + '\\\\n\\\\n';
            case 'h5': return '\\\\n\\\\n##### ' + children.trim() + '\\\\n\\\\n';
            case 'h6': return '\\\\n\\\\n###### ' + children.trim() + '\\\\n\\\\n';
            case 'strong':
            case 'b':
              return ' **' + children.trim() + '** ';
            case 'em':
            case 'i':
              return ' *' + children.trim() + '* ';
            case 'code':
              return ' \`' + children.trim() + '\` ';
            case 'ul':
              return '\\\\n' + children + '\\\\n';
            case 'ol':
              return '\\\\n' + children + '\\\\n';
            case 'li': {
              const isOrdered = node.parentNode && node.parentNode.tagName.toLowerCase() === 'ol';
              if (isOrdered) {
                const lis = Array.from(node.parentNode.children).filter(c => c.tagName.toLowerCase() === 'li');
                const index = lis.indexOf(node) + 1;
                return '\\\\n' + index + '. ' + children.trim();
              }
              return '\\\\n- ' + children.trim();
            }
            case 'a':
              return ' [' + children.trim() + '](' + (node.getAttribute('href') || '') + ') ';
            case 'blockquote':
              return (
                '\\\\n\\\\n> ' +
                children.trim().replace(/\\\\n/g, '\\\\n> ') +
                '\\\\n\\\\n'
              );
            case 'hr':
              return '---';
            case 'br':
              return '\\\\n';
            default:
              return children;
          }
        };
        
        return walk(el)
          .replace(/\\\\n{3,}/g, '\\\\n\\\\n')
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
  `,

  scrapeHistory: `
    (() => {
      const itemSel = {{selectors.chatItem}};
      const textSel = {{selectors.chatItemText}};
      const activeSel = {{selectors.chatActiveItem}};
      
      const items = Array.from(document.querySelectorAll(itemSel));
      return items.map((el, index) => {
        const textEl = textSel ? el.querySelector(textSel) : el;
        let isActive = false;
        const href = el.getAttribute('href');
        if (href) {
          const currentPath = window.location.pathname;
          const currentHref = window.location.href;
          isActive = currentPath === href || currentHref.endsWith(href) || currentPath.endsWith(href);
        }
        if (!isActive) {
          if (activeSel) {
            isActive = el.matches(activeSel) || el.closest(activeSel) !== null;
          } else {
            isActive = el.getAttribute('aria-current') === 'page' || 
                       el.classList.contains('active') ||
                       el.getAttribute('aria-selected') === 'true' ||
                       Array.from(el.classList).some(cls => cls.includes('active') || cls.includes('selected'));
          }
        }
        return {
          index,
          title: textEl ? textEl.textContent.trim() : '',
          active: isActive
        };
      });
    })()
  `,

  sendMessage: `
    (() => {
      const inputSel = {{selectors.input}};
      const sendButtonSel = {{selectors.sendButton}};
      const inputEl = document.querySelector(inputSel);
      if (!inputEl) return false;
      
      inputEl.focus();
      
      if (inputEl.tagName === 'INPUT' || inputEl.tagName === 'TEXTAREA') {
        const valueSetter = Object.getOwnPropertyDescriptor(inputEl.constructor.prototype, 'value') ||
                            Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value') ||
                            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
        if (valueSetter && valueSetter.set) {
          valueSetter.set.call(inputEl, {{messageText}});
        } else {
          inputEl.value = {{messageText}};
        }
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        try {
          inputEl.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('delete', false, null);
          document.execCommand('insertText', false, {{messageText}});
        } catch (e) {
          inputEl.innerHTML = {{messageText}};
        }
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
  `,

  selectThread: `
    (() => {
      const itemSel = {{selectors.chatItem}};
      const items = Array.from(document.querySelectorAll(itemSel));
      const item = items[{{index}}];
      if (item) {
        item.click();
        return true;
      }
      return false;
    })()
  `,

  newChat: `
    (() => {
      const rawVal = {{newChat.value}};
      const selectors = rawVal.split(',').map(s => s.trim());
      for (const selector of selectors) {
        const btn = document.querySelector(selector);
        if (btn) {
          btn.click();
          return true;
        }
      }
      return false;
    })()
  `,
};

export function resolveOnlineScript(
  type: keyof typeof DEFAULT_ONLINE_SCRIPTS,
  card: CardData,
  context: {
    messageText?: string;
    index?: number | null;
  } = {},
): string {
  const onlineConfig = card.onlineConfig;
  const customScript = onlineConfig?.scripts?.[type];
  const template = customScript !== undefined ? customScript : DEFAULT_ONLINE_SCRIPTS[type];

  let resolved = template;

  if (onlineConfig) {
    const {selectors, newChat} = onlineConfig;
    if (selectors) {
      resolved = resolved.replace(/\{\{selectors\}\}/g, JSON.stringify(selectors));
      resolved = resolved.replace(/\{\{selectors\.input\}\}/g, JSON.stringify(selectors.input));
      resolved = resolved.replace(/\{\{selectors\.sendButton\}\}/g, JSON.stringify(selectors.sendButton || ''));
      resolved = resolved.replace(/\{\{selectors\.userMessage\}\}/g, JSON.stringify(selectors.userMessage));
      resolved = resolved.replace(/\{\{selectors\.assistantMessage\}\}/g, JSON.stringify(selectors.assistantMessage));
      resolved = resolved.replace(/\{\{selectors\.messageText\}\}/g, JSON.stringify(selectors.messageText));
      resolved = resolved.replace(/\{\{selectors\.chatItem\}\}/g, JSON.stringify(selectors.chatItem || ''));
      resolved = resolved.replace(/\{\{selectors\.chatItemText\}\}/g, JSON.stringify(selectors.chatItemText || ''));
      resolved = resolved.replace(/\{\{selectors\.chatActiveItem\}\}/g, JSON.stringify(selectors.chatActiveItem || ''));
    }
    if (newChat) {
      resolved = resolved.replace(/\{\{newChat\}\}/g, JSON.stringify(newChat));
      resolved = resolved.replace(/\{\{newChat\.value\}\}/g, JSON.stringify(newChat.value));
    }
  }

  if (context.messageText !== undefined) {
    resolved = resolved.replace(/\{\{messageText\}\}/g, JSON.stringify(context.messageText));
  }

  if (context.index !== undefined && context.index !== null) {
    resolved = resolved.replace(/\{\{index\}\}/g, String(context.index));
  }

  return resolved;
}
