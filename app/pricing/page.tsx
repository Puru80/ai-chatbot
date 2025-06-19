'use client';

import React, { useTransition, useState, SVGProps } from 'react';
import { upgradeToPro, type UpgradeActionState } from '@/app/(auth)/actions';

// Simple Checkmark SVG component
const CheckIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="w-5 h-5"
    {...props}
  >
    <path
      fillRule="evenodd"
      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
      clipRule="evenodd"
    />
  </svg>
);

const PricingPage = () => {
  const [isPending, startTransition] = useTransition();
  const [actionResult, setActionResult] = useState<UpgradeActionState | null>(null);

  const handleUpgradeClick = () => {
    startTransition(async () => {
      const result = await upgradeToPro({ status: 'idle' }, new FormData());
      setActionResult(result);

      if (result.status === 'success') {
        console.log('Upgrade successful!');
        // Potentially refresh or show persistent success message
      } else if (result.status === 'failed' || result.status === 'unauthenticated') {
        console.error('Upgrade failed:', result.error);
      }
    });
  };

  const plans = [
    {
      name: 'Free',
      price: '$0 / month',
      description: 'Get started with basic features for individual use.',
      features: [
        '10 messages per day',
        'Access to basic AI models',
        'Community support',
        'Limited chat history',
      ],
      cta: {
        text: 'Current Plan',
        disabled: true,
        action: () => {},
        className: 'w-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-semibold py-3 rounded-lg cursor-default',
      },
      cardClassName: 'bg-white dark:bg-gray-800 shadow-lg',
      featureTextColor: 'text-gray-600 dark:text-gray-300',
      checkIconColor: 'text-gray-400 dark:text-gray-500',
    },
    {
      name: 'Pro',
      price: '$10 / month', // Placeholder price
      description: 'Unlock premium features for power users and faster responses.',
      features: [
        '100 messages per day',
        'Access to all AI models (including premium)',
        'Faster response times',
        'Priority email support',
        'Unlimited chat history',
      ],
      cta: {
        text: 'Upgrade to Pro',
        pendingText: 'Upgrading...',
        disabled: isPending,
        action: handleUpgradeClick,
        className: 'w-full bg-white text-purple-600 font-semibold py-3 rounded-lg hover:bg-gray-100 transition duration-150 ease-in-out disabled:opacity-75 disabled:cursor-not-allowed shadow-md hover:shadow-lg',
      },
      cardClassName: 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-xl ring-1 ring-purple-900/5',
      featureTextColor: 'text-purple-100',
      checkIconColor: 'text-purple-300',
      isProPlan: true, // Flag for specific Pro plan messages
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <header className="text-center mb-12 sm:mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Select the plan that best fits your needs and unlock more features.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl p-6 sm:p-8 flex flex-col ${plan.cardClassName}`}
            >
              <h2 className={`text-3xl font-bold mb-3 ${plan.isProPlan ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {plan.name}
              </h2>
              <p className={`text-lg mb-1 ${plan.isProPlan ? 'text-purple-200' : 'text-gray-500 dark:text-gray-400'}`}>
                {plan.price}
              </p>
              <p className={`text-sm mb-6 min-h-[40px] ${plan.isProPlan ? 'text-purple-200' : 'text-gray-500 dark:text-gray-400'}`}>
                {plan.description}
              </p>

              <ul className="space-y-3 mb-8 flex-grow">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckIcon className={`mr-2 mt-1 flex-shrink-0 ${plan.checkIconColor}`} />
                    <span className={plan.featureTextColor}>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={plan.cta.action}
                disabled={plan.cta.disabled}
                className={plan.cta.className}
              >
                {plan.cta.disabled && plan.name === 'Pro' && isPending ? plan.cta.pendingText : plan.cta.text}
              </button>

              {plan.isProPlan && actionResult && (
                <div className="mt-4 text-center text-sm">
                  {actionResult.status === 'success' && (
                    <p className="text-green-300">Upgrade successful! Your plan has been updated.</p>
                  )}
                  {actionResult.status === 'failed' && (
                    <p className="text-red-300">{actionResult.error || 'Upgrade failed. Please try again.'}</p>
                  )}
                  {actionResult.status === 'unauthenticated' && (
                    <p className="text-red-300">You need to be logged in to upgrade.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
