import {Button, Chip} from '@heroui/react';
import {APP_NAME} from '@lynx_common/consts';
import {CheckCircleIcon, CpuIcon, Rocket2Icon, Widget5Icon} from '@solar-icons/react/bold-duotone';
import {CheckReadIcon} from '@solar-icons/react/line-duotone';
import {motion, Variants} from 'framer-motion';

import {RequirementStatus} from './types';

const containerVariants: Variants = {
  hidden: {opacity: 0},
  enter: {
    opacity: 1,
    transition: {staggerChildren: 0.08, delayChildren: 0.1},
  },
  exit: {opacity: 0, y: -15, transition: {duration: 0.25}},
};

const itemVariants: Variants = {
  hidden: {opacity: 0, y: 14},
  enter: {opacity: 1, y: 0, transition: {duration: 0.4, ease: [0.16, 1, 0.3, 1]}},
};

type Props = {
  onComplete: () => void;
  installedPlugins: string[];
  requirementStatus: RequirementStatus | null;
};

const summaryCardClass =
  'w-full bg-surface/70 border border-surface-secondary p-4.5 rounded-3xl ' +
  'text-left backdrop-blur-sm shadow-sm space-y-3.5 my-1.5';

const badgeClass =
  'relative z-10 size-18 rounded-full bg-success/20 border border-success/40 ' +
  'shadow-xl shadow-success/20 flex items-center justify-center text-success backdrop-blur-md';

const finishBtnClass =
  'font-bold px-8 h-11 text-xs shadow-lg shadow-accent/25 ' + 'hover:shadow-accent/40 active:scale-95 transition-all';

export default function StepComplete({onComplete, installedPlugins, requirementStatus}: Props) {
  return (
    <motion.div
      exit="exit"
      key="complete"
      animate="enter"
      initial="hidden"
      variants={containerVariants}
      className="flex flex-col items-center justify-between h-full text-center max-w-2xl mx-auto py-1">
      {/* Animated Celebration Icon */}
      <motion.div variants={itemVariants} className="relative size-22 flex items-center justify-center my-1.5">
        {/* Expanding pulse ripple rings with visible borders */}
        <motion.div
          animate={{scale: [1, 1.45, 1.8], opacity: [0.8, 0.35, 0]}}
          transition={{duration: 2.5, repeat: Infinity, ease: 'easeOut'}}
          className="absolute inset-0 rounded-full border border-success/40 bg-success/10"
        />

        {/* Central Success Badge */}
        <motion.div
          className={badgeClass}
          animate={{scale: 1, rotate: 0}}
          initial={{scale: 0.5, rotate: -20}}
          transition={{type: 'spring', damping: 12, stiffness: 200}}>
          <CheckReadIcon className="size-9" />
        </motion.div>
      </motion.div>

      {/* Typography */}
      <motion.div className="space-y-1.5" variants={itemVariants}>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">You're All Set!</h2>
        <p className="text-xs md:text-sm text-muted max-w-md mx-auto leading-relaxed">
          {APP_NAME} is fully configured. A quick restart will initialize your workspace with all verified tools and
          extensions.
        </p>
      </motion.div>

      {/* Setup Summary Card */}
      <motion.div variants={itemVariants} className={summaryCardClass}>
        <div className="flex items-center justify-between pb-2.5 border-b border-surface-secondary">
          <h3 className="font-bold text-xs uppercase tracking-wider text-muted">Configuration Summary</h3>
          <Chip variant="soft" color="success" className="text-xs font-semibold gap-1">
            <CheckCircleIcon className="size-3.5" />
            <span>Ready to Launch</span>
          </Chip>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Core Tools Section */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <CpuIcon className="size-4 text-blue-500" />
              <span>Core Tools</span>
            </div>
            <div className="space-y-1 pl-5.5 text-muted">
              <div>
                Git:{' '}
                <span className="text-foreground font-mono font-medium">{requirementStatus?.git || 'Verified'}</span>
              </div>
              {requirementStatus?.pwsh && requirementStatus.pwsh !== 'N/A' && (
                <div>
                  PowerShell: <span className="text-foreground font-mono font-medium">{requirementStatus.pwsh}</span>
                </div>
              )}
              <div>
                Main AI Engine:{' '}
                <span className="text-foreground font-medium">{requirementStatus?.appModule || 'Installed'}</span>
              </div>
            </div>
          </div>

          {/* Extensions Section */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Widget5Icon className="size-4 text-purple-500" />
              <span>Installed Extensions</span>
            </div>
            <div className="pl-5.5">
              {installedPlugins.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {installedPlugins.map(p => (
                    <Chip key={p} size="sm" variant="secondary" className="text-[11px] font-medium">
                      {p}
                    </Chip>
                  ))}
                </div>
              ) : (
                <span className="text-muted italic text-xs">Standard Core (No extra extensions)</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Completion CTA */}
      <motion.div className="pt-1.5" variants={itemVariants}>
        <Button size="lg" variant="primary" onPress={onComplete} className={finishBtnClass}>
          <span>Finish & Restart {APP_NAME}</span>
        </Button>
      </motion.div>
    </motion.div>
  );
}
