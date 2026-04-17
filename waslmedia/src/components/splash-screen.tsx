
'use client';

import { motion } from 'framer-motion';
import { WaslmediaLogo } from './waslmedia-logo';

export function SplashScreen() {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-background z-[200]">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
            >
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: 1.5,
                        ease: 'easeInOut',
                        repeat: Infinity,
                        repeatType: 'loop'
                    }}
                >
                    <WaslmediaLogo className="w-24 h-24 text-primary" />
                </motion.div>
            </motion.div>
        </div>
    );
}
