'use server';

import { generateText, type UIMessage } from 'ai';
import { cookies } from 'next/headers';
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById, updateChatTitleById,
  updateChatVisiblityById,
  getUserPromptDetails,
  incrementUserPromptCount,
  resetUserPromptQuota,
} from '@/lib/db/queries';
import type { VisibilityType } from '@/components/visibility-selector';
import { myProvider } from '@/lib/ai/providers';
import { OpenRouterProvider } from "@/lib/ai/openrouter-provider";
import { auth } from '@/app/(auth)/auth';
import { entitlementsByUserType } from '@/lib/ai/entitlements';

const openRouterProvider = new OpenRouterProvider();

// Helper function to calculate the next reset time in IST, returned as a UTC Date object
function calculateNextResetTimeIST(): Date {
  const now = new Date(); // Current time in local (server) timezone

  // IST is UTC+5:30. We want to find the next 5:30 AM IST.
  // Let's work in UTC to avoid local timezone complexities.
  const resetHourIST = 5;
  const resetMinuteIST = 30;

  // Get current UTC date parts
  const currentUTCFullYear = now.getUTCFullYear();
  const currentUTCMonth = now.getUTCMonth(); // 0-indexed
  const currentUTCDate = now.getUTCDate();

  // Create a Date object for 5:30 AM IST today in UTC
  // UTC Hour = IST Hour - 5 (5 - 5 = 0)
  // UTC Minute = IST Minute - 30 (30 - 30 = 0)
  // So, 5:30 AM IST is 00:00 UTC on the same day.
  let resetTimeUTC = new Date(Date.UTC(currentUTCFullYear, currentUTCMonth, currentUTCDate, 0, 0, 0, 0));

  // Check if current UTC time is already past 00:00 UTC (which is 5:30 AM IST)
  const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds()));

  if (nowUTC.getTime() >= resetTimeUTC.getTime()) {
    // If current time is past 5:30 AM IST today, set reset for 5:30 AM IST tomorrow
    resetTimeUTC.setUTCDate(resetTimeUTC.getUTCDate() + 1);
  }

  // The resetTimeUTC is already at 00:00 UTC, which corresponds to 5:30 AM IST.
  // If we wanted to be more precise about the 5:30 AM IST mark for calculation before comparison:
  // Target UTC hour for 5:30 AM IST is 0 (5 - 5)
  // Target UTC minute for 5:30 AM IST is 0 (30 - 30)

  // Let's refine the logic slightly to be absolutely sure about "next"
  // Construct the reset time for *today* 5:30 AM IST in UTC
  let nextResetUTC = new Date(Date.UTC(currentUTCFullYear, currentUTCMonth, currentUTCDate, 0, 0, 0, 0)); // 5:30 AM IST is 00:00 UTC

  // If 'now' (in UTC) is already past today's 00:00 UTC (5:30 AM IST)
  // then the next reset is tomorrow's 00:00 UTC (5:30 AM IST tomorrow)
  if (nowUTC.getTime() >= nextResetUTC.getTime()) {
      nextResetUTC.setUTCDate(nextResetUTC.getUTCDate() + 1);
  }

  return nextResetUTC;
}

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
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized: User session not found.');
  }
  const userId = session.user.id;

  let userDetails = await getUserPromptDetails(userId);
  if (!userDetails) {
    throw new Error('User details not found.');
  }

  const userType = userDetails.type || 'guest';
  const maxPrompts = entitlementsByUserType[userType]?.maxMessagesPerDay ?? 0;
  let promptCount = userDetails.prompt_count ?? 0;
  let quotaResetsAt = userDetails.quota_resets_at ? new Date(userDetails.quota_resets_at) : null;

  const now = new Date();
  const nextCalculatedResetTime = calculateNextResetTimeIST();

  // Reset logic
  if (quotaResetsAt && quotaResetsAt < now && promptCount >= maxPrompts) {
    await resetUserPromptQuota(userId, nextCalculatedResetTime);
    promptCount = 0;
    quotaResetsAt = nextCalculatedResetTime;
  } else if (!quotaResetsAt && promptCount >= maxPrompts) {
    await resetUserPromptQuota(userId, nextCalculatedResetTime);
    promptCount = 0;
    quotaResetsAt = nextCalculatedResetTime;
  }

  // Enforcement logic
  if (promptCount >= maxPrompts && quotaResetsAt && quotaResetsAt > now) {
    throw new Error(`Daily prompt limit of ${maxPrompts} reached. Your quota will reset at ${quotaResetsAt.toLocaleString()}.`);
  }
  if (maxPrompts === 0) {
    throw new Error("You currently do not have any prompts available. Please check your subscription.");
  }
  if (promptCount >= maxPrompts && !quotaResetsAt) {
    await resetUserPromptQuota(userId, nextCalculatedResetTime);
    throw new Error(`Daily prompt limit of ${maxPrompts} reached. Your quota will reset at ${nextCalculatedResetTime.toLocaleString()}.`);
  }

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

  await incrementUserPromptCount(userId);
  return title;
}

export async function generateEnhancedPrompt({
  message
}: {
  message: UIMessage;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized: User session not found.');
  }
  const userId = session.user.id;

  let userDetails = await getUserPromptDetails(userId);
  if (!userDetails) {
    // This case should ideally not happen for a logged-in user.
    // If it does, it might indicate a new user not yet fully in DB or an issue.
    // For now, let's assume a default state or throw an error.
    // Re-fetching or creating a default entry might be an option in a full implementation.
    throw new Error('User details not found.');
  }

  const userType = userDetails.type || 'guest'; // Default to 'guest' if type is null/undefined
  const maxPrompts = entitlementsByUserType[userType]?.maxMessagesPerDay ?? 0; // Default to 0 if type or entitlement missing
  let promptCount = userDetails.prompt_count ?? 0;
  let quotaResetsAt = userDetails.quota_resets_at ? new Date(userDetails.quota_resets_at) : null;

  const now = new Date();
  const nextCalculatedResetTime = calculateNextResetTimeIST();

  // Reset logic
  if (quotaResetsAt && quotaResetsAt < now && promptCount >= maxPrompts) {
    await resetUserPromptQuota(userId, nextCalculatedResetTime);
    promptCount = 0;
    quotaResetsAt = nextCalculatedResetTime;
  } else if (!quotaResetsAt && promptCount >= maxPrompts) {
    // If quotaResetsAt was null (e.g. new user, first time hitting limit)
    // and they've hit the max prompts, set their reset time.
    await resetUserPromptQuota(userId, nextCalculatedResetTime);
    promptCount = 0; // They just got reset
    quotaResetsAt = nextCalculatedResetTime;
  }


  // Enforcement logic
  // Check if quotaResetsAt is in the future. If it's null, it means it hasn't been set yet OR they were just reset.
  // If it's null AND promptCount is already >= maxPrompts (e.g. maxPrompts = 0), they are blocked.
  // If it's in the future AND promptCount >= maxPrompts, they are blocked.
  if (promptCount >= maxPrompts && quotaResetsAt && quotaResetsAt > now) {
    throw new Error(`Daily prompt limit of ${maxPrompts} reached. Your quota will reset at ${quotaResetsAt.toLocaleString()}.`);
  }
  // Special case: if maxPrompts is 0, they should always be blocked unless entitlements change.
  if (maxPrompts === 0) {
    throw new Error("You currently do not have any prompts available. Please check your subscription.");
  }
  // If quotaResetsAt is null (maybe a brand new user who hasn't had it set yet) and they are already over limit
  // This can happen if their maxPrompts is 0, or if they somehow bypassed the initial reset.
  if (promptCount >= maxPrompts && !quotaResetsAt) {
     // Set their reset time and then immediately tell them they are over limit.
     // This ensures their quota_resets_at field gets populated.
    await resetUserPromptQuota(userId, nextCalculatedResetTime);
    throw new Error(`Daily prompt limit of ${maxPrompts} reached. Your quota will reset at ${nextCalculatedResetTime.toLocaleString()}.`);
  }


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
  await incrementUserPromptCount(userId);
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
