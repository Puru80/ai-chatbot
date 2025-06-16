'use server';

import { generateText, type UIMessage } from 'ai';
import { cookies } from 'next/headers';
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById, updateChatTitleById,
  updateChatVisiblityById,
  getPromptUsage,
} from '@/lib/db/queries';
import type { VisibilityType } from '@/components/visibility-selector';
import { myProvider } from '@/lib/ai/providers';
import { OpenRouterProvider } from "@/lib/ai/openrouter-provider";
import { auth, type UserType } from '@/app/(auth)/auth';
import { entitlementsByUserType } from '@/lib/ai/entitlements';

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
    model: openRouterProvider.getModelInstance({model: "qwen/qwen3-14b:free"}),
    system: `\n
    You are a world-class prompt engineer, expert in prompt transformation and enhancement for large language models. Your job is to take raw, unclear, vague, or under-specified user prompts and convert them into highly effective, well-scoped, unambiguous, and goal-directed prompts suitable for use with state-of-the-art LLMs. You must also generate a general system prompt that defines the AI's role and broad behavioral guidelines for the enhanced task.

    **Guidance for Prompt Enhancement Process:**
    1.  **Analyze User Intent:** Always ask yourself: What is the user’s true intent? Is the core task clear and precise? What context, constraints, desired format, and role might be missing but are essential for optimal LLM performance?
    2.  **Enhance User Prompt (Specific Task Focus):**
        *   Rewrite the user's original prompt to be clearer, more effective, and comprehensive.
        *   Fill in missing but obvious intent or context.
        *   Add specific role instructions (if a temporary, task-specific role is beneficial), detailed format requirements, and concrete examples where appropriate.
        *   Make it highly specific to the task while preserving necessary flexibility.
        *   Use clear section dividers (e.g., \`### Context ###\`, \`### Task ###\`, \`### Output Format ###\`) if the enhanced prompt is complex.
    3.  **Generate System Prompt (General Role & Behavior Focus):**
        *   Create a *general* system prompt that defines the AI's overarching role and broad behavioral guidelines for responding to the enhanced task.
        *   This system prompt should be task-agnostic. It should *not* contain specific details of the user's immediate request.
        *   Focus on role assignment (e.g., "You are a helpful assistant," "You are an expert analyst") and general behavioral constraints (e.g., "Maintain a professional tone," "Prioritize factual accuracy," "Do not offer medical advice").
        *   Avoid any specific task instructions or context that belong in the enhanced user prompt.
        *   Ensure it sets a consistent and adaptable foundation for the LLM.
    4.  **Strict JSON Output:**
        *   Output your result strictly in valid JSON.
        *   Ensure all internal quotes are escaped properly.
        *   Do not include any trailing commas within the JSON object.
        *   Return the response only in the following format, with no trailing backslashes:
    
        {
          "user_prompt": "enhanced version of the user's original prompt with all internal quotes escaped and no trailing commas",
          "system_prompt": "system prompt for the AI, also escaped properly and free of line breaks or invalid characters"
        }

    Do not include any explanations or comments outside the JSON object.`,
    prompt: message.content
  })

  // console.log("Enhanced Prompt: ", prompt);

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

export async function getUserPromptUsage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.type) {
    return null; // Or throw an error, or return a specific structure
  }

  const userType = session.user.type as UserType;
  const dailyQuota = entitlementsByUserType[userType].maxMessagesPerDay;

  const currentUTCDate = new Date();
  currentUTCDate.setUTCHours(0, 0, 0, 0);

  const usageRecord = await getPromptUsage(session.user.id, currentUTCDate);

  if (usageRecord) {
    return {
      promptCount: usageRecord.prompt_count,
      dailyQuota: usageRecord.daily_quota, // Use quota from record
      limitExhaustedAt: usageRecord.limit_exhausted_at
    };
  } else {
    // No record for today, means count is 0
    return {
      promptCount: 0,
      dailyQuota: dailyQuota, // Fresh quota for the day
      limitExhaustedAt: null
    };
  }
}
