import {Avatar, CardHeader, Description, Label, Spinner, Tooltip} from '@heroui/react';
import {extractGitUrl, getCacheUrl, getFallbackString} from '@lynx_common/utils';
import {ArrowDown} from '@solar-icons/react-perf/LineDuotone';
import {AnimatePresence, motion} from 'framer-motion';
import {memo, useMemo} from 'react';

import {useCardsState} from '../../redux/reducers/cards';
import {useCardStore} from './store';

type CardHeaderContentProps = {
  /** The currently displayed title (could be custom). */
  modifiedTitle: string;
  /** Callback when the title is edited. */
  onTitleChange: (target: string) => void;
  /** Whether an update is available for this card. */
  updateAvailable: boolean;
};

/**
 * Component to display the header of the card, including user info and update status.
 */
export const CardHeaderContent = memo(({modifiedTitle, onTitleChange, updateAvailable}: CardHeaderContentProps) => {
  const updateChecking = useCardsState('updateChecking');
  const repoUrl = useCardStore(state => state.repoUrl);
  const isInstalled = useCardStore(state => state.installed);
  const id = useCardStore(state => state.id);
  const isOnline = useCardStore(state => state.isOnline);
  const iconUrl = useCardStore(state => state.iconUrl);
  const logoUrl = useCardStore(state => state.logoUrl);
  const customDeveloper = useCardStore(state => state.developer);

  const {developer, avatarSrc} = useMemo(() => {
    const customIcon = iconUrl || logoUrl;
    if (isOnline) {
      return {developer: customDeveloper || 'Online', avatarSrc: customIcon || ''};
    }
    if (!repoUrl) {
      return {developer: customDeveloper || 'Local', avatarSrc: customIcon || ''};
    }
    const {owner, avatarUrl} = extractGitUrl(repoUrl);
    return {developer: customDeveloper || owner || 'Local', avatarSrc: customIcon || getCacheUrl(avatarUrl)};
  }, [repoUrl, isOnline, iconUrl, logoUrl, customDeveloper]);

  return (
    <CardHeader className="justify-between flex-row">
      <div className="inline-flex items-center gap-2">
        <Avatar className={`size-12 shrink-0 ${isInstalled && 'ring-accent ring-2'}`}>
          <Avatar.Image
            src={avatarSrc}
            alt={modifiedTitle}
            className={isInstalled ? 'p-0.5 rounded-full overflow-hidden' : ''}
          />
          <Avatar.Fallback>{getFallbackString(modifiedTitle)}</Avatar.Fallback>
        </Avatar>
        <div className="flex flex-col">
          <Label
            className={
              'cursor-text outline-none focus:border border-transparent focus:border-surface-secondary' +
              ' focus:px-1.5 focus:py-0.5 rounded-lg transition duration-200 line-clamp-1 z-20'
            }
            onBlur={e => {
              const selection = window.getSelection();
              if (selection) {
                selection.removeAllRanges();
              }
              onTitleChange(e.currentTarget.textContent);
            }}
            onKeyDown={e => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.preventDefault();
                e.currentTarget.blur();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                e.currentTarget.blur();
                // Reset title to original name
                onTitleChange('');
              }
            }}
            spellCheck="false"
            onClick={e => e.stopPropagation()}
            contentEditable
            suppressContentEditableWarning>
            {modifiedTitle}
          </Label>
          <Description>By {developer}</Description>
        </div>
      </div>

      <AnimatePresence>
        {isInstalled && updateAvailable && (
          <motion.div
            exit={{opacity: 0, translateY: 2}}
            animate={{opacity: 1, translateY: 0}}
            initial={{opacity: 0, translateY: 2}}>
            <Tooltip>
              <Tooltip.Trigger>
                <div
                  className={
                    'flex items-center justify-center size-6 rounded-full bg-success/15 text-success' +
                    ' border border-success/20 shadow-sm transition duration-200 hover:scale-105'
                  }>
                  <ArrowDown className="size-3" />
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content>Update available</Tooltip.Content>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isInstalled && updateChecking === id && (
          <motion.div
            exit={{opacity: 0, scale: 0.2}}
            animate={{opacity: 1, scale: 1}}
            initial={{opacity: 0, scale: 0.2}}
            className="absolute top-1.5 right-1.5 flex">
            <Spinner size="sm" color="success" />
          </motion.div>
        )}
      </AnimatePresence>
    </CardHeader>
  );
});
