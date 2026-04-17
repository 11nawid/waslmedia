
'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { WaslmediaLogo } from '@/components/waslmedia-logo';
import { useProgressRouter } from '@/hooks/use-progress-router';

export default function SignupSuccessPage() {
  const router = useProgressRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/');
    }, 4000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background z-[100]">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-center"
      >
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 1,
            ease: 'easeInOut',
            delay: 0.5,
          }}
        >
          <WaslmediaLogo className="w-24 h-24 text-primary mx-auto" />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="text-3xl font-bold mt-6"
        >
          Your channel has been created!
        </motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.2 }}
          className="text-muted-foreground mt-2"
        >
          Get ready to share your content with the world.
        </motion.p>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.4 }}
          className="text-sm text-muted-foreground mt-8"
        >
          Redirecting you to the home page...
        </motion.p>
      </motion.div>
    </div>
  );
}
