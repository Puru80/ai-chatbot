'use server';

import { generateText, type UIMessage } from 'ai';
import { cookies } from 'next/headers';
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById, updateChatTitleById,
  updateChatVisiblityById,
} from '@/lib/db/queries';
import type { VisibilityType } from '@/components/visibility-selector';
import { myProvider } from '@/lib/ai/providers';
import { OpenRouterProvider } from "@/lib/ai/openrouter-provider";

const openRouterProvider = new OpenRouterProvider();

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('chat-model', model);
}

export async function generateTitleFromUserMessage({
  message,
  selectedChatModel
}: {
  message: UIMessage;
  selectedChatModel: string
}) {
  const { text: title } = await generateText({
    model: openRouterProvider.getModelInstance({model: selectedChatModel}),
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - assume that the user will chat on the same topic as the first message
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: JSON.stringify(message),
  });

  return title;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}

export async function updateChatTitle({
                                        chatId,
                                        title,
                                      }: {
  chatId: string;
  title: string;
}) {
  // Implement your DB update logic here
  await updateChatTitleById({ chatId, title }); // You need to implement this in your db/queries
}
