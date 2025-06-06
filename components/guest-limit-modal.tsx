// components/guest-limit-modal.tsx
import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export function GuestLimitModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 px-6 py-8 shadow-xl border dark:border-zinc-700"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-3">
              Continue Chatting
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
              Please sign up or log in to keep chatting.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                onClick={() => router.push('/register')}
              >
                Sign Up
              </button>
              <button
                className="flex-1 bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 py-2.5 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                onClick={() => router.push('/login')}
              >
                Log In
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
