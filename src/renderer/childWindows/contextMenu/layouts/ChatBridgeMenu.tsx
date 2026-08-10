import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {ChatRoundIcon, CopyIcon, EarthIcon, FileDownloadIcon, RestartIcon} from '@solar-icons/react/bold-duotone';
import {AltArrowLeftIcon} from '@solar-icons/react/line-duotone';
import {memo} from 'react';

import {useContextState} from '../redux/reducer';
import Separator from './right_click/Separator';
import {ActionButton, createActionHandler} from './right_click/Utils';

/**
 * Context menu layout specifically for the custom Chat Bridge Page.
 */
const ChatBridgeMenu = memo(function ChatBridgeMenu() {
  const {tabID, step, hasMessages, hasNewChat, selectionText} = useContextState('chatBridgeMenu');

  const triggerAction = (action: string, payload?: string) => {
    return createActionHandler(() => {
      contextMenuIpc.send.chatBridgeAction(tabID, action, payload);
    })();
  };

  const hasSelection = typeof selectionText === 'string' && selectionText.length > 0;

  return (
    <div className={'overflow-hidden px-1.5 flex flex-col gap-y-1 py-2'}>
      {/* 1. Selection Specific Actions */}
      {hasSelection && (
        <>
          <ActionButton
            title="Copy Selection"
            icon={<CopyIcon className="size-4" />}
            onPress={() => triggerAction('copy-selection', selectionText)}
          />
          <ActionButton
            title="Search Web"
            icon={<EarthIcon className="size-4" />}
            onPress={() => triggerAction('search-web', selectionText)}
          />
          <ActionButton
            title="Start New Chat with Selection"
            icon={<ChatRoundIcon className="size-4 text-accent" />}
            onPress={() => triggerAction('start-chat-with-selection', selectionText)}
          />
          <Separator />
        </>
      )}

      {/* 2. General Page Actions */}
      {step !== 'select_module' && (
        <>
          <ActionButton
            title="Reload Module"
            onPress={() => triggerAction('reload')}
            icon={<RestartIcon className="size-4" />}
          />
          {!tabID?.startsWith('chat-bridge-') && (
            <ActionButton
              title="Back to Select"
              onPress={() => triggerAction('back')}
              icon={<AltArrowLeftIcon className="size-4" />}
            />
          )}
          <ActionButton
            onPress={() => triggerAction('toggle-webpage')}
            title={step === 'chat' ? 'View Source Webpage' : 'Show Chatting'}
            icon={step === 'chat' ? <EarthIcon className="size-4" /> : <ChatRoundIcon className="size-4" />}
          />
        </>
      )}

      {/* 3. New Chat (No Selection active to avoid duplication) */}
      {step === 'chat' && hasNewChat && !hasSelection && (
        <ActionButton
          title="New Chat"
          onPress={() => triggerAction('new-chat')}
          icon={<ChatRoundIcon className="size-4 text-accent" />}
        />
      )}

      {/* 4. Chat Log Export Actions */}
      {step === 'chat' && hasMessages && (
        <>
          <Separator />
          <ActionButton
            title="Copy as Markdown"
            onPress={() => triggerAction('copy-markdown')}
            icon={<CopyIcon className="size-4 text-muted" />}
          />
          <ActionButton
            title="Copy as Plain Text"
            onPress={() => triggerAction('copy-text')}
            icon={<CopyIcon className="size-4 text-muted" />}
          />
          <ActionButton
            title="Save as Markdown (.md)"
            onPress={() => triggerAction('save-markdown')}
            icon={<FileDownloadIcon className="size-4 text-muted" />}
          />
          <ActionButton
            title="Save as Plain Text (.txt)"
            onPress={() => triggerAction('save-text')}
            icon={<FileDownloadIcon className="size-4 text-muted" />}
          />
        </>
      )}
    </div>
  );
});

export default ChatBridgeMenu;
