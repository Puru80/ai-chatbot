'use client';

import type { AppMessage } from '@/app/types/model';
import type {Attachment} from 'ai';
import {GuestLimitModal} from './guest-limit-modal';
import {useChat} from '@ai-sdk/react';
import {useEffect, useState} from 'react';
import useSWR, {useSWRConfig} from 'swr';
import {ChatHeader} from '@/components/chat-header';
import type {Vote} from '@/lib/db/schema';
import {fetcher, generateUUID} from '@/lib/utils';
import {Artifact} from './artifact';
import {MultimodalInput} from './multimodal-input';
import {Messages} from './messages';
import type {VisibilityType} from './visibility-selector';
import {useArtifactSelector} from '@/hooks/use-artifact';
import {unstable_serialize} from 'swr/infinite';
import {getChatHistoryPaginationKey} from './sidebar-history';
import {toast} from './toast';
import type {Session} from 'next-auth';
import {useSearchParams} from 'next/navigation';
import { LimitExhaustionModal } from '@/components/limit-exhaustion-modal'; // Added
import {useChatVisibility} from '@/hooks/use-chat-visibility';
import {useAutoResume} from '@/hooks/use-auto-resume';
import {LLMManager} from "@/lib/ai/manager";

export function Chat({
                       id,
                       initialMessages,
                       initialChatModel,
                       initialVisibilityType,
                       isReadonly,
                       session,
                       autoResume,
                     }: {
  id: string;
  initialMessages: Array<AppMessage>;
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  autoResume: boolean;
}) {
  const {mutate} = useSWRConfig();

  const {visibilityType} = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

  const [shouldEnhancePrompt, setShouldEnhancePrompt] = useState(false);

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    stop,
    reload,
    experimental_resume,
    data,
  } = useChat({
    id,
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    experimental_prepareRequestBody: (body) => ({
      id,
      message: body.messages.at(-1),
      selectedChatModel: initialChatModel,
      selectedVisibilityType: visibilityType,
      shouldEnhancePrompt: shouldEnhancePrompt
    }),
    onFinish: (assistantMessage) => {
      // The assistantMessage is the final message object from the AI SDK
      // It should be an AppMessage, but let's ensure we cast it or treat it as such
      // when adding our custom field.

      setMessages(currentMessages => currentMessages.map(msg =>
        msg.id === assistantMessage.id
          ? { ...msg, modelId: LLMManager.getInstance().getModelNameById(initialChatModel) }
          : msg
      ));

      mutate(unstable_serialize(getChatHistoryPaginationKey));

      // Trigger SWR revalidation for prompt usage
      mutate('/api/prompt-usage');
    },
    onError: async (error) => {
      if (error instanceof Response) {
        const errorData = await error.json();
        if (error.status === 429 || errorData?.message?.includes('limit')) {
          setIsLimitModalOpen(true);
        } else {
          toast({
            type: 'error',
            description: errorData.message || 'An error occurred while processing your request.',
          });
        }
      } else {
        const errorMessage = error.message || 'An unknown error occurred.';
        if (errorMessage.includes('limit') || errorMessage.includes('429')) {
          setIsLimitModalOpen(true);
        } else {
          toast({
            type: 'error',
            description: errorMessage,
          });
        }
      }
    },
  });

  const searchParams = useSearchParams();
  const query = searchParams.get('query');

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      append({
        role: 'user',
        content: query,
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, '', `/chat/${id}`);
    }
  }, [query, append, hasAppendedQuery, id]);

  const {data: votes} = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  const [showGuestModal, setShowGuestModal] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false); // Added

  const isGuest = session?.user?.type === 'guest';

  const handleInputSubmit = async (...args: any[]) => {
    if (isGuest) {
      // Store the current input in localStorage for retrieval after login/signup
      if (input && input.length > 0) {
        localStorage.setItem('guest_prompt', input);
      }
      setShowGuestModal(true);
      return;
    }
    // Call the original handleSubmit from useChat
    return handleSubmit(...args);
  };

  // Restore prompt from localStorage after login/signup
  useEffect(() => {
    if (!isGuest) {
      const storedPrompt = localStorage.getItem('guest_prompt');
      if (storedPrompt) {
        setInput(storedPrompt);
        localStorage.removeItem('guest_prompt');
      }
    }
    // Only run when session changes (i.e., after login/signup)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.type]);

  useAutoResume({
    autoResume,
    initialMessages,
    experimental_resume,
    data,
    setMessages,
  });

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader
          chatId={id}
          selectedModelId={initialChatModel}
          selectedVisibilityType={initialVisibilityType}
          isReadonly={isReadonly}
          session={session}
        />

        <Messages
          chatId={id}
          status={status}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          isArtifactVisible={isArtifactVisible}
        />

        <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              handleSubmit={handleInputSubmit}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              append={append}
              selectedVisibilityType={visibilityType}
              shouldEnhancePrompt={shouldEnhancePrompt}
              setShouldEnhancePrompt={setShouldEnhancePrompt}
              isGuest={isGuest}
            />
          )}
        </form>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
        selectedVisibilityType={visibilityType}
        shouldEnhancePrompt={shouldEnhancePrompt}
        setShouldEnhancePrompt={setShouldEnhancePrompt}
        isGuest={isGuest}
      />

      <GuestLimitModal
        open={showGuestModal}
        onClose={() => setShowGuestModal(false)}
      />
      <LimitExhaustionModal
        isOpen={isLimitModalOpen}
        onClose={() => setIsLimitModalOpen(false)}
        // onUpgrade={() => router.push('/upgrade')} // Example if using router for upgrade
      />
    </>
  );
}
