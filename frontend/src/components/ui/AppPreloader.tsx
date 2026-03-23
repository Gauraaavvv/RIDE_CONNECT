import React from 'react';
import { motion } from 'framer-motion';
import { Car } from 'lucide-react';

const AppPreloader: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeInOut' } }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[#03070f]/95 backdrop-blur-md"
      aria-live="polite"
      aria-label="Loading RideConnect"
    >
      <div className="relative flex flex-col items-center text-center">
        <motion.div
          className="absolute h-28 w-28 rounded-full border border-cyan-200/25"
          animate={{ rotate: 360 }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute h-20 w-20 rounded-full border border-amber-200/25"
          animate={{ rotate: -360 }}
          transition={{ duration: 2.1, repeat: Infinity, ease: 'linear' }}
        />
        <div className="relative inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-cyan-100">
          <Car className="h-6 w-6" />
        </div>
        <p className="mt-6 text-2xl font-semibold tracking-tight text-white">RideConnect</p>
        <p className="mt-1 text-sm text-slate-300">Less hassle. More comfort.</p>
      </div>
    </motion.div>
  );
};

export default AppPreloader;

