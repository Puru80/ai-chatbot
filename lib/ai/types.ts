import type { LanguageModelV1 } from "ai";
// import type { IProviderSetting } from '@/app/types/model';

export interface ModelInfo {
  // id: string;
  id: string;
  label: string;
  provider: string;
  description: string;
  maxTokenAllowed: number;
  thinking?: boolean
}

export interface ProviderInfo {
  name: string;
  staticModels: ModelInfo[];
  getDynamicModels?: (
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv?: Record<string, string>
  ) => Promise<ModelInfo[]>;
  getModelInstance: (options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }) => LanguageModelV1;
  icon?: string;
}

export interface ProviderConfig {
  baseUrlKey?: string;
  baseUrl?: string;
  apiTokenKey?: string;
}

export interface IProviderSetting {
  enabled?: boolean;
  baseUrl?: string;
}

export type IProviderConfig = ProviderInfo & {
  settings: IProviderSetting;
};
