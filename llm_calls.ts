import { createGoogleGenerativeAI, google, GoogleGenerativeAIProvider } from "@ai-sdk/google";
import { Notice } from "obsidian";
import { streamText, StreamTextResult, CoreTool, generateText, generateObject } from "ai";
import { OpenAIProvider } from "@ai-sdk/openai";
import { AnthropicProvider } from "@ai-sdk/anthropic";
import { GroqProvider, createGroq } from "@ai-sdk/groq";
import { createOllama, OllamaProvider, ollama } from "ollama-ai-provider";
import { createOpenRouter, OpenRouterProvider } from "@openrouter/ai-sdk-provider";
import { createOpenAICompatible, OpenAICompatibleProvider } from "@ai-sdk/openai-compatible";
import { experimental_generateImage as generateImage } from "ai";

import { z } from "zod";
import CaretPlugin from "main";
import { XaiProvider } from "@ai-sdk/xai";

// Zod validation for message structure
const MessageSchema = z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string()
});

const ConversationSchema = z.array(MessageSchema);

export type sdk_provider =
    | GoogleGenerativeAIProvider
    | OpenAIProvider
    | AnthropicProvider
    | GroqProvider
    | OllamaProvider
    | OpenRouterProvider
    | OpenAICompatibleProvider;
export type eligible_provider =
    | "google"
    | "openai"
    | "anthropic"
    | "groq"
    | "ollama"
    | "openrouter"
    | "custom"
    | "perplexity";

export type image_provider = OpenAIProvider | XaiProvider;

const refactored_providers = ["openai", "google", "anthropic", "groq", "ollama", "openrouter", "custom", "perplexity"];
export const isEligibleProvider = (provider: string): provider is eligible_provider => {
    return refactored_providers.includes(provider);
};
export function get_provider(plugin: CaretPlugin, provider: eligible_provider): sdk_provider {
    switch (provider) {
        case "openai":
            return plugin.openai_client;
        case "google":
            return plugin.google_client;
        case "anthropic":
            return plugin.anthropic_client;
        case "groq":
            return plugin.groq_client;
        case "ollama":
            return plugin.ollama_client;
        case "openrouter":
            return plugin.openrouter_client;
        case "perplexity":
            return plugin.perplexity_client;
        case "custom":
            const settings = plugin.settings;
            const current_model = settings.model;
            const custom_endpoint = settings.custom_endpoints[current_model];

            if (!custom_endpoint) {
                throw new Error(`No custom endpoint configuration found for model: ${current_model}`);
            }

            const sdk_provider = createOpenAICompatible({
                baseURL: custom_endpoint.endpoint,
                apiKey: custom_endpoint.api_key,
                name: provider,
            });

            plugin.custom_client = sdk_provider;
            return plugin.custom_client;
        default:
            throw new Error(
                `Invalid provider: ${provider}. Must be one of: openai, google, anthropic, groq, ollama, openrouter, custom`
            );
    }
}
export async function ai_sdk_streaming(
    provider: sdk_provider,
    model: string,
    conversation: Array<{ role: string; content: string }>,
    temperature: number,
    provider_name: eligible_provider
): Promise<StreamTextResult<Record<string, CoreTool<any, any>>, never>> {
    new Notice(`Calling ${provider_name[0].toUpperCase() + provider_name.slice(1)}`);
    
    // Validate conversation structure
    const validatedConversation = ConversationSchema.parse(conversation);
    const handleError = (event: unknown) => {
        const error = (event as { error: unknown }).error;
        const typedError = error as { errors: Array<{ statusCode: number }> };
        const errors = typedError.errors;

        if (errors?.some((e) => e.statusCode === 429)) {
            console.error("Rate limit exceeded error");
            new Notice(`Rate limit exceeded for ${provider_name} API`);
        } else {
            new Notice(`Unknown error during ${provider_name} streaming`);
        }
    };

    if (provider_name === "openrouter") {
        const openrouter_provider = provider as OpenRouterProvider;
        return await streamText({
            model: openrouter_provider.chat(model),
            messages: validatedConversation,
            temperature,
            onError: handleError,
        });
    }

    const final_provider = provider as Exclude<sdk_provider, OpenRouterProvider>;
    const stream = await streamText({
        model: final_provider(model),
        messages: validatedConversation,
        temperature,
        onError: handleError,
    });

    return stream;
}
export async function ai_sdk_completion(
    provider: sdk_provider,
    model: string,
    conversation: Array<{ role: string; content: string }>,
    temperature: number,
    provider_name: eligible_provider
): Promise<string> {
    new Notice(`Calling ${provider_name[0].toUpperCase() + provider_name.slice(1)}`);
    
    // Validate conversation structure
    const validatedConversation = ConversationSchema.parse(conversation);

    if (provider_name === "openrouter") {
        const openrouter_provider = provider as OpenRouterProvider;
        const response = await generateText({
            model: openrouter_provider.chat(model),
            messages: validatedConversation,
            temperature,
        });
        return response.text;
    }

    const final_provider = provider as Exclude<sdk_provider, OpenRouterProvider>;
    const response = await generateText({
        model: final_provider(model),
        messages: validatedConversation,
        temperature,
    });

    return response.text;
}
export async function ai_sdk_structured<T extends z.ZodType>(
    provider: sdk_provider,
    model: string,
    conversation: Array<{ role: string; content: string }>,
    temperature: number,
    provider_name: eligible_provider,
    schema: T
): Promise<z.infer<T>> {
    new Notice(`Calling ${provider_name[0].toUpperCase() + provider_name.slice(1)}`);
    
    // Validate conversation structure
    const validatedConversation = ConversationSchema.parse(conversation);

    if (provider_name === "openrouter") {
        const openrouter_provider = provider as OpenRouterProvider;
        const response = await generateObject({
            model: openrouter_provider.chat(model),
            schema,
            messages: validatedConversation,
            temperature,
            mode: "json",
        });

        return response;
    }

    const final_provider = provider as Exclude<sdk_provider, OpenRouterProvider>;
    const response = await generateObject({
        model: final_provider(model),
        schema,
        messages: validatedConversation,
        temperature,
    });

    return response.object;
}

export async function ai_sdk_image_gen(params: { provider: image_provider; prompt: string; model: string }) {
    // Implementation to be added
    const model = params.model;
    const { image } = await generateImage({
        model: params.provider.image(model),
        prompt: params.prompt,
    });
    const arrayBuffer = image.uint8Array;
    return arrayBuffer;
}
