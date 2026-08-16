import {APP_ICON_TRANSPARENT} from '@lynx_common/consts';
import {BoltIcon, CodeSquareIcon, Widget5Icon} from '@solar-icons/react/bold-duotone';
import {motion} from 'framer-motion';

const satellites = [
  {
    icon: CodeSquareIcon,
    label: 'AI & Terminal',
    color: 'text-blue-500 dark:text-blue-400',
    bg: 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20',
    x: -95,
    y: -35,
    delay: 0.1,
  },
  {
    icon: Widget5Icon,
    label: 'Modular Plugins',
    color: 'text-purple-500 dark:text-purple-400',
    bg: 'bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/20',
    x: 95,
    y: -35,
    delay: 0.2,
  },
  {
    icon: BoltIcon,
    label: 'Native Speed',
    color: 'text-amber-500 dark:text-amber-400',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20',
    x: 0,
    y: 65,
    delay: 0.3,
  },
];

const haloGlowClass =
  'absolute -inset-3 rounded-full ' + 'bg-gradient-to-tr from-blue-500/20 via-purple-500/20 to-orange-500/20 blur-lg';

const logoContainerClass =
  'relative size-16 rounded-2xl bg-surface/90 border border-surface-secondary ' +
  'shadow-xl shadow-black/10 dark:shadow-black/40 flex items-center justify-center p-2.5 backdrop-blur-md';

export default function WelcomeHeroGraphic() {
  return (
    <div className="relative size-52 mx-auto flex items-center justify-center select-none">
      {/* Background Orbit Ring SVG */}
      <svg viewBox="0 0 208 208" className="absolute inset-0 size-full pointer-events-none">
        <defs>
          <linearGradient x1="0%" y1="0%" x2="100%" y2="100%" id="orbit-grad-1">
            <stop offset="0%" stopOpacity="0.5" stopColor="var(--color-LynxBlue)" />
            <stop offset="50%" stopOpacity="0.3" stopColor="var(--color-LynxPurple)" />
            <stop offset="100%" stopOpacity="0.5" stopColor="var(--color-LynxOrange)" />
          </linearGradient>
        </defs>

        {/* Outer orbital track */}
        <motion.circle
          r="78"
          cx="104"
          cy="104"
          fill="none"
          strokeWidth="1.5"
          strokeDasharray="4 8"
          animate={{rotate: 360}}
          stroke="url(#orbit-grad-1)"
          style={{transformOrigin: '104px 104px'}}
          transition={{duration: 40, repeat: Infinity, ease: 'linear'}}
        />

        {/* Inner concentric ring */}
        <motion.circle
          r="54"
          cx="104"
          cy="104"
          fill="none"
          strokeWidth="1"
          stroke="currentColor"
          strokeDasharray="2 6"
          animate={{rotate: -360}}
          className="text-foreground/15"
          style={{transformOrigin: '104px 104px'}}
          transition={{duration: 30, repeat: Infinity, ease: 'linear'}}
        />
      </svg>

      {/* Center glowing pulse core */}
      <motion.div
        animate={{scale: 1, opacity: 1}}
        initial={{scale: 0.8, opacity: 0}}
        className="relative z-10 flex items-center justify-center"
        transition={{type: 'spring', damping: 15, stiffness: 200}}>
        {/* Halo glow */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.6, 0.9, 0.6],
          }}
          className={haloGlowClass}
          transition={{duration: 4, repeat: Infinity, ease: 'easeInOut'}}
        />

        {/* App Logo Container */}
        <motion.div whileHover={{scale: 1.05}} className={logoContainerClass}>
          <img alt="LynxHub Core" src={APP_ICON_TRANSPARENT} className="size-full object-contain drop-shadow-md" />
        </motion.div>
      </motion.div>

      {/* Orbiting Satellite Pills */}
      {satellites.map((sat, index) => {
        const Icon = sat.icon;
        const pillClass =
          `absolute flex items-center gap-1.5 px-2.5 py-1 ` +
          `rounded-full border shadow-sm backdrop-blur-md ${sat.bg}`;

        return (
          <motion.div
            animate={{
              opacity: 1,
              scale: 1,
              x: sat.x,
              y: sat.y,
            }}
            transition={{
              type: 'spring',
              damping: 18,
              stiffness: 220,
              delay: sat.delay,
            }}
            key={index}
            className={pillClass}
            initial={{opacity: 0, scale: 0.6, x: 0, y: 0}}>
            <Icon className={`size-3.5 shrink-0 ${sat.color}`} />
            <span className="text-[10px] font-semibold text-foreground/90 whitespace-nowrap">{sat.label}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
