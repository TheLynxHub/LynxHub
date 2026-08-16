import {motion} from 'framer-motion';

const orb1Bg =
  'bg-[radial-gradient(circle,rgba(0,120,255,0.25)_0%,rgba(0,120,255,0)_70%)] ' +
  'dark:bg-[radial-gradient(circle,rgba(59,130,246,0.2)_0%,rgba(59,130,246,0)_70%)]';

const orb2Bg =
  'bg-[radial-gradient(circle,rgba(255,95,0,0.18)_0%,rgba(255,95,0,0)_70%)] ' +
  'dark:bg-[radial-gradient(circle,rgba(255,95,0,0.15)_0%,rgba(255,95,0,0)_70%)]';

const orb3Bg =
  'bg-[radial-gradient(circle,rgba(168,85,247,0.15)_0%,rgba(168,85,247,0)_70%)] ' +
  'dark:bg-[radial-gradient(circle,rgba(168,85,247,0.12)_0%,rgba(168,85,247,0)_70%)]';

const orb3Class =
  'absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 ' + `w-80 h-80 rounded-full ${orb3Bg} blur-2xl`;

export default function Background() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {/* Ambient gradient orbs */}
      <motion.div
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        animate={{
          x: [0, 40, -20, 0],
          y: [0, 30, -10, 0],
          scale: [1, 1.15, 0.95, 1],
        }}
        aria-hidden="true"
        className={`absolute -top-32 -left-32 w-96 h-96 rounded-full ${orb1Bg} blur-2xl`}
      />

      <motion.div
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        animate={{
          x: [0, -35, 25, 0],
          y: [0, -40, 20, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        aria-hidden="true"
        className={`absolute -bottom-40 -right-32 w-[32rem] h-[32rem] rounded-full ${orb2Bg} blur-3xl`}
      />

      <motion.div
        animate={{
          scale: [0.9, 1.1, 0.9],
          opacity: [0.5, 0.9, 0.5],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        aria-hidden="true"
        className={orb3Class}
      />

      {/* Subtle geometric dot grid pattern overlay */}
      <svg xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 size-full opacity-[0.03] dark:opacity-[0.04]">
        <defs>
          <pattern width="28" height="28" id="welcome-grid" patternUnits="userSpaceOnUse">
            <circle r="1" cx="2" cy="2" fill="currentColor" className="text-foreground" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#welcome-grid)" />
      </svg>
    </div>
  );
}
