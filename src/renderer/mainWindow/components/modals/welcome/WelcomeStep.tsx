import {Button} from '@heroui/react';
import {APP_NAME} from '@lynx_common/consts';
import {BoltIcon, CpuIcon, StarsMinimalisticIcon, Widget5Icon} from '@solar-icons/react/bold-duotone';
import {ArrowRightIcon} from '@solar-icons/react/line-duotone';
import {motion, Variants} from 'framer-motion';

import WelcomeHeroGraphic from './WelcomeHeroGraphic';

const containerVariants: Variants = {
  hidden: {opacity: 0},
  enter: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
  exit: {opacity: 0, y: -15, transition: {duration: 0.25, ease: 'easeIn'}},
};

const itemVariants: Variants = {
  hidden: {opacity: 0, y: 14},
  enter: {opacity: 1, y: 0, transition: {duration: 0.4, ease: [0.16, 1, 0.3, 1]}},
};

type Props = {onNext: () => void};

const tagBadgeClass =
  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full ' +
  'bg-accent/15 border border-accent/30 text-accent font-semibold text-xs';

const cardBaseClass =
  'flex flex-col items-center p-3 rounded-2xl bg-surface/80 border ' +
  'border-surface-secondary backdrop-blur-sm transition-all hover:bg-surface hover:shadow-md';

const getStartedBtnClass =
  'font-bold px-8 h-11 text-xs shadow-lg shadow-accent/25 ' + 'hover:shadow-accent/40 active:scale-95 transition-all';

export default function StepWelcome({onNext}: Props) {
  return (
    <motion.div
      exit="exit"
      key="welcome"
      animate="enter"
      initial="hidden"
      variants={containerVariants}
      className="flex flex-col items-center justify-between h-full text-center max-w-3xl mx-auto py-1">
      {/* Top Tag & Hero Graphic */}
      <motion.div className="space-y-2.5" variants={itemVariants}>
        <div className={tagBadgeClass}>
          <StarsMinimalisticIcon className="size-3.5 shrink-0" />
          <span>Next-Gen AI Workspace</span>
        </div>

        <WelcomeHeroGraphic />
      </motion.div>

      {/* Headline & Subtitle */}
      <motion.div variants={itemVariants} className="space-y-1.5 max-w-xl">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Welcome to {APP_NAME}</h1>
        <p className="text-xs md:text-sm text-muted leading-relaxed">
          The unified environment for AI power users — bridging local terminals, intelligent browsing, and extensible
          workflows.
        </p>
      </motion.div>

      {/* 3 Value Proposition Highlight Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full my-1.5">
        <div className={cardBaseClass}>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 mb-1.5">
            <CpuIcon className="size-4.5" />
          </div>
          <h2 className="font-semibold text-xs text-foreground mb-0.5">Local & Cloud AI</h2>
          <p className="text-[11px] text-muted leading-normal">Orchestrate local LLMs and cloud APIs seamlessly</p>
        </div>

        <div className={cardBaseClass}>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 mb-1.5">
            <Widget5Icon className="size-4.5" />
          </div>
          <h2 className="font-semibold text-xs text-foreground mb-0.5">Modular Ecosystem</h2>
          <p className="text-[11px] text-muted leading-normal">Expand workflows with one-click community extensions</p>
        </div>

        <div className={cardBaseClass}>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 mb-1.5">
            <BoltIcon className="size-4.5" />
          </div>
          <h2 className="font-semibold text-xs text-foreground mb-0.5">Native Speed</h2>
          <p className="text-[11px] text-muted leading-normal">Fast, responsive execution built for power users</p>
        </div>
      </motion.div>

      {/* CTA Button */}
      <motion.div className="pt-1.5" variants={itemVariants}>
        <Button size="lg" onPress={onNext} variant="primary" className={getStartedBtnClass}>
          <span>Get Started</span>
          <ArrowRightIcon className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
