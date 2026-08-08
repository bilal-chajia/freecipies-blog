import { useOutlet, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { getAnimatedOutletKey } from '../app/route-contract';

export function AnimatedOutlet() {
  const outlet = useOutlet();
  const location = useLocation();
  const outletKey = getAnimatedOutletKey(location.pathname);

  if (outletKey === null) {
    return <div className="contents">{outlet}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={outletKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="contents"
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}

export default AnimatedOutlet;
