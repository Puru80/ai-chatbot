import {
  appendResponseMessages,
  createDataStream,
  smoothStream,
  streamText,
  type CoreMessage, UserContent, AssistantContent, ToolContent, // Added CoreMessage
} from "ai";
import {auth, type UserType} from "@/app/(auth)/auth";
import {type RequestHints, systemPrompt} from "@/lib/ai/prompts";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  // getMessageCountByUserId, // Commented out as per requirement
  getMessagesByChatId,
  getStreamIdsByChatId,
  getUserPersonality, // Added getUserPersonality
  saveChat,
  saveMessages,
  getPromptUsage,
  createOrUpdatePromptUsage,
} from "@/lib/db/queries";
import {generateUUID, getTrailingMessageId} from "@/lib/utils";
import {generateTitleFromUserMessage, generateEnhancedPrompt} from "../../actions";
import {isProductionEnvironment} from "@/lib/constants";
import {entitlementsByUserType} from "@/lib/ai/entitlements";
import {postRequestBodySchema, type PostRequestBody} from "./schema";
import {geolocation} from "@vercel/functions";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import {after} from "next/server";
import type {Chat} from "@/lib/db/schema";
import {differenceInSeconds} from "date-fns";
import {OpenRouterProvider} from "@/lib/ai/openrouter-provider";
import {LLMManager} from "@/lib/ai/manager";

const openRouterProvider = new OpenRouterProvider();
const llmManager = LLMManager.getInstance();

const CONTEXT_TOKEN_BUDGET = 4000; // Added token budget

let globalStreamContext: ResumableStreamContext | null = null;

function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL"
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

// Helper to estimate token count (simple heuristic)
function estimateTokens(text: string | UserContent | AssistantContent | ToolContent): number {
  return Math.ceil(text.length / 4);
}

// Define DBMessage type based on usage, assuming parts is an array of text objects
// This is an approximation; ideally, it would be imported or defined more concretely.
interface DBMessagePart {
  type: 'text' | string; // Assuming 'text' is one type, but could be others
  text: string;
  // Potentially other fields like 'mimeType' for non-text parts
}

interface DBMessage {
  id: string;
  role: 'user' | 'assistant' | 'system'; // Or other roles if they exist in DB
  parts: DBMessagePart[];
  createdAt: Date | string; // Assuming it could be Date object or string
  // Other fields like chatId, modelId etc. might exist but are not needed for CoreMessage conversion
}

// Helper to convert DBMessage[] to CoreMessage[]
function mapDbMessagesToCoreMessages(dbMessages: DBMessage[]): CoreMessage[] {
  return dbMessages.map(dbMsg => ({
    id: dbMsg.id,
    role: dbMsg.role as 'user' | 'assistant' | 'system', // Ensure role compatibility
    content: dbMsg.parts
      .filter(part => part.type === 'text') // Filter for text parts
      .map(part => part.text)
      .join('\n'), // Concatenate text parts
  }));
}

// Updated truncateConversationHistory function
async function truncateConversationHistory(
  allMessages: CoreMessage[], // Chronological order (oldest to newest)
  systemPromptString: string,
  tokenBudget: number
): Promise<CoreMessage[]> {
  const systemPromptTokens = estimateTokens(systemPromptString);
  let remainingBudgetForHistory = tokenBudget - systemPromptTokens;

  if (remainingBudgetForHistory <= 0) {
    return []; // No budget left for messages
  }

  const truncatedMessages: CoreMessage[] = [];
  // Iterate from newest to oldest
  for (let i = allMessages.length - 1; i >= 0; i--) {
    const message = allMessages[i];
    const messageTokens = estimateTokens(message.content);

    if (remainingBudgetForHistory - messageTokens >= 0) {
      truncatedMessages.push(message);
      remainingBudgetForHistory -= messageTokens;
    } else {
      // Optional: if we want to allow partial messages or a summary
      // For now, we just stop including messages once budget is hit.
      break;
    }
  }
  return truncatedMessages.reverse(); // Restore chronological order
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (e) {
    console.log("Error: ", e);
    return new Response("Invalid request body", {status: 400});
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
      shouldEnhancePrompt
    } =
      requestBody;

    const session = await auth();

    if (!session?.user) {
      return new Response("Unauthorized", {status: 401});
    }

    const userPersonalityContext = await getUserPersonality(session.user.id);

    const userType: UserType = session.user.type;

    if (userType === 'guest') {
      return Response.json({redirectToSignUp: true, prompt: requestBody.message});
    }

    // --- Prompt Usage Reset & Check Logic START ---
    const dailyQuota = entitlementsByUserType[userType].maxMessagesPerDay;

    const currentUTCDate = new Date();
    currentUTCDate.setUTCHours(0, 0, 0, 0);

    const nowIST = new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000));
    const resetHourIST = 5;
    const resetMinuteIST = 30;

    let userPromptUsage = await getPromptUsage(session.user.id, currentUTCDate);

    if (!userPromptUsage) {
      const yesterdayUTCDate = new Date(currentUTCDate);
      yesterdayUTCDate.setUTCDate(currentUTCDate.getUTCDate() - 1);
      const previousDayUsage = await getPromptUsage(session.user.id, yesterdayUTCDate);

      if (previousDayUsage) {
        const previousDayExhausted = previousDayUsage.limit_exhausted_at || previousDayUsage.prompt_count >= previousDayUsage.daily_quota;
        const isPastResetTimeIST = nowIST.getUTCHours() > resetHourIST || (nowIST.getUTCHours() === resetHourIST && nowIST.getUTCMinutes() >= resetMinuteIST);

        if (previousDayExhausted && isPastResetTimeIST) {
          // Reset triggered: Create a new record for the current UTC day with 0 prompts
          await createOrUpdatePromptUsage({
            userId: session.user.id,
            date: currentUTCDate,
            promptCount: 0,
            limitExhaustedAt: null,
            dailyQuota: dailyQuota, // Use current day's quota
            // No id, so it inserts a new record
          });
          // Re-fetch userPromptUsage for currentUTCDate as it's now reset
          userPromptUsage = await getPromptUsage(session.user.id, currentUTCDate);
        }
      }
    }

    // Initialize variables for current day's usage from userPromptUsage (which is for currentUTCDate)
    let promptCountToday = 0;
    let limitExhaustedTimestamp;
    let promptUsageId: string | undefined;

    if (userPromptUsage) {
        promptCountToday = userPromptUsage.prompt_count;
        limitExhaustedTimestamp = userPromptUsage.limit_exhausted_at;
        promptUsageId = userPromptUsage.id; // This ID is for the currentUTCDate record
    }
    // else, if userPromptUsage is still null, it's the user's first prompt today and no reset was applicable.
    // The first prompt will create a new record in onFinish.

    // Check if limit was already exhausted today (e.g. from a previous request today after reset)
    if (limitExhaustedTimestamp) {
      let res = new Response("You have exhausted your daily prompt limit and need to wait for it to reset.", { status: 429 })
      console.log("Response: ", res);
      return res
    }

    // Check if current prompt attempt would exceed quota for today
    if (promptCountToday >= dailyQuota) {
        const now = new Date(); // For limit_exhausted_at timestamp
        // This update is for the currentUTCDate record
        await createOrUpdatePromptUsage({
            userId: session.user.id,
            date: currentUTCDate, // Explicitly use currentUTCDate
            promptCount: promptCountToday, // or dailyQuota
            limitExhaustedAt: now,
            dailyQuota: dailyQuota,
            id: promptUsageId ? promptUsageId: undefined // Pass ID to update existing record for currentUTCDate
        });
        return new Response("You have reached your daily prompt limit.", { status: 429 });
    }
    // --- Prompt Usage Reset & Check Logic END ---

    const chat = await getChatById({id});

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message,
        selectedChatModel
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== session.user.id) {
        return new Response("Forbidden", {status: 403});
      }
    }

    let enhancedUserPrompt: string | undefined;
    let enhancedSystemPrompt: string | undefined;
    if (shouldEnhancePrompt) {
      const enhancedPrompt = await generateEnhancedPrompt({
        message
      })

      // console.log("Enhanced Prompt: ", enhancedPrompt.user_prompt);
      // console.log("Enhanced System Prompt: ", enhancedPrompt.system_prompt);

      enhancedSystemPrompt = enhancedPrompt.user_prompt;
      enhancedUserPrompt = enhancedPrompt.system_prompt;
    }

    // Building appropriate context
    const dbPreviousMessages = await getMessagesByChatId({id});
    // Convert DB messages to CoreMessages
    // Assuming getMessagesByChatId returns something compatible with DBMessage[]
    const previousCoreMessages: CoreMessage[] = mapDbMessagesToCoreMessages(dbPreviousMessages as DBMessage[]);

    // Convert the new user message (UIMessage from 'ai') to CoreMessage
    const currentUserCoreMessage: CoreMessage = {
      // id: message.id, // from requestBody.message (UIMessage)
      role: message.role as 'user', // from requestBody.message
      content: enhancedUserPrompt ? enhancedUserPrompt : message.parts.map(p => p.text).join('\n'), // Handle UIMessagePart
    };

    const allCoreMessages: CoreMessage[] = [...previousCoreMessages, currentUserCoreMessage];

    const {longitude, latitude, city, country} = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    // Prepare system prompt with personality
    let baseSystemPrompt = systemPrompt({selectedChatModel, requestHints});
    if (enhancedSystemPrompt) { // If using enhanced prompt, that takes precedence
      baseSystemPrompt = enhancedSystemPrompt;
    }
    const finalSystemPrompt = userPersonalityContext
      ? userPersonalityContext + "\n\n" + baseSystemPrompt
      : baseSystemPrompt;

    // Call truncation function
    const curatedMessages = await truncateConversationHistory(
      allCoreMessages,
      finalSystemPrompt, // This already includes personality
      CONTEXT_TOKEN_BUDGET
    );

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: "user",
          parts: message.parts,
          attachments: message.experimental_attachments ?? [],
          createdAt: new Date(),
          modelId: null
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({streamId, chatId: id});

    const modelName = llmManager.getModelNameById(selectedChatModel);

    const stream = createDataStream({
      execute: (dataStream) => {
        const result = streamText({
          model: openRouterProvider.getModelInstance({model: selectedChatModel}),
          system: finalSystemPrompt, // This contains base system prompt + geo hints + user personality
          messages: curatedMessages, // These are the user/assistant messages, truncated
          maxSteps: 5,
          // experimental_activeTools:
          //   selectedChatModel === "chat-model-reasoning"
          //     ? []
          //     : [
          //         "getWeather",
          //         "createDocument",
          //         "updateDocument",
          //         "requestSuggestions",
          //       ],
          experimental_transform: smoothStream({chunking: "line"}),
          experimental_generateMessageId: generateUUID,
          tools: {
            // getWeather,
            // createDocument: createDocument({ session, dataStream }),
            // updateDocument: updateDocument({ session, dataStream }),
            // requestSuggestions: requestSuggestions({
            //   session,
            //   dataStream,
            // }),
          },
          onFinish: async ({response}) => {
            if (session.user?.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === "assistant"
                  ),
                });

                if (!assistantId) {
                  throw new Error("No assistant message found!");
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [message],
                  responseMessages: response.messages,
                });

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments:
                        assistantMessage.experimental_attachments ?? [],
                      createdAt: new Date(),
                      modelId: modelName,
                    },
                  ],
                });

                    // --- Increment Prompt Usage START ---
                    // Re-fetch current usage for currentUTCDate to ensure atomicity if multiple requests are near-simultaneous
                    const currentUsageOnFinish = await getPromptUsage(session.user.id, currentUTCDate);
                    let countForUpdate = 1;
                    let idForUpdateInOnFinish = promptUsageId; // Use ID from initial check if available for currentUTCDate

                    if (currentUsageOnFinish) {
                        countForUpdate = currentUsageOnFinish.prompt_count + 1;
                        idForUpdateInOnFinish = currentUsageOnFinish.id; // Always use the most current ID
                    } else if (promptUsageId) {
                        // This means a record for currentUTCDate existed initially (e.g. after reset) but somehow gone now?
                        // Or promptUsageId was from a previous day if logic was different.
                        // For safety, if currentUsageOnFinish is null, it's better to treat as insert for currentUTCDate.
                        // However, our promptUsageId is already for currentUTCDate due to the logic at the start.
                        // If userPromptUsage was null initially, promptUsageId is null.
                        // If userPromptUsage was populated (either by fetch or reset), promptUsageId is for currentUTCDate.
                        countForUpdate = 1; // Should be first prompt if no record found now.
                    }


                    await createOrUpdatePromptUsage({
                        userId: session.user.id,
                        date: currentUTCDate, // Use currentUTCDate for the record
                        promptCount: countForUpdate,
                        limitExhaustedAt: (countForUpdate >= dailyQuota) ? new Date() : null,
                        dailyQuota: dailyQuota,
                        id: idForUpdateInOnFinish // This will be null if no record existed for currentUTCDate yet, leading to an insert.
                                                 // Or it will be the ID of currentUTCDate's record.
                    });
                    // --- Increment Prompt Usage END ---

                  } catch (e) {
                    console.error("Failed to save chat or update prompt usage", e);
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
        });

        result.toDataStreamResponse({
          getErrorMessage: (error) => {
            console.log("Possible Error: ", error);
            return "An unknown error occurred.";
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: () => {
        return "Oops, an error occurred!";
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () => stream)
      );
    } else {
      return new Response(stream);
    }
  } catch (e) {
    console.log(e);
    return new Response("An error occurred while processing your request!", {
      status: 500,
    });
  }
}

export async function GET(request: Request) {
  const streamContext = getStreamContext();
  const resumeRequestedAt = new Date();

  if (!streamContext) {
    return new Response(null, {status: 204});
  }

  const {searchParams} = new URL(request.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return new Response("id is required", {status: 400});
  }

  const session = await auth();

  if (!session?.user) {
    return new Response("Unauthorized", {status: 401});
  }

  let chat: Chat;

  try {
    chat = await getChatById({id: chatId});
  } catch {
    return new Response("Not found", {status: 404});
  }

  if (!chat) {
    return new Response("Not found", {status: 404});
  }

  if (chat.visibility === "private" && chat.userId !== session.user.id) {
    return new Response("Forbidden", {status: 403});
  }

  const streamIds = await getStreamIdsByChatId({chatId});

  if (!streamIds.length) {
    return new Response("No streams found", {status: 404});
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new Response("No recent stream found", {status: 404});
  }

  const emptyDataStream = createDataStream({
    execute: () => {
    },
  });

  const stream = await streamContext.resumableStream(
    recentStreamId,
    () => emptyDataStream
  );

  /*
   * For when the generation is streaming during SSR
   * but the resumable stream has concluded at this point.
   */
  if (!stream) {
    const messages = await getMessagesByChatId({id: chatId});
    const mostRecentMessage = messages.at(-1);

    if (!mostRecentMessage) {
      return new Response(emptyDataStream, {status: 200});
    }

    if (mostRecentMessage.role !== "assistant") {
      return new Response(emptyDataStream, {status: 200});
    }

    const messageCreatedAt = new Date(mostRecentMessage.createdAt);

    if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
      return new Response(emptyDataStream, {status: 200});
    }

    const restoredStream = createDataStream({
      execute: (buffer) => {
        buffer.writeData({
          type: "append-message",
          message: JSON.stringify(mostRecentMessage),
        });
      },
    });

    return new Response(restoredStream, {status: 200});
  }

  return new Response(stream, {status: 200});
}

export async function DELETE(request: Request) {
  const {searchParams} = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", {status: 404});
  }

  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", {status: 401});
  }

  try {
    const chat = await getChatById({id});

    if (chat.userId !== session.user.id) {
      return new Response("Forbidden", {status: 403});
    }

    const deletedChat = await deleteChatById({id});

    return Response.json(deletedChat, {status: 200});
  } catch (error) {
    console.error(error);
    return new Response("An error occurred while processing your request!", {
      status: 500,
    });
  }
}
