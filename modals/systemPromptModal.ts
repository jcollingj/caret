import { App, Modal, Notice } from "obsidian";
export class SystemPromptModal extends Modal {
    plugin: any;
    system_prompt: string = "";

    constructor(app: App, plugin: any) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("caret-system-prompt-modal");

        // Header
        const header = contentEl.createEl("div", { cls: "caret-modal-header" });
        header.createEl("h2", { text: "System Prompt", cls: "caret-modal-title" });
        header.createEl("p", { 
            text: "Set a global system prompt that will be used for all LLM interactions", 
            cls: "caret-modal-subtitle" 
        });

        // Content area
        const content = contentEl.createEl("div", { cls: "caret-modal-content" });
        
        const textArea = content.createEl("textarea", {
            cls: "caret-system-prompt-modal-text-area",
            attr: { 
                placeholder: "Enter your system prompt here...\n\nExample: You are a helpful assistant. Always be concise and accurate." 
            }
        });
        textArea.value = this.plugin.settings.system_prompt || "";

        // Button container
        const buttonContainer = contentEl.createEl("div", { cls: "caret-modal-buttons" });
        
        const cancelButton = buttonContainer.createEl("button", { 
            text: "Cancel", 
            cls: "caret-modal-button caret-modal-button-secondary" 
        });
        cancelButton.addEventListener("click", () => {
            this.close();
        });

        const submitButton = buttonContainer.createEl("button", { 
            text: "Save", 
            cls: "caret-modal-button caret-modal-button-primary" 
        });
        submitButton.addEventListener("click", async () => {
            this.plugin.settings.system_prompt = textArea.value;
            new Notice("System prompt saved successfully");
            await this.plugin.saveSettings();
            this.close();
        });

        // Focus the textarea
        setTimeout(() => textArea.focus(), 100);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
