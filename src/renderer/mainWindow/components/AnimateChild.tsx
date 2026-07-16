import {AnimatePresence} from 'framer-motion';
import {motion} from 'framer-motion';
import {ReactNode} from 'react';

type AnimProp = {
  children: ReactNode;
  show: boolean;
};

export default function AnimateChild({show, children}: AnimProp) {
  return (
    <AnimatePresence mode="popLayout">
      {show && (
        <motion.div
          layout={true}
          transition={{duration: 0.1}}
          exit={{translateY: 5, opacity: 0, scale: 0.7}}
          animate={{translateY: 0, opacity: 1, scale: 1}}
          initial={{translateY: 5, opacity: 0, scale: 0.7}}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
