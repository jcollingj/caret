import { App, MarkdownView, Modal, Setting } from "obsidian";

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
            cls: "caret-inline-editing-container-div", // Apply the CSS class here
        });

        contentEl.createEl("br"); // Line break

        const textArea = contentEl.createEl("textarea", {
            placeholder: "Type here...",
            cls: "caret-inline-editing-textarea", // Apply the CSS class here
        });

        const buttonContainer = contentEl.createEl("div", { cls: "caret-button-container" });

        new Setting(buttonContainer)
            .addButton((btn) =>
                btn
                    .setButtonText("Append output")

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
// Please apply the following instructions to the below content:
Por favor, aplique as instruções abaixo ao conteúdo a seguir:

// Instructions:
Instruções:
${this.result}

// Content:
Conteúdo:
${this.selectedText}

// ## Rules:
## Regras:
// - Just return the reponse that follows the instructions. No need to include a preample or anything
- Apenas retorne a resposta que segue as instruções. Não é necessário incluir um preâmbulo ou qualquer outra coisa

// ## Markdown Formatting: 
## Formatação Markdown:
// Always apply markdown formatting. For keywords use the following:
Sempre aplique a formatação markdown. Para palavras-chave, use o seguinte:
// 	todos - Prepend todo lines with:
// 	- [ ] 
	todos - Adicione no início das linhas de tarefas:
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
