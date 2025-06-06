import {
  extractReasoningMiddleware,
  LanguageModelV1,
  wrapLanguageModel,
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
      id: "qwen/qwq-32b:free",
      label: "Qwen: QwQ 32B (free)",
      provider: "OpenRouter",
      description: "Reasoning Model",
      maxTokenAllowed: 8000,
      thinking: true,
    },
    {
      id: "mistralai/devstral-small:free",
      label: "Mistral: Devstral Small (free)",
      provider: "OpenRouter",
      description: "Mistral Small Model",
      maxTokenAllowed: 8000,
      thinking: true,
    },
    {
      id: "google/gemma-3-27b-it:free",
      label: "Google: Gemma 3 27B (free)",
      provider: "OpenRouter",
      description: "Google's open model",
      maxTokenAllowed: 8000,
      thinking: true,
    },
    {
      id: "meta-llama/llama-3.3-70b-instruct:free",
      label: "Meta: Llama 3.3 70B Instruct (free)",
      provider: "OpenRouter",
      description: "Multilingual large language model (LLM)",
      maxTokenAllowed: 8000,
    },
    {
      id: "meta-llama/llama-4-scout:free",
      label: "Meta: Llama 4 Scout (free)",
      provider: "OpenRouter",
      description:
        "Text and image multilingual output (text and code)",
      maxTokenAllowed: 8000,
    },
  ];

  getThinkingValue(id: string): boolean {
    const item = this.staticModels.find((i) => i.id === id);
    return item?.thinking ?? false;
  }

  // TODO: Play around with provider settings and dynamic models later
  getModelInstance(options: { model: string }): LanguageModelV1 {
    const { model } = options;

    const openRouter = createOpenRouter({
      apiKey: this.config.apiKey,
    });

    const instance = openRouter.languageModel(model) as LanguageModelV1;

    if (this.getThinkingValue(model)) {
      return wrapLanguageModel({
        model: instance,
        middleware: extractReasoningMiddleware({ tagName: "think" }),
      });
    }

    return instance;
  }
}
