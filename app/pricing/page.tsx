'use client';

import React, { useTransition, useState } from 'react'; // Added useTransition and useState
import { upgradeToPro, type UpgradeActionState } from '@/app/(auth)/actions'; // Added server action import

const PricingPage = () => {
  const [isPending, startTransition] = useTransition();
  // Optional: State to hold the result of the action
  const [actionResult, setActionResult] = useState<UpgradeActionState | null>(null);

  const handleUpgradeClick = () => {
    startTransition(async () => {
      // FormData is not strictly needed by this action, but it's a common pattern.
      // Pass an empty FormData if the action expects it but doesn't use its values.
      // If the action doesn't need FormData at all, its signature in actions.ts could be simplified.
      const result = await upgradeToPro({ status: 'idle' }, new FormData());
      setActionResult(result);

      if (result.status === 'success') {
        // Optionally, redirect or show a success message.
        // The revalidatePath in the action should update relevant UI like the header button.
        console.log('Upgrade successful!');
        // You might want to refresh the page or navigate the user
        // window.location.reload();
      } else if (result.status === 'failed' || result.status === 'unauthenticated') {
        console.error('Upgrade failed:', result.error);
        // Display error to the user if needed
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-12">Pricing Plans</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Plan */}
        <div className="border rounded-lg p-6 shadow-lg bg-white">
          <h2 className="text-2xl font-semibold mb-4">Free Plan</h2>
          <p className="text-gray-600 mb-6">Basic features for individual use.</p>
          <ul className="list-disc list-inside mb-6 space-y-2 text-gray-700">
            <li>Feature 1 placeholder</li>
            <li>Feature 2 placeholder</li>
            <li>Limit A: X items</li>
            <li>Limit B: Y GB storage</li>
          </ul>
          <button
            type="button"
            className="w-full bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg cursor-default"
            disabled
          >
            Current Plan
          </button>
        </div>

        {/* Pro Plan */}
        <div className="border rounded-lg p-6 shadow-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <h2 className="text-2xl font-semibold mb-4">Pro Plan</h2>
          <p className="opacity-90 mb-6">Advanced features for power users and teams.</p>
          <ul className="list-disc list-inside mb-6 space-y-2">
            <li>Advanced Feature 1 placeholder</li>
            <li>Advanced Feature 2 placeholder</li>
            <li>Advanced Feature 3 placeholder</li>
            <li>Limit A: Unlimited items</li>
            <li>Limit B: ZZZ GB storage</li>
            <li>Priority Support</li>
          </ul>
          <button
            type="button"
            onClick={handleUpgradeClick}
            onClick={handleUpgradeClick}
            disabled={isPending} // Disable button when action is pending
            className="w-full bg-white text-purple-600 font-semibold py-3 rounded-lg hover:bg-gray-100 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Upgrading...' : 'Upgrade to Pro'}
          </button>
          {actionResult && actionResult.status === 'failed' && (
            <p className="mt-2 text-sm text-red-400">{actionResult.error || 'Upgrade failed. Please try again.'}</p>
          )}
          {actionResult && actionResult.status === 'unauthenticated' && (
            <p className="mt-2 text-sm text-red-400">You need to be logged in to upgrade.</p>
          )}
           {actionResult && actionResult.status === 'success' && (
            <p className="mt-2 text-sm text-green-400">Upgrade successful! Your plan has been updated.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
