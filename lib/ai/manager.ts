import { ModelInfo } from "./types";
import { BaseProvider } from "./base-provider";
import * as providers from "./registry";
import { createScopedLogger } from "../utils/logger";

const logger = createScopedLogger("LLMManager");
export class LLMManager {
  private static _instance: LLMManager;
  private _providers: Map<string, BaseProvider> = new Map();
  private _modelList: ModelInfo[] = [];

  private constructor() {
    this._registerProvidersFromDirectory();
  }

  static getInstance(): LLMManager {
    if (!LLMManager._instance) {
      LLMManager._instance = new LLMManager();
    }

    return LLMManager._instance;
  }

  private async _registerProvidersFromDirectory() {
    try {
      /*
       * Dynamically import all files from the providers directory
       * const providerModules = import.meta.glob('./providers/*.ts', { eager: true });
       */

      // Look for exported classes that extend BaseProvider
      for (const exportedItem of Object.values(providers)) {
        if (
          typeof exportedItem === "function" &&
          exportedItem.prototype instanceof BaseProvider
        ) {
          const provider = new exportedItem();

          try {
            this.registerProvider(provider);
          } catch (error: any) {
            logger.warn(
              "Failed To Register Provider: ",
              provider.name,
              "error:",
              error.message
            );
          }
        }
      }
    } catch (error) {
      logger.error("Error registering providers:", error);
    }
  }

  registerProvider(provider: BaseProvider) {
    if (this._providers.has(provider.name)) {
      logger.warn(`Provider ${provider.name} is already registered. Skipping.`);
      return;
    }

    logger.info("Registering Provider: ", provider.name);
    this._providers.set(provider.name, provider);
    this._modelList = [...this._modelList, ...provider.staticModels];
  }

  getModelList(): ModelInfo[] {
    return this._modelList;
  }

  getModelNameById(modelId: string): string {
    // Fetch model name by ID
    const model = this._modelList.find((m) => m.id === modelId);
    if (model) {
      return model.label;
    }
    return '';
  }

}
