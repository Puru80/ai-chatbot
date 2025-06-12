'use client';

import { useSession } from 'next-auth/react';
import React from 'react';

export function PromptUsageIndicator() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="p-2 text-sm text-gray-500 dark:text-gray-400">
        Loading usage...
      </div>
    );
  }

  if (!session?.user) {
    return null; // Or some other placeholder if user is not logged in
  }

  const {
    promptCount,
    maxPrompts,
    quotaResetsAt: quotaResetsAtISO
  } = session.user as {
    promptCount: number;
    maxPrompts: number;
    quotaResetsAt: string | null;
  };

  // Ensure defaults if values are somehow undefined, though auth.ts should set them
  const currentPrompts = promptCount ?? 0;
  const maximumPrompts = maxPrompts ?? 0;

  const percentage = maximumPrompts > 0 ? (currentPrompts / maximumPrompts) * 100 : 0;

  let quotaResetsAtDate: Date | null = null;
  let formattedResetTime: string | null = null;

  if (quotaResetsAtISO) {
    quotaResetsAtDate = new Date(quotaResetsAtISO);
    // Simple formatting, consider a date library for more complex needs or timezones
    // Displaying in local time of the browser
    formattedResetTime = quotaResetsAtDate.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
    // Optional: Add date if it's not today, but problem asks for H:MM AM/PM [Date]
    // For now, keeping it simple as per example "Resets at H:MM AM/PM"
    // If the date part is needed: + ` on ${quotaResetsAtDate.toLocaleDateString()}`
  }

  return (
    <div className="p-3 my-2 border-t border-gray-200 dark:border-gray-700 text-sm">
      <div className="flex justify-between mb-1">
        <span className="text-gray-700 dark:text-gray-300">Prompt Usage:</span>
        <span className="font-medium text-gray-800 dark:text-gray-200">
          {currentPrompts} / {maximumPrompts}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.0 dark:bg-gray-700 mb-1">
        <div
          className="bg-primary h-2.0 rounded-full" // Assuming 'bg-primary' is a defined Tailwind primary color
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      {currentPrompts >= maximumPrompts && formattedResetTime && (
        <p className="text-xs text-orange-600 dark:text-orange-400 text-center">
          Quota exhausted. Resets at {formattedResetTime}.
        </p>
      )}
      {/*
        Optional: Display when quota will reset even if not exhausted.
        {currentPrompts < maximumPrompts && formattedResetTime && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Quota resets at {formattedResetTime}.
          </p>
        )}
      */}
    </div>
  );
}
