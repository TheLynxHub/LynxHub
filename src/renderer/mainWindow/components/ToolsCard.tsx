import {Avatar, Button, Card, Description, Label} from '@heroui/react';
import {useIsPinnedCard} from '@lynx/utils/hooks';
import {getFallbackString} from '@lynx_common/utils';
import {storageUtilsIpc} from '@lynx_shared/ipc/storage';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {PinIcon} from '@solar-icons/react/bold';
import {PinIcon as PinLine} from '@solar-icons/react/line-duotone';
import {ReactNode} from 'react';

type Props = {
  id?: string;
  title: string;
  description: string;
  icon: string | ReactNode;
  onPress?: () => void;
  footer?: ReactNode;
  avatarClassName?: string;
};

/**
 * A card component for the Tools page, featuring a spotlight effect and hover animations.
 */
export function ToolsCard({id, title, description, icon, onPress, footer, avatarClassName}: Props) {
  const isPinned = useIsPinnedCard(id || '');

  return (
    <Card
      className={
        `w-75 h-46 relative group transform border border-surface ` +
        ' hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer'
      }
      onClick={() => {
        AddBreadcrumb_Renderer(`Card Interaction: Clicked ToolsCard "${title}"`);
        if (id) {
          storageUtilsIpc.invoke.recentlyUsedCards('update', id);
        }
        onPress?.();
      }}>
      <Card.Header>
        <div className="inline-flex items-center gap-2">
          {typeof icon === 'string' ? (
            <Avatar className={`size-12 shrink-0 ring-LynxPurple ring-2 ${avatarClassName}`}>
              <Avatar.Image src={icon} alt={title} />
              <Avatar.Fallback>{getFallbackString(title)}</Avatar.Fallback>
            </Avatar>
          ) : (
            <div
              className={
                `size-12 rounded-full ring-2 ring-LynxPurple flex items-center` + ` justify-center  ${avatarClassName}`
              }>
              {icon}
            </div>
          )}
          <div className="flex flex-col pointer-events-none">
            <Label>{title}</Label>
          </div>
        </div>
      </Card.Header>
      <Card.Content>
        <Description className="line-clamp-3 text-xs">{description}</Description>
      </Card.Content>

      <Card.Footer className="justify-between flex items-center">
        {id ? (
          <div onClick={e => e.stopPropagation()} className="flex items-center gap-x-2">
            <Button
              className={
                `shrink-0 -translate-x-2 opacity-0 transition duration-200 ` +
                `group-hover:translate-x-0 group-hover:opacity-100`
              }
              onPress={() => {
                AddBreadcrumb_Renderer(`Pin ToolsCard: id:${id} , ${isPinned ? 'remove' : 'add'}`);
                storageUtilsIpc.invoke.pinnedCards(isPinned ? 'remove' : 'add', id);
              }}
              size="sm"
              variant="ghost"
              isIconOnly>
              {isPinned ? <PinIcon className="size-3" /> : <PinLine className="size-3" />}
            </Button>
          </div>
        ) : (
          <div />
        )}
        {footer}
      </Card.Footer>
    </Card>
  );
}
