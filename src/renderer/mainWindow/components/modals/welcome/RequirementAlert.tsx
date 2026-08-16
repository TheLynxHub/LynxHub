import {Alert, Button, buttonVariants, Link} from '@heroui/react';
import applicationIpc from '@lynx_shared/ipc/application';
import {DangerCircleIcon, InfoCircleIcon} from '@solar-icons/react/bold-duotone';

import {FailureType} from './types';

type Props = {
  failureType: FailureType;
  skipAppModule: () => void;
};

const GitUrl = 'https://git-scm.com/downloads';
const PWS7ReleasePage = 'https://github.com/PowerShell/PowerShell/releases/latest';

export default function RequirementAlert({failureType, skipAppModule}: Props) {
  if (!failureType) return null;

  switch (failureType) {
    case 'git':
      return (
        <Alert status="warning" className="rounded-2xl border border-warning/20">
          <Alert.Indicator>
            <DangerCircleIcon className="size-5 text-warning" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Title className="text-xs font-bold">Git is Required</Alert.Title>
            <Alert.Description className="text-xs text-muted">
              Git is required for version control and module synchronization.
            </Alert.Description>
          </Alert.Content>
          <Link
            className={buttonVariants({variant: 'primary', size: 'sm'})}
            onPress={() => applicationIpc.send.openUrlDefaultBrowser(GitUrl)}>
            Download Git
            <Link.Icon />
          </Link>
        </Alert>
      );
    case 'pwsh':
      return (
        <Alert status="warning" className="rounded-2xl border border-warning/20">
          <Alert.Indicator>
            <DangerCircleIcon className="size-5 text-warning" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Title className="text-xs font-bold">PowerShell 7+ Required</Alert.Title>
            <Alert.Description className="text-xs text-muted">
              PowerShell 7 (pwsh) or later is required for Windows scripting.
            </Alert.Description>
          </Alert.Content>
          <Link
            className={buttonVariants({variant: 'primary', size: 'sm'})}
            onPress={() => applicationIpc.send.openUrlDefaultBrowser(PWS7ReleasePage)}>
            Get PowerShell 7
            <Link.Icon />
          </Link>
        </Alert>
      );
    case 'appModule':
      return (
        <Alert status="warning" className="rounded-2xl border border-warning/20">
          <Alert.Indicator>
            <InfoCircleIcon className="size-5 text-warning" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Title className="text-xs font-bold">Main Module Setup</Alert.Title>
            <Alert.Description className="text-xs text-muted">
              Could not auto-install the main AI module right now. You can skip and install later.
            </Alert.Description>
          </Alert.Content>
          <Button size="sm" variant="secondary" onPress={skipAppModule}>
            Skip for now
          </Button>
        </Alert>
      );
    default:
      return null;
  }
}
