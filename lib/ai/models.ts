import { LLMManager } from "./manager";
import { ModelInfo } from "./types";

export const DEFAULT_CHAT_MODEL: string = "meta-llama/llama-3.3-70b-instruct:free";

const manager = LLMManager.getInstance();
export const chatModels: Array<ModelInfo> = manager.getModelList();
