import {
  LanguageModelV1
} from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { BaseProvider } from "./base-provider";
import { ModelInfo } from "./types";

export class OpenRouterProvider extends BaseProvider {
  name = "openRouter";
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

    // console.log("OpenRouterProvider getModelInstance", model);
    // console.log("OpenRouter API KEY: ", this.config.apiKey);

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

    const instance = openRouter.chat(model) as LanguageModelV1;

    return instance;
  }
}
