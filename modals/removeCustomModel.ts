import { App, Modal } from "obsidian";
import { CustomModels } from "../types";
export class RemoveCustomModelModal extends Modal {
    plugin: any;

    constructor(app: App, plugin: any) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl, modalEl } = this;
        contentEl.empty();
        contentEl.createEl("h2", { text: "Remove custom model", cls: "caret-insert-file-header" });

        // Set the width of the modal
        modalEl.classList.add("custom-model-modal-container"); // Apply the CSS class here

        const table = contentEl.createEl("table", { cls: "caret-custom-models-table" });
        const headerRow = table.createEl("tr");
        headerRow.createEl("th", { text: "Name" });
        headerRow.createEl("th", { text: "Context window" });
        headerRow.createEl("th", { text: "URL" });
        headerRow.createEl("th", { text: "Action" });

        const custom_models: { [key: string]: CustomModels } = this.plugin.settings.custom_endpoints;

        for (const [model_id, model] of Object.entries(custom_models)) {
            const row = table.createEl("tr");

            row.createEl("td", { text: model.name });
            row.createEl("td", { text: model.context_window.toString() });
            row.createEl("td", { text: model.endpoint });

            const deleteButtonContainer = row.createEl("td", { cls: "caret-delete-btn-container" });
            const deleteButton = deleteButtonContainer.createEl("button", { text: "Delete", cls: "caret-mod-warning" });
            deleteButton.addEventListener("click", async () => {
                delete custom_models[model_id];
                await this.plugin.saveSettings();
                this.onOpen(); // Refresh the modal to reflect changes
            });
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
