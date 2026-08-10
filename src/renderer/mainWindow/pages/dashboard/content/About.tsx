import {Avatar, Button, Card, Chip, LinkIcon} from '@heroui/react';
import SettingsSection from '@lynx/components/SettingsSection';
import {DiscordColor_Icon, GitHub_Icon, Gmail_Icon, Reddit_Icon, Scales_Icon} from '@lynx_assets/icons';
import {
  APP_BUILD_NUMBER,
  APP_DETAILED_DESCRIPTION,
  APP_ICON_TRANSPARENT,
  APP_NAME,
  APP_VERSION_FORMAT,
  DISCORD_SERVER,
  EMAIL,
  GITHUB_URL,
  LICENSE_NAME,
  LICENSE_PAGE,
  LYNXHUB_DOCS,
  LYNXHUB_WEBSITE,
  REDDIT_URL,
} from '@lynx_common/consts';
import {CopyIcon, DocumentTextIcon, GlobalIcon, InfoCircleIcon} from '@solar-icons/react/bold-duotone';
import {memo, useCallback} from 'react';

import {topToast} from '../../../layouts/ToastProviders';

export const DashboardAboutId = 'settings_about_elem';

/** Information about application and developer */
const DashboardAbout = memo(() => {
  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      topToast.info(`Copied to clipboard: ${text}`);
    } catch (e) {
      console.error('Failed to copy text:', e);
      topToast.warning('Failed to copy to clipboard!');
    }
  }, []);

  const socialLinks = [
    {
      name: 'Website',
      icon: <GlobalIcon className="size-5" />,
      action: () => window.open(LYNXHUB_WEBSITE),
      actionIcon: <LinkIcon className="size-3.5" />,
    },
    {
      name: 'Docs',
      icon: <DocumentTextIcon className="size-5" />,
      action: () => window.open(LYNXHUB_DOCS),
      actionIcon: <LinkIcon className="size-3.5" />,
    },
    {
      name: 'Email',
      icon: <Gmail_Icon className="size-5" />,
      action: () => copyText(EMAIL),
      actionIcon: <CopyIcon className="size-4" />,
    },
    {
      name: 'GitHub',
      icon: <GitHub_Icon className="size-5" />,
      action: () => window.open(GITHUB_URL),
      actionIcon: <LinkIcon className="size-3.5" />,
    },
    {
      name: 'Discord',
      icon: <DiscordColor_Icon className="size-5" />,
      action: () => window.open(DISCORD_SERVER),
      actionIcon: <LinkIcon className="size-3.5" />,
    },
    {
      name: 'Reddit',
      icon: <Reddit_Icon className="size-5" />,
      action: () => window.open(REDDIT_URL),
      actionIcon: <LinkIcon className="size-3.5" />,
    },
    {
      name: LICENSE_NAME,
      icon: <Scales_Icon className="size-5" />,
      action: () => window.open(LICENSE_PAGE),
      actionIcon: <LinkIcon className="size-3.5" />,
    },
  ];

  return (
    <SettingsSection title="About" id={DashboardAboutId} icon={<InfoCircleIcon className="size-5" />} itemsCenter>
      <div className="w-full max-w-4xl mx-auto space-y-4">
        {/* App Info Card */}
        <Card className="overflow-hidden border-none bg-transparent shadow-none">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="size-24 rounded-none">
              <Avatar.Image src={APP_ICON_TRANSPARENT} />
            </Avatar>

            <div className="text-center space-y-3">
              <h1 className="text-2xl font-bold">{APP_NAME}</h1>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <Chip size="sm" color="success" variant="secondary">
                  {APP_VERSION_FORMAT}
                </Chip>
                <Chip size="sm" variant="secondary">
                  Build {APP_BUILD_NUMBER}
                </Chip>
                <Chip size="sm" color="accent" variant="secondary">
                  Chromium {window.electron.process.versions.chrome}
                </Chip>
              </div>

              <p className="text-sm text-muted max-w-2xl leading-relaxed">{APP_DETAILED_DESCRIPTION}</p>
            </div>
          </div>
        </Card>

        {/* Social Links */}
        <div className="flex flex-wrap gap-2">
          {socialLinks.map(link => (
            <Button key={link.name} onPress={link.action} className="group bg-surface text-surface-foreground">
              {link.icon}
              <span>{link.name}</span>
              <span className="opacity-0 group-hover:opacity-60 transition-opacity">{link.actionIcon}</span>
            </Button>
          ))}
        </div>
      </div>
    </SettingsSection>
  );
});

DashboardAbout.displayName = 'DashboardAbout';

export default DashboardAbout;
