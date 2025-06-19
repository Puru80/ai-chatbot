'use client';

import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';

import { ModelSelector } from '@/components/model-selector';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { PlusIcon } from './icons';
import { useSidebar } from './ui/sidebar';
import { memo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { type VisibilityType, VisibilitySelector } from './visibility-selector';
import type { Session } from 'next-auth';
import Link from 'next/link'; // Added Link import

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
  session,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session; // Assuming Session type includes user.type or we'll adjust later
}) {
  const router = useRouter();
  const { open } = useSidebar();

  const { width: windowWidth } = useWindowSize();

  return (
    <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
      <SidebarToggle />

      {(!open || windowWidth < 768) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="order-2 md:order-1 md:px-2 px-2 md:h-fit ml-auto md:ml-0"
              onClick={() => {
                router.push('/');
                router.refresh();
              }}
            >
              <PlusIcon />
              <span className="md:sr-only">New Chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Chat</TooltipContent>
        </Tooltip>
      )}

      {!isReadonly && (
        <ModelSelector
          session={session}
          selectedModelId={selectedModelId}
          className="order-1 md:order-2"
        />
      )}

      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
          className="order-1 md:order-3"
        />
      )}

      {/* Upgrade to Pro Button - Conditionally Rendered */}
      {session?.user && session.user.type !== 'pro' && (
        <Button
          asChild // Use asChild to pass props to Link
          variant="outline" // Changed from ghost to outline
          // New order: md:order-4. Default order adjusted to 4. Removed ml-auto to keep it grouped.
          className="order-4 md:order-4 px-3 h-fit md:h-[34px] text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 border-purple-600 dark:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30"
        >
          <Link href="/pricing">
            Upgrade to Pro
          </Link>
        </Button>
      )}

      {/* Existing empty Button, seems like a placeholder or for other purposes. Adjusted order to be last. */}
      <Button
        className="bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-zinc-50 dark:text-zinc-900 hidden md:flex py-1.5 px-2 h-fit md:h-[34px] order-last md:order-5 md:ml-auto" // Changed to order-last (or md:order-5 if more items were added)
        asChild
      />
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  // Considering session changes for memoization if needed, but for now, modelId is the key.
  // If session.user.type changes often and should trigger re-render, this condition might need adjustment.
  return (
    prevProps.selectedModelId === nextProps.selectedModelId &&
    prevProps.session?.user?.type === nextProps.session?.user?.type &&
    prevProps.chatId === nextProps.chatId &&
    prevProps.isReadonly === nextProps.isReadonly &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType
  );
});
