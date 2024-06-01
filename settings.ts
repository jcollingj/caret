import { generateHashForUUID, validateUUIDHashPair, validate_license_key } from "./license_hashing";
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
type ModelDropDownSettings = {
    openai: string;
    groq: string;
    ollama: string;
    anthropic?: string;
    custom?: string; // Make 'custom' optional
};

import { Models, CustomModels, LLMProviderOptions } from "./types";
import CaretPlugin, { DEFAULT_SETTINGS } from "./main";

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
    context_window: number;
    license_key: string;
    license_hash: string;
    custom_endpoints: { [model: string]: CustomModels };
    system_prompt: string;
    temperature: number;
    llm_provider_options: LLMProviderOptions;
    provider_dropdown_options: { [key: string]: string };
}

export class CaretSettingTab extends PluginSettingTab {
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

    api_settings_tab(containerEl: HTMLElement): void {
        // API settings logic here
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
                    context_window = parseInt(context_window_value.toLocaleString());
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
    chat_settings_tab(containerEl: HTMLElement): void {
        containerEl.createEl("p", { text: "Chat Settings" });
        let tempChatFolderPath = this.plugin.settings.chat_logs_folder; // Temporary storage for input value

        new Setting(containerEl)
            .setName("Chat Folder Path")
            .setDesc("Specify the folder path where chat logs will be stored.")
            .addText((text) => {
                text.setPlaceholder("Enter folder path")
                    .setValue(this.plugin.settings.chat_logs_folder)
                    .onChange((value: string) => {
                        tempChatFolderPath = value; // Store the value temporarily
                    });
            });

        new Setting(containerEl)
            .setName("Use Date Format for Subfolders")
            .setDesc("Use Year-Month-Date as subfolders for the chat logs.")
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.chat_logs_date_format_bool).onChange(async (value: boolean) => {
                    this.plugin.settings.chat_logs_date_format_bool = value;
                    await this.plugin.saveSettings();
                    await this.plugin.loadSettings();
                });
            });

        new Setting(containerEl)
            .setName("Rename Chats")
            .setDesc("Chats will be given a descriptive name using your default set provider/model")
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.chat_logs_rename_bool).onChange(async (value: boolean) => {
                    this.plugin.settings.chat_logs_rename_bool = value;
                    await this.plugin.saveSettings();
                    await this.plugin.loadSettings();
                });
            });

        // LLM Provider Settings
        const send_chat_shortcut_options: { [key: string]: string } = {
            enter: "Enter",
            shift_enter: "Shift + Enter",
            // cmd_enter: "CMD + Enter",
        };
        new Setting(containerEl)
            .setName("Send Chat Shortcut")
            .setDesc("Select which shortcut will be used to send messages.")
            .addDropdown((dropdown) => {
                dropdown.addOptions(send_chat_shortcut_options).onChange(async (selected) => {
                    this.plugin.settings.chat_send_chat_shortcut = selected;

                    await this.plugin.saveSettings();
                    await this.plugin.loadSettings();
                    // this.display();
                    console.log(this.plugin.settings.chat_send_chat_shortcut);
                });
            });

        new Setting(containerEl)
            .setName("Save Settings")
            .setDesc("Save the chat settings")
            .addButton((button) => {
                button.setButtonText("Save").onClick(async () => {
                    console.log("Saving settings");
                    // Validate the path when the save button is clicked
                    if (tempChatFolderPath.length <= 1) {
                        new Notice("The folder path must be longer than one character.");
                        return;
                    }
                    if (tempChatFolderPath.endsWith("/")) {
                        new Notice("The folder path must not end with a trailing slash.");
                        return;
                    }
                    if (tempChatFolderPath !== this.plugin.settings.chat_logs_folder) {
                        this.plugin.settings.chat_logs_folder = tempChatFolderPath;
                    }
                    await this.plugin.saveSettings();
                    await this.plugin.loadSettings();
                    new Notice("Chat settings saved!");
                });
            });
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
                                // @ts-ignore
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

        // LLM Provider Settings
        new Setting(containerEl)
            // .setName("LLM Provider")
            .setDesc(`Caret Version: ${this.plugin.settings.caret_version}`);

        const tabContainer = containerEl.createEl("div", { cls: "tab-container" });
        const apiTab = tabContainer.createEl("button", { text: "API Settings", cls: "tab" });
        const chatTab = tabContainer.createEl("button", { text: "Chat Settings", cls: "tab" });

        const apiSettingsContainer = containerEl.createEl("div", { cls: "api-settings-container hidden" });
        const chatSettingsContainer = containerEl.createEl("div", { cls: "chat-settings-container hidden" });

        this.api_settings_tab(apiSettingsContainer);
        this.chat_settings_tab(chatSettingsContainer);

        apiTab.addEventListener("click", () => {
            apiSettingsContainer.classList.remove("hidden");
            chatSettingsContainer.classList.add("hidden");
        });

        chatTab.addEventListener("click", () => {
            chatSettingsContainer.classList.remove("hidden");
            apiSettingsContainer.classList.add("hidden");
            // Placeholder for chat settings rendering function
            // this.chat_settings_tab(chatSettingsContainer);
        });

        // Initially load API settings tab
        apiTab.click();

        // this.api_settings_tab(containerEl);
        console.log("Done rendeirng in new way");
    }
}
