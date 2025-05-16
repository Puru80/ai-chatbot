import { LLMManager } from "./manager";
import { ModelInfo } from "./types";

export const DEFAULT_CHAT_MODEL: string = "deepseek/deepseek-chat-v3-0324:free";

export interface ChatModel {
  id: string;
  label: string;
  description: string;
}

/* export const chatModels: Array<ChatModel> = [
  {
    id: "chat-model",
    label: "Chat model",
    description: "Primary model for all-purpose chat",
  },
  {
    id: "chat-model-reasoning",
    label: "Reasoning model",
    description: "Uses advanced reasoning",
  },
  {
    id: "deepseek/deepseek-chat-v3-0324:free",
    label: "DeepSeek: DeepSeek V3 0324",
    description: "685B-parameter, mixture-of-experts model",
  },
];
 */

const manager = LLMManager.getInstance();
export const chatModels: Array<ModelInfo> = manager.getModelList();