import { Notice, ItemView, WorkspaceLeaf, TFile } from "obsidian";
import { WorkflowPrompt, CaretPluginSettings } from "../types";
import { DEFAULT_SETTINGS } from "../main";

export class LinearWorkflowEditor extends ItemView {
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
        return "Workflow editor";
    }

    async onOpen() {
        if (this.file_path) {
            const file = this.app.vault.getAbstractFileByPath(this.file_path);
            if (file) {
                const front_matter = await this.plugin.getFrontmatter(file);
                this.workflow_type = front_matter.caret_prompt;
                let file_content;
                if (file instanceof TFile) {
                    file_content = await this.app.vault.cachedRead(file);
                    this.workflow_name = file.name.replace(".md", "");
                    this.stored_file_name = file.name;
                } else {
                    throw new Error("The provided file is not a valid TFile.");
                }
                this.workflow_name = file.name.replace(".md", "");
                this.stored_file_name = file.name;
                const xml_content = file_content.match(/```xml([\s\S]*?)```/)?.[1]?.trim() ?? "";
                const xml = await this.plugin.parseXml(xml_content);
                const xml_prompts = xml?.root?.prompt ?? [];

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
            cls: "caret-workflow_container",
        });
        metacontainer.prepend(container);

        // Add description

        // Add workflow name input
        const title_container = container.createEl("div", { cls: "caret-flex-row" });
        title_container.createEl("h2", { text: `Workflow name:`, cls: "caret-w-8" });
        const workflow_name_input = title_container.createEl("input", {
            type: "text",
            cls: "caret-workflow-name-input caret-w-full",
            value: this.workflow_name,
        });
        container.createEl("p", { text: "Add prompts that will then be run in a linear fashion on any input." });
        workflow_name_input.addEventListener("input", () => {
            this.workflow_name = workflow_name_input.value;
        });

        this.prompt_container = container.createEl("div", { cls: "caret-w-full" });

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
        const buttonContainer = container.createEl("div", {
            cls: "caret-button-container caret-bottom-screen-padding",
        });

        const addPromptButton = buttonContainer.createEl("button", { text: "Add new prompt" });
        addPromptButton.addEventListener("click", () => {
            this.add_prompt();
        });

        // Create a save workflow button
        const save_button = buttonContainer.createEl("button", { text: "Save workflow" });
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
                new Notice("Workflow updated!");
            } else {
                await this.app.vault.create(file_path, file_content);
                new Notice("Workflow created!");
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
            cls: "caret-dropdown-container",
        });

        dropdown_container.createEl("label", { text: "Workflow type: ", cls: "caret-dropdown-label" });

        const workflow_type_select = dropdown_container.createEl("select", {
            cls: "caret-workflow-type-select",
        });

        const options = [
            { value: "linear", text: "Linear workflow" },
            { value: "parallel", text: "Parallel workflow" },
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
            this.workflow_type = (event.target as HTMLSelectElement).value as "linear" | "parallel";
            new Notice(`Workflow type set to ${this.workflow_type}`);
        });

        this.prompt_container.createEl("h3", { text: "System prompt" });
        const text_area = this.prompt_container.createEl("textarea", {
            cls: "caret-full_width_text_container",
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
            cls: `caret-w-full caret-workflow_text_area text_area_id_${step_number}`,
            placeholder: "Add a step into your workflow",
        });
        text_area.value = prompt.prompt;
        text_area.id = `text_area_id_${step_number}`;
        // Create a container div with class flex-row
        const options_container = this.prompt_container.createEl("div", {
            cls: "caret-flex-row",
        });
        // Provider label and dropdown
        const provider_label = options_container.createEl("label", {
            text: "Provider",
            cls: "caret-row_items_spacing",
        });
        const provider_select = options_container.createEl("select", {
            cls: "caret-provider_select caret-row_items_spacing",
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
            cls: "caret-row_items_spacing",
        });
        const model_select = options_container.createEl("select", {
            cls: "caret-model_select caret-row_items_spacing",
        });

        // Function to update model options based on selected provider
        const update_model_options = (provider: string) => {
            if (!provider) {
                return;
            }
            while (model_select.firstChild) {
                model_select.removeChild(model_select.firstChild);
            }
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
            cls: "caret-row_items_spacing",
        });

        // Temperature input
        const temperature_input = options_container.createEl("input", {
            type: "number",
            cls: "caret-workflow-editor-temperature-input caret-temperature_input", // Apply the CSS class here
        }) as HTMLInputElement;

        // Set the attributes separately to avoid TypeScript errors
        temperature_input.min = "0";
        temperature_input.max = "2";
        temperature_input.step = "0.1";
        temperature_input.value = prompt.temperature;

        // Delay label and input
        const delay_label = options_container.createEl("label", {
            text: "Delay",
            cls: "caret-row_items_spacing",
        });
        const delay_input = options_container.createEl("input", {
            type: "number",
            cls: "caret-delay_input caret-row_items_spacing",
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
