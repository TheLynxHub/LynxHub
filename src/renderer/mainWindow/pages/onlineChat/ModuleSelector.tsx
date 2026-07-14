import {Avatar, Card} from '@heroui/react';
import {getCacheUrl, getFallbackString} from '@lynx_common/utils';
import {ChatRound} from '@solar-icons/react-perf/BoldDuotone';
import {memo} from 'react';

interface ModuleSelectorProps {
  onlineCards: any[];
  onSelectCard: (card: any) => void;
}

const ModuleSelector = memo(({onlineCards, onSelectCard}: ModuleSelectorProps) => {
  return (
    <div className="flex size-full flex-col items-center justify-center p-6 gap-y-6 bg-surface-secondary">
      {onlineCards.length === 0 ? (
        <Card className="p-8 max-w-md text-center border border-border">
          <Card.Content className="flex flex-col items-center gap-4">
            <ChatRound className="size-16 text-muted opacity-60" />
            <div className="font-semibold text-lg text-foreground">No Online Modules Installed</div>
            <div className="text-sm text-muted">Install a module marked as an online background scraper to begin.</div>
          </Card.Content>
        </Card>
      ) : (
        <div className="flex flex-wrap gap-4 size-full">
          {onlineCards.map(card => {
            const avatarUrl = getCacheUrl(card.logoUrl || card.iconUrl);

            return (
              <Card
                className={
                  'hover:scale-[1.02] cursor-pointer transition-all duration-200 w-77 h-42' + ' border border-border'
                }
                key={card.id}
                onClick={() => onSelectCard(card)}>
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
});

ModuleSelector.displayName = 'ModuleSelector';

export default ModuleSelector;
