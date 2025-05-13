import {
  LanguageModelV1
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
      name: "deepseek/deepseek-chat-v3-0324:free",
      label: "DeepSeek: DeepSeek V3 0324(Free)",
      provider: "OpenRouter",
      maxTokenAllowed: 8000,
    },
  ];

  // TODO: Play around with provider settings and dynamic models later
  getModelInstance(options: { model: string }): LanguageModelV1 {
    const { model } = options;

    const openRouter = createOpenRouter({
      apiKey: this.config.apiKey,
    });

    /* return customProvider({
      languageModels: {
        [model]: wrapLanguageModel({
          model: openRouter(model),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
      },
    }); */

    const instance = openRouter.languageModel(model) as LanguageModelV1;

    return instance;
  }
}
