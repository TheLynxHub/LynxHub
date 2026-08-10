import {Button, Dropdown, Separator, Spinner, useOverlayState} from '@heroui/react';
import {extensionsData} from '@lynx/plugins/extensions/loader';
import {useUpdatingCard} from '@lynx/utils/hooks';
import {MenuDotsIcon} from '@solar-icons/react/bold-duotone';
import {memo, useMemo} from 'react';

import ReadmeModal from '../../modals/ReadmeModal';
import {useCardStore} from '../store';
import {useCardOverlayState} from '../useCardOverlayState';
import {AboutMenuItem, DuplicateMenuItem, HomePageMenuItem} from './about';
import CardInfoModal from './about/infoModal';
import {CommonProps} from './about/types';
import {UnAssignMenuItem, UninstallMenuItem} from './dangerZone';
import UnassignModal from './dangerZone/UnassignModal';
import UninstallModal from './dangerZone/UninstallModal';
import {ExtensionsMenuItem, LaunchConfigMenuItem, RepoConfigMenuItem} from './options';
import ExtensionsModal from './options/ExtensionsModal';
import GitManagerModal from './options/GitModal';
import LaunchConfigModal from './options/LaunchConfigModal';
import {AutoUpdateMenuItem, CheckForUpdateMenuItem, UpdateMenuItem} from './update';

export const InstalledMenu = memo(({setType, state}: {setType: (type: 'install' | 'update') => void} & CommonProps) => {
  const id = useCardStore(state => state.id);
  const title = useCardStore(state => state.title);
  const url = useCardStore(state => state.repoUrl);
  const setMenuIsOpen = useCardStore(state => state.setMenuIsOpen);
  const menuIsOpen = useCardStore(state => state.menuIsOpen);
  const addOverlayState = useCardStore(state => state.addOverlayState);

  const updating = useUpdatingCard(id);

  const {first, second, third, fourth, addModal} = useMemo(() => {
    const sections = extensionsData.cards.customize.menu.addSection;
    const addModal = extensionsData.cards.customize.menu.addModal;

    const first = sections.find(item => item.index === 0)?.components || [];
    const second = sections.find(item => item.index === 1)?.components || [];
    const third = sections.find(item => item.index === 2)?.components || [];
    const fourth = sections.find(item => item.index === 3)?.components || [];

    const modals = addModal.map(modal => {
      addOverlayState(modal.key);
      return modal.component;
    });

    return {first, second, third, fourth, addModal: modals};
  }, []);

  const readmeModal = useOverlayState();
  const infoModal = useOverlayState();
  const unassignModal = useOverlayState();
  const uninstallModal = useOverlayState();
  const launchConfigModal = useOverlayState();
  const extensionsModal = useOverlayState();
  const gitModal = useOverlayState();

  return (
    <>
      <Dropdown
        onOpenChange={isOpen => {
          setMenuIsOpen(isOpen);
        }}
        isOpen={menuIsOpen}>
        <Button variant="tertiary" isPending={updating} aria-label="Open Card Menu" isIconOnly>
          {updating ? (
            <Spinner size="sm" color="current" />
          ) : (
            <MenuDotsIcon
              className={`size-[1.3rem] ${menuIsOpen ? 'rotate-90' : 'rotate-0'} transition-all duration-500`}
            />
          )}
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu aria-label="Card Menu" shouldCloseOnSelect={false}>
            {first.map((Comp, index) => {
              return <Comp key={index} useCardStore={useCardStore} useCardOverlayState={useCardOverlayState} />;
            })}
            <Dropdown.Section>
              <LaunchConfigMenuItem state={launchConfigModal} />
              <ExtensionsMenuItem state={extensionsModal} />
              <RepoConfigMenuItem state={gitModal} />
            </Dropdown.Section>

            <Separator className="bg-surface-secondary/70" />

            {second.map((Comp, index) => {
              return <Comp key={index} useCardStore={useCardStore} useCardOverlayState={useCardOverlayState} />;
            })}
            <Dropdown.Section>
              <UpdateMenuItem state={state} setType={setType} />
              <CheckForUpdateMenuItem />
              <AutoUpdateMenuItem />
            </Dropdown.Section>

            <Separator className="bg-surface-secondary/70" />

            <Dropdown.Section>
              <Dropdown.SubmenuTrigger>
                <Dropdown.Item>
                  More
                  <Dropdown.SubmenuIndicator />
                </Dropdown.Item>
                <Dropdown.Popover className="min-h-fit">
                  <Dropdown.Menu>
                    {third.map((Comp, index) => {
                      return <Comp key={index} useCardStore={useCardStore} useCardOverlayState={useCardOverlayState} />;
                    })}
                    <Dropdown.Section key="info">
                      <AboutMenuItem state={infoModal} />
                      <HomePageMenuItem state={readmeModal} />
                    </Dropdown.Section>

                    <Separator className="bg-surface-secondary/70" />

                    <Dropdown.Section key="card_modify">
                      <DuplicateMenuItem />
                      <UnAssignMenuItem state={unassignModal} />
                      <UninstallMenuItem state={uninstallModal} />
                    </Dropdown.Section>
                    {fourth.map((Comp, index) => {
                      return <Comp key={index} useCardStore={useCardStore} useCardOverlayState={useCardOverlayState} />;
                    })}
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown.SubmenuTrigger>
            </Dropdown.Section>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      <ReadmeModal url={url} title={title} state={readmeModal} />
      <CardInfoModal state={infoModal} />
      <UnassignModal state={unassignModal} />
      <UninstallModal state={uninstallModal} />
      <LaunchConfigModal state={launchConfigModal} />
      <ExtensionsModal state={extensionsModal} />
      <GitManagerModal state={gitModal} />

      {addModal.map((Comp, index) => {
        return (
          <Comp key={`ext_modal_${index}`} useCardStore={useCardStore} useCardOverlayState={useCardOverlayState} />
        );
      })}
    </>
  );
});

export default InstalledMenu;
