import { App, Modal } from "obsidian";
import Fuse from "fuse.js";
export class InsertNoteModal extends Modal {
    plugin: any;
    current_view: any;
    onSubmit: (note: string) => void;

    constructor(app: App, plugin: any, onSubmit: (note: string) => void) {
        super(app);
        this.plugin = plugin;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        const all_files = this.app.vault.getFiles();

        const html_insert_files = contentEl.createEl("p", {
            text: "Insert File",
            cls: "caret-insert-file-header",
        });

        // Create a text input for filtering files
        const inputField = contentEl.createEl("input", {
            type: "text",
            placeholder: "Enter text to search files",
            cls: "caret-file-filter-input",
        });

        // Function to filter files based on input text and limit to 10 results
        const filter_files = (input_text: string) => {
            const fuse_options = {
                keys: ["name"],
                includeScore: true,
                threshold: 0.3,
            };
            const fuse = new Fuse(all_files, fuse_options);
            const results = fuse.search(input_text);
            return results.map((result) => result.item).slice(0, 10);
        };

        // Display the filtered files
        const filesDisplay = contentEl.createEl("div", { cls: "caret-insert-file-files-display" });

        let currentSelectedIndex = -1; // -1 means the input field is selected

        // Function to update the visual selection
        const updateSelection = () => {
            const fileElements = filesDisplay.querySelectorAll(".insert-file-file-name");
            fileElements.forEach((el, index) => {
                if (index === currentSelectedIndex) {
                    el.classList.add("selected");
                    el.scrollIntoView({ block: "nearest" });
                } else {
                    el.classList.remove("selected");
                }
            });
        };

        // Update display when input changes
        inputField.addEventListener("input", () => {
            const filtered_files = filter_files(inputField.value);

            // Clear previous file display
            // filesDisplay.innerHTML = "";
            filesDisplay.empty();

            // Add filtered files to the display
            filtered_files.forEach((file) => {
                const fileElement = filesDisplay.createEl("div", {
                    text: file.name,
                    cls: "caret-insert-file-file-name",
                });
                fileElement.addEventListener("click", () => {
                    this.onSubmit(`[[${file.name}]]`);
                    this.close();
                    // if (this.current_view.getViewType() === "main-caret") {
                    //     this.current_view.insert_text_into_user_message(`[[${file.name}]]`);
                    //     this.current_view.focusAndPositionCursorInTextBox();
                    //     this.close();
                    // }
                });
            });

            // Reset selection
            currentSelectedIndex = -1;
            updateSelection();
        });

        // Keyboard navigation
        inputField.addEventListener("keydown", (event) => {
            const fileElements = filesDisplay.querySelectorAll(".insert-file-file-name");
            if (event.key === "ArrowDown") {
                if (currentSelectedIndex < fileElements.length - 1) {
                    currentSelectedIndex++;
                    updateSelection();
                    event.preventDefault(); // Prevent scrolling the page
                }
            } else if (event.key === "ArrowUp") {
                if (currentSelectedIndex > -1) {
                    currentSelectedIndex--;
                    updateSelection();
                    event.preventDefault(); // Prevent scrolling the page
                }
            } else if (event.key === "Enter" && currentSelectedIndex >= 0) {
                event.preventDefault(); // Prevent adding an extra line break
                (fileElements[currentSelectedIndex] as HTMLElement).click();
            }
        });
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}
