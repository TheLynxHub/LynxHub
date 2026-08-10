import {Accordion, Chip, Modal, Table, UseOverlayStateReturn} from '@heroui/react';
import {AltArrowDownIcon} from '@solar-icons/react/linear';
import {isEmpty} from 'lodash-es';
import {LucideReplace, Minus, Plus} from 'lucide-react';
import {ReactNode, useCallback, useMemo} from 'react';
import {PullResult} from 'simple-git';

import DescriptionGrid from '../../DescriptionGrid';
import LynxTooltip from '../../LynxTooltip';
import TabModal from '../../TabModal';

type DetailsRow = {
  key: number;
  name: ReactNode;
  insertions: number;
  deletions: number;
}[];

type Props = {details: PullResult; title: string; state: UseOverlayStateReturn};

/**
 * Modal showing details and changes about updated card.
 */
export default function UpdateDetails({state, details, title}: Props) {
  const rows = useMemo<DetailsRow>(() => {
    return details.files.map((file, index) => ({
      deletions: details.deletions[file] || 0,
      insertions: details.insertions[file] || 0,
      key: index,
      name: (
        <LynxTooltip delay={700} content={file}>
          <p className="sm:max-w-150 xl:max-w-full truncate overflow-hidden">{file}</p>
        </LynxTooltip>
      ),
    }));
  }, [details]);

  const renderFileList = useCallback((files: string[]) => {
    return isEmpty(files) ? (
      <p className="text-sm text-muted">No files found in this category.</p>
    ) : (
      <ul className="list-disc pl-5 text-sm text-semi-muted">
        {files.map((file, index) => (
          <li key={index}>{file}</li>
        ))}
      </ul>
    );
  }, []);

  return (
    <TabModal isOpen={state.isOpen} onOpenChange={state.setOpen}>
      <Modal.CloseTrigger />

      <Modal.Header>
        <Modal.Heading>{title || 'Update Details.'}</Modal.Heading>
      </Modal.Header>

      <Modal.Body className="flex flex-col gap-y-6 pt-4">
        <DescriptionGrid
          items={[
            {
              key: 'Insertions',
              label: (
                <div className="flex flex-row items-center gap-x-1">
                  <Plus className="size-4 shrink-0 text-success-soft-foreground" />
                  <span>Insertions</span>
                </div>
              ),
              content: <span className="ml-5">{details.summary.insertions}</span>,
            },
            {
              key: 'Deletions',
              label: (
                <div className="flex flex-row items-center gap-x-1">
                  <Minus className="size-4 shrink-0 text-danger-soft-foreground" />
                  <span>Deletions</span>
                </div>
              ),
              content: <span className="ml-5">{details.summary.deletions}</span>,
            },
            {
              key: 'Changes',
              label: (
                <div className="flex flex-row items-center gap-x-1">
                  <LucideReplace className="size-4 shrink-0 text-warning-soft-foreground" />
                  <span>Changes</span>
                </div>
              ),
              content: <span className="ml-5">{details.summary.changes}</span>,
            },
          ]}
          columns={3}
          title="Summary"
          itemClassName="bg-surface! shadow-none!"
          className="bg-surface-secondary! shadow-none!"
        />

        <div className="rounded-3xl bg-surface-secondary py-4 px-5">
          <h4 className="mb-4 text-base font-semibold text-foreground">Details</h4>
          <Accordion variant="surface" allowsMultipleExpanded>
            <Accordion.Item>
              <Accordion.Heading>
                <Accordion.Trigger>
                  <Plus className="mr-3 size-4 shrink-0 text-success-soft-foreground" />
                  <span>Created Files</span>
                  <Chip color="success" className="ml-2 size-5 justify-center">
                    {details.created.length}
                  </Chip>
                  <Accordion.Indicator>
                    <AltArrowDownIcon />
                  </Accordion.Indicator>
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body>{renderFileList(details.created)}</Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item>
              <Accordion.Heading>
                <Accordion.Trigger>
                  <Minus className="mr-3 size-4 shrink-0 text-danger-soft-foreground" />
                  <span>Deleted Files</span>
                  <Chip color="danger" className="ml-2 size-5 justify-center">
                    {details.deleted.length}
                  </Chip>
                  <Accordion.Indicator>
                    <AltArrowDownIcon />
                  </Accordion.Indicator>
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body>{renderFileList(details.deleted)}</Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item>
              <Accordion.Heading>
                <Accordion.Trigger>
                  <LucideReplace className="mr-3 size-4 shrink-0 text-warning-soft-foreground" />
                  <span>Changed Files</span>
                  <Chip color="warning" className="ml-2 size-5 justify-center">
                    {details.files.length}
                  </Chip>
                  <Accordion.Indicator>
                    <AltArrowDownIcon />
                  </Accordion.Indicator>
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body>
                  {!isEmpty(details.files) ? (
                    <Table>
                      <Table.ScrollContainer>
                        <Table.Content>
                          <Table.Header>
                            <Table.Column isRowHeader>File Name</Table.Column>
                            <Table.Column>Insertions</Table.Column>
                            <Table.Column>Deletions</Table.Column>
                          </Table.Header>
                          <Table.Body>
                            {rows.map(row => (
                              <Table.Row key={row.key}>
                                <Table.Cell>{row.name}</Table.Cell>
                                <Table.Cell className="text-success-soft-foreground">{row.insertions}</Table.Cell>
                                <Table.Cell className="text-danger-soft-foreground">{row.deletions}</Table.Cell>
                              </Table.Row>
                            ))}
                          </Table.Body>
                        </Table.Content>
                      </Table.ScrollContainer>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted">No files have been modified.</p>
                  )}
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </div>
      </Modal.Body>
    </TabModal>
  );
}
