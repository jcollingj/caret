import {
    StepGetWebsiteContent,
    StepGetWebsiteContentInput,
    StepGetWebsiteContentOutput,
} from "steps/step_get_website_content";
import { google_search } from "steps/step_serpapi";
import { StepPlan, StepPlanInput, StepPlanOutput } from "./steps/step_plan";

interface PlanNode {
    id: number;
    type: string;
    input: string;
    dependencies: number[];
}
// @ts-ignore
import pdfjs, { GlobalWorkerOptions } from "@bundled-es-modules/pdfjs-dist/build/pdf";
import pdf_worker_code from "./workers/pdf.worker.js";

// Create a Blob URL from the worker code
const pdf_worker_blob = new Blob([pdf_worker_code], { type: "application/javascript" });
const pdf_worker_url = URL.createObjectURL(pdf_worker_blob);
pdfjs.GlobalWorkerOptions.workerSrc = pdf_worker_url;

import { generateHashForUUID, validateUUIDHashPair, validate_license_key } from "./license_hashing";
import Fuse from "fuse.js";
import { encodingForModel } from "js-tiktoken";
// @ts-ignore
import ollama from "ollama/browser";

import OpenAI from "openai";
import Groq from "groq-sdk";
import Anthropic from "@anthropic-ai/sdk";
import { around } from "monkey-around";
import { Canvas, ViewportNode, Message, Node, Edge, SparkleConfig } from "./types";
import {
    App,
    Editor,
    MarkdownView,
    Modal,
    Notice,
    Plugin,
    PluginSettingTab,
    Setting,
    ItemView,
    WorkspaceLeaf,
    setTooltip,
    setIcon,
    requestUrl,
} from "obsidian";
import { CanvasFileData, CanvasNodeData, CanvasTextData } from "obsidian/canvas";
import { Extension, RangeSetBuilder, StateField, Transaction } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
var parseString = require("xml2js").parseString;

export class CMDJModal extends Modal {
    result: string;
    selectedText: string;
    startIndex: number;
    endIndex: number;
    plugin: any;

    constructor(app: App, selectedText: string, startIndex: number, endIndex: number, plugin: any) {
        super(app);
        this.selectedText = selectedText;
        this.startIndex = startIndex;
        this.endIndex = endIndex;
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        const textDisplay = contentEl.createEl("div", {
            text: this.selectedText,
        });
        textDisplay.style.height = "60px";
        textDisplay.style.overflow = "scroll";

        contentEl.createEl("br"); // Line break

        const textArea = contentEl.createEl("textarea", {
            placeholder: "Type here...",
        });
        textArea.style.width = "100%";
        textArea.style.minHeight = "100px";
        textArea.style.resize = "none";
        textArea.oninput = () => {
            textArea.style.height = ""; // Reset the height
            textArea.style.height = `${textArea.scrollHeight}px`;
        };

        const buttonContainer = contentEl.createEl("div", { cls: "button-container" });
        // buttonContainer.style.display = "flex";
        // buttonContainer.style.justifyContent = "space-between"; // This will space the buttons evenly

        // Create the "Append Output" button
        new Setting(buttonContainer)
            .addButton((btn) =>
                btn
                    .setButtonText("Append Output")

                    .onClick(async () => {
                        this.result = textArea.value; // Capture the value from the textarea

                        const content = await this.submit_edit(this.result);
                        this.insert_response(content);
                        this.close();
                    })
            )
            .addButton((btn) =>
                btn
                    .setButtonText("Replace")
                    .setCta()
                    .onClick(async () => {
                        this.result = textArea.value; // Capture the value from the textarea
                        const content = await this.submit_edit(this.result);
                        this.apply_delete(this.result);
                        this.insert_response(content, true);
                        this.close();
                    })
            );
    }

    async submit_edit(result: string) {
        let content = `
Please apply the following instructions to the below content:

Instructions:
${this.result}

Content:
${this.selectedText}

## Rules:
- Just return the reponse that follows the instructions. No need to include a preample or anything

## Markdown Formatting: 
Always apply markdown formatting. For keywords use the following:
	todos - Prepend todo lines with:
	- [ ] 
`.trim();
        const conversation = [{ role: "user", content: content }];
        const output_content = await this.plugin.llm_call(
            this.plugin.settings.llm_provider,
            this.plugin.settings.model,
            conversation
        );
        return output_content;
    }

    insert_response(response: string, replace: boolean = false) {
        const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
        if (editor) {
            let index = this.endIndex;
            if (replace) {
                index = index + 4;
            }
            const pos = editor.offsetToPos(index);
            editor.replaceRange(`\n|+${response}+|`, pos);
            editor.setCursor(pos); // Optionally set the cursor after the inserted text
            editor.focus(); // Focus the editor after inserting text
        }
    }

    apply_delete(text: string) {
        const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
        if (editor) {
            const content = editor.getValue();
            const index = content.indexOf(this.selectedText);
            if (index !== -1) {
                const beforeText = content.substring(0, index);
                const afterText = content.substring(index + this.selectedText.length);
                const newText = beforeText + `|-${this.selectedText}-|` + afterText;
                editor.setValue(newText);
            }
        }
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}

export const redBackgroundField = StateField.define<DecorationSet>({
    create(state): DecorationSet {
        return Decoration.none;
    },
    update(oldState: DecorationSet, transaction: Transaction): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const docText = transaction.state.doc.toString();
        const delete_regex = /\|-(.*?)-\|/gs; // Changed to match across lines
        const add_regex = /\|\+(.*?)\+\|/gs; // Changed to match across lines
        let delete_match;
        let add_match;
        let ranges = [];

        while ((delete_match = delete_regex.exec(docText)) !== null) {
            const start = delete_match.index;
            const end = delete_regex.lastIndex;
            ranges.push({ start, end, style: "background-color: #f56c62;" });
        }

        while ((add_match = add_regex.exec(docText)) !== null) {
            const start = add_match.index;
            const end = add_regex.lastIndex;
            ranges.push({ start, end, style: "background-color: #64f562;" });
        }
        // Sort ranges by start position
        ranges.sort((a, b) => a.start - b.start);

        // Add sorted ranges to the builder
        ranges.forEach((range) => {
            builder.add(
                range.start,
                range.end,
                Decoration.mark({
                    attributes: { style: range.style },
                })
            );
        });

        return builder.finish();
    },
    provide(field: StateField<DecorationSet>): Extension {
        return EditorView.decorations.from(field);
    },
});

export class InsertNoteModal extends Modal {
    plugin: any;
    current_view: any;

    constructor(app: App, plugin: any, view: any) {
        super(app);
        this.plugin = plugin;
        this.current_view = view;
    }

    onOpen() {
        const { contentEl } = this;
        const all_files = this.app.vault.getFiles();

        const html_insert_files = contentEl.createEl("p", {
            text: "Insert File",
            cls: "insert-file-header",
        });

        // Create a text input for filtering files
        const inputField = contentEl.createEl("input", {
            type: "text",
            placeholder: "Enter text to search files",
            cls: "file-filter-input",
        });

        // Function to filter files based on input text and limit to 10 results
        const filter_files = (input_text) => {
            const fuse_options = {
                keys: ["name"],
                includeScore: true,
                threshold: 0.3,
            };
            const fuse = new Fuse(all_files, fuse_options);
            const results = fuse.search(input_text);
            return results.map((result) => result.item).slice(0, 10);
        };

        // Display the filtered files
        const filesDisplay = contentEl.createEl("div", { cls: "insert-file-files-display" });

        let currentSelectedIndex = -1; // -1 means the input field is selected

        // Function to update the visual selection
        const updateSelection = () => {
            const fileElements = filesDisplay.querySelectorAll(".insert-file-file-name");
            fileElements.forEach((el, index) => {
                if (index === currentSelectedIndex) {
                    el.classList.add("selected");
                    el.scrollIntoView({ block: "nearest" });
                } else {
                    el.classList.remove("selected");
                }
            });
        };

        // Update display when input changes
        inputField.addEventListener("input", () => {
            const filtered_files = filter_files(inputField.value);

            // Clear previous file display
            filesDisplay.innerHTML = "";

            // Add filtered files to the display
            filtered_files.forEach((file) => {
                const fileElement = filesDisplay.createEl("div", { text: file.name, cls: "insert-file-file-name" });
                fileElement.addEventListener("click", () => {
                    if (this.current_view.getViewType() === "main-caret") {
                        this.current_view.insert_text_into_user_message(`[[${file.name}]]`);
                        this.current_view.focusAndPositionCursorInTextBox();
                        this.close();
                    }
                });
            });

            // Reset selection
            currentSelectedIndex = -1;
            updateSelection();
        });

        // Keyboard navigation
        inputField.addEventListener("keydown", (event) => {
            const fileElements = filesDisplay.querySelectorAll(".insert-file-file-name");
            if (event.key === "ArrowDown") {
                if (currentSelectedIndex < fileElements.length - 1) {
                    currentSelectedIndex++;
                    updateSelection();
                    event.preventDefault(); // Prevent scrolling the page
                }
            } else if (event.key === "ArrowUp") {
                if (currentSelectedIndex > -1) {
                    currentSelectedIndex--;
                    updateSelection();
                    event.preventDefault(); // Prevent scrolling the page
                }
            } else if (event.key === "Enter" && currentSelectedIndex >= 0) {
                event.preventDefault(); // Prevent adding an extra line break
                fileElements[currentSelectedIndex].click();
            }
        });
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}
class AgentPromptModal extends Modal {
    plugin: any;
    file_path: string;
    agent_type: string;
    node_id: string;

    constructor(app: App, plugin: any, file_path: string, agent_type: string, node_id: string) {
        super(app);
        this.plugin = plugin;
        this.file_path = file_path;
        this.agent_type = agent_type;
        this.node_id = node_id;
    }

    onOpen() {
        const { contentEl } = this;
        const file_name = this.file_path.split("/").pop();

        // Display agent name
        const agentNameDisplay = contentEl.createEl("div", {
            text: `Agent Name: ${file_name}`,
        });
        agentNameDisplay.style.fontWeight = "bold";
        agentNameDisplay.style.marginBottom = "10px";

        // Text area for prompt
        const textArea = contentEl.createEl("textarea", {
            placeholder: "Type your prompt here...",
        });
        textArea.style.width = "100%";
        textArea.style.minHeight = "100px";
        textArea.style.resize = "none";

        // Submit button
        const submitButton = contentEl.createEl("button", {
            text: "Submit",
        });
        submitButton.style.marginTop = "10px";
        submitButton.addEventListener("click", async () => {
            const prompt = textArea.value;
            await this.submitPrompt(prompt);
            this.close();
        });
    }

    async submitPrompt(prompt: string) {
        // Implement the logic to handle the prompt submission

        const input: StepPlanInput = {
            user_input: prompt,
        };
        const step: StepPlan = new StepPlan();
        const output: StepPlanOutput = await step.process(input);
        const plan = output.nodes;

        this.plugin.execute_plan(plan, this.node_id);
        // You can add more logic here to handle the prompt submission as needed
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}

interface Models {
    name: string;
    context_window: number;
    function_calling: boolean;
    vision: boolean;
    streaming: boolean;
}
interface CustomModels extends Models {
    endpoint: string;
    api_key: string;
    known_provider: string;
}

interface LLMProviderOptions {
    [key: string]: {
        [model: string]: Models;
    };
}

interface CaretPluginSettings {
    caret_version: string;
    model: string;
    llm_provider: string;
    openai_api_key: string;
    groq_api_key: string;
    open_router_key: string;
    anthropic_api_key: string;
    context_window: number;
    license_key: string;
    license_hash: string;
    custom_endpoints: { [model: string]: CustomModels };
    system_prompt: string;
    temperature: number;
    llm_provider_options: LLMProviderOptions;
    provider_dropdown_options: { [key: string]: string };
}

const DEFAULT_SETTINGS: CaretPluginSettings = {
    caret_version: "0.2.24",
    model: "gpt-4-turbo",
    llm_provider: "openai",
    openai_api_key: "",
    groq_api_key: "",
    anthropic_api_key: "",
    open_router_key: "",
    context_window: 128000,
    license_key: "",
    license_hash: "",
    custom_endpoints: {},
    system_prompt: "",
    temperature: 1,
    llm_provider_options: {
        openai: {
            "gpt-4-turbo": {
                name: "gpt-4-turbo",
                context_window: 128000,
                function_calling: true,
                vision: true,
                streaming: true,
            },
            "gpt-3.5-turbo": {
                name: "gpt-3.5-turbo",
                context_window: 128000,
                function_calling: true,
                vision: true,
                streaming: true,
            },
            "gpt-4o": {
                name: "gpt-4o",
                context_window: 128000,
                function_calling: true,
                vision: true,
                streaming: true,
            },
        },
        groq: {
            "llama3-8b-8192": {
                name: "Llama 8B",
                context_window: 8192,
                function_calling: false,
                vision: false,
                streaming: true,
            },
            "llama3-70b-8192": {
                name: "Llama 70B",
                context_window: 8192,
                function_calling: false,
                vision: false,
                streaming: true,
            },
            "mixtral-8x7b-32768": {
                name: "Mixtral 8x7b",
                context_window: 32768,
                function_calling: false,
                vision: false,
                streaming: true,
            },
            "gemma-7b-it": {
                name: "Gemma 7B",
                context_window: 8192,
                function_calling: false,
                vision: false,
                streaming: true,
            },
        },
        anthropic: {
            "claude-3-opus-20240229": {
                name: "Claude 3 Opus",
                context_window: 200000,
                function_calling: true,
                vision: true,
                streaming: false,
            },
            "claude-3-sonnet-20240229": {
                name: "Claude 3 Sonnet",
                context_window: 200000,
                function_calling: true,
                vision: false,
                streaming: false,
            },
            "claude-3-haiku-20240307": {
                name: "Claude 3 Haiku",
                context_window: 200000,
                function_calling: true,
                vision: true,
                streaming: false,
            },
        },
        openrouter: {
            "anthropic/claude-3-opus": {
                name: "Claude 3 Opus",
                context_window: 200000,
                function_calling: true,
                vision: true,
                streaming: true,
            },
            "anthropic/claude-3-sonnet": {
                name: "Claude 3 Sonnet",
                context_window: 200000,
                function_calling: true,
                vision: true,
                streaming: true,
            },
            "anthropic/claude-3-haiku": {
                name: "Claude 3 Haiku",
                context_window: 200000,
                function_calling: true,
                vision: true,
                streaming: true,
            },
            "google/gemini-flash-1.5": {
                name: "Gemini Flash 1.5",
                context_window: 2800000,
                function_calling: true,
                vision: true,
                streaming: true,
            },
            "google/gemini-pro-1.5": {
                name: "Gemini Pro 1.5",
                context_window: 2800000,
                function_calling: true,
                vision: true,
                streaming: true,
            },
        },
        ollama: {
            llama3: {
                name: "llama3 8B",
                context_window: 8192,
                function_calling: false,
                vision: false,
                streaming: true,
            },
            phi3: {
                name: "Phi-3 3.8B",
                context_window: 8192,
                function_calling: false,
                vision: false,
                streaming: true,
            },
            mistral: {
                name: "Mistral 7B",
                context_window: 32768,
                function_calling: false,
                vision: false,
                streaming: true,
            },
            gemma: {
                name: "Gemma 7B",
                context_window: 8192,
                function_calling: false,
                vision: false,
                streaming: true,
            },
        },
        custom: {},
    },
    provider_dropdown_options: {
        openai: "OpenAI",
        groq: "Groq",
        ollama: "Ollama",
        anthropic: "Anthropic",
        openrouter: "OpenRouter",
        custom: "Custom",
    },
};
export const VIEW_NAME_SIDEBAR_CHAT = "sidebar-caret";
class SidebarChat extends ItemView {
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }
    textBox: HTMLTextAreaElement;
    messagesContainer: HTMLElement; // Container for messages

    getViewType() {
        return VIEW_NAME_SIDEBAR_CHAT;
    }

    getDisplayText() {
        return VIEW_NAME_SIDEBAR_CHAT;
    }

    async onOpen() {
        const metacontainer = this.containerEl.children[1];
        metacontainer.empty();
        const container = metacontainer.createEl("div", {
            cls: "container",
        });
        metacontainer.prepend(container);
        // this.containerEl.appendChild(container);

        // Create a container for messages
        this.messagesContainer = container.createEl("div", {
            cls: "messages-container",
        });

        // Add a "Hello World" message
        this.addMessage("MLX Testing", "system");
        this.createChatInputArea(container);
    }
    createChatInputArea(container: HTMLElement) {
        // Create a container for the text box and the submit button
        const inputContainer = container.createEl("div", {
            cls: "chat-input-container",
        });

        // Create the text box within the input container
        this.textBox = inputContainer.createEl("textarea", {
            cls: "full_width_text_container",
        });
        this.textBox.placeholder = "Type something...";

        // Create the submit button within the input container
        const button = inputContainer.createEl("button");
        button.textContent = "Submit";
        button.addEventListener("click", () => {
            this.submitMessage(this.textBox.value);
            this.textBox.value = ""; // Clear the text box after sending
        });
    }

    addMessage(text: string, sender: "user" | "system") {
        const messageDiv = this.messagesContainer.createEl("div", {
            cls: `message ${sender}`,
        });
        messageDiv.textContent = text;
    }

    submitMessage(userMessage: string) {
        let current_page_content = "";
        if (userMessage.includes("@current")) {
            // Find the first MarkdownView that is open in the workspace
            const markdownView = this.app.workspace
                .getLeavesOfType("markdown")
                // @ts-ignore
                .find((leaf) => leaf.view instanceof MarkdownView && leaf.width > 0)?.view as MarkdownView;
            if (markdownView && markdownView.editor) {
                current_page_content = markdownView.editor.getValue();
            }
        }
        this.addMessage(userMessage, "user"); // Display the user message immediately

        const current_page_message = `
		${userMessage}

		------ Note for Model ---
		When I am referring to @current, I meant the following:

		${current_page_content}
		`;

        let final_message = userMessage;
        if (current_page_content.length > 0) {
            final_message = current_page_message;
        }

        const data = { message: final_message };
        fetch("http://localhost:8000/conversation", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        })
            .then((response) => response.json())
            .then((data) => {
                this.addMessage(data.response, "system"); // Display the response
            })
            .catch((error) => {
                console.error("Error:", error);
            });
    }

    async onClose() {
        // Cleanup logic if necessary
    }
}

export const VIEW_NAME_MAIN_CHAT = "main-caret";
class FullPageChat extends ItemView {
    chat_id: string;
    plugin: any;
    conversation_title: string;
    textBox: HTMLTextAreaElement;
    messagesContainer: HTMLElement; // Container for messages
    conversation: Message[]; // List to store conversation messages
    is_generating: boolean;
    constructor(plugin: any, leaf: WorkspaceLeaf, chat_id?: string, conversation: Message[] = []) {
        super(leaf);
        this.plugin = plugin;
        this.chat_id = chat_id || this.generateRandomID(5);
        this.conversation = conversation; // Initialize conversation list with default or passed value
    }

    getViewType() {
        return VIEW_NAME_MAIN_CHAT;
    }

    getDisplayText() {
        return `Provider ${this.plugin.settings.llm_provider} | Model ${this.plugin.settings.model} | Chat: ${this.chat_id}`;
    }

    async onOpen() {
        const metacontainer = this.containerEl.children[1];
        metacontainer.empty();
        const container = metacontainer.createEl("div", {
            cls: "container",
        });
        metacontainer.prepend(container);

        // Create a container for messages
        this.messagesContainer = container.createEl("div", {
            cls: "messages-container",
        });

        // Render initial conversation
        this.renderConversation();
        this.createChatInputArea(container);
    }
    createChatInputArea(container: HTMLElement) {
        // Create a container for the text box
        const inputContainer = container.createEl("div", {});

        // Create the text box within the input container
        this.textBox = inputContainer.createEl("textarea", {
            cls: "full_width_text_container",
        });
        this.textBox.placeholder = "Type something...";
        this.textBox.addEventListener("keydown", (event) => {
            if (event.key === "@") {
                event.preventDefault(); // Prevent the default action
                this.textBox.value += "@"; // Add the '@' sign to the textBox value
                new InsertNoteModal(this.app, this.plugin, this).open(); // Open the modal
            }
        });

        // Create a separate container for buttons within the input container
        const buttonContainer = inputContainer.createEl("div", {
            cls: "button-container",
        });

        // Create the submit button within the button container
        const submitButton = buttonContainer.createEl("button", {});
        submitButton.textContent = "Submit";
        const submitAction = () => {
            if (!this.is_generating) {
                if (this.textBox.value.length > 0) {
                    this.submitMessage(this.textBox.value);
                    this.textBox.value = ""; // Clear the text box after sending
                }
            } else {
                new Notice("Response still in progress");
            }
        };

        submitButton.addEventListener("click", submitAction);

        this.textBox.addEventListener("keydown", (event) => {
            if (event.shiftKey && event.key === "Enter") {
                event.preventDefault(); // Prevent the default action of a newline
                submitAction();
            }
        });
    }

    addMessage(text: string, sender: "user" | "assistant") {
        // Add message to the conversation array
        this.conversation.push({ content: text, role: sender });
        // Re-render the conversation in the HTML
        this.renderConversation();
    }
    async streamMessage(stream_response) {
        if (this.plugin.settings.llm_provider === "ollama") {
            for await (const part of stream_response) {
                this.conversation[this.conversation.length - 1].content += part.message.content;
                this.renderConversation();
            }
        }
        if (this.plugin.settings.llm_provider === "openai" || "groq" || "custom") {
            for await (const part of stream_response) {
                const delta_content = part.choices[0]?.delta.content || "";
                this.conversation[this.conversation.length - 1].content += delta_content;
                this.renderConversation();
            }
        }
    }

    renderConversation() {
        // Clear the current messages
        this.messagesContainer.empty();

        // Add each message in the conversation to the messages container
        this.conversation.forEach((message) => {
            const display_class = `message ${message.role}`;
            const messageDiv = this.messagesContainer.createEl("div", {
                cls: display_class,
            });
            messageDiv.textContent = message.content;
        });
        setTimeout(() => {
            this.saveChat();
        }, 200);
    }

    async submitMessage(userMessage: string) {
        this.is_generating = true;
        const user_message_tokens = this.plugin.encoder.encode(userMessage).length;
        if (user_message_tokens > this.plugin.settings.context_window) {
            new Notice(
                `Single message exceeds model context window. Can't submit. Please shorten message and try again`
            );
            return;
        }

        this.addMessage(userMessage, "user");
        let total_context_length = 0;
        let valid_conversation = [];

        for (let i = 0; i < this.conversation.length; i++) {
            let message = this.conversation[i];
            let modified_content = message.content;
            if (modified_content.length === 0) {
                continue;
            }

            // Check for text in double brackets and log the match
            const bracket_regex = /\[\[(.*?)\]\]/g;
            const match = bracket_regex.exec(modified_content);
            if (match) {
                const file_path = match[1];
                const file = await this.app.vault.getFileByPath(file_path);
                if (file) {
                    const file_content = await this.app.vault.cachedRead(file);
                    modified_content += file_content; // Update modified_content instead of message.content
                } else {
                    new Notice(`File not found: ${file_path}`);
                }
            }

            const encoded_message = this.plugin.encoder.encode(modified_content);
            const message_length = encoded_message.length;
            if (total_context_length + message_length > this.plugin.context_window) {
                break;
            }
            total_context_length += message_length;
            valid_conversation.push({ ...message, content: modified_content }); // Push modified content in a hidden way
        }
        if (
            this.plugin.settings.llm_provider_options[this.plugin.settings.llm_provider][this.plugin.settings.model]
                .streaming
        ) {
            const response = await this.plugin.llm_call_streaming(
                this.plugin.settings.llm_provider,
                this.plugin.settings.model,
                valid_conversation
            );
            this.addMessage("", "assistant"); // Display the response
            await this.streamMessage(response);
            this.is_generating = false;
        } else {
            const content = await this.plugin.llm_call(
                this.plugin.settings.llm_provider,
                this.plugin.settings.model,
                valid_conversation
            );
            this.addMessage(content, "assistant");
            this.is_generating = false;
        }
    }
    focusAndPositionCursorInTextBox() {
        this.textBox.focus();
    }
    insert_text_into_user_message(text: string) {
        this.textBox.value += text.trim() + " ";
    }
    escapeXml(unsafe: string): string {
        return unsafe.replace(/[<>&'"]/g, (c) => {
            switch (c) {
                case "<":
                    return "&lt;";
                case ">":
                    return "&gt;";
                case "&":
                    return "&amp;";
                case "'":
                    return "&apos;";
                case '"':
                    return "&quot;";
                default:
                    return c;
            }
        });
    }
    async saveChat() {
        const chat_folder_path = "caret/chats";
        const chat_folder = this.app.vault.getAbstractFileByPath(chat_folder_path);
        if (!chat_folder) {
            await this.app.vault.createFolder(chat_folder_path);
        }
        const file_name = `${this.chat_id}.md`;
        const file_path = chat_folder_path + "/" + file_name;

        let file_content = `\`\`\`xml
        <root>
		<metadata>\n<id>${this.chat_id}</id>\n</metadata>
		`;

        let messages = ``;
        if (this.conversation.length === 0) {
            return;
        }
        for (let i = 0; i < this.conversation.length; i++) {
            const message = this.conversation[i];
            const escaped_content = this.escapeXml(message.content);
            const message_xml = `
                <message>
                    <role>${message.role}</role>
                    <content>${escaped_content}</content>
                </message>
            `.trim();
            messages += message_xml;
        }
        let conversation = `<conversation>\n${messages}</conversation></root>\`\`\``;
        file_content += conversation;
        const file = await this.app.vault.getFileByPath(file_path);

        try {
            if (file) {
                await this.app.vault.modify(file, file_content);
            } else {
                await this.app.vault.create(file_path, file_content);
            }
        } catch (error) {
            console.error("Failed to save chat:", error);
        }
    }

    generateRandomID(length: number) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    async onClose() {
        // Cleanup logic if necessary
    }
}
class CustomModelModal extends Modal {
    model_id: string = "";
    model_name: string = "";
    streaming: boolean = true;
    vision: boolean = false;
    function_calling: boolean = false;
    context_window: number = 0;
    url: string = "";
    api_key: string = "";
    plugin: any;
    known_provider: string = "";

    constructor(app: App, plugin: any) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h2", { text: "Add Custom Model" });
        contentEl.createEl("div", { text: "Note: The model needs to support the OpenAI spec.", cls: "callout" });
        contentEl.createEl("div", {
            text: "Note: The endpoint needs to support CORS. This is experimental and might require additional CORS settings to be added to Caret. Let me know!",
            cls: "callout",
        });

        new Setting(contentEl)
            .setName("Model ID")
            .setDesc("This is the model. This is the value for the model parameter that will be sent to the endpoint.")
            .addText((text) => {
                text.setValue(this.model_id).onChange((value) => {
                    this.model_id = value;
                });
            });

        new Setting(contentEl)
            .setName("Model Name")
            .setDesc("This is the human-friendly name only used for displaying.")
            .addText((text) => {
                text.setValue(this.model_name).onChange((value) => {
                    this.model_name = value;
                });
            });

        new Setting(contentEl)
            .setName("Vision")
            .setDesc("Not used currently, will be used to know if the model can process pictures.")
            .addToggle((toggle) => {
                toggle.setValue(this.vision).onChange((value) => {
                    this.vision = value;
                });
            });
        new Setting(contentEl)
            .setName("Function Calling")
            .setDesc("Does the model support function calling?")
            .addToggle((toggle) => {
                toggle.setValue(this.function_calling).onChange((value) => {
                    this.function_calling = value;
                });
            });

        new Setting(contentEl)
            .setName("Context Size")
            .setDesc("You can normally pull this out of the Hugging Face repo, the config.json.")
            .addText((text) => {
                text.setValue(this.context_window.toString()).onChange((value) => {
                    this.context_window = parseInt(value);
                });
            });

        new Setting(contentEl)
            .setName("Custom Endpoint")
            .setDesc("This is where the model is located. It can be a remote URL or a server URL running locally.")
            .addText((text) => {
                text.setValue(this.url).onChange((value) => {
                    this.url = value;
                });
            });

        new Setting(contentEl)
            .setName("API Key")
            .setDesc("This is the API key required to access the model.")
            .addText((text) => {
                text.setValue(this.api_key).onChange((value) => {
                    this.api_key = value;
                });
            });

        new Setting(contentEl)
            .setName("Known Provider")
            .setDesc("Select this if it's a known endpoint like Ollama.")
            .addDropdown((dropdown) => {
                dropdown.addOption("ollama", "Ollama");
                dropdown.addOption("openrouter", "OpenRouter");
                dropdown.setValue(this.known_provider).onChange((value) => {
                    this.known_provider = value;
                });
            });
        new Setting(contentEl).addButton((button) => {
            button.setButtonText("Submit").onClick(async () => {
                const settings: CaretPluginSettings = this.plugin.settings;
                const parsed_context_window = parseInt(this.context_window.toString());

                if (!this.model_name || this.model_name.trim() === "") {
                    new Notice("Model name must exist");
                    console.error("Validation Error: Model name must exist");
                    return;
                }

                if (
                    (!this.url || this.url.trim() === "") &&
                    (!this.known_provider || this.known_provider.trim() === "")
                ) {
                    new Notice("Either endpoint or known provider must be set");
                    console.error("Validation Error: Either endpoint or known provider must be set");
                    return;
                }

                if (!this.model_id || this.model_id.trim() === "") {
                    new Notice("Model ID must have a value");
                    console.error("Validation Error: Model ID must have a value");
                    return;
                }

                if (isNaN(parsed_context_window)) {
                    new Notice("Context window must be a number");
                    console.error("Validation Error: Context window must be a number");
                    return;
                }
                const new_model: CustomModels = {
                    name: this.model_name,
                    context_window: this.context_window,
                    function_calling: this.function_calling, // Assuming default value as it's not provided in the form
                    vision: this.vision,
                    streaming: true,
                    endpoint: this.url,
                    api_key: this.api_key,
                    known_provider: this.known_provider,
                };

                settings.custom_endpoints[this.model_id] = new_model;

                await this.plugin.saveSettings();

                this.close();
            });
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class RemoveCustomModelModal extends Modal {
    plugin: any;

    constructor(app: App, plugin: any) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl, modalEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: "Remove Custom Model", cls: "insert-file-header" });

        // Set the width of the modal
        modalEl.style.width = "800px"; // Adjust the width as needed

        const table = contentEl.createEl("table", { cls: "custom-models-table" });
        const headerRow = table.createEl("tr");
        headerRow.createEl("th", { text: "Name" });
        headerRow.createEl("th", { text: "Context Window" });
        headerRow.createEl("th", { text: "URL" });
        headerRow.createEl("th", { text: "Action" });

        const custom_models: { [key: string]: CustomModels } = this.plugin.settings.custom_endpoints;

        for (const [model_id, model] of Object.entries(custom_models)) {
            const row = table.createEl("tr");

            row.createEl("td", { text: model.name });
            row.createEl("td", { text: model.context_window.toString() });
            row.createEl("td", { text: model.endpoint });

            const deleteButtonContainer = row.createEl("td", { cls: "delete-btn-container" });
            const deleteButton = deleteButtonContainer.createEl("button", { text: "Delete", cls: "mod-warning" });
            deleteButton.addEventListener("click", async () => {
                delete custom_models[model_id];
                await this.plugin.saveSettings();
                this.onOpen(); // Refresh the modal to reflect changes
            });
        }

        // Apply minimum width to contentEl
        contentEl.style.minWidth = "600px";
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class SystemPromptModal extends Modal {
    plugin: any;
    system_prompt: string = "";

    constructor(app: App, plugin: any) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h2", { text: "System Prompt" });

        const textArea = contentEl.createEl("textarea", {
            cls: "system-prompt-textarea",
            text: this.plugin.settings.system_prompt || "",
        });
        textArea.style.height = "400px";
        textArea.style.width = "100%";

        const submitButton = contentEl.createEl("button", { text: "Submit", cls: "mod-cta" });
        submitButton.addEventListener("click", async () => {
            this.plugin.settings.system_prompt = textArea.value;
            new Notice("System prompt updated");
            await this.plugin.saveSettings();
            await this.plugin.loadSettings();
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

interface WorkflowPrompt {
    model: string;
    provider: string;
    delay: string;
    temperature: string;
    prompt: string;
}

class LinearWorkflowEditor extends ItemView {
    plugin: any;
    file_path: string;
    prompts: WorkflowPrompt[];
    workflow_name: string;
    system_prompt: string;
    prompt_container: HTMLDivElement;
    stored_file_name: string;
    workflow_type: "linear" | "parallel";

    constructor(plugin: any, leaf: WorkspaceLeaf, file_path: string = "") {
        super(leaf);
        this.plugin = plugin;
        this.file_path = file_path;
        this.prompts = [];
        this.workflow_name = "";
        this.system_prompt = "";
    }

    getViewType() {
        return "workflow-editor";
    }

    getDisplayText() {
        return "Workflow Editor";
    }

    async onOpen() {
        if (this.file_path) {
            const file = this.app.vault.getAbstractFileByPath(this.file_path);
            if (file) {
                const front_matter = await this.plugin.get_frontmatter(file);
                this.workflow_type = front_matter.caret_prompt;
                const file_content = await this.app.vault.cachedRead(file);
                this.workflow_name = file.name.replace(".md", "");
                this.stored_file_name = file.name;
                const xml_content = file_content.match(/```xml([\s\S]*?)```/)[1].trim();
                const xml = await this.plugin.parseXml(xml_content);
                const xml_prompts = xml.root.prompt;

                for (let i = 0; i < xml_prompts.length; i++) {
                    const prompt = xml_prompts[i]._.trim();
                    const delay = parseInt(xml_prompts[i].$.delay) || 0;
                    const model = xml_prompts[i].$.model || "default";
                    const provider = xml_prompts[i].$.provider || "default";
                    const temperature = parseFloat(xml_prompts[i].$.temperature) || this.plugin.settings.temperature;

                    if (prompt.trim().length > 0) {
                        this.prompts.push({
                            model,
                            provider,
                            delay: delay.toString(),
                            temperature: temperature.toString(),
                            prompt,
                        });
                    }
                }

                if (xml.root.system_prompt && xml.root.system_prompt.length > 0) {
                    if (xml.root.system_prompt && xml.root.system_prompt[0] && xml.root.system_prompt[0]._) {
                        this.system_prompt = xml.root.system_prompt[0]._.trim();
                    } else {
                        this.system_prompt = "";
                    }
                } else {
                    this.system_prompt = "";
                }
                // Process file content and initialize prompts if necessary
            }
        }

        const metacontainer = this.containerEl.children[1];
        metacontainer.empty();
        const container = metacontainer.createEl("div", {
            cls: "workflow_container",
        });
        metacontainer.prepend(container);

        // Add description

        // Add workflow name input
        const title_container = container.createEl("div", { cls: "flex-row" });
        title_container.createEl("h2", { text: `Workflow Name:`, cls: "w-8" });
        const workflow_name_input = title_container.createEl("input", {
            type: "text",
            cls: "workflow-name-input w-full",
            value: this.workflow_name,
        });
        container.createEl("p", { text: "Add prompts that will then be run in a linear fashion on any input." });
        workflow_name_input.addEventListener("input", () => {
            this.workflow_name = workflow_name_input.value;
        });

        this.prompt_container = container.createEl("div", { cls: "w-full" });

        // Create the system message right away
        this.add_system_prompt();
        if (this.prompts.length > 0) {
            for (let i = 0; i < this.prompts.length; i++) {
                this.add_prompt(this.prompts[i], true, i);
            }
        } else {
            this.add_prompt();
        }

        // Create a button to add new prompts
        const buttonContainer = container.createEl("div", { cls: "button-container bottom-screen-padding" });

        const addPromptButton = buttonContainer.createEl("button", { text: "Add New Prompt" });
        addPromptButton.addEventListener("click", () => {
            this.add_prompt();
        });

        // Create a save workflow button
        const save_button = buttonContainer.createEl("button", { text: "Save Workflow" });
        save_button.addEventListener("click", () => {
            if (this.workflow_name.length === 0) {
                new Notice("Workflow must be named before saving");
                return;
            }

            for (let i = 0; i < this.prompts.length; i++) {
                const prompt = this.prompts[i];
                if (!prompt.model) {
                    new Notice(`Prompt ${i + 1}: Model must have a value`);
                    return;
                }
                if (!prompt.provider) {
                    new Notice(`Prompt ${i + 1}: Provider must have a value`);
                    return;
                }
                const delay = parseInt(prompt.delay, 10);
                if (isNaN(delay) || delay < 0 || delay > 60) {
                    new Notice(`Prompt ${i + 1}: Delay must be a number between 0 and 60`);
                    return;
                }
                const temperature = parseFloat(prompt.temperature);
                if (isNaN(temperature) || temperature < 0 || temperature > 2) {
                    new Notice(`Prompt ${i + 1}: Temperature must be a float between 0 and 2`);
                    return;
                }
                if (!prompt.prompt || prompt.prompt.length === 0) {
                    new Notice(`Prompt ${i + 1}: Prompt must not be empty`);
                    return;
                }
            }

            this.save_workflow();
        });
    }

    async save_workflow() {
        const chat_folder_path = "caret/workflows";
        const chat_folder = this.app.vault.getAbstractFileByPath(chat_folder_path);
        if (!chat_folder) {
            await this.app.vault.createFolder(chat_folder_path);
        }
        const system_prompt_string = `
<system_prompt tag="placeholder_do_not_delete">
${this.plugin.escapeXml(this.system_prompt)}
</system_prompt>
`;

        let prompts_string = ``;
        for (let i = 0; i < this.prompts.length; i++) {
            if (this.prompts[i].prompt.length === 0) {
                continue;
            }
            const escaped_content = this.plugin.escapeXml(this.prompts[i].prompt);
            prompts_string += `
<prompt model="${this.prompts[i].model || "default"}" provider="${this.prompts[i].provider || "default"}" delay="${
                this.prompts[i].delay || "default"
            }" temperature="${this.prompts[i].temperature || "default"}">
${escaped_content}
</prompt>`.trim();
        }

        let file_content = `
---
caret_prompt: ${this.workflow_type}
version: 1
---
\`\`\`xml
<root>
${system_prompt_string}
${prompts_string}
</root>
\`\`\`
        `.trim();

        let file_name = `${this.workflow_name}.md`;
        let file_path = `${chat_folder_path}/${file_name}`;
        let old_file_path = `${chat_folder_path}/${this.stored_file_name}`;
        let file = await this.app.vault.getFileByPath(old_file_path);

        try {
            if (file) {
                if (old_file_path !== file_path) {
                    await this.app.vault.rename(file, file_path);
                }
                await this.app.vault.modify(file, file_content);
                new Notice("Workflow Updated!");
            } else {
                await this.app.vault.create(file_path, file_content);
                new Notice("Workflow Created!");
            }
        } catch (error) {
            console.error("Failed to save chat:", error);
            if (error.message.includes("File already exists")) {
                new Notice("A workflow with that name already exists!");
            } else {
                console.error("Failed to save chat:", error);
            }
        }
    }

    add_system_prompt(system_prompt: string = "") {
        // Add a toggle switch for workflow type
        const dropdown_container = this.prompt_container.createEl("div", {
            cls: "dropdown-container",
        });

        dropdown_container.createEl("label", { text: "Workflow Type: ", cls: "dropdown-label" });

        const workflow_type_select = dropdown_container.createEl("select", {
            cls: "workflow-type-select",
        });

        const options = [
            { value: "linear", text: "Linear Workflow" },
            { value: "parallel", text: "Parallel Workflow" },
        ];

        options.forEach((option) => {
            const opt = workflow_type_select.createEl("option", {
                value: option.value,
                text: option.text,
            });
            if (this.workflow_type === option.value) {
                opt.selected = true;
            }
        });

        workflow_type_select.addEventListener("change", (event) => {
            this.workflow_type = (event.target as HTMLSelectElement).value;
            new Notice(`Workflow type set to ${this.workflow_type}`);
        });

        this.prompt_container.createEl("h3", { text: "System Prompt" });
        const text_area = this.prompt_container.createEl("textarea", {
            cls: "full_width_text_container",
            placeholder: "Add a system prompt",
        });
        text_area.value = this.system_prompt;

        text_area.addEventListener("input", () => {
            this.system_prompt = text_area.value;
        });
    }

    add_prompt(
        prompt: WorkflowPrompt = { model: "default", provider: "default", delay: "0", temperature: "1", prompt: "" },
        loading_prompt: boolean = false,
        index: number | null = null
    ) {
        let step_number = index !== null ? index + 1 : this.prompts.length + 1;
        let array_index = index !== null ? index : this.prompts.length;

        if (step_number === 1) {
            step_number = 1;
        }
        this.prompt_container.createEl("h3", { text: `Prompt ${step_number}` });

        const text_area = this.prompt_container.createEl("textarea", {
            cls: `w-full workflow_text_area text_area_id_${step_number}`,
            placeholder: "Add a step into your workflow",
        });
        text_area.value = prompt.prompt;
        text_area.id = `text_area_id_${step_number}`;
        // Create a container div with class flex-row
        const options_container = this.prompt_container.createEl("div", {
            cls: "flex-row",
        });
        // Provider label and dropdown
        const provider_label = options_container.createEl("label", {
            text: "Provider",
            cls: "row_items_spacing",
        });
        const provider_select = options_container.createEl("select", {
            cls: "provider_select row_items_spacing",
        });
        const settings: CaretPluginSettings = this.plugin.settings;
        const provider_entries = Object.entries(DEFAULT_SETTINGS.provider_dropdown_options);

        // Ensure the provider select has a default value set from the beginning
        if (provider_entries.length > 0) {
            provider_entries.forEach(([provider_key, provider_name]) => {
                const option = provider_select.createEl("option", { text: provider_name });
                option.value = provider_key;
            });
        }

        // Default to the first provider if prompt.provider is not set
        if (!prompt.provider && provider_entries.length > 0) {
            prompt.provider = provider_entries[0][0];
        }

        // Set the default value after options are added
        provider_select.value = prompt.provider || provider_entries[0][0];

        // Model label and dropdown
        const model_label = options_container.createEl("label", {
            text: "Model",
            cls: "row_items_spacing",
        });
        const model_select = options_container.createEl("select", {
            cls: "model_select row_items_spacing",
        });

        // Function to update model options based on selected provider
        const update_model_options = (provider: string) => {
            if (!provider) {
                return;
            }
            model_select.innerHTML = ""; // Clear existing options
            const models = settings.llm_provider_options[provider];
            Object.entries(models).forEach(([model_key, model_details]) => {
                const option = model_select.createEl("option", { text: model_details.name });
                option.value = model_key;
            });
            // Set the default value after options are added
            model_select.value = prompt.model;
        };

        // Add event listener to provider select to update models dynamically
        provider_select.addEventListener("change", (event) => {
            const selected_provider = (event.target as HTMLSelectElement).value;
            update_model_options(selected_provider);
        });

        // Initialize model options based on the default or current provider
        update_model_options(provider_select.value);
        model_select.value = prompt.model;

        // Temperature label and input
        const temperature_label = options_container.createEl("label", {
            text: "Temperature",
            cls: "row_items_spacing",
        });

        // Temperature input
        const temperature_input = options_container.createEl("input", {
            type: "number",
            cls: "temperature_input",
        }) as HTMLInputElement;

        // Set the attributes separately to avoid TypeScript errors
        temperature_input.min = "0";
        temperature_input.max = "2";
        temperature_input.step = "0.1";
        temperature_input.value = prompt.temperature;

        // Ensure the up and down arrows appear on the input
        temperature_input.style.appearance = "number-input";
        temperature_input.style.webkitAppearance = "number-input";

        // Delay label and input
        const delay_label = options_container.createEl("label", {
            text: "Delay",
            cls: "row_items_spacing",
        });
        const delay_input = options_container.createEl("input", {
            type: "number",
            cls: "delay_input row_items_spacing",
            // @ts-ignore
            min: "0",
            max: "60",
            step: "1",
            value: prompt.delay,
        });

        if (!loading_prompt) {
            this.prompts.push({
                model: provider_select.value,
                provider: provider_select.value,
                delay: delay_input.value,
                temperature: temperature_input.value,
                prompt: text_area.value,
            });
        }

        text_area.id = `text_area_id_${array_index}`;
        provider_select.id = `provider_select_id_${array_index}`;
        model_select.id = `model_select_id_${array_index}`;
        temperature_input.id = `temperature_input_id_${array_index}`;
        delay_input.id = `delay_input_id_${array_index}`;

        text_area.addEventListener("input", () => {
            const text_area_element = this.prompt_container.querySelector(`#text_area_id_${array_index}`);
            if (text_area_element) {
                this.prompts[array_index].prompt = (text_area_element as HTMLInputElement).value;
            }
        });

        provider_select.addEventListener("change", () => {
            const provider_select_element = this.prompt_container.querySelector(`#provider_select_id_${array_index}`);
            if (provider_select_element) {
                this.prompts[array_index].provider = provider_select.value;
                update_model_options(provider_select.value);
            }
        });

        model_select.addEventListener("change", () => {
            const model_select_element = this.prompt_container.querySelector(`#model_select_id_${array_index}`);
            if (model_select_element) {
                this.prompts[array_index].model = model_select.value;
            }
        });

        temperature_input.addEventListener("input", () => {
            const temperature_input_element = this.prompt_container.querySelector(
                `#temperature_input_id_${array_index}`
            );
            if (temperature_input_element) {
                this.prompts[array_index].temperature = temperature_input.value;
            }
        });

        delay_input.addEventListener("input", () => {
            const delay_input_element = this.prompt_container.querySelector(`#delay_input_id_${array_index}`);
            if (delay_input_element) {
                this.prompts[array_index].delay = delay_input.value;
            }
        });
    }
}
function fetchWrapper(request: string | RequestUrlParam): Promise<Response> {
    return requestUrl(request).then((response) => {
        return new Response(response.arrayBuffer, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
        });
    });
}
export default class CaretPlugin extends Plugin {
    settings: CaretPluginSettings;
    canvas_patched: boolean = false;
    selected_node_colors: any = {};
    color_picker_open_on_last_click: boolean = false;
    openai_client: OpenAI;
    groq_client: Groq;
    anthropic_client: Anthropic;
    openrouter_client: OpenAI;
    encoder: any;

    async onload() {
        this.encoder = encodingForModel("gpt-4-0125-preview");
        await this.loadSettings();
        if (this.settings.openai_api_key) {
            this.openai_client = new OpenAI({ apiKey: this.settings.openai_api_key, dangerouslyAllowBrowser: true });
        }
        if (this.settings.groq_api_key) {
            this.groq_client = new Groq({ apiKey: this.settings.groq_api_key, dangerouslyAllowBrowser: true });
        }
        if (this.settings.anthropic_api_key) {
            this.anthropic_client = new Anthropic({
                apiKey: this.settings.anthropic_api_key,
            });
        }
        if (this.settings.open_router_key) {
            this.openrouter_client = new OpenAI({
                baseURL: "https://openrouter.ai/api/v1",
                apiKey: this.settings.open_router_key,
                dangerouslyAllowBrowser: true,
            });
        }

        this.addSettingTab(new CaretSettingTab(this.app, this));
        this.addCommand({
            id: "add-custom-models",
            name: "Add Custom Models",
            callback: () => {
                new CustomModelModal(this.app, this).open();
            },
        });
        this.addCommand({
            id: "test-log",
            name: "test",
            callback: () => {
                const canvas_view = this.app.workspace.getMostRecentLeaf()?.view;
                // @ts-ignore
                if (!canvas_view?.canvas) {
                    return;
                }
                const canvas = (canvas_view as any).canvas; // Assuming canvas is a property of the view

                const selection = canvas.selection;
                const selection_iterator = selection.values();
                const node = selection_iterator.next().value;
                if (!node) {
                    return;
                }
                return;
                // Create a new <p> element
                const pElement = document.createElement("p");
                pElement.textContent = "This is a new paragraph.";

                // Find the desired location to insert the <p> element
                // const targetDiv = node.contentEl.querySelector(".markdown-preview-sizer.markdown-preview-section");
                const targetDiv = node.contentEl.querySelector(".markdown-embed-content.node-insert-event");

                // Insert the <p> element into the target location
                if (targetDiv) {
                    targetDiv.appendChild(pElement);

                    // Create a new <div> element
                    const redSquareDiv = document.createElement("div");
                    redSquareDiv.textContent = "🤖";
                    redSquareDiv.style.width = "100%";
                    redSquareDiv.style.height = "40px";
                    redSquareDiv.style.backgroundColor = "rgba(211, 211, 211, 0.8)"; // Li
                    // redSquareDiv.style.position = "absolute";
                    // redSquareDiv.style.top = "0";
                    // redSquareDiv.style.left = "0";
                    redSquareDiv.style.padding = "2px";

                    // Insert the <div> before the targetDiv
                    targetDiv.parentNode.insertBefore(redSquareDiv, targetDiv);
                } else {
                    console.error("Target div not found");
                }
            },
        });
        this.addCommand({
            id: "remove-custom-models",
            name: "Remove Custom Models",
            callback: () => {
                new RemoveCustomModelModal(this.app, this).open();
            },
        });
        this.addCommand({
            id: "set-system-prompt",
            name: "Set System Prompt",
            callback: () => {
                new SystemPromptModal(this.app, this).open();
            },
        });
        this.addCommand({
            id: "create-new-workflow",
            name: "Create New Workflow",
            callback: () => {
                const leaf = this.app.workspace.getLeaf(true);
                const linearWorkflowEditor = new LinearWorkflowEditor(this, leaf);
                leaf.open(linearWorkflowEditor);
                this.app.workspace.revealLeaf(leaf);
            },
        });
        this.addCommand({
            id: "create-linear-workflow",
            name: "Create Linear Workflow From Canvas",
            callback: async () => {
                const canvas_view = this.app.workspace.getMostRecentLeaf()?.view;
                // @ts-ignore
                if (!canvas_view?.canvas) {
                    return;
                }
                const canvas = (canvas_view as any).canvas; // Assuming canvas is a property of the view

                const selection = canvas.selection;

                const selected_ids = [];
                const selection_iterator = selection.values();
                for (const node of selection_iterator) {
                    selected_ids.push(node.id);
                }

                const canvas_data = canvas.getData();
                const { nodes, edges } = canvas;

                // Filter nodes and edges based on selected IDs
                const selected_nodes = [];
                for (const node of nodes.values()) {
                    if (selected_ids.includes(node.id)) {
                        selected_nodes.push(node);
                    }
                }

                const selected_edges = [];
                for (const edge of edges.values()) {
                    // if (selected_ids.includes(edge.from.node.id) && selected_ids.includes(edge.to.node.id)) {
                    if (selected_ids.includes(edge.to.node.id)) {
                        selected_edges.push(edge);
                    }
                }
                const linear_graph = [];
                for (let i = 0; i < selected_edges.length; i++) {
                    const edge = selected_edges[i];
                    const from_node = edge.from.node.id;
                    const to_node = edge.to.node.id;
                    const node_text = linear_graph.push({ from_node, to_node });
                }
                const from_nodes = new Set(linear_graph.map((edge) => edge.from_node));
                const to_nodes = new Set(linear_graph.map((edge) => edge.to_node));

                let ultimate_ancestor = null;
                let ultimate_child = null;

                // Find the ultimate ancestor (a from_node that is not a to_node)
                for (const from_node of from_nodes) {
                    if (!to_nodes.has(from_node)) {
                        ultimate_ancestor = from_node;
                        break;
                    }
                }

                // Find the ultimate child (a to_node that is not a from_node)
                for (const to_node of to_nodes) {
                    if (!from_nodes.has(to_node)) {
                        ultimate_child = to_node;
                        break;
                    }
                }
                // Create a map for quick lookup of edges by from_node
                const edge_map = new Map();
                for (const edge of linear_graph) {
                    if (!edge_map.has(edge.from_node)) {
                        edge_map.set(edge.from_node, []);
                    }
                    edge_map.get(edge.from_node).push(edge);
                }

                // Initialize the sorted graph with the ultimate ancestor
                const sorted_graph = [];
                let current_node = ultimate_ancestor;

                // Traverse the graph starting from the ultimate ancestor
                while (current_node !== ultimate_child) {
                    const edges_from_current = edge_map.get(current_node);
                    if (edges_from_current && edges_from_current.length > 0) {
                        const next_edge = edges_from_current[0]; // Assuming there's only one edge from each node
                        sorted_graph.push(next_edge);
                        current_node = next_edge.to_node;
                    } else {
                        break; // No further edges, break the loop
                    }
                }

                // Add the ultimate child as the last node
                sorted_graph.push({ from_node: current_node, to_node: ultimate_child });
                // Create a list to hold the ordered node IDs
                const ordered_node_ids = [];

                // Add the ultimate ancestor as the starting node
                ordered_node_ids.push(ultimate_ancestor);

                // Traverse the sorted graph to collect node IDs in order
                for (const edge of sorted_graph) {
                    if (
                        edge.to_node !== ultimate_child ||
                        ordered_node_ids[ordered_node_ids.length - 1] !== ultimate_child
                    ) {
                        ordered_node_ids.push(edge.to_node);
                    }
                }

                // Initialize a new list to hold the prompts
                const prompts = [];

                // Iterate over the ordered node IDs
                for (const node_id of ordered_node_ids) {
                    // Find the corresponding node in selected_nodes
                    const node = selected_nodes.find((n) => n.id === node_id);
                    if (node) {
                        // Get the node context
                        const context = node.text;
                        // Check if the context starts with "user"
                        if (context.startsWith("<role>user</role>")) {
                            // Add the context to the prompts list
                            prompts.push(context.replace("<role>user</role>", "").trim());
                        }
                    }
                }

                const chat_folder_path = "caret/workflows";
                const chat_folder = this.app.vault.getAbstractFileByPath(chat_folder_path);
                if (!chat_folder) {
                    await this.app.vault.createFolder(chat_folder_path);
                }

                let prompts_string = ``;
                for (let i = 0; i < prompts.length; i++) {
                    const escaped_content = this.escapeXml(prompts[i]);
                    prompts_string += `

<prompt model="${this.settings.model}" provider="${this.settings.llm_provider}" delay="0" temperature="1">
${escaped_content}
</prompt>`.trim();
                }

                let file_content = `
---
caret_prompt: linear
version: 1
---
\`\`\`xml
<root>
<system_prompt tag="placeholder_do_not_delete">
</system_prompt>
    ${prompts_string}
</root>
\`\`\`
`.trim();

                let base_file_name = prompts[0]
                    .split(" ")
                    .slice(0, 10)
                    .join(" ")
                    .substring(0, 20)
                    .replace(/[^a-zA-Z0-9]/g, "_");
                let file_name = `${base_file_name}.md`;
                let file_path = `${chat_folder_path}/${file_name}`;
                let file = await this.app.vault.getFileByPath(file_path);
                let counter = 1;

                while (file) {
                    file_name = `${base_file_name}_${counter}.md`;
                    file_path = `${chat_folder_path}/${file_name}`;
                    file = await this.app.vault.getFileByPath(file_path);
                    counter++;
                }

                try {
                    if (file) {
                        await this.app.vault.modify(file, file_content);
                    } else {
                        await this.app.vault.create(file_path, file_content);
                    }
                    // new Notice("Workflow saved!");
                    const leaf = this.app.workspace.getLeaf(true);
                    const linearWorkflowEditor = new LinearWorkflowEditor(this, leaf, file_path);
                    leaf.open(linearWorkflowEditor);
                    this.app.workspace.revealLeaf(leaf);
                } catch (error) {
                    console.error("Failed to save chat:", error);
                }
            },
        });

        this.registerEvent(this.app.workspace.on("layout-change", () => {}));
        const that = this;

        this.registerEvent(
            this.app.workspace.on("active-leaf-change", (event) => {
                const currentLeaf = this.app.workspace.activeLeaf;
                this.unhighlight_lineage();

                if (currentLeaf?.view.getViewType() === "canvas") {
                    const canvas = currentLeaf.view;
                    this.patchCanvasMenu();
                }
            })
        );
        this.registerEditorExtension([redBackgroundField]);

        // Register the sidebar icon
        this.addChatIconToRibbon();

        this.addCommand({
            id: "caret-log",
            name: "Log",
            callback: async () => {
                const currentLeaf = this.app.workspace.activeLeaf;
                const path = "caret/chats";
                const folder = this.app.vault.getFolderByPath(path);

                if (currentLeaf?.view.getViewType() === "canvas") {
                    const canvasView = currentLeaf.view;
                    const canvas = (canvasView as any).canvas;
                    const viewportNodes = canvas.getViewportNodes();
                }
            },
        });
        this.addCommand({
            id: "insert-note",
            name: "Insert Note",
            callback: async () => {
                const currentLeaf = this.app.workspace.activeLeaf;
                if (!currentLeaf) {
                    new Notice("No active leaf");
                    return;
                }
                const view = currentLeaf.view;
                const view_type = view.getViewType();

                new InsertNoteModal(this.app, this, view).open();
            },
        });

        this.addCommand({
            id: "canvas-prompt",
            name: "Canvas Prompt",
            callback: async () => {
                const currentLeaf = this.app.workspace.activeLeaf;
                if (currentLeaf?.view.getViewType() === "canvas") {
                    const canvasView = currentLeaf.view;
                    const canvas = (canvasView as any).canvas;
                    const selection = canvas.selection;

                    let average_x = 0;
                    let average_y = 0;
                    let average_height = 0;
                    let average_width = 0;

                    let total_x = 0;
                    let total_y = 0;
                    let count = 0;
                    let total_height = 0;
                    let total_width = 0;
                    let all_text = "";

                    let convo_total_tokens = 0;

                    const context_window = this.settings.context_window;

                    for (const obj of selection) {
                        const { x, y, height, width } = obj;
                        total_x += x;
                        total_y += y;
                        total_height += height;
                        total_width += width;
                        count++;
                        if ("text" in obj) {
                            const { text } = obj;
                            const text_token_length = this.encoder.encode(text).length;
                            if (convo_total_tokens + text_token_length < context_window) {
                                all_text += text + "\n";
                                convo_total_tokens += text_token_length;
                            } else {
                                new Notice("Context window exceeded - This is the message?");
                                break;
                            }
                        } else if ("filePath" in obj) {
                            let { filePath } = obj;
                            const file = await this.app.vault.getFileByPath(filePath);
                            if (file.extension === "pdf") {
                                const text = await this.extractTextFromPDF(file.name);
                                const text_token_length = this.encoder.encode(text).length;
                                if (convo_total_tokens + text_token_length > context_window) {
                                    new Notice("Context window exceeded");
                                    break;
                                }
                                const file_text = `PDF Title: ${file.name}`;
                                all_text += `${file_text} \n ${text}`;
                                convo_total_tokens += text_token_length;
                            } else if (file?.extension === "md") {
                                const text = await this.app.vault.read(file);
                                const text_token_length = this.encoder.encode(text).length;
                                if (convo_total_tokens + text_token_length > context_window) {
                                    new Notice("Context window exceeded");
                                    break;
                                }
                                const file_text = `
                                Title: ${filePath.replace(".md", "")}
                                ${text}
                                `.trim();
                                all_text += file_text;
                                convo_total_tokens += text_token_length;
                            }
                        }
                    }

                    average_x = count > 0 ? total_x / count : 0;
                    average_y = count > 0 ? total_y / count : 0;
                    average_height = count > 0 ? Math.max(200, total_height / count) : 200;
                    average_width = count > 0 ? Math.max(200, total_width / count) : 200;

                    // This handles the model ---
                    // Create a modal with a text input and a submit button
                    const modal = new Modal(this.app);
                    modal.contentEl.createEl("h1", { text: "Canvas Prompt" });
                    const container = modal.contentEl.createDiv({ cls: "flex-col" });
                    const text_area = container.createEl("textarea", {
                        placeholder: "",
                        cls: "w-full mb-2",
                    });
                    const submit_button = container.createEl("button", { text: "Submit" });
                    submit_button.onclick = async () => {
                        modal.close();
                        const prompt = `
                        Please do the following:
                        ${text_area.value}

                        Given this content:
                        ${all_text}
                        `;
                        const conversation: Message[] = [{ role: "user", content: prompt }];
                        // Create the text node on the canvas
                        const text_node_config = {
                            pos: { x: average_x + 50, y: average_y }, // Position on the canvas
                            size: { width: average_width, height: average_height }, // Size of the text box
                            position: "center", // This might relate to text alignment
                            text: "", // Text content from input
                            save: true, // Save this node's state
                            focus: true, // Focus and start editing immediately
                        };
                        const node = canvas.createTextNode(text_node_config);
                        const node_id = node.id;

                        if (
                            this.settings.llm_provider_options[this.settings.llm_provider][this.settings.model]
                                .streaming
                        ) {
                            const stream: Message = await this.llm_call_streaming(
                                this.settings.llm_provider,
                                this.settings.model,
                                conversation,
                                1
                            );

                            await this.update_node_content(node_id, stream);
                        } else {
                            const content = await this.llm_call(
                                this.settings.llm_provider,
                                this.settings.model,
                                conversation
                            );
                            node.setText(content);
                        }
                    };
                    modal.open();
                }
            },
        });

        this.addCommand({
            id: "inline-editing",
            name: "Inline Editing",
            hotkeys: [{ modifiers: ["Mod"], key: "j" }],
            callback: () => {
                const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (activeView && activeView.editor) {
                    const selectedText = activeView.editor.getSelection();
                    const content = activeView.editor.getValue();
                    const startIndex = content.indexOf(selectedText);
                    const endIndex = startIndex + selectedText.length;
                    new CMDJModal(this.app, selectedText, startIndex, endIndex, this).open();
                } else {
                    new Notice("No active markdown editor or no text selected.");
                }
            },
        });

        // Register the custom view
        this.registerView(VIEW_NAME_SIDEBAR_CHAT, (leaf) => new SidebarChat(leaf));
        this.registerView(VIEW_NAME_MAIN_CHAT, (leaf) => new FullPageChat(this, leaf));
        // Define a command to insert text into the sidebar
        this.addCommand({
            id: "insert-text-into-sidebar",
            name: "Insert Text into Sidebar",
            hotkeys: [{ modifiers: ["Mod"], key: "l" }],
            callback: () => {
                const activeLeaf = this.app.workspace.activeLeaf;
                if (activeLeaf) {
                    const editor = activeLeaf.view instanceof MarkdownView ? activeLeaf.view.editor : null;
                    if (editor) {
                        const selectedText = editor.getSelection();
                        this.insertTextIntoSidebar(selectedText);
                    }
                }
            },
        });

        // // Define a command to clear text from the sidebar
        // this.addCommand({
        //     id: "clear-text-in-sidebar",
        //     name: "Clear Text in Sidebar",
        //     hotkeys: [{ modifiers: ["Mod"], key: ";" }],
        //     callback: () => {
        //         this.clearTextInSidebar();
        //     },
        // });
        this.addCommand({
            id: "open-chat",
            name: "Open Chat",
            callback: async () => {
                const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
                if (editor) {
                    let content = editor.getValue();
                    content = content.replace("```xml", "").trim();
                    content = content.replace("```", "").trim();
                    const xml_object = await this.parseXml(content);
                    const convo_id = xml_object.root.metadata[0].id[0];
                    const messages_from_xml = xml_object.root.conversation[0].message;
                    const messages: Message[] = [];
                    if (messages_from_xml) {
                        for (let i = 0; i < messages_from_xml.length; i++) {
                            const role = messages_from_xml[i].role[0];
                            const content = messages_from_xml[i].content[0];
                            messages.push({ role, content });
                        }
                    }
                    if (convo_id && messages) {
                        const leaf = this.app.workspace.getLeaf(true);
                        const chatView = new FullPageChat(this, leaf, convo_id, messages);
                        leaf.open(chatView);
                        this.app.workspace.revealLeaf(leaf);
                    } else {
                        new Notice("No valid chat data found in the current document.");
                    }
                } else {
                    new Notice("No active markdown editor found.");
                }
            },
        });
        this.addCommand({
            id: "open-workflow-editor",
            name: "Open Workflow Editor",
            callback: async () => {
                const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
                if (editor) {
                    const current_file = this.app.workspace.getActiveFile();
                    const front_matter = await this.get_frontmatter(current_file);

                    if (front_matter.caret_prompt !== "linear") {
                        new Notice("Not a linear workflow");
                    }
                    const leaf = this.app.workspace.getLeaf(true);
                    const linearWorkflowEditor = new LinearWorkflowEditor(this, leaf, current_file?.path);
                    leaf.open(linearWorkflowEditor);
                    this.app.workspace.revealLeaf(leaf);
                    return;
                }
            },
        });

        this.addCommand({
            id: "apply-diffs",
            name: "Apply Diffs",
            hotkeys: [{ modifiers: ["Mod"], key: "d" }],
            callback: () => {
                const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
                if (editor) {
                    let content = editor.getValue();
                    // Regex to find |-content-|
                    const deleteRegex = /\|-(.*?)-\|/gs;
                    // Regex to find |+content+|

                    // Replace all instances of |-content-| with empty string
                    content = content.replace(deleteRegex, "");
                    // Replace all instances of |+content+| with empty string
                    // @ts-ignore
                    content = content.replaceAll("|+", "");
                    // @ts-ignore
                    content = content.replaceAll("+|", "");

                    // Set the modified content back to the editor
                    editor.setValue(content);
                    new Notice("Dips applied successfully.");
                } else {
                    new Notice("No active markdown editor found.");
                }
            },
        });
    }
    async get_frontmatter(file: any) {
        let front_matter: any;
        try {
            await this.app.fileManager.processFrontMatter(file, (fm) => {
                front_matter = { ...fm };
            });
        } catch (error) {
            console.error("Error processing front matter:", error);
        }
        return front_matter;
    }

    async highlight_lineage() {
        await new Promise((resolve) => setTimeout(resolve, 200)); // Sleep for 200 milliseconds

        const canvas_view = this.app.workspace.getMostRecentLeaf()?.view;
        // @ts-ignore
        if (!canvas_view?.canvas) {
            return;
        }
        const canvas = (canvas_view as any).canvas; // Assuming canvas is a property of the view

        const selection = canvas.selection;
        const selection_iterator = selection.values();
        const node = selection_iterator.next().value;
        if (!node) {
            return;
        }
        const nodes_iterator = canvas.nodes.values();
        const nodes_array = Array.from(nodes_iterator);
        const canvas_data = canvas.getData();
        const { edges, nodes } = canvas_data;
        const longest_lineage = await this.getLongestLineage(nodes, edges, node.id);

        // Create a set to track lineage node IDs for comparison
        const lineage_node_ids = new Set(longest_lineage.map((node) => node.id));

        // Iterate through all nodes in the longest lineage
        for (const lineage_node of longest_lineage) {
            const lineage_id = lineage_node.id;
            const lineage_color = lineage_node.color;
            // Only store and change the color if it's not already stored
            if (!this.selected_node_colors.hasOwnProperty(lineage_id)) {
                this.selected_node_colors[lineage_id] = lineage_color; // Store the current color with node's id as key
                const filtered_nodes = nodes_array.filter((node: Node) => node.id === lineage_id);
                filtered_nodes.forEach((node: Node) => {
                    node.color = "4"; // Reset the node color to its original
                    node.render(); // Re-render the node to apply the color change
                });
            }
        }

        // Reset and remove nodes not in the current lineage
        Object.keys(this.selected_node_colors).forEach((node_id) => {
            if (!lineage_node_ids.has(node_id)) {
                const original_color = this.selected_node_colors[node_id];
                const filtered_nodes = nodes_array.filter((node: Node) => node.id === node_id);
                filtered_nodes.forEach((node: Node) => {
                    node.color = original_color; // Reset the node color to its original
                    node.render(); // Re-render the node to apply the color change
                });
                delete this.selected_node_colors[node_id]; // Remove from tracking object
            }
        });
    }
    escapeXml(unsafe: string): string {
        return unsafe.replace(/[<>&'"]/g, (c) => {
            switch (c) {
                case "<":
                    return "&lt;";
                case ">":
                    return "&gt;";
                case "&":
                    return "&amp;";
                case "'":
                    return "&apos;";
                case '"':
                    return "&quot;";
                default:
                    return c;
            }
        });
    }
    async unhighlight_lineage() {
        const canvas_view = this.app.workspace.getMostRecentLeaf()?.view;
        // @ts-ignore
        if (!canvas_view?.canvas) {
            return;
        }
        const canvas = (canvas_view as any).canvas;
        const nodes_iterator = canvas.nodes.values();
        const nodes_array = Array.from(nodes_iterator);

        for (const node_id in this.selected_node_colors) {
            const filtered_nodes = nodes_array.filter((node: Node) => node.id === node_id);
            filtered_nodes.forEach((node: Node) => {
                node.color = this.selected_node_colors[node_id]; // Reset the node color to its original
                node.render(); // Re-render the node to apply the color change
            });
        }
        this.selected_node_colors = {}; // Clear the stored colors after resetting
    }
    patchCanvasMenu() {
        const canvasView = this.app.workspace.getMostRecentLeaf()?.view;
        // @ts-ignore
        if (!canvasView?.canvas) {
            return;
        }
        if (!canvasView) {
            return;
        }
        // @ts-ignore
        const canvas = canvasView.canvas;
        const nodes = canvas.nodes;

        for (const node of nodes.values()) {
            if (node.unknownData) {
                if (!node.unknownData.role) {
                    node.unknownData.role = "";
                }
                if (node.unknownData.displayOverride) {
                    node.unknownData.displayOverride = false;
                }
            }
        }

        const menu = canvas.menu;
        if (!menu) {
            console.error("No menu found on the canvas");
            return;
        }
        const that = this; // Capture the correct 'this' context.

        const menuUninstaller = around(menu.constructor.prototype, {
            render: (next: any) =>
                async function (...args: any) {
                    const result = await next.call(this, ...args);

                    that.add_new_node_button(this.menuEl);

                    that.add_sparkle_button(this.menuEl);
                    that.add_extra_actions(this.menuEl);

                    // await that.add_agent_button(this.menuEl);

                    return result;
                },
        });
        this.register(menuUninstaller);
        // if (!this.canvas_patched) {
        // Define the functions to be patched
        const functions = {
            onDoubleClick: (next: any) =>
                function (event: MouseEvent) {
                    next.call(this, event);
                },
            onPointerdown: (next: any) =>
                function (event: MouseEvent) {
                    if (event.target) {
                        // @ts-ignore
                        const isNode = event.target.closest(".canvas-node");
                        const canvas_color_picker_item = document.querySelector(
                            '.clickable-icon button[aria-label="Set Color"]'
                        );

                        if (isNode) {
                            that.highlight_lineage();
                        } else {
                            that.unhighlight_lineage();
                        }
                    } else {
                        that.unhighlight_lineage();
                    }

                    next.call(this, event);
                },
            // rerenderViewport: (next: any) =>
            //     function (...args: any) {
            //         console.log("rerenderViewport called with arguments:", args);
            //         const result = next.call(this, ...args);
            //         console.log("rerenderViewport event:", result);
            //         return result;
            //     },
            // renderSnapPoints: (next: any) =>
            //     function (...args: any) {
            //         console.log("renderSnapPoints called with arguments:", args);
            //         const result = next.call(this, ...args);
            //         console.log("renderSnapPoints event:", result);
            //         return result;
            //     },
            // setViewport: (next: any) =>
            //     function (...args: any) {
            //         console.log("setViewport called with arguments:", args);
            //         const result = next.call(this, ...args);
            //         console.log("setViewport event:", result);
            //         return result;
            //     },
            // getData: (next: any) =>
            //     function (...args: any) {
            //         console.log("getData called with arguments:", args);
            //         const result = next.call(this, ...args);
            //         console.log("getData result:", result);
            //         return result;
            //     },
            // getState: (next: any) =>
            //     function (...args: any) {
            //         console.log("getState called with arguments:", args);
            //         const result = next.call(this, ...args);
            //         console.log("getState result:", result);
            //         return result;
            //     },
            // getViewportNodes: (next: any) =>
            //     function (...args: any) {
            //         console.log("getViewportNodes called with arguments:", args);
            //         const result = next.call(this, ...args);
            //         console.log("getViewportNodes result:", result);
            //         return result;
            //     },
            // load: (next: any) =>
            //     function (...args: any) {
            //         console.log("load called with arguments:", args);
            //         const result = next.call(this, ...args);
            //         console.log("load result:", result);
            //         return result;
            //     },
            // markViewportChanged: (next: any) =>
            //     function (...args: any) {
            //         console.log("markViewportChanged called with arguments:", args);
            //         const result = next.call(this, ...args);
            //         console.log("markViewportChanged result:", result);
            //         return result;
            //     },
            requestFrame: (next: any) =>
                function (...args: any) {
                    const canvas_view = this.app.workspace.getMostRecentLeaf()?.view;
                    // @ts-ignore
                    if (!canvas_view?.canvas) {
                        return;
                    }
                    const canvas = (canvas_view as any).canvas; // Assuming canvas is a property of the view
                    const nodes = canvas.nodes;

                    for (const node of nodes.values()) {
                        if (node.unknownData) {
                            if (!node.unknownData.role) {
                                node.unknownData.role = "";
                            }
                            if (!node.unknownData.displayOverride) {
                                node.unknownData.displayOverride = false;
                            }
                        }
                        const contentEl = node.contentEl;
                        if (contentEl) {
                            const targetDiv = contentEl.querySelector(".markdown-embed-content.node-insert-event");
                            if (targetDiv) {
                                let customDisplayDiv = contentEl.querySelector("#custom-display");
                                if (!customDisplayDiv) {
                                    customDisplayDiv = document.createElement("div");
                                    customDisplayDiv.id = "custom-display";
                                    customDisplayDiv.style.width = "100%";
                                    customDisplayDiv.style.height = "40px";
                                    customDisplayDiv.style.backgroundColor = "rgba(211, 211, 211, 0.8)";
                                    customDisplayDiv.style.padding = "2px";
                                    customDisplayDiv.style.paddingLeft = "8px";
                                    customDisplayDiv.style.paddingTop = "4px";
                                    targetDiv.parentNode.insertBefore(customDisplayDiv, targetDiv);
                                }

                                if (node.unknownData.role === "assistant") {
                                    customDisplayDiv.textContent = "🤖";
                                } else if (node.unknownData.role === "user") {
                                    customDisplayDiv.textContent = "👤";
                                } else if (node.unknownData.role === "system") {
                                    customDisplayDiv.textContent = "🖥️";
                                }

                                node.unknownData.displayOverride = true;
                            }
                        }
                    }

                    const result = next.call(this, ...args);
                    return result;
                },
        };
        const doubleClickPatcher = around(canvas.constructor.prototype, functions);
        this.register(doubleClickPatcher);

        canvasView.scope?.register(["Mod", "Shift"], "ArrowUp", () => {
            that.create_directional_node(canvas, "top");
        });

        canvasView.scope?.register(["Mod"], "ArrowUp", () => {
            that.navigate(canvas, "top");
        });
        canvasView.scope?.register(["Mod"], "ArrowDown", () => {
            that.navigate(canvas, "bottom");
        });
        canvasView.scope?.register(["Mod"], "ArrowLeft", () => {
            that.navigate(canvas, "left");
        });
        canvasView.scope?.register(["Mod"], "ArrowRight", () => {
            that.navigate(canvas, "right");
        });
        canvasView.scope?.register(["Mod"], "Enter", () => {
            that.start_editing_node(canvas);
        });

        canvasView.scope?.register(["Mod", "Shift"], "ArrowUp", () => {
            that.create_directional_node(canvas, "top");
        });
        canvasView.scope?.register(["Mod", "Shift"], "ArrowDown", () => {
            that.create_directional_node(canvas, "bottom");
        });
        canvasView.scope?.register(["Mod", "Shift"], "ArrowLeft", () => {
            that.create_directional_node(canvas, "left");
        });
        canvasView.scope?.register(["Mod", "Shift"], "ArrowRight", () => {
            that.create_directional_node(canvas, "right");
        });
        canvasView.scope?.register(["Mod", "Shift"], "Enter", () => {
            that.run_graph_chat(canvas);
        });

        if (!this.canvas_patched) {
            // @ts-ignore
            canvasView.leaf.rebuildView();
            this.canvas_patched = true;
        }
    }
    create_directional_node(canvas: any, direction: string) {
        const selection = canvas.selection;
        const selectionIterator = selection.values();
        const node = selectionIterator.next().value;
        if (!node) {
            return;
        }
        if (node.isEditing) {
            return;
        }
        const parent_node_x = node.x;
        const parent_node_y = node.y;
        const parent_width = node.width;
        const parent_height = node.height;

        let x: number;
        let y: number;
        let from_side: string;
        let to_side: string;

        switch (direction) {
            case "left":
                x = parent_node_x - parent_width - 200;
                y = parent_node_y;
                from_side = "left";
                to_side = "right";
                break;
            case "right":
                x = parent_node_x + parent_width + 200;
                y = parent_node_y;
                from_side = "right";
                to_side = "left";
                break;
            case "top":
                x = parent_node_x;
                y = parent_node_y - parent_height - 200;
                from_side = "top";
                to_side = "bottom";
                break;
            case "bottom":
                x = parent_node_x;
                y = parent_node_y + parent_height + 200;
                from_side = "bottom";
                to_side = "top";
                break;
            default:
                console.error("Invalid direction provided");
                return;
        }

        this.childNode(canvas, node, x, y, "<role>user</role>", from_side, to_side);
    }
    start_editing_node(canvas: Canvas) {
        const selection = canvas.selection;
        const selectionIterator = selection.values();
        const node = selectionIterator.next().value;
        const node_id = node.id;
        node.isEditing = true;
        const editButton = document.querySelector('.canvas-menu button[aria-label="Edit"]') as HTMLElement;
        if (editButton) {
            editButton.click(); // Simulate the click on the edit button
        } else {
            console.error("Edit button not found");
        }
    }
    run_graph_chat(canvas: Canvas) {
        canvas.requestSave();
        const selection = canvas.selection;
        const selectionIterator = selection.values();
        const node = selectionIterator.next().value;
        const node_id = node.id;

        const editButton = document.querySelector('.canvas-menu button[aria-label="Sparkle"]') as HTMLButtonElement;
        if (editButton) {
            setTimeout(() => {
                editButton.click(); // Simulate the click on the edit button after 200 milliseconds
            }, 200);
        } else {
            console.error("Edit button not found");
        }
    }
    navigate(canvas: Canvas, direction: string) {
        // const canvas = canvasView.canvas;
        const selection = canvas.selection;
        const selectionIterator = selection.values();
        const node = selectionIterator.next().value;
        if (!node) {
            return;
        }
        if (node.isEditing) {
            return;
        }
        const node_id = node.id;
        const canvas_data = canvas.getData();

        // Assuming direction can be 'next' or 'previous' for simplicity
        const edges = canvas_data.edges;
        const nodes = canvas_data.nodes;
        let targetNodeID: string | null = null;

        switch (direction) {
            case "right":
                // Handle both 'from' and 'to' cases for 'right'
                const edgeRightFrom = edges.find(
                    (edge: Edge) => edge.fromNode === node_id && edge.fromSide === "right"
                );
                if (edgeRightFrom) {
                    targetNodeID = edgeRightFrom.toNode;
                } else {
                    const edgeRightTo = edges.find((edge: Edge) => edge.toNode === node_id && edge.toSide === "right");
                    if (edgeRightTo) {
                        targetNodeID = edgeRightTo.fromNode;
                    }
                }
                break;
            case "left":
                // Handle both 'from' and 'to' cases for 'left'
                const edgeLeftFrom = edges.find((edge: Edge) => edge.fromNode === node_id && edge.fromSide === "left");
                if (edgeLeftFrom) {
                    targetNodeID = edgeLeftFrom.toNode;
                } else {
                    const edgeLeftTo = edges.find((edge: Edge) => edge.toNode === node_id && edge.toSide === "left");
                    if (edgeLeftTo) {
                        targetNodeID = edgeLeftTo.fromNode;
                    }
                }
                break;
            case "top":
                // Handle both 'from' and 'to' cases for 'top'
                const edgeTopFrom = edges.find((edge: Edge) => edge.fromNode === node_id && edge.fromSide === "top");
                if (edgeTopFrom) {
                    targetNodeID = edgeTopFrom.toNode;
                } else {
                    const edgeTopTo = edges.find((edge: Edge) => edge.toNode === node_id && edge.toSide === "top");
                    if (edgeTopTo) {
                        targetNodeID = edgeTopTo.fromNode;
                    }
                }
                break;
            case "bottom":
                // Handle both 'from' and 'to' cases for 'bottom'
                const edgeBottomFrom = edges.find(
                    (edge: Edge) => edge.fromNode === node_id && edge.fromSide === "bottom"
                );
                if (edgeBottomFrom) {
                    targetNodeID = edgeBottomFrom.toNode;
                } else {
                    const edgeBottomTo = edges.find(
                        (edge: Edge) => edge.toNode === node_id && edge.toSide === "bottom"
                    );
                    if (edgeBottomTo) {
                        targetNodeID = edgeBottomTo.fromNode;
                    }
                }
                break;
        }
        // const viewportNodes = canvas.getViewportNodes();
        let viewport_nodes: ViewportNode[] = [];
        let initial_viewport_children = canvas.nodeIndex.data.children;
        if (initial_viewport_children.length > 1) {
            let type_nodes = "nodes";

            // If there is more childen then use this path.
            if (initial_viewport_children[0] && "children" in initial_viewport_children[0]) {
                type_nodes = "children";
            }
            if (type_nodes === "children") {
                for (let i = 0; i < initial_viewport_children.length; i++) {
                    const nodes_list = initial_viewport_children[i].children;

                    nodes_list.forEach((node: ViewportNode) => {
                        viewport_nodes.push(node);
                    });
                }
            }
            if (type_nodes === "nodes") {
                for (let i = 0; i < initial_viewport_children.length; i++) {
                    const viewport_node = initial_viewport_children[i];
                    viewport_nodes.push(viewport_node);
                }
            }
        }

        if (targetNodeID) {
            const target_node = viewport_nodes.find((node) => node.id === targetNodeID);

            canvas.selectOnly(target_node);
            canvas.zoomToSelection(target_node);
        }
        this.highlight_lineage();
    }
    // async get_viewport_node(node_id: string): Promise<ViewportNode | undefined> {
    //     const canvas_view = await this.get_current_canvas_view();
    //     // @ts-ignore
    //     const canvas = canvas_view.canvas;
    //     let viewport_nodes: ViewportNode[] = [];
    //     let initial_viewport_children = canvas.nodeIndex.data.children;
    //     if (initial_viewport_children.length > 1) {
    //         let type_nodes = "nodes";

    //         // If there is more childen then use this path.
    //         if (initial_viewport_children[0] && "children" in initial_viewport_children[0]) {
    //             type_nodes = "children";
    //         }
    //         if (type_nodes === "children") {
    //             for (let i = 0; i < initial_viewport_children.length; i++) {
    //                 const nodes_list = initial_viewport_children[i].children;

    //                 nodes_list.forEach((node: ViewportNode) => {
    //                     viewport_nodes.push(node);
    //                 });
    //             }
    //         }
    //         if (type_nodes === "nodes") {
    //             for (let i = 0; i < initial_viewport_children.length; i++) {
    //                 const viewport_node = initial_viewport_children[i];
    //                 viewport_nodes.push(viewport_node);
    //             }
    //         }
    //     }
    // }
    async parseXml(xmlString: string): Promise<any> {
        try {
            const result = await new Promise((resolve, reject) => {
                parseString(xmlString, (err, result) => {
                    if (err) reject(err);
                    else resolve(result);
                });
            });
            console.dir(result);
            return result;
        } catch (err) {
            console.error(err);
        }
    }

    parseCustomXML(xmlString: string, tags: string[]) {
        // Function to extract content between tags
        function getContent(tag: string, string: string) {
            const openTag = `<${tag}>`;
            const closeTag = `</${tag}>`;
            const start = string.indexOf(openTag) + openTag.length;
            const end = string.indexOf(closeTag);
            const prompt_content = string.substring(start, end).trim();
            return prompt_content;
        }

        // Initialize the result object
        const result: any = {};

        // Extract content for each tag provided
        tags.forEach((tag: string) => {
            const content = getContent(tag, xmlString);
            result[tag] = content;
        });

        return result;
    }
    async extractTextFromPDF(file_name: string): Promise<string> {
        // pdfjs.GlobalWorkerOptions.workerSrc = "pdf.worker.js";
        // Assuming this code is inside a method of your plugin class
        // TODO - Clean this up later
        // @ts-ignore
        // pdfjs.GlobalWorkerOptions.workerSrc = await this.app.vault.getResourcePath({
        //     path: ".obsidian/plugins/caret/pdf.worker.js",
        // });

        // TODO - Clean this up later
        // @ts-ignore
        const file_path = await this.app.vault.getResourcePath({
            path: file_name,
        });
        async function loadAndExtractText(file_path: string): Promise<string> {
            try {
                const doc = await pdfjs.getDocument(file_path).promise;
                const numPages = doc.numPages;

                // Load metadata
                const metadata = await doc.getMetadata();

                let fullText = "";
                for (let i = 1; i <= numPages; i++) {
                    const page = await doc.getPage(i);
                    const viewport = page.getViewport({ scale: 1.0 });

                    const content = await page.getTextContent();
                    const pageText = content.items.map((item: { str: string }) => item.str).join(" ");
                    fullText += pageText + " ";

                    // Release page resources.
                    page.cleanup();
                }
                return fullText;
            } catch (err) {
                console.error("Error: " + err);
                throw err;
            }
        }

        const fullDocumentText = await loadAndExtractText(file_path);
        return fullDocumentText;
    }
    add_new_node_button(menuEl: HTMLElement) {
        if (!menuEl.querySelector(".graph-menu-item")) {
            const graphButtonEl = createEl("button", "clickable-icon graph-menu-item");
            setTooltip(graphButtonEl, "Create Node", { placement: "top" });
            setIcon(graphButtonEl, "lucide-workflow");
            graphButtonEl.addEventListener("click", async () => {
                // Assuming canvasView is accessible here, or you need to pass it similarly
                const canvasView = this.app.workspace.getLeavesOfType("canvas").first()?.view;
                const view = this.app.workspace.getMostRecentLeaf()?.view;
                // @ts-ignore
                if (!view?.canvas) {
                    return;
                }
                // @ts-ignore
                const canvas = view.canvas;
                const selection = canvas.selection;
                const selectionIterator = selection.values();
                const node = selectionIterator.next().value;
                const x = node.x + node.width + 200;
                const new_node = await this.childNode(canvas, node, x, node.y, "");
                console.log({ new_node });
                new_node.unknownData.role = "user";
            });
            menuEl.appendChild(graphButtonEl);
        }
    }
    add_extra_actions(menuEl: HTMLElement) {
        if (!menuEl.querySelector(".wand")) {
            const graphButtonEl = createEl("button", "clickable-icon wand");
            setTooltip(graphButtonEl, "Actions", { placement: "top" });
            setIcon(graphButtonEl, "lucide-wand");

            interface SubmenuItemConfig {
                name: string;
                icon: string;
                tooltip: string;
                callback: () => void;
            }

            function createSubmenu(configs: SubmenuItemConfig[]): HTMLElement {
                const submenuEl = createEl("div", { cls: "submenu" });

                configs.forEach((config) => {
                    const submenuItem = createEl("div", { cls: "submenu-item" });
                    const iconEl = createEl("span", { cls: "clickable-icon" });
                    setIcon(iconEl, config.icon);
                    setTooltip(iconEl, config.tooltip, { placement: "top" });
                    submenuItem.appendChild(iconEl);
                    submenuItem.addEventListener("click", config.callback);
                    submenuEl.appendChild(submenuItem);
                });

                return submenuEl;
            }
            const canvasView = this.app.workspace.getLeavesOfType("canvas").first()?.view;
            const view = this.app.workspace.getMostRecentLeaf()?.view;
            // @ts-ignore
            if (!view?.canvas) {
                return;
            }
            // @ts-ignore
            const canvas = view.canvas;
            const selection = canvas.selection;
            const selectionIterator = selection.values();
            const node = selectionIterator.next().value;

            const submenuConfigs: SubmenuItemConfig[] = [
                {
                    name: "User",
                    icon: "lucide-user",
                    tooltip: "Set role to user",
                    callback: () => {
                        console.log(node);
                        node.unknownData.role = "user";
                        node.unknownData.displayOverride = false;
                        canvas.requestFrame();
                    },
                },
                {
                    name: "Assistant",
                    icon: "lucide-bot",
                    tooltip: "Set role to assistant",
                    callback: () => {
                        node.unknownData.role = "assistant";
                        node.unknownData.displayOverride = false;
                        canvas.requestFrame();
                    },
                },
                {
                    name: "System Prompt",
                    icon: "lucide-monitor-check",
                    tooltip: "Set system prompt",
                    callback: () => {
                        node.unknownData.role = "system";
                        node.unknownData.displayOverride = false;
                        canvas.requestFrame();
                    },
                },
            ];

            const submenuEl = createSubmenu(submenuConfigs);

            // Append the submenu to the main button
            graphButtonEl.appendChild(submenuEl);

            let submenuVisible = false;

            graphButtonEl.addEventListener("click", () => {
                submenuVisible = !submenuVisible;
                submenuEl.style.display = submenuVisible ? "grid" : "none";
            });

            menuEl.appendChild(graphButtonEl);
        }
    }

    get_ancestors(nodes: Node[], edges: Edge[], nodeId: string): Node[] {
        let ancestors: Node[] = [];
        let currentId: string = nodeId;
        let processedNodes: Set<string> = new Set();

        while (true) {
            const incomingEdges: Edge[] = edges.filter((edge) => edge.toNode === currentId);
            if (incomingEdges.length === 0) {
                break; // No more ancestors
            }

            currentId = incomingEdges[0].fromNode;
            if (processedNodes.has(currentId)) {
                break; // Avoid infinite loops in cyclic graphs
            }
            processedNodes.add(currentId);

            const ancestor: Node | undefined = nodes.find((node) => node.id === currentId);
            if (ancestor) {
                ancestors.push(ancestor);
            }
        }

        return ancestors;
    }
    getAllAncestorNodes(nodes: Node[], edges: Edge[], nodeId: string): Node[] {
        let ancestors: Node[] = [];
        let queue: string[] = [nodeId];
        let processedNodes: Set<string> = new Set();

        while (queue.length > 0) {
            let currentId = queue.shift();
            if (!currentId || processedNodes.has(currentId)) continue;

            processedNodes.add(currentId);
            const incomingEdges: Edge[] = edges.filter((edge) => edge.toNode === currentId);
            incomingEdges.forEach((edge) => {
                const ancestor = nodes.find((node) => node.id === edge.fromNode);
                if (ancestor && !processedNodes.has(ancestor.id)) {
                    ancestors.push(ancestor);
                    queue.push(ancestor.id);
                }
            });
        }

        return ancestors;
    }
    getLongestLineage(nodes: Node[], edges: Edge[], nodeId: string): Node[] {
        let longestLineage: Node[] = [];

        function findLongestPath(currentId: string, path: Node[]): void {
            const incomingEdges: Edge[] = edges.filter((edge) => edge.toNode === currentId);
            if (incomingEdges.length === 0) {
                // Check if the current path is the longest we've encountered
                if (path.length > longestLineage.length) {
                    longestLineage = path.slice();
                }
                return;
            }

            incomingEdges.forEach((edge) => {
                const ancestor = nodes.find((node) => node.id === edge.fromNode);
                if (ancestor) {
                    // Check if the ancestor is the direct ancestor (index 1) and has 'context' in its content
                    if (path.length === 1 && ancestor.type === "text" && ancestor.text.includes("<context>")) {
                        return; // Skip this lineage
                    }
                    findLongestPath(ancestor.id, path.concat(ancestor));
                }
            });
        }

        // Start with the given node
        const startNode = nodes.find((node) => node.id === nodeId);
        if (startNode) {
            findLongestPath(nodeId, [startNode]);
        }

        return longestLineage;
    }
    async getDirectAncestorsWithContext(nodes: Node[], edges: Edge[], nodeId: string): Promise<string> {
        let direct_ancentors_context = "";

        const startNode = nodes.find((node) => node.id === nodeId);
        if (!startNode) return "";

        const incomingEdges: Edge[] = edges.filter((edge) => edge.toNode === nodeId);
        for (let i = 0; i < incomingEdges.length; i++) {
            const edge = incomingEdges[i];
            const ancestor = nodes.find((node) => node.id === edge.fromNode);
            if (ancestor && ancestor.type === "text" && ancestor.text.includes("<context>")) {
                direct_ancentors_context += ancestor.text + "\n";
            } else if (ancestor && ancestor.type === "file" && ancestor.file && ancestor.file.includes(".md")) {
                const file_path = ancestor.file;
                const file = this.app.vault.getFileByPath(file_path);
                if (file) {
                    const context = await this.app.vault.cachedRead(file);
                    direct_ancentors_context += "\n" + context;
                } else {
                    console.error("File not found:", file_path);
                }
            }
        }
        return direct_ancentors_context;
    }
    async getAllAncestorsWithContext(nodes: Node[], edges: Edge[], nodeId: string): Promise<string> {
        let ancestors_context = "";
        let convo_total_tokens = 0;

        const findAncestorsWithContext = async (nodeId: string) => {
            const node = nodes.find((node) => node.id === nodeId);
            if (!node) return;

            const incomingEdges: Edge[] = edges.filter((edge) => edge.toNode === nodeId);
            for (let i = 0; i < incomingEdges.length; i++) {
                const edge = incomingEdges[i];
                const ancestor = nodes.find((node) => node.id === edge.fromNode);
                if (ancestor) {
                    let contextToAdd = "";

                    if (ancestor.type === "text") {
                        if (!ancestor.text.includes("<role>")) {
                            contextToAdd = ancestor.text + "\n";
                        }
                    } else if (ancestor.type === "file" && ancestor.file && ancestor.file.includes(".md")) {
                        const file_path = ancestor.file;
                        const file = this.app.vault.getFileByPath(file_path);
                        if (file) {
                            const context = await this.app.vault.cachedRead(file);

                            if (!context.includes("caret_prompt")) {
                                contextToAdd = `\n\n---------------------------\n\nFile Title: ${file_path}\n${context}`;
                            }
                        } else {
                            console.error("File not found:", file_path);
                        }
                    } else if (ancestor.type === "file" && ancestor.file && ancestor.file.includes(".pdf")) {
                        console.log("PDF for context here");
                        const file_name = ancestor.file;
                        const text = await this.extractTextFromPDF(file_name);
                        console.log(text.substring(0, 1000));
                        contextToAdd = `\n\n---------------------------\n\nPDF File Title: ${file_name}\n${text}`;
                    }

                    const contextTokens = this.encoder.encode(contextToAdd).length;
                    if (convo_total_tokens + contextTokens > this.settings.context_window) {
                        new Notice(
                            "Exceeding context window while adding ancestor context. Stopping further additions."
                        );
                        return;
                    }

                    ancestors_context += contextToAdd;
                    convo_total_tokens += contextTokens;

                    await findAncestorsWithContext(ancestor.id);
                }
            }
        };

        await findAncestorsWithContext(nodeId);
        console.log(ancestors_context);
        return ancestors_context;
    }

    async get_ref_blocks_content(node: any): Promise<string> {
        let rep_block_content = "";
        let ref_blocks;
        if (!node.text) {
            return "";
        }
        try {
            ref_blocks = node.text.match(/\[\[.*?\]\]/g) || [];
        } catch (error) {
            console.error(node);
            console.error(node.text);
            throw error;
        }

        const inner_texts = ref_blocks.map((block: string) => block.slice(2, -2));
        const files = this.app.vault.getFiles();

        for (const file_name of inner_texts) {
            const foundFile = files.find((file) => file.basename === file_name);
            if (foundFile) {
                const text = await this.app.vault.cachedRead(foundFile);
                rep_block_content += `Title: ${file_name}\n${text}\n\n`;
            } else {
                console.error("File not found for:", file_name);
            }
        }
        rep_block_content = rep_block_content.trim();
        return rep_block_content;
    }
    async get_current_node(canvas: Canvas, node_id: string) {
        await canvas.requestSave(true);
        const nodes_iterator = canvas.nodes.values();
        let node = null;
        for (const node_obj of nodes_iterator) {
            if (node_obj.id === node_id) {
                node = node_obj;
                break;
            }
        }
        return node;
    }
    async get_current_canvas_view() {
        const canvas_view = this.app.workspace.getMostRecentLeaf()?.view;
        // @ts-ignore
        if (!canvas_view || !canvas_view.canvas) {
            return;
        }
        // @ts-ignore
        const canvas = canvas_view.canvas;
        return canvas_view;
    }

    async sparkle(
        node_id: string,
        system_prompt: string = "",
        sparkle_config: SparkleConfig = {
            model: "default",
            provider: "default",
            temperature: 1,
        }
    ) {
        let local_system_prompt = system_prompt;
        const canvas_view = this.app.workspace.getMostRecentLeaf()?.view;
        // @ts-ignore
        if (!canvas_view || !canvas_view.canvas) {
            return;
        }
        // @ts-ignore
        const canvas = canvas_view.canvas;

        let node = await this.get_current_node(canvas, node_id);
        if (!node) {
            console.error("Node not found with ID:", node_id);
            return;
        }
        console.log(node);
        node.unknownData.role = "user";
        console.log("--- HEre??");

        // Add user xml if it's not there and re-fetch the node
        const current_text = node.text;

        const canvas_data = canvas.getData();
        const { edges, nodes } = canvas_data;

        // Continue with operations on `target_node`
        if (node.hasOwnProperty("file")) {
            const file_path = node.file.path;
            const file = this.app.vault.getAbstractFileByPath(file_path);
            if (file) {
                const text = await this.app.vault.cachedRead(file);

                // Check for the presence of three dashes indicating the start of the front matter
                const front_matter = await this.get_frontmatter(file);
                if (front_matter.hasOwnProperty("caret_prompt")) {
                    let caret_prompt = front_matter.caret_prompt;

                    if (caret_prompt === "parallel") {
                        const xml_content = text.match(/```xml([\s\S]*?)```/)[1].trim();
                        const xml = await this.parseXml(xml_content);
                        const system_prompt_list = xml.root.system_prompt;

                        const system_prompt = system_prompt_list[0]._.trim();

                        const prompts = xml.root.prompt;
                        const card_height = node.height;
                        const middle_index = Math.floor(prompts.length / 2);
                        const highest_y = node.y - middle_index * (100 + card_height); // Calculate the highest y based on the middle index
                        const sparkle_promises = [];

                        for (let i = 0; i < prompts.length; i++) {
                            const prompt = prompts[i];
                            const prompt_content = prompt._.trim();
                            const prompt_delay = prompt.$?.delay || 0;
                            const prompt_model = prompt.$?.model || "default";
                            const prompt_provider = prompt.$?.provider || "default";
                            const prompt_temperature = parseFloat(prompt.$?.temperature) || this.settings.temperature;
                            const new_node_content = `${prompt_content}`;
                            const x = node.x + node.width + 200;
                            const y = highest_y + i * (100 + card_height); // Increment y for each prompt to distribute them vertically including card height

                            // Create a new user node
                            const user_node = await this.childNode(
                                canvas,
                                node,
                                x,
                                y,
                                new_node_content,
                                "right",
                                "left",
                                "groq"
                            );
                            user_node.unknownData.role = "user";
                            user_node.unknownData.displayOverride = false;

                            const sparkle_config: SparkleConfig = {
                                model: prompt_model,
                                provider: prompt_provider,
                                temperature: prompt_temperature,
                            };

                            const sparkle_promise = (async () => {
                                if (prompt_delay > 0) {
                                    new Notice(`Waiting for ${prompt_delay} seconds...`);
                                    await new Promise((resolve) => setTimeout(resolve, prompt_delay * 1000));
                                    new Notice(`Done waiting for ${prompt_delay} seconds.`);
                                }
                                await this.sparkle(user_node.id, system_prompt, sparkle_config);
                            })();

                            sparkle_promises.push(sparkle_promise);
                        }

                        await Promise.all(sparkle_promises);
                        return;
                    } else if (caret_prompt === "linear") {
                        const xml_content = text.match(/```xml([\s\S]*?)```/)[1].trim();
                        const xml = await this.parseXml(xml_content);
                        const system_prompt_list = xml.root.system_prompt;

                        const system_prompt = system_prompt_list[0]._.trim();

                        const prompts = xml.root.prompt;

                        let current_node = node;
                        for (let i = 0; i < prompts.length; i++) {
                            const prompt = prompts[i];
                            const prompt_content = prompt._.trim();
                            const prompt_delay = prompt.$?.delay || 0;
                            const prompt_model = prompt.$?.model || "default";
                            const prompt_provider = prompt.$?.provider || "default";
                            const prompt_temperature = parseFloat(prompt.$?.temperature) || this.settings.temperature;
                            const new_node_content = `<role>user</role>\n${prompt_content}`;
                            const x = current_node.x + current_node.width + 200;
                            const y = current_node.y;

                            // Create a new user node
                            const user_node = await this.childNode(
                                canvas,
                                current_node,
                                x,
                                y,
                                new_node_content,
                                "right",
                                "left",
                                "groq"
                            );
                            user_node.unknownData.role = "user";
                            user_node.unknownData.displayOverride = false;
                            const sparkle_config: SparkleConfig = {
                                model: prompt_model,
                                provider: prompt_provider,
                                temperature: prompt_temperature,
                            };
                            if (prompt_delay > 0) {
                                new Notice(`Waiting for ${prompt_delay} seconds...`);
                                await new Promise((resolve) => setTimeout(resolve, prompt_delay * 1000));
                                new Notice(`Done waiting for ${prompt_delay} seconds.`);
                            }
                            const assistant_node = await this.sparkle(user_node.id, system_prompt, sparkle_config);
                            current_node = assistant_node;
                        }
                    } else {
                        new Notice("Invalid Caret Prompt");
                    }

                    return;
                }
            } else {
                console.error("File not found or is not a readable file:", file_path);
            }
        }

        // const ancestors = this.get_ancestors(nodes, edges, node.id);
        // const all_ancestors = this.getAllAncestorNodes(nodes, edges, node.id);
        const longest_lineage = this.getLongestLineage(nodes, edges, node.id);

        const ancestors_with_context = await this.getAllAncestorsWithContext(nodes, edges, node.id);

        // TODO - This needs to be cleaned up. Not sure what's going on with this
        // I would think it shoudl be plural. But it;'s only checking one node?
        const ref_blocks = await this.get_ref_blocks_content(node);
        let added_context = ``;

        if (ref_blocks.length > 1) {
            added_context += `\n ${ref_blocks}`;
        }
        added_context += "\n" + ancestors_with_context;
        added_context = added_context.trim();
        let convo_total_tokens = this.encoder.encode(added_context).length;
        const current_message_content = `
${current_text}

Please complete my above request using the below additional content:

${added_context}`;

        const current_message = { role: "user", content: current_message_content };
        let conversation = [current_message];

        for (let i = 1; i < longest_lineage.length; i++) {
            const node = longest_lineage[i];
            let role = node.role;
            if (role === "user") {
                let content = node.text;
                // Only for the first node
                const user_message_tokens = this.encoder.encode(content).length;
                if (user_message_tokens + convo_total_tokens > this.settings.context_window) {
                    new Notice("Exceeding context window while adding user message. Trimming content");
                    break;
                }
                const message = {
                    role,
                    content,
                };
                if (message.content.length > 0) {
                    console.log("Adding to conversaion");
                    conversation.push(message);
                    convo_total_tokens += user_message_tokens;
                }
            } else if (role === "assistant") {
                const content = node.text;
                const message = {
                    role,
                    content,
                };
                conversation.push(message);
            } else if (role === "system") {
                console.log("Adding system prompt!!");
                local_system_prompt = node.text;
            } else {
                console.info("Moving over content");
            }
        }
        conversation.reverse();
        if (local_system_prompt.length > 0) {
            conversation.unshift({ role: "system", content: local_system_prompt });
            console.log("System prompt is added");
        } else {
            console.log("No system prompt added");
        }
        console.log(conversation);

        let model = this.settings.model;
        let provider = this.settings.llm_provider;
        let temperature = this.settings.temperature;
        if (sparkle_config.model !== "default") {
            model = sparkle_config.model;
        }
        if (sparkle_config.provider !== "default") {
            provider = sparkle_config.provider;
        }
        if (sparkle_config.temperature !== this.settings.temperature) {
            temperature = sparkle_config.temperature;
        }
        // const content = message.content;
        const node_content = ``;
        const x = node.x + node.width + 200;
        const new_node = await this.childNode(canvas, node, x, node.y, node_content, "right", "left", "groq");
        if (!new_node) {
            throw new Error("Invalid new node");
        }
        const new_node_id = new_node.id;
        if (!new_node_id) {
            throw new Error("Invalid node id");
        }
        const new_canvas_node = await this.get_node_by_id(canvas, new_node_id);

        if (!new_canvas_node.unknownData.hasOwnProperty("role")) {
            new_canvas_node.unknownData.role = "";
            new_canvas_node.unknownData.displayOverride = false;
        }
        new_canvas_node.unknownData.role = "assistant";

        if (this.settings.llm_provider_options[this.settings.llm_provider][this.settings.model].streaming) {
            const stream = await this.llm_call_streaming(provider, model, conversation, temperature);
            await this.update_node_content(new_node_id, stream);
            return new_node;
        } else {
            const content = await this.llm_call(this.settings.llm_provider, this.settings.model, conversation);
            new_node.setText(content);
        }
    }
    async update_node_content(node_id: string, stream: any) {
        const canvas_view = this.app.workspace.getMostRecentLeaf()?.view;
        // @ts-ignore
        if (!canvas_view?.canvas) {
            return;
        }
        const canvas: Canvas = (canvas_view as any).canvas; // Assuming canvas is a property of the view
        const canvas_data = canvas.getData();
        const nodes_iterator = canvas.nodes.values();
        let node = null;
        for (const node_objs of nodes_iterator) {
            if (node_objs.id === node_id) {
                node = node_objs;
                break;
            }
        }
        node.width = 510;

        if (
            this.settings.llm_provider === "openai" ||
            this.settings.llm_provider === "groq" ||
            this.settings.llm_provider === "custom" ||
            this.settings.llm_provider === "openrouter"
        ) {
            for await (const part of stream) {
                const delta_content = part.choices[0]?.delta.content || "";

                const current_text = node.text;
                const new_content = `${current_text}${delta_content}`;
                const word_count = new_content.split(/\s+/).length;
                const number_of_lines = Math.ceil(word_count / 7);
                if (word_count > 500) {
                    node.width = 750;
                    node.height = Math.max(200, number_of_lines * 35);
                } else {
                    node.height = Math.max(200, number_of_lines * 45);
                }

                node.setText(new_content);
                node.render();
            }
        }
        if (this.settings.llm_provider === "ollama") {
            for await (const part of stream) {
                const current_text = node.text;
                const new_content = `${current_text}${part.message.content}`;
                const word_count = new_content.split(/\s+/).length;
                const number_of_lines = Math.ceil(word_count / 10);
                if (word_count > 500) {
                    node.width = 750;
                    node.height = Math.max(200, number_of_lines * 25);
                } else {
                    node.height = Math.max(200, number_of_lines * 30);
                }

                node.setText(new_content);
                node.render();
            }
        }
    }

    async llm_call(provider: string, model: string, conversation: any[]): Promise<string> {
        if (provider === "ollama") {
            let model_param = model;
            new Notice("Calling ollama");
            try {
                const response = await ollama.chat({
                    model: model_param,
                    messages: conversation,
                });
                new Notice("Message back from ollama");
                return response.message.content;
            } catch (error) {
                console.error(error);
                if (error.message) {
                    new Notice(error.message);
                }
                throw error;
            }
        } else if (provider == "openai") {
            if (!this.openai_client) {
                const error_message = "API Key not configured for OpenAI. Restart the app if you just added it!";
                new Notice(error_message);
                throw new Error(error_message);
            }
            new Notice("Calling OpenAI");
            const params = {
                messages: conversation,
                model: model,
            };
            try {
                const completion = await this.openai_client.chat.completions.create(params);
                new Notice("Message back from OpenAI");
                const message = completion.choices[0].message as Message;
                return message.content;
            } catch (error) {
                console.error("Error fetching chat completion from OpenAI:", error);
                new Notice(error.message);
                throw error;
            }
        } else if (provider == "anthropic") {
            try {
                if (!this.anthropic_client) {
                    const error_message =
                        "API Key not configured for Anthropic.  Restart the app if you just added it!";
                    new Notice(error_message);
                    throw new Error(error_message);
                }
                new Notice("Calling Anthropic");

                // Extract system message content if it exists
                let systemContent = "";
                conversation = conversation.filter((message) => {
                    if (message.role === "system") {
                        systemContent = message.content;
                        return false; // Remove the system message from the conversation
                    }
                    return true;
                });

                const body = {
                    model: this.settings.model,
                    max_tokens: 4096,
                    messages: conversation,
                    system: systemContent, // Set the system parameter
                };

                const response = await requestUrl({
                    url: "https://api.anthropic.com/v1/messages",
                    method: "POST",
                    headers: {
                        "x-api-key": this.settings.anthropic_api_key,
                        "anthropic-version": "2023-06-01", // Add this line
                        "content-type": "application/json", // Add this line
                    },
                    body: JSON.stringify(body),
                });
                const completion = await response.json;
                new Notice("Message back from Anthropic");
                const message = completion.content[0].text;
                return message;
            } catch (error) {
                console.error("Error during Anthropic call:");
                console.error(error);
                new Notice(`Error: ${error.message}`);
                throw error;
            }
        } else if (provider == "groq") {
            if (!this.groq_client) {
                const error_message = "API Key not configured for Groq.  Restart the app if you just added it!";
                new Notice(error_message);
                throw new Error(error_message);
            }
            new Notice("Calling Groq");

            const params = {
                messages: conversation,
                model: model,
            };
            try {
                const completion = await this.groq_client.chat.completions.create(params);
                new Notice("Message back from Groq");
                const message = completion.choices[0].message as Message;
                return message.content;
            } catch (error) {
                console.error("Error fetching chat completion from OpenAI:", error);
                new Notice(error.message);
                throw error;
            }
        } else {
            const error_message = "Invalid llm provider / model configuration";
            new Notice(error_message);
            throw new Error(error_message);
        }
    }
    async llm_call_streaming(provider: string, model: string, conversation: any[], temperature: number) {
        if (this.settings.system_prompt && this.settings.system_prompt.length > 0) {
            conversation.unshift({
                role: "system",
                content: this.settings.system_prompt,
            });
        }
        if (provider === "ollama") {
            let model_param = model;
            new Notice("Calling ollama");
            try {
                const response = await ollama.chat({
                    model: model_param,
                    messages: conversation,
                    stream: true,
                    temperature: temperature,
                });
                return response;
            } catch (error) {
                console.error(error);
                if (error.message) {
                    new Notice(error.message);
                }
                throw error;
            }
        } else if (provider == "openai") {
            if (!this.openai_client) {
                const error_message = "API Key not configured for OpenAI. Restart the app if you just added it!";
                new Notice(error_message);
                throw new Error(error_message);
            }
            new Notice("Calling OpenAI");
            const params = {
                messages: conversation,
                model: model,
                stream: true,
                temperature: temperature,
            };
            try {
                const stream = await this.openai_client.chat.completions.create(params);
                return stream;
            } catch (error) {
                console.error("Error fetching chat completion from OpenAI:", error);
                new Notice(error.message);
                throw error;
            }
        } else if (provider == "openrouter") {
            if (!this.openrouter_client) {
                const error_message = "API Key not configured for OpenRouter. Restart the app if you just added it!";
                new Notice(error_message);
                throw new Error(error_message);
            }
            new Notice("Calling OpenRouter");
            const params = {
                messages: conversation,
                model: model,
                stream: true,
                temperature: temperature,
            };
            try {
                const stream = await this.openrouter_client.chat.completions.create(params);
                return stream;
            } catch (error) {
                console.error("Error fetching chat completion from OpenRouter:", error);
                new Notice(error.message);
                throw error;
            }
        } else if (provider == "groq") {
            if (!this.groq_client) {
                const error_message = "API Key not configured for Groq.  Restart the app if you just added it!";
                new Notice(error_message);
                throw new Error(error_message);
            }
            new Notice("Calling Groq");

            const params = {
                messages: conversation,
                model: model,
                stream: true,
                temperature: temperature,
            };
            try {
                const stream = await this.groq_client.chat.completions.create(params);
                return stream;
            } catch (error) {
                console.error("Error fetching chat completion from OpenAI:", error);
                new Notice(error.message);
                throw error;
            }
        } else if (provider == "anthropic") {
            new Notice("Error: Anthropic Streaming not supported");
            // if (!this.anthropic_client) {
            //     const error_message = "API key not configured for Anthropic. Restart the app if you just added it!";
            //     new Notice(error_message);
            //     throw new Error(error_message);
            // }
            // new Notice("Calling Anthropic");

            // const params = {
            //     messages: conversation,
            //     model: model,
            //     stream: false,
            //     max_tokens: 4096,
            // };

            // try {
            //     const stream = await this.anthropic_client.messages.create(params);
            //     return stream;
            // } catch (error) {
            //     console.error("Error fetching chat completion from Anthropic:", error);
            //     new Notice(error.message || "An unknown error occurred while fetching chat completion from Anthropic.");
            //     throw error;
            // }
        } else if (provider == "custom") {
            new Notice("Calling Custom Client");
            const custom_model = this.settings.model;
            const model_settings = this.settings.custom_endpoints[custom_model];
            const custom_api_key = model_settings.api_key;
            const custom_endpoint = model_settings.endpoint;

            const custom_client = new OpenAI({
                apiKey: custom_api_key,
                baseURL: custom_endpoint,
                dangerouslyAllowBrowser: true,
            });

            if (!custom_endpoint) {
                const error_message = "Custom endpoint not configured. Restart the app if you just added it!";
                new Notice(error_message);
                throw new Error(error_message);
            }

            if (!custom_client) {
                const error_message = "Custom client not initialized properly. Restart the app if you just added it!";
                new Notice(error_message);
                throw new Error(error_message);
            }

            const params = {
                messages: conversation,
                model: model,
                stream: true,
                temperature: temperature,
            };

            try {
                const stream = await custom_client.chat.completions.create(params);
                return stream;
            } catch (error) {
                console.error("Error streaming from Custom Client:", error);
                new Notice(error.message);
                throw error;
            }
        } else {
            const error_message = "Invalid llm provider / model configuration";
            new Notice(error_message);
            throw new Error(error_message);
        }
    }

    add_sparkle_button(menuEl: HTMLElement) {
        if (!menuEl.querySelector(".spark_button")) {
            const buttonEl = createEl("button", "clickable-icon spark_button");
            setTooltip(buttonEl, "Sparkle", { placement: "top" });
            setIcon(buttonEl, "lucide-sparkles");
            buttonEl.addEventListener("click", async () => {
                const canvasView = this.app.workspace.getMostRecentLeaf().view;
                // @ts-ignore
                if (!canvasView.canvas) {
                    return;
                }
                // @ts-ignore
                const canvas = canvasView.canvas;
                await canvas.requestSave(true);
                const selection = canvas.selection;
                const selectionIterator = selection.values();
                const node = selectionIterator.next().value;
                const node_id = node.id;
                await this.sparkle(node_id);
            });
            menuEl.appendChild(buttonEl);
        }
    }
    // async add_agent_button(menuEl: HTMLElement) {
    //     if (menuEl.querySelector(".agent_button")) {
    //         return; // Exit if the button already exists
    //     }

    //     const buttonEl = createEl("button", "clickable-icon agent_button");

    //     setTooltip(buttonEl, "Agent Prompt", { placement: "top" });
    //     setIcon(buttonEl, "lucide-bot");

    //     // @ts-ignore
    //     const canvasView = this.app.workspace.getMostRecentLeaf()?.view;
    //     // @ts-ignore
    //     if (!canvasView?.canvas) {
    //         return;
    //     }

    //     const canvas = canvasView.canvas;
    //     const selection = canvas.selection;
    //     const selectionIterator = selection.values();
    //     const node = selectionIterator.next().value;

    //     if (!node || !node.filePath) {
    //         return; // Exit if no node or node has no filePath
    //     }

    //     const file_path = node.filePath;
    //     const file = this.app.vault.getAbstractFileByPath(file_path);
    //     if (!file) {
    //         return; // Exit if no file found
    //     }

    //     const front_matter = await this.get_frontmatter(file);

    //     if (front_matter.caret_prompt && front_matter.caret_prompt === "mini-agent") {
    //         buttonEl.addEventListener("click", async () => {
    //             const canvasView = this.app.workspace.getMostRecentLeaf().view;

    //             new AgentPromptModal(this.app, this, file_path, front_matter.caret_prompt, node.id).open();
    //         });
    //         menuEl.appendChild(buttonEl);
    //     }
    // }
    async get_node_by_id(canvas: Canvas, node_id: string) {
        const nodes_iterator = canvas.nodes.values();
        for (const node of nodes_iterator) {
            if (node.id === node_id) {
                return node;
            }
        }
        return null; // Return null if no node matches the ID
    }
    async execute_plan(nodes: PlanNode[], agent_node_id: string): Promise<void> {
        const canvas_view = this.app.workspace.getMostRecentLeaf()?.view;
        // @ts-ignore
        if (!canvas_view?.canvas) {
            return;
        }
        const canvas = (canvas_view as any).canvas; // Assuming canvas is a property of the view

        const canvas_data = canvas.getData();
        const canvas_nodes = canvas_data.nodes;

        let agent_node;

        // Iterate over the canvas nodes to find the agent node
        canvas_nodes.forEach((node: any) => {
            if (node.id === agent_node_id) {
                agent_node = node;
            }
        });
        if (!agent_node) {
            throw new Error("failed to id the agent node");
        }

        function topological_sort(nodes: PlanNode[]): PlanNode[] {
            const sorted_nodes: PlanNode[] = [];
            const visited: Set<number> = new Set();
            const temp_mark: Set<number> = new Set();

            function visit(node: PlanNode) {
                if (temp_mark.has(node.id)) {
                    throw new Error("Graph is not a DAG");
                }
                if (!visited.has(node.id)) {
                    temp_mark.add(node.id);
                    node.dependencies.forEach((dep_id) => {
                        const dep_node = nodes.find((n) => n.id === dep_id);
                        if (dep_node) {
                            visit(dep_node);
                        }
                    });
                    temp_mark.delete(node.id);
                    visited.add(node.id);
                    sorted_nodes.push(node);
                }
            }

            nodes.forEach((node) => {
                if (!visited.has(node.id)) {
                    visit(node);
                }
            });

            return sorted_nodes;
        }

        // Adapter function for known pairings
        async function adapter(node1: PlanNode, node2: PlanNode): Promise<any> {
            if (node1.type === "google_search" && node2.type === "get_websites_content") {
                const search_results = await google_search(node1.input);

                return search_results;
            }
        }

        // Sort the nodes based on dependencies
        const sorted_nodes = topological_sort(nodes);

        // Initialize results dictionary
        const results: { [key: string]: { raw_output: any; canvas_nodes: any } } = {};

        // Execute the nodes in the sorted order with adapter check
        for (let i = 0; i < sorted_nodes.length; i++) {
            const current_node = sorted_nodes[i];
            const next_node = sorted_nodes[i + 1];
            let step_output;

            if (next_node && current_node.type === "google_search" && next_node.type === "get_websites_content") {
                step_output = await adapter(current_node, next_node);
            } else {
                if (current_node.type === "get_websites_content") {
                    const step_input: StepGetWebsiteContentInput = {
                        list_of_websites_string: results[current_node.dependencies[0]].raw_output,
                    };
                    const step = new StepGetWebsiteContent();
                    const run_step: StepGetWebsiteContentOutput = await step.process(step_input);
                    step_output = run_step.text_nodes;
                }
            }
            if (i === 0) {
                if (Array.isArray(step_output)) {
                    step_output = step_output.map((item) => String(item)).join(", ");
                }
                const new_node = await this.childNode(
                    canvas,
                    agent_node,
                    agent_node.x + 200,
                    agent_node.y,
                    step_output
                );

                // Store the results
                results[current_node.id] = {
                    raw_output: step_output,
                    canvas_nodes: [new_node],
                };
            } else {
                const previous_node_id = current_node.dependencies[0];
                const previous_node = results[previous_node_id];
                const output_nodes = [];
                if (Array.isArray(step_output)) {
                    const total_nodes = step_output.length;
                    const median_index = Math.floor(total_nodes / 2);
                    const y_values = [];

                    for (let i = 0; i < total_nodes; i++) {
                        const y_offset = (i - median_index) * 200;
                        y_values.push(previous_node.canvas_nodes[0].y + y_offset);
                    }

                    for (let i = 0; i < step_output.length; i++) {
                        const content = step_output[i];
                        const new_node = await this.childNode(
                            canvas,
                            previous_node.canvas_nodes[0],
                            previous_node.canvas_nodes[0].x + 600,
                            y_values[i],
                            content
                        );
                        output_nodes.push(new_node);
                    }
                }

                // Store the results
                results[current_node.id] = {
                    raw_output: step_output,
                    canvas_nodes: output_nodes,
                };
            }
        }
    }

    childNode = async (
        canvas: Canvas,
        parentNode: CanvasNodeData,
        x: number,
        y: number,
        content: string = "",
        from_side: string = "right",
        to_side: string = "left",
        origin: string = "ignore"
    ) => {
        let tempChildNode = this.addNode(canvas, this.random(16), {
            x: x,
            y: y,
            width: parentNode.width,
            height: parentNode.height,
            type: "text",
            content,
        });
        await this.createEdge(parentNode, tempChildNode, canvas, from_side, to_side);

        const node = canvas.nodes?.get(tempChildNode?.id!);
        if (!node) return;

        // canvas.selectOnly(node);

        canvas.requestSave();

        return node;
    };

    addNode = (
        canvas: Canvas,
        id: string,
        {
            x,
            y,
            width,
            height,
            type,
            content,
        }: {
            x: number;
            y: number;
            width: number;
            height: number;
            type: "text" | "file";
            content: string;
        }
    ) => {
        if (!canvas) return;

        const data = canvas.getData();
        if (!data) return;

        const node: Partial<CanvasTextData | CanvasFileData> = {
            id: id,
            x: x,
            y: y,
            width: width,
            height: height,
            type: type,
        };

        switch (type) {
            case "text":
                node.text = content;
                break;
            case "file":
                node.file = content;
                break;
        }

        canvas.importData({
            nodes: [...data.nodes, node],
            edges: data.edges,
        });

        canvas.requestFrame();

        return node;
    };
    createEdge = async (node1: any, node2: any, canvas: any, from_side: string = "right", to_side: string = "left") => {
        this.addEdge(
            canvas,
            this.random(16),
            {
                fromOrTo: "from",
                side: from_side,
                node: node1,
            },
            {
                fromOrTo: "to",
                side: to_side,
                node: node2,
            }
        );
    };
    random = (e: number) => {
        let t = [];
        for (let n = 0; n < e; n++) {
            t.push(((16 * Math.random()) | 0).toString(16));
        }
        return t.join("");
    };
    addEdge = (canvas: any, edgeID: string, fromEdge: EdgeDirection, toEdge: EdgeDirection) => {
        if (!canvas) return;

        const data = canvas.getData();
        if (!data) return;

        canvas.importData({
            edges: [
                ...data.edges,
                {
                    id: edgeID,
                    fromNode: fromEdge.node.id,
                    fromSide: fromEdge.side,
                    toNode: toEdge.node.id,
                    toSide: toEdge.side,
                },
            ],
            nodes: data.nodes,
        });

        canvas.requestFrame();
    };

    // Method to insert text into the sidebar
    insertTextIntoSidebar(text: string) {
        const trimmed_text = text.trim();
        this.app.workspace.iterateAllLeaves((leaf) => {
            if (leaf.view.getViewType() === VIEW_NAME_SIDEBAR_CHAT) {
                const view = leaf.view as SidebarChat;
                if (view.textBox) {
                    view.textBox.value += trimmed_text;
                }
            }
        });
    }

    // // Method to clear text from the sidebar
    clearTextInSidebar() {
        this.app.workspace.iterateAllLeaves((leaf) => {
            if (leaf.view.getViewType() === VIEW_NAME_SIDEBAR_CHAT) {
                const view = leaf.view as SidebarChat;
                if (view.textBox) {
                    view.textBox.value = ""; // Clear the text box
                }
                if (view.messagesContainer) {
                    view.messagesContainer.innerHTML = ""; // Clear the messages container
                }
            }
        });
    }
    addChatIconToRibbon() {
        this.addRibbonIcon("message-square", "Caret Chat", async (evt) => {
            await this.app.workspace.getLeaf(true).setViewState({
                type: VIEW_NAME_MAIN_CHAT,
                active: true,
            });
        });
    }

    onunload() {}

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

type ModelDropDownSettings = {
    openai: string;
    groq: string;
    ollama: string;
    anthropic?: string;
    custom?: string; // Make 'custom' optional
};

class CaretSettingTab extends PluginSettingTab {
    plugin: CaretPlugin;

    constructor(app: App, plugin: CaretPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    async activate_license(license: string) {
        new Notice("Activating license...");
        this.plugin.settings.license_key = license;
        const activation_output = await validate_license_key(license);
        if (!activation_output.status) {
            new Notice("Error in license activation. Please try again. ");
            new Notice("If it continues please contact Jake for help.");
        }
        if (!activation_output.validKey) {
            if (activation_output.message === "invalid_key") {
                new Notice("Invalid License Key");
            } else if (activation_output.message === "too_many_activations") {
                new Notice("License has exceeded allowed activations");
                new Notice("Please contact Jake for more activations");
            } else {
                new Notice("Key is invalid for an unknown reason");
                new Notice("If it continues please contact Jake for help.");
            }
            return { status: false };
        } else {
            const hash = generateHashForUUID(license);
            const valid_license = { status: true, hash: hash };
            return valid_license;
        }
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        if (
            !this.plugin.settings.license_key ||
            !this.plugin.settings.license_hash ||
            !validateUUIDHashPair(this.plugin.settings.license_key, this.plugin.settings.license_hash)
        ) {
            new Setting(containerEl)
                .setName("License Key")
                .setDesc("Enter your license key here.")
                .addText((text) => {
                    text
                        .setPlaceholder("Enter License Key")
                        .setValue(this.plugin.settings.license_key)
                        .onChange(async (value: string) => {
                            this.plugin.settings.license_key = value;
                        }).inputEl.style.width = "100%"; // Set the width to full length
                })
                .setDesc("Click to activate your license.")
                .addButton((button) => {
                    button
                        .setButtonText("Activate")
                        .setClass("activate-button")
                        .onClick(async (evt: MouseEvent) => {
                            const license = this.plugin.settings.license_key;
                            const hash_resp = await this.activate_license(license);
                            if (hash_resp.status) {
                                this.plugin.settings.license_hash = hash_resp.hash;
                                new Notice("License Activated!");
                            }
                            await this.plugin.saveSettings();
                            await this.plugin.loadSettings();
                            this.display();
                        });
                });

            return;
        }
        if (this.plugin.settings.caret_version !== DEFAULT_SETTINGS.caret_version) {
            this.plugin.settings.caret_version = DEFAULT_SETTINGS.caret_version;
        }

        const default_llm_providers = DEFAULT_SETTINGS.llm_provider_options;
        const current_llm_providers = this.plugin.settings.llm_provider_options;
        const current_custom = current_llm_providers.custom;
        this.plugin.settings.llm_provider_options = { ...default_llm_providers, custom: { ...current_custom } };

        const custom_endpoints = this.plugin.settings.custom_endpoints;
        // @ts-ignore
        let model_drop_down_settings: ModelDropDownSettings = DEFAULT_SETTINGS.provider_dropdown_options;

        if (Object.keys(custom_endpoints).length > 0) {
            for (const [key, value] of Object.entries(custom_endpoints)) {
                if (value.known_provider) {
                    if (!this.plugin.settings.llm_provider_options[value.known_provider]) {
                        this.plugin.settings.llm_provider_options[value.known_provider] = {};
                    }
                    this.plugin.settings.llm_provider_options[value.known_provider][key] = value;
                } else {
                    this.plugin.settings.llm_provider_options.custom[key] = value;
                }
            }
        }

        let context_window = null;
        try {
            const llm_provider = this.plugin.settings.llm_provider;
            const model = this.plugin.settings.model;
            if (
                this.plugin.settings.llm_provider_options[llm_provider] &&
                this.plugin.settings.llm_provider_options[llm_provider][model]
            ) {
                const model_details = this.plugin.settings.llm_provider_options[llm_provider][model];
                if (model_details && model_details.context_window) {
                    const context_window_value = model_details.context_window;
                    context_window = parseInt(context_window_value).toLocaleString();
                }
            }
        } catch (error) {
            console.error("Error retrieving model details:", error);
            context_window = null;
        }
        if (!this.plugin.settings.llm_provider || this.plugin.settings.llm_provider.length === 0) {
            this.plugin.settings.llm_provider = "openai";
            this.plugin.settings.model = "gpt-4-turbo";
            this.plugin.settings.context_window = 128000;
            this.plugin.saveSettings();
        }

        const model_options_data = Object.fromEntries(
            Object.entries(
                this.plugin.settings.llm_provider_options[
                    this.plugin.settings.llm_provider as keyof typeof this.plugin.settings.llm_provider_options
                ]
            ).map(([key, value]) => [key, value.name])
        );
        // LLM Provider Settings
        new Setting(containerEl)
            // .setName("LLM Provider")
            .setDesc(`Caret Version: ${this.plugin.settings.caret_version}`);

        // LLM Provider Settings
        new Setting(containerEl)
            .setName("LLM Provider")
            .setDesc("")
            .addDropdown((dropdown) => {
                dropdown
                    .addOptions(model_drop_down_settings)
                    .setValue(this.plugin.settings.llm_provider)
                    .onChange(async (provider) => {
                        this.plugin.settings.llm_provider = provider;
                        this.plugin.settings.model = Object.keys(
                            this.plugin.settings.llm_provider_options[provider]
                        )[0];
                        this.plugin.settings.context_window =
                            this.plugin.settings.llm_provider_options[provider][
                                this.plugin.settings.model
                            ].context_window;
                        await this.plugin.saveSettings();
                        await this.plugin.loadSettings();
                        this.display();
                    });
            });
        const setting = new Setting(containerEl).setName("Model").addDropdown((modelDropdown) => {
            modelDropdown.addOptions(model_options_data);
            modelDropdown.setValue(this.plugin.settings.model);
            modelDropdown.onChange(async (value) => {
                this.plugin.settings.model = value;
                this.plugin.settings.context_window =
                    this.plugin.settings.llm_provider_options[this.plugin.settings.llm_provider][value].context_window;
                await this.plugin.saveSettings();
                await this.plugin.loadSettings();
                this.display();
            });
        });
        if (this.plugin.settings.model === "gpt-4o") {
            new Setting(containerEl)
                .setName("GPT-4o")
                .setDesc(
                    "You are are using the new model! If you check errors it might be because your API key doesn't have access."
                );
        }

        if (context_window) {
            setting.setDesc(`FYI your selected model has a context window of ${context_window}`);
        }
        if (this.plugin.settings.llm_provider === "ollama") {
            const ollama_info_container = containerEl.createEl("div", {
                cls: "settings_container",
            });
            ollama_info_container.createEl("strong", { text: "You're using Ollama!" });
            ollama_info_container.createEl("p", { text: "Remember to do the following:" });
            ollama_info_container.createEl("p", { text: "Make sure you have downloaded the model you want to use:" });
            const second_code_block_container = ollama_info_container.createEl("div", {
                cls: "settings_code_block",
            });

            second_code_block_container.createEl("code", { text: `ollama run ${this.plugin.settings.model}` });
            ollama_info_container.createEl("p", {
                text: "After running the model, kill that command and close the ollama app.",
            });
            ollama_info_container.createEl("p", {
                text: "Then run this command to start the Ollama server and make it accessible from Obsidian:",
            });
            const code_block_container = ollama_info_container.createEl("div", {
                cls: "settings_code_block",
            });
            code_block_container.createEl("code", {
                text: "OLLAMA_ORIGINS=app://obsidian.md* ollama serve",
            });

            ollama_info_container.createEl("br"); // Adds a line break for spacing
        }

        new Setting(containerEl)
            .setName("OpenAI API Key")
            .setDesc("")
            .addText((text) => {
                text.setPlaceholder("OpenAI API Key")
                    .setValue(this.plugin.settings.openai_api_key)
                    .onChange(async (value: string) => {
                        this.plugin.settings.openai_api_key = value;
                        await this.plugin.saveSettings();
                        await this.plugin.loadSettings();
                    });
                text.inputEl.addClass("hidden-value-unsecure");
            });

        new Setting(containerEl)
            .setName("Groq API Key")
            .setDesc("")
            .addText((text) => {
                text.setPlaceholder("Grok API Key")
                    .setValue(this.plugin.settings.groq_api_key)
                    .onChange(async (value: string) => {
                        this.plugin.settings.groq_api_key = value;
                        await this.plugin.saveSettings();
                        await this.plugin.loadSettings();
                    });
                text.inputEl.addClass("hidden-value-unsecure");
            });
        new Setting(containerEl)
            .setName("Anthropic API Key")
            .setDesc("")
            .addText((text) => {
                text.setPlaceholder("Anthropic API Key")
                    .setValue(this.plugin.settings.anthropic_api_key)
                    .onChange(async (value: string) => {
                        this.plugin.settings.anthropic_api_key = value;
                        await this.plugin.saveSettings();
                        await this.plugin.loadSettings();
                    });
                text.inputEl.addClass("hidden-value-unsecure");
            });
        new Setting(containerEl)
            .setName("Open Router API Key")
            .setDesc("")
            .addText((text) => {
                text.setPlaceholder("OpenRouter API Key")
                    .setValue(this.plugin.settings.open_router_key)
                    .onChange(async (value: string) => {
                        this.plugin.settings.open_router_key = value;
                        await this.plugin.saveSettings();
                        await this.plugin.loadSettings();
                    });
                text.inputEl.addClass("hidden-value-unsecure");
            });
        new Setting(containerEl)
            .setName("Reload after adding API Keys!")
            .setDesc(
                "After you added API keys for the first time you will need to reload the plugin for those changes to take effect. \n This only needs to be done the first time or when you change your keys."
            );

        new Setting(containerEl).setName("Save Settings").addButton((button) => {
            button
                .setButtonText("Save")
                .setClass("save-button")
                .onClick(async (evt: MouseEvent) => {
                    await this.plugin.saveSettings();
                    await this.plugin.loadSettings();
                    new Notice("Settings Saved!");
                });
        });
    }
}
