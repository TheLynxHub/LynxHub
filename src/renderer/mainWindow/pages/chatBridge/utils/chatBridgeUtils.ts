export interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

export function markdownToPlainText(markdown: string): string {
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

export function formatChatToMarkdown(messages: Message[], cardTitle?: string): string {
  const title = cardTitle || 'AI';
  const header = `# Chat with ${title}\n\n`;
  const body = messages
    .map(msg => {
      const sender = msg.sender === 'user' ? 'User' : title;
      return `**${sender}**:\n${msg.text}`;
    })
    .join('\n\n---\n\n');
  return header + body;
}

export function formatChatToPlainText(messages: Message[], cardTitle?: string): string {
  const title = cardTitle || 'AI';
  const header = `Chat with ${title}\n\n`;
  const body = messages
    .map(msg => {
      const sender = msg.sender === 'user' ? 'User' : title;
      const plainText = markdownToPlainText(msg.text);
      return `${sender}:\n${plainText}`;
    })
    .join('\n\n' + '-'.repeat(50) + '\n\n');
  return header + body;
}
