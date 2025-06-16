'use client';

import type { User } from 'next-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react'; // Added useEffect, useState
import { getUserPromptUsage } from '@/app/(chat)/actions'; // Added getUserPromptUsage
import { usePromptUsageData } from '@/hooks/use-prompt-usage'; // Added SWR hook
import { PlusIcon } from '@/components/icons';
import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  const {promptUsage, isLoadingUsage, errorUsage} = usePromptUsageData();

  const percentage = promptUsage && promptUsage.dailyQuota > 0
    ? (promptUsage.promptCount / promptUsage.dailyQuota) * 100
    : 0;

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center">
            <Link
              href="/"
              onClick={() => {
                setOpenMobile(false);
              }}
              className="flex flex-row gap-3 items-center"
            >
              <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer">
                Chatbot
              </span>
            </Link>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  type="button"
                  className="p-2 h-fit"
                  onClick={() => {
                    setOpenMobile(false);
                    router.push('/');
                    router.refresh();
                  }}
                >
                  <PlusIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent align="end">New Chat</TooltipContent>
            </Tooltip>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarHistory user={user} />
      </SidebarContent>
      <SidebarFooter>
        {user && isLoadingUsage && (
          <div className="px-4 mb-2">
            <p className="text-xs text-muted-foreground mb-1">Loading usage...</p>
            <div className="w-full bg-muted dark:bg-neutral-700 rounded-full h-2.5">
              <div className="bg-primary h-2.5 rounded-full" style={{width: `0%`}}></div>
            </div>
          </div>
        )}
        {user && errorUsage && (
          <div className="px-4 mb-2">
            <p className="text-xs text-destructive mb-1">Failed to load usage.</p>
          </div>
        )}
        {user && !isLoadingUsage && !errorUsage && promptUsage && (
          <div className="px-4 mb-2">
            <p className="text-xs text-muted-foreground mb-1">
              Daily Prompts: {promptUsage.promptCount} / {promptUsage.dailyQuota}
            </p>
            <div className="w-full bg-muted dark:bg-neutral-700 rounded-full h-2.5">
              <div
                className="bg-primary h-2.5 rounded-full"
                style={{width: `${percentage}%`}}
              ></div>
            </div>
            {promptUsage.limitExhaustedAt && ( // This implies limitExhaustedAt is a Date object or a truthy value
              <p className="text-xs text-destructive mt-1">Limit reached. Resets after 5:30 AM IST.</p>
            )}
          </div>
        )}
        {user && <SidebarUserNav user={user} />}
      </SidebarFooter>
    </Sidebar>
  );
}
