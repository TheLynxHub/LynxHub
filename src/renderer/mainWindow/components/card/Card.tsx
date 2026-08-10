import {Card, Description, useOverlayState} from '@heroui/react';
import {extensionsData} from '@lynx/plugins/extensions/loader';
import {getAccentColorAsHex} from '@lynx/utils/accentColorGenerator';
import {extractGitUrl} from '@lynx_common/utils';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {motion} from 'framer-motion';
import {CSSProperties, memo, useMemo, useState} from 'react';

import Footer from './Footer';
import {CardHeaderContent} from './Header';
import InstallCardModal from './menu/update/installModal';
import {useCardStore} from './store';
import {useCardActions} from './useCardActions';
import {useCardOverlayState} from './useCardOverlayState';
import {useCardTitle} from './useCardTitle';

const MotionCard = motion.create(Card);

type AccentStyle = CSSProperties & {'--accent-bg-color'?: string};

/**
 * Main Card component for displaying a plugin/module.
 */
const LynxCard = memo(() => {
  const isInstalled = useCardStore(state => state.installed);
  const title = useCardStore(state => state.title);
  const repoUrl = useCardStore(state => state.repoUrl);
  const description = useCardStore(state => state.description);
  const setMenuIsOpen = useCardStore(state => state.setMenuIsOpen);
  const id = useCardStore(state => state.id);

  const installModal = useOverlayState();
  const [installModalType, setInstallModalType] = useState<'install' | 'update'>('install');

  const {startAi, install, isRunning, updating, updateAvailable, isUpdatingExtensions, updateCount} = useCardActions(
    installModal,
    setInstallModalType,
  );

  const {modifiedTitle, onTitleChange} = useCardTitle();

  // Calculate accent color based on developer name and title
  const {developer} = useMemo(() => {
    if (!repoUrl) return {developer: 'Unknown'};
    const {owner} = extractGitUrl(repoUrl);
    return {developer: owner};
  }, [repoUrl]);

  const accentColor = useMemo(() => getAccentColorAsHex(title, developer), [title, developer]);

  const accentStyle: AccentStyle = useMemo(
    () => (isInstalled ? {'--accent-bg-color': accentColor} : {}),
    [isInstalled, accentColor],
  );

  const isPressable = !isRunning && !updating && !isUpdatingExtensions;

  return (
    <>
      <MotionCard
        onClick={() => {
          if (!isPressable) return;

          AddBreadcrumb_Renderer(`Card Interaction: Clicked card "${title}"`);
          if (isInstalled) startAi();
          else install();
        }}
        className={
          'relative h-46 w-75 border border-surface/50 transition-all duration-200 overflow-hidden ' +
          `group hover:scale-[1.02] hover:shadow-lg ${isPressable && 'cursor-pointer'}`
        }
        whileHover="hover"
        onContextMenu={() => setMenuIsOpen(true)}>
        <div
          className={
            'absolute inset-0 z-0 scale-150 transition-opacity duration-300 opacity-[0.09]' +
            ' group-hover:opacity-[0.14] ' +
            (isInstalled ? 'bg-installed' : 'bg-uninstalled')
          }
          style={accentStyle}
        />

        {extensionsData.cards.customize.header ? (
          <extensionsData.cards.customize.header
            useCardStore={useCardStore}
            useCardOverlayState={useCardOverlayState}
          />
        ) : (
          <CardHeaderContent
            modifiedTitle={modifiedTitle}
            onTitleChange={onTitleChange}
            updateAvailable={updateAvailable}
          />
        )}

        {extensionsData.cards.customize.body ? (
          <extensionsData.cards.customize.body useCardStore={useCardStore} useCardOverlayState={useCardOverlayState} />
        ) : (
          <Card.Content>
            <Description className="line-clamp-3 text-xs">{description}</Description>
          </Card.Content>
        )}

        {extensionsData.cards.customize.footer ? (
          <extensionsData.cards.customize.footer
            useCardStore={useCardStore}
            useCardOverlayState={useCardOverlayState}
          />
        ) : (
          <Footer
            id={id}
            updating={updating}
            state={installModal}
            isRunning={isRunning}
            updateCount={updateCount}
            setType={setInstallModalType}
            updatingExtensions={isUpdatingExtensions}
          />
        )}
      </MotionCard>

      <InstallCardModal state={installModal} type={installModalType} />
    </>
  );
});

export default LynxCard;
