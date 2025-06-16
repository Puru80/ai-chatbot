'use client'; // SWR hooks are client-side

import useSWR from 'swr';
import { getUserPromptUsage } from '@/app/(chat)/actions'; // Path to server action

// Define the expected shape of the data returned by getUserPromptUsage
export interface PromptUsageData {
  promptCount: number;
  dailyQuota: number;
  limitExhaustedAt: Date | null; // Ensure this is Date or null after fetcher processing
}

// Fetcher function that calls the server action
const fetcher = async (): Promise<PromptUsageData | null> => {
  const data = await getUserPromptUsage();
  if (!data) {
    return null;
  }
  // Ensure limitExhaustedAt is a Date object if it's returned as a string (e.g., from server action if not already Date)
  // Server actions returning Date objects directly should be fine, but this handles cases where it might be serialized.
  if (data.limitExhaustedAt && typeof data.limitExhaustedAt === 'string') {
    return { ...data, limitExhaustedAt: new Date(data.limitExhaustedAt) };
  }
  // If it's already a Date or null, return as is.
  // The server action getUserPromptUsage already returns Date | null for limitExhaustedAt.
  return data as PromptUsageData; // Cast to ensure type conformity, assuming server action aligns
};

// Custom SWR hook
export function usePromptUsageData() {
  const { data, error, isLoading, mutate } = useSWR<PromptUsageData | null>(
    '/api/prompt-usage', // Unique SWR key for this data
    fetcher,
    {
      // Optional SWR configuration
      // revalidateOnFocus: true, // Example: revalidate when window gets focus
      // refreshInterval: 60000, // Example: refresh every 60 seconds
    }
  );

  return {
    promptUsage: data, // Will be undefined initially, then PromptUsageData or null
    isLoadingUsage: isLoading,
    errorUsage: error,
    mutateUsage: mutate, // Allows manual revalidation or updating of the cached data
  };
}
