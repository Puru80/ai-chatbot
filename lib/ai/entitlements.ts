import type { UserType } from "@/app/(auth)/auth";
import { chatModels, type ChatModel } from "./models";

interface Entitlements {
  maxMessagesPerDay: number;
  availableChatModelIds: Array<ChatModel["id"]>;
}

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */
  guest: {
    maxMessagesPerDay: 20,
    availableChatModelIds: ["deepseek/deepseek-chat-v3-0324:free"],
  },

  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: chatModels.map(item => item.id),
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
