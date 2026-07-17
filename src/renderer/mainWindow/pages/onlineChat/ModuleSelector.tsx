import {Avatar, Card, Checkbox} from '@heroui/react';
import {getCacheUrl, getFallbackString} from '@lynx_common/utils';
import {ChatRound} from '@solar-icons/react-perf/BoldDuotone';
import {memo} from 'react';

interface ModuleSelectorProps {
  onlineCards: any[];
  onSelectCard: (card: any) => void;
  bgChatEnabledCards: string[];
  onToggleBgChat: (cardId: string) => void;
}

const ModuleSelector = memo(({onlineCards, onSelectCard, bgChatEnabledCards, onToggleBgChat}: ModuleSelectorProps) => {
  return (
    <div className="flex size-full flex-col p-6 gap-y-4 bg-surface-secondary overflow-y-auto">
      <div className="text-sm font-semibold text-muted pl-1">Select Chat Mode or AI Service</div>
      <div className="flex flex-wrap gap-4">
        {onlineCards.map(card => {
          const isUniversal = card.id === 'universal';
          const avatarUrl = isUniversal ? '' : getCacheUrl(card.logoUrl || card.iconUrl);
          const isBgEnabled = bgChatEnabledCards.includes(card.id);

          return (
            <Card
              className={
                'hover:scale-[1.02] cursor-pointer transition-all duration-200 w-77 h-45 border border-border bg-card'
              }
              key={card.id}
              onClick={() => onSelectCard(card)}>
              <Card.Content className="flex flex-col h-full justify-between p-3.5">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    {isUniversal ? (
                      <div className="size-10 shrink-0 flex items-center justify-center bg-accent-soft rounded-full">
                        <ChatRound className="size-5 text-accent" />
                      </div>
                    ) : (
                      <Avatar className="size-10 shrink-0">
                        <Avatar.Image src={avatarUrl} alt={card.title} />
                        <Avatar.Fallback>{getFallbackString(card.title)}</Avatar.Fallback>
                      </Avatar>
                    )}
                    <div>
                      <div className="font-bold text-sm text-foreground leading-snug">{card.title}</div>
                      {!isUniversal && <div className="text-[10px] text-muted">{card.developer}</div>}
                    </div>
                  </div>
                  <div className="text-xs text-muted line-clamp-2 leading-relaxed">{card.description}</div>
                </div>
                {!isUniversal && (
                  <div onClick={e => e.stopPropagation()} className="flex items-center justify-between mt-2 pt-2">
                    <span className="text-[11px] font-medium text-muted">Background Scrape</span>
                    <Checkbox
                      variant="secondary"
                      isSelected={isBgEnabled}
                      id={`bg-toggle-${card.id}`}
                      onChange={() => onToggleBgChat(card.id)}
                      aria-label={`Toggle background run for ${card.title}`}>
                      <Checkbox.Content>
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                      </Checkbox.Content>
                    </Checkbox>
                  </div>
                )}
              </Card.Content>
            </Card>
          );
        })}
      </div>
    </div>
  );
});

ModuleSelector.displayName = 'ModuleSelector';

export default ModuleSelector;
