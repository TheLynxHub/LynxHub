import {Accordion, buttonVariants, Card, Chip, Link, ScrollShadow, Separator} from '@heroui/react';
import {APP_BUILD_NUMBER, APP_VERSION, RELEASES_PAGE} from '@lynx_common/consts';
import {AppUpdateInfo} from '@lynx_common/types';
import {ShieldCrossIcon} from '@solar-icons/react/bold-duotone';
import {AltArrowDownIcon, ArrowRightIcon} from '@solar-icons/react/linear';
import {isEmpty} from 'lodash-es';

import {RenderSubItems} from '../../../utils/hooks';
import DescriptionGrid from '../../DescriptionGrid';
import EmptyStateCard from '../../EmptyStateCard';
import {ReleaseNote} from './useUpdateApp';

type Props = {
  releaseNotes: ReleaseNote[];
  updateInfo: Omit<AppUpdateInfo, 'earlyAccess'> | undefined;
};

/** Information and release notes about update */
export default function Info({updateInfo, releaseNotes}: Props) {
  return (
    <div className="flex w-full flex-col items-center gap-4 size-full">
      <DescriptionGrid
        items={[
          {
            key: 'version',
            label: 'Version',
            content: (
              <div className="flex justify-center items-center gap-x-2">
                <span>{APP_VERSION}</span>
                <ArrowRightIcon />
                <span className="text-success font-semibold">{updateInfo?.currentVersion}</span>
              </div>
            ),
          },
          {
            key: 'buildNumber',
            label: 'Build Number',
            content: (
              <div className="flex justify-center items-center gap-x-2">
                <span>{APP_BUILD_NUMBER}</span>
                <ArrowRightIcon />
                <span className="text-success font-semibold">{updateInfo?.currentBuild}</span>
              </div>
            ),
          },
          {
            key: 'releaseDate',
            label: 'Release Date',
            content: <span className="text-success font-semibold">{updateInfo?.releaseDate}</span>,
          },
        ]}
        columns={3}
      />

      <Card variant="secondary" className="size-full">
        <Card.Header className="flex-row items-center gap-x-2">
          Release Notes
          <Chip size="sm">{releaseNotes.length}</Chip>
        </Card.Header>
        <Card.Content className="size-full pb-8 pt-2">
          <ScrollShadow className="size-full pr-4 pl-2">
            {isEmpty(releaseNotes) ? (
              <EmptyStateCard
                action={
                  <Link onPress={() => window.open(RELEASES_PAGE)} className={buttonVariants({variant: 'secondary'})}>
                    Releases Page
                    <Link.Icon />
                  </Link>
                }
                className="size-full"
                title="Failed to fetch release notes"
                icon={<ShieldCrossIcon className="size-14 text-warning-soft-foreground" />}
              />
            ) : (
              <Accordion
                variant="surface"
                className="w-full"
                onExpandedChange={console.log}
                defaultExpandedKeys={[releaseNotes[0].version]}>
                {releaseNotes.map((note, index) => (
                  <Accordion.Item id={note.version} key={note.version}>
                    <Accordion.Heading>
                      <Accordion.Trigger>
                        <span className="shrink-0 text-muted">Version {note.version}</span>
                        <Accordion.Indicator>
                          <AltArrowDownIcon />
                        </Accordion.Indicator>
                      </Accordion.Trigger>
                    </Accordion.Heading>
                    <Accordion.Panel>
                      <Accordion.Body>
                        <div className="flex flex-col gap-4">
                          {note.changes.map((change, changeIndex) => (
                            <div
                              key={changeIndex}
                              className="flex flex-col gap-2 bg-surface-secondary/50 p-3 rounded-3xl">
                              <div className={'w-full pb-1 text-sm font-bold text-foreground'}>
                                {change.title}
                                <Separator className="mt-1" variant="default" />
                              </div>
                              <ul className="list-disc pl-4 text-sm text-muted">
                                {RenderSubItems(change.items, `section_${index}_${changeIndex}`)}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </Accordion.Body>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            )}
          </ScrollShadow>
        </Card.Content>
      </Card>
    </div>
  );
}
