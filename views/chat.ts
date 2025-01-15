import { streamText, StreamTextResult, CoreTool, generateText, generateObject } from "ai";
import { ai_sdk_streaming, isEligibleProvider, sdk_provider, get_provider, ai_sdk_completion } from "../llm_calls";
import React from "react";
import { createRoot } from "react-dom/client";
import { ConvertTextToNoteModal } from "../modals/convertTextToNoteModal";
import { InsertNoteModal } from "../modals/insertNoteModal";
import ChatComponent from "../components/chat";
import { Message } from "../types";
import { Notice, ItemView, WorkspaceLeaf } from "obsidian";
import CaretPlugin from "../main";
export const VIEW_CHAT = "main-caret";
export class FullPageChat extends ItemView {
    chat_id: string;
    plugin: CaretPlugin;
    conversation_title: string;
    textBox: HTMLTextAreaElement;
    messagesContainer: HTMLElement; // Container for messages
    conversation: Message[]; // List to store conversation messages
    is_generating: boolean;
    chatComponentRef: any;
    file_name: string;

    constructor(
        plugin: any,
        leaf: WorkspaceLeaf,
        chat_id?: string,
        conversation: Message[] = [],
        file_name: string = ""
    ) {
        super(leaf);
        this.plugin = plugin;
        this.chat_id = chat_id || this.generateRandomID(5);
        this.conversation = conversation; // Initialize conversation list with default or passed value
        this.file_name = file_name;
    }

    getViewType() {
        return VIEW_CHAT;
    }

    getDisplayText() {
        if (this.file_name.length > 1) {
            return `Chat: ${this.file_name}`;
        }
        return `Chat: ${this.chat_id}`;
    }

    async onOpen() {
        const metacontainer = this.containerEl.children[1];
        metacontainer.empty();
        const container = metacontainer.createEl("div", {
            cls: "caret-container",
        });
        metacontainer.prepend(container);

        // Create a container for messages
        this.messagesContainer = container.createEl("div", {
            cls: "caret-messages-container",
        });

        // Render the React component using createRoot
        // Render the React component using createRoot
        const root = createRoot(this.messagesContainer);
        const chatComponent = React.createElement(ChatComponent, {
            plugin: this.plugin,
            chat_id: this.chat_id,
            initialConversation: this.conversation,
            onSubmitMessage: this.submitMessage.bind(this),
            onSave: this.handleSave.bind(this), // Add this line
            onBulkConvert: this.bulkConvert.bind(this),
            onNewChat: this.newChat.bind(this),
            onInsertNote: this.handleInsertNote.bind(this),
            ref: (ref) => {
                this.chatComponentRef = ref;
            }, // Set the ref here
        });
        root.render(chatComponent);
    }
    async submitMessage(userMessage: string) {
        if (this.chatComponentRef) {
            await this.chatComponentRef.submitMessage(userMessage);
        }
    }
    handleInsertNote(callback: (note: string) => void) {
        new InsertNoteModal(this.app, this.plugin, (note: string) => {
            callback(note); // Call the callback with the note value
        }).open();
    }
    bulkConvert(checkedContents: string[]) {
        if (checkedContents.length < 1) {
            new Notice("No selected messages to convert to note");
        }
        new ConvertTextToNoteModal(this.app, this.plugin, checkedContents).open();
    }
    handleSave() {
        // You can access the conversation state from the chatComponentRef if needed
        if (this.chatComponentRef) {
            const conversation = this.chatComponentRef.getConversation(); // Call the getConversation method
            // Save the conversation or perform any other actions
            this.conversation = conversation;
            this.saveChat();
        }
    }

    addMessage(text: string, sender: "user" | "assistant") {
        const newMessage = { content: text, role: sender };
        // Add message to the conversation array
        // this.conversation.push(newMessage);
        // Update the conversation in the React component
        if (this.chatComponentRef) {
            this.chatComponentRef.addMessage(newMessage);
        }
    }

    async streamMessage(stream_response: AsyncIterable<any>) {
        if (this.plugin.settings.llm_provider === "ollama") {
            for await (const part of stream_response) {
                this.conversation[this.conversation.length - 1].content += part.message.content;
                if (this.chatComponentRef) {
                    this.chatComponentRef.updateLastMessage(part.message.content);
                }
            }
        }
        if (this.plugin.settings.llm_provider === "openai" || "groq" || "custom") {
            for await (const part of stream_response) {
                const delta_content = part.choices[0]?.delta.content || "";
                this.conversation[this.conversation.length - 1].content += delta_content;
                if (this.chatComponentRef) {
                    this.chatComponentRef.updateLastMessage(delta_content);
                }
            }
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
    async newChat() {
        const currentLeaf = this.app.workspace.activeLeaf;
        if (currentLeaf) {
            // This would detach it if we wanted to it. But it causes bugs below.
            // I actually like the UX this way.
            // currentLeaf?.detach();
        }

        const new_leaf = await this.app.workspace.getLeaf(true);
        new_leaf.setViewState({
            type: VIEW_CHAT,
            active: true,
        });
    }

    async saveChat() {
        // Prep the contents itself to be saved

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

        // And then get the actual save file
        const chat_folder_path = this.plugin.settings.chat_logs_folder;

        const chat_folder = this.app.vault.getAbstractFileByPath(chat_folder_path);
        if (!chat_folder) {
            await this.app.vault.createFolder(chat_folder_path);
        }
        let file_to_save_to = await this.plugin.getChatLog(chat_folder_path, this.chat_id);

        let new_chat = true;
        if (file_to_save_to && file_to_save_to.path) {
            new_chat = false;
        }

        const date = new Date();
        const year = date.getFullYear();
        const month = ("0" + (date.getMonth() + 1)).slice(-2);
        const day = ("0" + date.getDate()).slice(-2);
        const date_path = `/${year}/${month}/${day}`;

        if (this.plugin.settings.chat_logs_date_format_bool) {
            const fullPath = chat_folder_path + date_path;
            const pathSegments = fullPath.split("/");
            let currentPath = "";
            for (const segment of pathSegments) {
                if (segment !== "") {
                    currentPath += segment;
                    const folderExists = this.app.vault.getAbstractFileByPath(currentPath);
                    if (!folderExists) {
                        await this.app.vault.createFolder(currentPath);
                    }
                    currentPath += "/";
                }
            }
        }

        if (new_chat) {
            const file_name = `${this.chat_id}.md`;
            let file_path = chat_folder_path + "/" + file_name;
            if (this.plugin.settings.chat_logs_date_format_bool) {
                file_path = chat_folder_path + date_path + "/" + file_name;
            }
            const new_file_created = await this.app.vault.create(file_path, file_content);
            if (this.plugin.settings.chat_logs_rename_bool) {
                await this.name_new_chat(new_file_created);
            }
        } else {
            if (!file_to_save_to?.path) {
                new Notice("Failed to find file to save to");
                return;
            }
            const file = await this.app.vault.getFileByPath(file_to_save_to.path);
            if (!file) {
                new Notice("Failed to save file");
                throw new Error("Failed to save file");
            }
            await this.app.vault.modify(file, file_content);
        }
    }
    async name_new_chat(new_file: any) {
        let new_message = `
Please create a title for this conversation. Keep it to 3-5 words at max. Be as descriptive with that as you can be.\n\n

Respond in plain text with no formatting.
`;
        for (let i = 0; i < this.conversation.length; i++) {
            const message = this.conversation[i];
            new_message += `${message.role}:\n${message.content}`;
        }
        const conversation = [{ role: "user", content: new_message }];

        const provider = this.plugin.settings.llm_provider;
        const model = this.plugin.settings.model;
        const temperature = this.plugin.settings.temperature;

        // await this.update_node_content_streaming(node_id, stream, this.settings.llm_provider);
        if (!isEligibleProvider(provider)) {
            throw new Error(`Invalid provider: ${provider}`);
        }

        let sdk_provider: sdk_provider = get_provider(this.plugin, provider);
        const content = await ai_sdk_completion(sdk_provider, model, conversation, temperature, provider);

        const path = new_file.path;
        const newPath = `${path.substring(0, path.lastIndexOf("/"))}/${content}.md`;
        await this.app.vault.rename(new_file, newPath);
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
