// import { CaretSettingTab } from "./settings";

// // @ts-ignore
// import pdfjs from "@bundled-es-modules/pdfjs-dist/build/pdf";
// import pdf_worker_code from "./workers/pdf.worker.js";

// // Create a Blob URL from the worker code
// // @ts-ignore
// const pdf_worker_blob = new Blob([pdf_worker_code], { type: "application/javascript" });
// const pdf_worker_url = URL.createObjectURL(pdf_worker_blob);
// pdfjs.GlobalWorkerOptions.workerSrc = pdf_worker_url;

// import { encodingForModel } from "js-tiktoken";
// // @ts-ignore
// import ollama from "ollama/browser";

// import OpenAI from "openai";
// import Groq from "groq-sdk";
// import Anthropic from "@anthropic-ai/sdk";
// import { around } from "monkey-around";
// import { Canvas, ViewportNode, Message, Node, Edge, SparkleConfig } from "./types";
// import {
//     App,
//     Editor,
//     MarkdownView,
//     Modal,
//     Notice,
//     Plugin,
//     PluginSettingTab,
//     Setting,
//     ItemView,
//     WorkspaceLeaf,
//     setTooltip,
//     setIcon,
//     requestUrl,
//     TFile,
// } from "obsidian";
// import { CanvasFileData, CanvasNodeData, CanvasTextData } from "obsidian/canvas";
// import { NewNode, CustomModels, CaretPluginSettings } from "./types";
// var parseString = require("xml2js").parseString;
// export const VIEW_NAME_SIDEBAR_CHAT = "sidebar-caret";
// class SidebarChat extends ItemView {
//     constructor(leaf: WorkspaceLeaf) {
//         super(leaf);
//     }
//     textBox: HTMLTextAreaElement;
//     messagesContainer: HTMLElement; // Container for messages

//     getViewType() {
//         return VIEW_NAME_SIDEBAR_CHAT;
//     }

//     getDisplayText() {
//         return VIEW_NAME_SIDEBAR_CHAT;
//     }

//     async onOpen() {
//         const metacontainer = this.containerEl.children[1];
//         metacontainer.empty();
//         const container = metacontainer.createEl("div", {
//             cls: "container",
//         });
//         metacontainer.prepend(container);
//         // this.containerEl.appendChild(container);

//         // Create a container for messages
//         this.messagesContainer = container.createEl("div", {
//             cls: "messages-container",
//         });

//         // Add a "Hello World" message
//         this.addMessage("MLX Testing", "system");
//         this.createChatInputArea(container);
//     }
//     createChatInputArea(container: HTMLElement) {
//         // Create a container for the text box and the submit button
//         const inputContainer = container.createEl("div", {
//             cls: "chat-input-container",
//         });

//         // Create the text box within the input container
//         this.textBox = inputContainer.createEl("textarea", {
//             cls: "full_width_text_container",
//         });
//         this.textBox.placeholder = "Type something...";

//         // Create the submit button within the input container
//         const button = inputContainer.createEl("button");
//         button.textContent = "Submit";
//         button.addEventListener("click", () => {
//             this.submitMessage(this.textBox.value);
//             this.textBox.value = ""; // Clear the text box after sending
//         });
//     }

//     addMessage(text: string, sender: "user" | "system") {
//         const messageDiv = this.messagesContainer.createEl("div", {
//             cls: `message ${sender}`,
//         });
//         messageDiv.textContent = text;
//     }

//     submitMessage(userMessage: string) {
//         let current_page_content = "";
//         if (userMessage.includes("@current")) {
//             // Find the first MarkdownView that is open in the workspace
//             const markdownView = this.app.workspace
//                 .getLeavesOfType("markdown")
//                 // @ts-ignore
//                 .find((leaf) => leaf.view instanceof MarkdownView && leaf.width > 0)?.view as MarkdownView;
//             if (markdownView && markdownView.editor) {
//                 current_page_content = markdownView.editor.getValue();
//             }
//         }
//         this.addMessage(userMessage, "user"); // Display the user message immediately

//         const current_page_message = `
// 		${userMessage}

// 		------ Note for Model ---
// 		When I am referring to @current, I meant the following:

// 		${current_page_content}
// 		`;

//         let final_message = userMessage;
//         if (current_page_content.length > 0) {
//             final_message = current_page_message;
//         }

//         const data = { message: final_message };
//         fetch("http://localhost:8000/conversation", {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//             },
//             body: JSON.stringify(data),
//         })
//             .then((response) => response.json())
//             .then((data) => {
//                 this.addMessage(data.response, "system"); // Display the response
//             })
//             .catch((error) => {
//                 console.error("Error:", error);
//             });
//     }

//     async onClose() {
//         // Cleanup logic if necessary
//     }
// }
