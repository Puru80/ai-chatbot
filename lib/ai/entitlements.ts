import type { UserType } from "@/app/(auth)/auth";
import { chatModels} from "./models";

interface Entitlements {
  maxMessagesPerDay: number;
  availableChatModelIds: Array<string>;
}

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */
  guest: {
    maxMessagesPerDay: 20,
    availableChatModelIds: ["meta-llama/llama-3.3-70b-instruct:free"],
  },

  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 5,
    availableChatModelIds: chatModels.map(item => item.id),
  },

  /*
   * For users with an account and a paid membership
   */
  pro: {
    maxMessagesPerDay: 50,
    availableChatModelIds: chatModels.map(item => item.id),
  },
};
