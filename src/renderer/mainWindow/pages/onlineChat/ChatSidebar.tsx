import {ScrollShadow} from '@heroui/react';
import {ChatRound} from '@solar-icons/react-perf/BoldDuotone';
import {motion} from 'framer-motion';
import {memo} from 'react';

interface ChatHistoryItem {
  index: number;
  title: string;
  active: boolean;
}

interface ChatSidebarProps {
  chatHistory: ChatHistoryItem[];
  onSelectHistoryItem: (index: number) => void;
}

const ChatSidebar = memo(({chatHistory, onSelectHistoryItem}: ChatSidebarProps) => {
  return (
    <div className="w-60 h-full border-r border-border bg-surface-secondary flex flex-col shrink-0">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <ChatRound className="size-5 text-accent" />
        <span className="font-bold text-foreground text-sm">Recents</span>
      </div>
      <ScrollShadow className="flex-1 p-2 flex flex-col gap-y-1">
        {chatHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center h-40">
            <span className="text-xs text-muted">No recent chats found</span>
          </div>
        ) : (
          chatHistory.map(item => {
            const isSelected = item.active;

            return (
              <button
                className={
                  'relative w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left shrink-0 ' +
                  'transition duration-200 cursor-pointer overflow-hidden group focus-visible:outline-none'
                }
                key={item.index}
                onClick={() => onSelectHistoryItem(item.index)}>
                {isSelected && (
                  <motion.div
                    layoutId="active_chat_indicator"
                    className="absolute inset-0 bg-accent-soft z-0"
                    transition={{duration: 0.35, type: 'spring', stiffness: 380, damping: 30}}
                  />
                )}

                {!isSelected && (
                  <div
                    className={
                      'absolute inset-0 bg-foreground/5 opacity-0 ' +
                      'group-hover:opacity-100 transition-opacity duration-150 rounded-xl'
                    }
                  />
                )}

                <div className="relative z-10 flex items-center gap-2 w-full">
                  <ChatRound
                    className={`size-4 shrink-0 ${isSelected ? 'text-accent-soft-foreground' : 'text-muted'}`}
                  />
                  <span
                    className={
                      'text-xs font-medium truncate transition-colors duration-150 flex-1 ' +
                      `${isSelected ? 'text-accent-soft-foreground' : 'text-foreground'}`
                    }>
                    {item.title}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </ScrollShadow>
    </div>
  );
});

ChatSidebar.displayName = 'ChatSidebar';

export default ChatSidebar;
