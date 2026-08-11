import {Avatar, Description, Label, Link, Modal} from '@heroui/react';
import {extractGitUrl, getCacheUrl, getFallbackString} from '@lynx_common/utils';
import {isEmpty, isNil} from 'lodash-es';
import {memo, useMemo} from 'react';

import {extensionsData} from '../../plugins/extensions/loader';
import {CommonProps} from '../card/menu/about/types';
import MarkdownViewer from '../MarkdownViewer';
import TabModal from '../TabModal';

type Props = {url: string; title: string} & CommonProps;

const CardReadmeDialog = memo(({state, url, title}: Props) => {
  const ReplaceMd = useMemo(() => extensionsData.replaceMarkdownViewer, []);

  return (
    <TabModal isOpen={state.isOpen} onOpenChange={state.setOpen}>
      <Modal.CloseTrigger onPress={state.close} />
      <Modal.Header>
        <Modal.Heading className={'justify-center overflow-hidden'}>
          <div className="inline-flex items-center gap-2">
            <Avatar>
              <Avatar.Image alt={title} src={getCacheUrl(extractGitUrl(url).avatarUrl)} />
              <Avatar.Fallback>{getFallbackString(title)}</Avatar.Fallback>
            </Avatar>
            <div className="flex flex-col">
              <Label>{title}</Label>
              <Description>
                <Link href={url} className="group no-underline hover:underline">
                  {url}
                  <Link.Icon />
                </Link>
              </Description>
            </div>
          </div>
        </Modal.Heading>
      </Modal.Header>
      <Modal.Body className="p-0">
        {!isEmpty(url) &&
          (isNil(ReplaceMd) ? (
            <MarkdownViewer url={url} rounded={false} />
          ) : (
            <ReplaceMd repoPath={url} rounded={false} />
          ))}
      </Modal.Body>
    </TabModal>
  );
});

const ReadmeModal = (props: Props) => {
  const CardReadme = useMemo(() => extensionsData.replaceModals.cardReadme, []);

  if (!props.state.isOpen) return null;

  return CardReadme ? <CardReadme /> : <CardReadmeDialog {...props} />;
};

export default ReadmeModal;
