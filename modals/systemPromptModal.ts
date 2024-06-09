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
