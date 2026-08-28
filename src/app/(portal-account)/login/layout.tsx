'use client';

import { motion } from 'motion/react';
import React from 'react';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.8 }}
      className="w-full flex-1 flex flex-col"
    >
      {children}
    </motion.div>
  );
}
