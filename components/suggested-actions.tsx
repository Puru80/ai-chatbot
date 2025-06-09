'use client';

import {motion} from 'framer-motion';
import {Button} from './ui/button';
import {memo, useState} from 'react';
import type {UseChatHelpers} from '@ai-sdk/react';
import type {VisibilityType} from './visibility-selector';
import {GuestLimitModal} from "@/components/guest-limit-modal";

interface SuggestedActionsProps {
  chatId: string;
  append: UseChatHelpers['append'];
  selectedVisibilityType: VisibilityType;
  isGuest: boolean
}

function PureSuggestedActions({
                                chatId,
                                append,
                                selectedVisibilityType,
                                isGuest
                              }: SuggestedActionsProps) {
  const suggestedActions = [
    {
      title: 'What are the advantages',
      label: 'of using Next.js?',
      action: 'What are the advantages of using Next.js?',
    },
    {
      title: 'Write code to',
      label: `demonstrate djikstra's algorithm`,
      action: `Write code to demonstrate djikstra's algorithm`,
    },
    {
      title: 'Help me write an essay',
      label: `about silicon valley`,
      action: `Help me write an essay about silicon valley`,
    },
    {
      title: 'What is the weather',
      label: 'in San Francisco?',
      action: 'What is the weather in San Francisco?',
    },
  ];

  const [showGuestModal, setShowGuestModal] = useState(false);

  const handleActionClick = async (event: any, action: string) => {
    event?.preventDefault();

    if (isGuest) {
      localStorage.setItem('redirect_chat_id', chatId)
      setShowGuestModal(true);
      return;
    }

    window.history.replaceState({}, '', `/chat/${chatId}`);
    append({
      role: 'user',
      content: action,
    });
  };

  return (
    <>
      <div
        data-testid="suggested-actions"
        className="grid sm:grid-cols-2 gap-2 w-full"
      >
        {suggestedActions.map((suggestedAction, index) => (
          <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: 20}}
            transition={{delay: 0.05 * index}}
            key={`suggested-action-${suggestedAction.title}-${index}`}
            className={index > 1 ? 'hidden sm:block' : 'block'}
          >
            <Button
              variant="ghost"
              onClick={(event) =>
                handleActionClick(event, suggestedAction.action)
              }
              className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start"
            >
              <span className="font-medium">{suggestedAction.title}</span>
              <span className="text-muted-foreground">
              {suggestedAction.label}
            </span>
            </Button>
          </motion.div>
        ))}
      </div>

      <GuestLimitModal
        open={showGuestModal}
        onClose={() => setShowGuestModal(false)}
      />

    </>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) return false;
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType)
      return false;
    if (prevProps.isGuest !== nextProps.isGuest) return false;

    return true;
  },
);
