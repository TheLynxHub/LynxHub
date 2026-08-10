import {Avatar, Description, Label, Link, Modal} from '@heroui/react';
import {CardInfoDescriptions} from '@lynx_common/types/plugins/modules';
import {extractGitUrl, getCacheUrl, getFallbackString, validateGitRepoUrl} from '@lynx_common/utils';
import {useDebounceBreadcrumb} from '@lynx_shared/sentry/Breadcrumbs';
import {InboxIcon} from '@solar-icons/react/bold-duotone';
import {isEmpty, startCase} from 'lodash-es';
import {useEffect, useMemo, useState} from 'react';

import {extensionsData} from '../../../../../plugins/extensions/loader';
import {useInstalledCard} from '../../../../../utils/hooks';
import EmptyStateCard from '../../../../EmptyStateCard';
import TabModal from '../../../../TabModal';
import {useCardStore} from '../../../store';
import {CommonProps} from '../types';
import CardInfoDescription from './Description';
import useCardInfoApi from './useCardInfoApi';

const CardInfoModalContent = ({state}: CommonProps) => {
  const cardId = useCardStore(st => st.id);
  const url = useCardStore(st => st.repoUrl);

  const webUI = useInstalledCard(cardId);

  const [openFolders, setOpenFolders] = useState<string[] | undefined>(undefined);
  const [cardInfoDescriptions, setCardInfoDescriptions] = useState<CardInfoDescriptions>(undefined);

  useEffect(() => {
    if (!state.isOpen) {
      setOpenFolders(undefined);
      setCardInfoDescriptions(undefined);
    }
  }, [state.isOpen]);

  const {avatarUrl, devName} = useMemo(() => {
    return {avatarUrl: getCacheUrl(extractGitUrl(url).avatarUrl), devName: extractGitUrl(url).owner};
  }, [url]);

  useDebounceBreadcrumb('Card Info Modal: ', [state.isOpen, cardId]);

  useCardInfoApi(cardId, setOpenFolders, setCardInfoDescriptions, webUI?.dir);

  return (
    <TabModal size="lg" isOpen={state.isOpen} onOpenChange={state.setOpen} dialogClassName="w-3xl! max-w-3xl!">
      <Modal.CloseTrigger />
      <Modal.Header>
        <Modal.Heading>
          {validateGitRepoUrl(url) && avatarUrl && (
            <div className="inline-flex items-center gap-2">
              <Avatar>
                <Avatar.Image alt={startCase(devName)} src={getCacheUrl(extractGitUrl(url).avatarUrl)} />
                <Avatar.Fallback>{getFallbackString(devName)}</Avatar.Fallback>
              </Avatar>
              <div className="flex flex-col">
                <Label>{startCase(devName)}</Label>
                <Description>
                  <Link href={url} className="group no-underline hover:underline">
                    {url}
                    <Link.Icon />
                  </Link>
                </Description>
              </div>
            </div>
          )}
        </Modal.Heading>
      </Modal.Header>
      <Modal.Body className="scrollbar-hide">
        {isEmpty(openFolders) && isEmpty(cardInfoDescriptions) ? (
          <EmptyStateCard
            bodyClassName="my-6"
            icon={<InboxIcon size={40} />}
            className="bg-surface-secondary"
            title="No data available to display!"
          />
        ) : (
          <CardInfoDescription folders={openFolders} descriptions={cardInfoDescriptions} />
        )}
      </Modal.Body>
    </TabModal>
  );
};

const CardInfoModal = ({state}: CommonProps) => {
  const CardInfo = useMemo(() => extensionsData.replaceModals.cardInfo, []);

  if (!state.isOpen) return null;

  return CardInfo ? <CardInfo /> : <CardInfoModalContent state={state} />;
};

export default CardInfoModal;
