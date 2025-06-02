import { LLMManager } from "./manager";
import { ModelInfo } from "./types";

export const DEFAULT_CHAT_MODEL: string = "google/gemini-2.0-flash-exp:free";

const manager = LLMManager.getInstance();
export const chatModels: Array<ModelInfo> = manager.getModelList();
