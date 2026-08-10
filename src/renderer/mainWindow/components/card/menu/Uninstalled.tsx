import {Button, Dropdown, useOverlayState} from '@heroui/react';
import {MenuDotsIcon} from '@solar-icons/react/bold-duotone';
import {memo} from 'react';

import ReadmeModal from '../../modals/ReadmeModal';
import {useCardStore} from '../store';
import {DuplicateMenuItem, HomePageMenuItem} from './about';

const UninstalledMenu = memo(() => {
  const menuIsOpen = useCardStore(state => state.menuIsOpen);
  const title = useCardStore(state => state.title);
  const url = useCardStore(state => state.repoUrl);
  const setMenuIsOpen = useCardStore(state => state.setMenuIsOpen);

  const readmeModal = useOverlayState();

  return (
    <>
      <Dropdown
        onOpenChange={isOpen => {
          setMenuIsOpen(isOpen);
        }}
        isOpen={menuIsOpen}>
        <Button variant="tertiary" aria-label="Open Card Menu" isIconOnly>
          <MenuDotsIcon
            className={`size-[1.3rem] ${menuIsOpen ? 'rotate-90' : 'rotate-0'} transition-all duration-500`}
          />
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu aria-label="Card Menu">
            <Dropdown.Section>
              <HomePageMenuItem state={readmeModal} />
              <DuplicateMenuItem />
            </Dropdown.Section>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      <ReadmeModal url={url} title={title} state={readmeModal} />
    </>
  );
});

export default UninstalledMenu;
