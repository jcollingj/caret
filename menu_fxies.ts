patchCanvasMenu() {
    console.log("Patching the canvas menu");

    const patchMenu = () => {
        const canvasView = this.app.workspace.getLeavesOfType("canvas").first()?.view;
        console.log(this.app.workspace.getLeavesOfType("canvas"));
        console.log(canvasView);
        if (!canvasView) {
            console.log("No canvas view found");
            return false;
        }

        const menu = canvasView.canvas.menu;
        if (!menu) {
            console.log("No menu found on the canvas");
            return false;
        }

        const menuUninstaller = around(menu.constructor.prototype, {
            render: (next: any) =>
                function (...args: any) {
                    const result = next.call(this, ...args);
                    // Check if the Graph button is already added
                    if (!this.menuEl.querySelector(".graph-menu-item")) {
                        const graphButtonEl = createEl("button", "clickable-icon graph-menu-item");
                        setTooltip(graphButtonEl, "View Graph", { placement: "top" });
                        setIcon(graphButtonEl, "lucide-workflow");
                        graphButtonEl.addEventListener("click", () => {
                            console.log("Graph button clicked");
                            // console.log(canvasView.canvas.select);
                            const selection = canvasView.canvas.selection;
                            const selectionIterator = selection.values();
                            const node = selectionIterator.next().value;

                            console.log({ node });
                            // Implement the functionality you want to trigger on click
                        });
                        this.menuEl.appendChild(graphButtonEl);
                    }
                    if (!this.menuEl.querySelector(".gpt-menu-item")) {
                        const buttonEl = createEl("button", "clickable-icon gpt-menu-item");
                        setTooltip(buttonEl, "Ask AI", { placement: "top" });
                        setIcon(buttonEl, "lucide-sparkles");
                        buttonEl.addEventListener("click", () => {
                            console.log("AI button clicked");
                            // Implement the functionality you want to trigger on click
                        });
                        this.menuEl.appendChild(buttonEl);
                    }

                    return result;
                },
        });

        // this.register(menuUninstaller);
        console.log("Canvas menu patched successfully");
        return true;
    };

    patchMenu();
}