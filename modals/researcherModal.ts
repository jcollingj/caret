import { App, Modal, Notice, Setting } from "obsidian";
import { triggerSkillRun, pollSkillRunStatus } from "../test_caretpro";

export class ResearchModal extends Modal {
    plugin: any;
    fileName: string = "";
    searchQuery: string = "";

    constructor(app: App, plugin: any) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h2", { text: "Conduct Research and Create Note" });

        new Setting(contentEl)
            .setName("Search Query")
            .setDesc("Enter your research query.")
            .addText((text) => {
                text.setPlaceholder("Enter your query here")
                    .setValue(this.searchQuery)
                    .onChange((value) => {
                        this.searchQuery = value;
                    });
            });

        new Setting(contentEl)
            .setName("File name")
            .setDesc("Enter the name for the note.")
            .addText((text) => {
                text.setPlaceholder("Enter file name")
                    .setValue(this.fileName)
                    .onChange((value) => {
                        this.fileName = value;
                    });
            });

        new Setting(contentEl).addButton((button) => {
            button
                .setButtonText("Submit")
                .setCta()
                .onClick(async () => {
                    if (!this.fileName || this.fileName.trim() === "") {
                        new Notice("File name must be set before saving");
                        return;
                    }
                    if (!this.searchQuery || this.searchQuery.trim() === "") {
                        new Notice("Search query must not be empty");
                        return;
                    }
                    new Notice("Research has started");
                    this.close();

                    try {
                        const skillRunId = await triggerSkillRun(this.searchQuery);
                        new Notice(`Research in progress`);

                        const data = await pollSkillRunStatus(skillRunId);
                        const researchContent = data.output.search_content;

                        await this.createNote(researchContent);
                        new Notice(`Research is done. Note created: ${this.fileName}`);
                    } catch (error) {
                        console.error("Error during research process:", error);
                        new Notice("An error occurred during the research process");
                    }
                });
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    async createNote(content: string) {
        const file_path = `${this.fileName}.md`;

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
                await this.app.vault.create(file_path, content);
                new Notice("Research note created successfully");
            }
        } catch (error) {
            console.error("Error creating note:", error);
            new Notice("Failed to create research note");
        }
    }
}
