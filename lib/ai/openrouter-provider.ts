import {
  extractReasoningMiddleware,
  LanguageModelV1,
  wrapLanguageModel
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { BaseProvider } from "./base-provider";
import { ModelInfo } from "./types";

export class OpenRouterProvider extends BaseProvider {
  name = "OpenRouter";
  config = {
    baseUrlKey: "OPENROUTER_BASE_URL",
    apiKey: process.env.OPENROUTER_API_KEY,
  };

  staticModels: ModelInfo[] = [
    {
      id: "deepseek/deepseek-r1:free",
      label: "DeepSeek: R1(Free)",
      provider: "OpenRouter",
      description: "Reasoning Model",
      maxTokenAllowed: 8000,
      thinking: true
    },
    {
      id: "deepseek/deepseek-chat-v3-0324:free",
      label: "DeepSeek: DeepSeek V3 0324(Free)",
      provider: "OpenRouter",
      description: "Misture of Experts(MoE)",
      maxTokenAllowed: 8000,
    },
  ];

  getThinkingValue(id: string): boolean {
    const item = this.staticModels.find(i => i.id === id);
    return item?.thinking ?? false;
  }

  // TODO: Play around with provider settings and dynamic models later
  getModelInstance(options: { model: string }): LanguageModelV1 {
    const { model } = options;

    const openRouter = createOpenRouter({
      apiKey: this.config.apiKey,
    });

    const instance = openRouter.languageModel(model) as LanguageModelV1;

    if(this.getThinkingValue(model)){
      return wrapLanguageModel({
        model: instance,
        middleware: extractReasoningMiddleware({ tagName: "think" }),
      });
    }

    return instance;
  }
}
