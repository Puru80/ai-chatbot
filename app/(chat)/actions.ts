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

export async function generateEnhancedPrompt({
  message
}: {
  message: UIMessage;
}) {
  console.log("Message Content: ", message.content);
  const {text: prompt} = await generateText({
    model: openRouterProvider.getModelInstance({model: "meta-llama/llama-4-scout:free"}),
    system: `\n
    You are a world-class prompt engineer, expert in prompt transformation and enhancement for large language models. Your job is to take raw, unclear, vague, or under-specified prompts and convert them into highly effective, well-scoped, unambiguous, and goal-directed prompts suitable for use with state-of-the-art LLMs.

    Always ask yourself:
    - What is the user’s true intent?
    - Is the task clear and precise?
    - Does the prompt include context, constraints, desired format, and role if needed?
    
    Enhance the user’s prompt by:
    - Rewriting it in a clearer, more effective format.
    - Filling in missing but obvious intent or context.
    - Adding role instructions, format requirements, and examples where appropriate.
    - Making it specific while preserving flexibility when necessary.
    
    In addition to improving the user prompt, also generate a general system prompt that would help guide an LLM to respond effectively to the enhanced task.
    
    **Output your result strictly in valid JSON.**
    
    **Return the response only int the following, no trailing '\`' please:**
    
    **{**
      **"user_prompt": "enhanced version of the user's original prompt with all internal quotes escaped and no trailing commas",**
      **"system_prompt": "system prompt for the AI, also escaped properly and free of line breaks or invalid characters"**
    **}**

    Focus on clarity, specificity, context, and desired tone or structure. Do not include any explanations or comments outside the JSON object.`,
    prompt: message.content
  })

  console.log("Enhanced Prompt: ", prompt);

  return JSON.parse(prompt);
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
