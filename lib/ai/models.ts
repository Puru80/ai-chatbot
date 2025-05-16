import { LLMManager } from "./manager";
import { ModelInfo } from "./types";

export const DEFAULT_CHAT_MODEL: string = "deepseek/deepseek-chat-v3-0324:free";

const manager = LLMManager.getInstance();
export const chatModels: Array<ModelInfo> = manager.getModelList();