import { MarkdownView } from "obsidian";

export interface ViewportNode {
    alwaysKeepLoaded: boolean;
    app: any; // This should be more specific based on the actual type of 'app'
    aspectRatio: number;
    bbox: {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
    };
    canvas: any; // This should be more specific based on the actual type of 'canvas'
    child: any; // This should be more specific based on the actual type of 'child'
    color: string;
    containerEl: HTMLElement;
    contentBlockerEl: HTMLElement;
    contentEl: HTMLElement;
    height: number;
    id: string;
    isEditing: boolean;
    nodeEl: HTMLElement;
    placeholderEl: HTMLElement;
    resizeDirty: boolean;
    text: string;
    unknownData: {
        id: string;
        type: string;
        text: string;
    };
    width: number;
    x: number;
    y: number;
    zIndex: number;
}
export interface UnknownData {
    id: string;
    type: string;
    text?: string;
    role?: string;
    url?: string;
    websiteContent?: string;
    file?: string;
}

export interface Node {
    id: string;
    type: string;
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    render(): void;
    file?: string;
    unknownData: UnknownData;
}

// TODO - improve types for everyting
export interface Canvas {
    readonly: boolean;
    view: MarkdownView;
    x: number;
    y: number;
    nodes: Map<string, any>;
    edges: Map<string, any>;
    selection: Set<any>;
    menu: CanvasMenu;
    nodeIndex: any; // Gotta figure out the typing for this.
    requestSave(save?: boolean, triggerBySelf?: boolean): void;
    getData(): any;
    getViewportNodes(): any[];
    requestSave(save?: boolean, triggerBySelf?: boolean): void;
    zoomToSelection(): void;
    selectOnly(node: Node): void;
    importData({}): void;
    requestFrame(): void;
}

export interface CanvasMenu {
    containerEl: HTMLElement;
    menuEl: HTMLElement;
    canvas: Canvas;

    render(): void;
    updateZIndex(): void;
}

export type Message = {
    content: string;
    role: "user" | "assistant";
};

export type Edge = {
    fromNode: string;
    toNode: string;
    fromSide: "left" | "right" | "top" | "bottom";
    toSide: "left" | "right" | "top" | "bottom";
};

export interface SparkleConfig {
    model: string;
    provider: string;
    temperature: number;
    context_window: string | number;
}

export interface Models {
    name: string;
    context_window: number;
    function_calling: boolean;
    vision: boolean;
    streaming: boolean;
}
export interface CustomModels extends Models {
    endpoint: string;
    api_key: string;
    known_provider: string;
}

export interface LLMProviderOptions {
    [key: string]: {
        [model: string]: Models;
    };
}

export interface ImageModel {
    name: string;
    supported_sizes: string[];
}

export interface ImageModelOptions {
    [key: string]: {
        [model: string]: ImageModel;
    };
}

export interface NewNode {
    x: number;
    y: number;
    width: number;
    height: number;
    type: "text" | "file";
    content: string;
}
export interface WorkflowPrompt {
    model: string;
    provider: string;
    delay: string;
    temperature: string;
    prompt: string;
}
export interface CaretPluginSettings {
    caret_version: string;
    chat_logs_folder: string;
    chat_logs_date_format_bool: boolean;
    chat_logs_rename_bool: boolean;
    chat_send_chat_shortcut: string;
    model: string;
    llm_provider: string;
    openai_api_key: string;
    groq_api_key: string;

    open_router_key: string;
    anthropic_api_key: string;
    xai_api_key: string;
    context_window: number;
    custom_endpoints: { [model: string]: CustomModels };
    system_prompt: string;
    temperature: number;
    llm_provider_options: LLMProviderOptions;
    provider_dropdown_options: { [key: string]: string };
    include_nested_block_refs: boolean;
    google_api_key: string;
    perplexity_api_key: string;

    image_model: string;
    image_provider: string;
    image_model_options: ImageModelOptions;
    image_provider_dropdown_options: { [key: string]: string };
}
