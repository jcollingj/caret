import { App, Modal, Notice, Setting } from "obsidian";
import CaretPlugin from "main";

export class ImageGenerationModal extends Modal {
    plugin: CaretPlugin;
    prompt: string = "";
    width: number = 1024;
    height: number = 1024;
    onSubmit: (prompt: string, width: number, height: number) => void;

    constructor(app: App, plugin: CaretPlugin, onSubmit: (prompt: string, width: number, height: number) => void) {
        super(app);
        this.plugin = plugin;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Generate Image" });
        
        new Setting(contentEl)
            .setName("Prompt")
            .setDesc("Describe the image you want to generate")
            .addTextArea((text) => {
                text.setValue(this.prompt).onChange((value) => {
                    this.prompt = value;
                });
                text.inputEl.rows = 5;
            });

        new Setting(contentEl)
            .setName("Size")
            .addDropdown((dropdown) => {
                dropdown
                    .addOption("1024x1024", "Square (1024x1024)")
                    .addOption("1024x1792", "Portrait (1024x1792)")
                    .addOption("1792x1024", "Landscape (1792x1024)")
                    .setValue("1024x1024")
                    .onChange((value) => {
                        const [width, height] = value.split("x").map(Number);
                        this.width = width;
                        this.height = height;
                    });
            });

        new Setting(contentEl).addButton((btn) => {
            btn.setButtonText("Generate").setCta().onClick(() => {
                if (!this.prompt.trim()) {
                    new Notice("Please enter a prompt");
                    return;
                }
                this.onSubmit(this.prompt, this.width, this.height);
                this.close();
            });
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}