import { App, Modal, Notice, Setting } from "obsidian";
export class ConvertTextToNoteModal extends Modal {
    plugin: any;
    messages: string[];
    formatting_prompt: string = "Format the below content into a nice markdown document.";
    fileName: string = "";
    apply_formatting: boolean = true;

    constructor(app: App, plugin: any, messages: string[]) {
        super(app);
        this.plugin = plugin;
        this.messages = messages;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h2", { text: "Convert text to note" });
        contentEl.createEl("div", { text: `Converting ${this.messages.length} messages`, cls: "callout" });

        new Setting(contentEl)
            .setName("File name")
            .setDesc("Enter the name for the note.")
            .addText((text) => {
                text.setValue(this.fileName).onChange((value) => {
                    this.fileName = value;
                });
            });

        new Setting(contentEl)
            .setName("Auto format")
            .setDesc("Apply prompt formatting to the note.")
            .addToggle((toggle) => {
                toggle.setValue(this.apply_formatting).onChange((value) => {
                    this.apply_formatting = value;
                });
            });
        const textArea = contentEl.createEl("textarea", {
            text: this.formatting_prompt,
            cls: "content-l caret-w-full",
            placeholder: "Enter the formatting song.",
        });
        textArea.onchange = (event) => {
            this.formatting_prompt = (event.target as HTMLTextAreaElement).value;
        };

        new Setting(contentEl).addButton((button) => {
            button.setButtonText("Submit").onClick(async () => {
                if (!this.fileName || this.fileName.trim() === "") {
                    new Notice("File name must be set before saving");
                    console.error("Validation Error: File name must exist");
                    return;
                }

                let final_content = this.messages.join("\n");
                if (this.apply_formatting) {
                    if (this.formatting_prompt.length < 1) {
                        new Notice("Must have formatting prompt");
                        return;
                    }
                    let final_prompt = `${this.formatting_prompt}\n\n${this.messages.join("\n")}`;
                    const conversation = [{ role: "user", content: final_prompt }];
                    const response = await this.plugin.llm_call(
                        this.plugin.settings.llm_provider,
                        this.plugin.settings.model,
                        conversation
                    );
                    final_content = response;
                }

                const file_path = `${this.fileName}.md`;

                // Check if the file path contains parentheses
                if (file_path.includes("/")) {
                    const pathParts = file_path.split("/");
                    let currentPath = "";
                    for (const part of pathParts.slice(0, -1)) {
                        currentPath += part;
                        const folder = await this.app.vault.getAbstractFileByPath(currentPath);
                        if (!folder) {
                            try {
                                await this.app.vault.createFolder(currentPath);
                            } catch (error) {
                                console.error("Failed to create folder:", error);
                            }
                        }
                        currentPath += "/";
                    }
                }
                const file = await this.app.vault.getFileByPath(file_path);

                try {
                    if (file) {
                        new Notice("File exists already, please choose another name");
                    } else {
                        await this.app.vault.create(file_path, final_content);
                        new Notice("Chat saved to note");
                        this.close();
                    }
                } catch (error) {
                    console.error("Failed to save note:", error);
                }
            });
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
