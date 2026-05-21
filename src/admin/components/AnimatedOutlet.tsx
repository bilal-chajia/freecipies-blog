import { useOutlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const editorRegex = /\/(articles|recipes|roundups)\/(new|[^/]+)$/;

export function AnimatedOutlet() {
  const outlet = useOutlet();
  const location = useLocation();
  const isEditor = editorRegex.test(location.pathname);

  if (isEditor) {
    return <div className="contents">{outlet}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
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
