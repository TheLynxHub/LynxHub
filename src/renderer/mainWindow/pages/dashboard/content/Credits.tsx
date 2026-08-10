import {Avatar, Button, Description, Label} from '@heroui/react';
import SettingsSection from '@lynx/components/SettingsSection';
import {useUserState} from '@lynx/redux/reducers/user';
import {PATREON_URL} from '@lynx_common/consts';
import {PatreonSupporter, PatreonSupporterTier} from '@lynx_common/types';
import staticsIpc from '@lynx_shared/ipc/statics';
import {
  ArrowRightUpIcon,
  CrownStarIcon,
  CupFirstIcon,
  HeartAngleIcon,
  HeartPulse2Icon,
  SquareTopDownIcon,
} from '@solar-icons/react/bold-duotone';
import {Plus} from 'lucide-react';
import {memo, ReactNode, useEffect, useMemo, useState} from 'react';
export const DashboardCreditsId = 'settings_credits_elem';

interface TierStyle {
  icon: ReactNode;
  badge: string;
  gradient: string;
  glow: string;
  borderColor: string;
  dotColor: string;
  accentText: string;
}

const TIER_STYLES: Record<PatreonSupporterTier, TierStyle> = {
  'Diamond Sponsor': {
    icon: <CrownStarIcon className="size-5" />,
    badge: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    gradient: 'from-cyan-500/10 via-transparent to-transparent',
    glow: 'group-hover:shadow-[0_0_15px_rgba(6,182,212,0.12)]',
    borderColor: 'hover:border-cyan-500/30',
    dotColor: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]',
    accentText: 'text-cyan-500 dark:text-cyan-400',
  },
  'Platinum Sponsor': {
    icon: <CupFirstIcon className="size-5" />,
    badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    gradient: 'from-amber-500/10 via-transparent to-transparent',
    glow: 'group-hover:shadow-[0_0_15px_rgba(245,158,11,0.12)]',
    borderColor: 'hover:border-amber-500/30',
    dotColor: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
    accentText: 'text-amber-500 dark:text-amber-400',
  },
};

const MAX_DISPLAYED_SUPPORTERS = 50;
const tiers: PatreonSupporterTier[] = ['Diamond Sponsor', 'Platinum Sponsor'];

const formatMemberSince = (dateString: string) => {
  try {
    const date = new Date(dateString.replace(/-/g, '/'));

    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', {month: 'short', year: 'numeric'});
    }
    return dateString;
  } catch {
    return dateString;
  }
};

const DashboardCredits = memo(() => {
  const [expandedTier, setExpandedTier] = useState<PatreonSupporterTier | null>(null);
  const [supporters, setSupporters] = useState<PatreonSupporter[]>([]);

  useEffect(() => {
    let mounted = true;
    staticsIpc.getPatrons().then(data => {
      if (mounted && data) {
        setSupporters(data);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const groupedSupporters = useMemo(
    () =>
      supporters.reduce(
        (acc, supporter) => {
          if (!acc[supporter.tier]) {
            acc[supporter.tier] = [];
          }
          acc[supporter.tier].push(supporter);
          return acc;
        },
        {} as Record<PatreonSupporterTier, PatreonSupporter[]>,
      ),
    [supporters],
  );

  const handleBecomePatron = () => {
    window.open(PATREON_URL);
  };

  const isLoggedIn = useUserState('isLoggedIn');
  const userData = useUserState('userData');
  const hasConnectedPatreon = isLoggedIn && userData.connectedProviders?.includes('patreon');

  return (
    <SettingsSection title="Credits" id={DashboardCreditsId} icon={<HeartPulse2Icon className="size-5" />} itemsCenter>
      {/* Premium Hero Banner */}
      <div
        className={
          'relative mb-10 overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80' +
          ' bg-zinc-50 dark:bg-zinc-900/40 p-8 shadow-xs'
        }>
        <div
          className={
            'absolute inset-0 bg-radial from-blue-500/5 via-transparent to-transparent opacity-80 pointer-events-none'
          }
        />

        <div className="relative z-10 flex items-center justify-between gap-8">
          <div className={`${hasConnectedPatreon ? '' : 'max-w-xl'} text-start`}>
            <div
              className={
                'inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600' +
                ' dark:text-blue-400 text-[11px] font-semibold mb-3'
              }>
              <HeartAngleIcon className="size-3.5" />
              <span>Backer Community</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Supporting Open Development
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              I'm a solo developer working on this app, its extensions, and modules full-time. Your support helps keep
              this project going and allows me to focus on releasing regular updates and improvements.
            </p>
          </div>

          {/* Action Callout Box */}
          {!hasConnectedPatreon && (
            <div
              className={
                'relative shrink-0 flex flex-col items-start bg-white/60 dark:bg-zinc-950/40 border' +
                ' border-zinc-200/50 dark:border-zinc-800 p-5 rounded-2xl min-w-sm'
              }>
              <Button
                className={
                  'relative isolate overflow-hidden w-full font-bold text-sm text-white' +
                  // Base Gradients (Light & Dark)
                  ' bg-linear-to-r from-rose-600 to-rose-500' +
                  ' dark:from-rose-700 dark:to-rose-600' +
                  // Hover Gradient Overlay (Light)
                  ' before:absolute before:inset-0 before:-z-10 before:opacity-0' +
                  ' before:transition-opacity before:duration-300' +
                  ' before:bg-linear-to-r before:from-rose-500 before:to-rose-400' +
                  // Hover Gradient Overlay (Dark)
                  ' dark:before:from-rose-600 dark:before:to-rose-500' +
                  // Hover Action to trigger the opacity transition
                  ' hover:before:opacity-100' +
                  // Shadows & Transitions
                  ' shadow-md shadow-rose-500/10 hover:shadow-rose-500/20' +
                  ' dark:shadow-rose-950/30 dark:hover:shadow-rose-900/20' +
                  ' py-5 rounded-xl transition-all duration-300 active:scale-[0.98]'
                }
                onPress={handleBecomePatron}>
                <span className="flex items-center justify-center gap-2 w-full">
                  Join the Patrons <SquareTopDownIcon className="size-4" />
                </span>
              </Button>

              <div
                className={
                  'mt-4 w-full border-t border-zinc-200/60 dark:border-zinc-800/80 pt-3 flex items-center' +
                  ' justify-around text-[10px] font-semibold text-zinc-500 dark:text-zinc-400'
                }>
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-rose-500" />
                  Profile Badge
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">|</span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-indigo-500" />
                  Discord Role
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sponsor Tiers */}
      <div className="space-y-12">
        {tiers.map(tier => {
          const style = TIER_STYLES[tier];
          const list = groupedSupporters[tier] || [];
          const hasSupporters = list.length > 0;
          const isExpanded = expandedTier === tier;
          const displayedList = isExpanded ? list : list.slice(0, MAX_DISPLAYED_SUPPORTERS);

          return (
            <div key={tier} className="relative">
              {/* Tier Section Header */}
              <div
                className={
                  'mb-5 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3'
                }>
                <div className="flex items-center space-x-3">
                  <span className={`flex size-9 items-center justify-center rounded-lg ${style.badge}`}>
                    {style.icon}
                  </span>
                  <div>
                    <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 leading-none">{tier}s</h3>
                    <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 mt-1">
                      {list.length} {list.length === 1 ? 'member' : 'members'} active
                    </p>
                  </div>
                </div>

                {list.length > MAX_DISPLAYED_SUPPORTERS && (
                  <Button
                    size="sm"
                    variant="tertiary"
                    className={'font-semibold text-xs'}
                    onPress={() => setExpandedTier(isExpanded ? null : tier)}>
                    {isExpanded ? 'Show Less' : `Show All ${list.length}`}
                  </Button>
                )}
              </div>

              {/* Grid Layout */}
              <div className="grid grid-cols-4 gap-3">
                {hasSupporters ? (
                  <>
                    {displayedList.map(supporter => {
                      const nameInitials = supporter.name
                        .split(' ')
                        .slice(0, 2)
                        .map(item => item[0])
                        .join('')
                        .toUpperCase();

                      return (
                        <Button
                          className={
                            `group relative flex h-auto w-full items-center justify-start gap-3 rounded-xl border` +
                            ` border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 p-3 text-start` +
                            ` transition-all duration-300 ${style.borderColor} ${style.glow} hover:-translate-y-0.5`
                          }
                          key={supporter.name}
                          onPress={() => window.open(supporter.homePage)}>
                          <div
                            className={
                              `absolute inset-0 rounded-xl bg-linear-to-br ${style.gradient} opacity-0` +
                              ` group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`
                            }
                          />

                          <Avatar
                            className={'size-9 shrink-0 shadow-2xs border border-zinc-200/40 dark:border-zinc-700/50'}>
                            <Avatar.Image alt={supporter.name} src={supporter.imageUrl} />
                            <Avatar.Fallback
                              className={
                                'font-semibold text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                              }>
                              {nameInitials}
                            </Avatar.Fallback>
                          </Avatar>

                          <div className="flex flex-col min-w-0 z-10 pr-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`size-1.5 rounded-full shrink-0 ${style.dotColor}`} />
                              <Label
                                className={
                                  'truncate font-bold text-xs text-zinc-800 dark:text-zinc-200 ' +
                                  'group-hover:text-zinc-900 dark:group-hover:text-white transition-colors'
                                }>
                                {supporter.name}
                              </Label>
                            </div>
                            <Description className="truncate text-[10px] text-zinc-400 dark:text-zinc-400 mt-1">
                              Since {formatMemberSince(supporter.memberSince)}
                            </Description>
                          </div>

                          {/* Subtle arrow indicator appearing on hover */}
                          <ArrowRightUpIcon
                            className={
                              'absolute top-2.5 right-2.5 size-3.5 text-zinc-400 dark:text-zinc-500 opacity-0' +
                              ' group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5' +
                              ' group-hover:-translate-y-0.5'
                            }
                          />
                        </Button>
                      );
                    })}

                    {/* Standardized "Join this tier" button */}
                    <button
                      className={
                        'group relative flex h-full w-full items-center justify-center gap-2 rounded-xl ' +
                        'border border-dashed border-zinc-400/50 dark:border-zinc-700 bg-zinc-50/40 ' +
                        'dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-900/80 p-3 text-center' +
                        ' transition-all duration-300 hover:border-zinc-500 dark:hover:border-zinc-500' +
                        ' min-h-14.5 cursor-pointer'
                      }
                      onClick={handleBecomePatron}>
                      <Plus
                        className={
                          'size-4 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-800' +
                          ' dark:group-hover:text-white transition-colors duration-300'
                        }
                      />
                      <span
                        className={
                          'text-zinc-500 dark:text-zinc-350 group-hover:text-zinc-850' +
                          ' dark:group-hover:text-white font-bold text-xs transition-colors duration-300'
                        }>
                        Join this tier
                      </span>
                    </button>
                  </>
                ) : (
                  /* Standardized Card-sized Placeholder using specific style icon */
                  <button
                    className={
                      'group relative flex h-auto w-full items-center justify-start gap-3 rounded-xl border' +
                      ' border-dashed border-zinc-400/50 dark:border-zinc-700 bg-zinc-50/40 ' +
                      'dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-900/80 p-3 ' +
                      'text-start transition-all duration-300 hover:border-zinc-500 ' +
                      'dark:hover:border-zinc-500 min-h-14.5 cursor-pointer'
                    }
                    onClick={handleBecomePatron}>
                    <div
                      className={
                        'flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100' +
                        ' dark:bg-zinc-800/80 text-zinc-500 group-hover:scale-105 transition-transform duration-300'
                      }>
                      {style.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span
                        className={
                          'font-bold text-xs text-zinc-700 dark:text-zinc-200 group-hover:text-zinc-900' +
                          ' dark:group-hover:text-white transition-colors'
                        }>
                        Be the first {tier.replace('Sponsor', '')}
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                        Claim this card slot
                      </span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </SettingsSection>
  );
});

DashboardCredits.displayName = 'DashboardCredits';

export default DashboardCredits;
