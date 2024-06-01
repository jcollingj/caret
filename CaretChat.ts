// import React, { useState, useEffect } from "react";
// import ReactDOM from "react-dom";

// class FullPageChat extends ItemView {
//     chat_id: string;
//     plugin: any;
//     conversation_title: string;
//     textBox: HTMLTextAreaElement;
//     messagesContainer: HTMLElement; // Container for messages
//     conversation: Message[]; // List to store conversation messages
//     is_generating: boolean;

//     constructor(plugin: any, leaf: WorkspaceLeaf, chat_id?: string, conversation: Message[] = []) {
//         super(leaf);
//         this.plugin = plugin;
//         this.chat_id = chat_id || this.generateRandomID(5);
//         this.conversation = conversation; // Initialize conversation list with default or passed value
//     }

//     getViewType() {
//         return VIEW_NAME_MAIN_CHAT;
//     }

//     getDisplayText() {
//         return `Provider ${this.plugin.settings.llm_provider} | Model ${this.plugin.settings.model} | Chat: ${this.chat_id}`;
//     }

//     async onOpen() {
//         const metacontainer = this.containerEl.children[1];
//         metacontainer.empty();
//         const container = metacontainer.createEl("div", {
//             cls: "container",
//         });
//         metacontainer.prepend(container);

//         // Create a container for messages
//         this.messagesContainer = container.createEl("div", {
//             cls: "messages-container",
//         });

//         // Render the React component
//         ReactDOM.render(
//             <ChatComponent
//                 plugin={this.plugin}
//                 chat_id={this.chat_id}
//                 initialConversation={this.conversation}
//                 onSubmitMessage={this.submitMessage.bind(this)}
//             />,
//             this.messagesContainer
//         );
//     }

//     async submitMessage(userMessage: string) {
//         // Your existingng) {
//         // Your existing submitMessage logic here
//     }

//     async onClose() {
//         // Cleanup logic if necessary
//     }
// }

// const ChatComponent = ({ plugin, chat_id, initialConversation, onSubmitMessage }) => {
//     const [conversation, setConversation] = useState(initialConversation);
//     const [isGenerating, setIsGenerating] = useState(false);
//     const [textBoxValue, setTextBoxValue] = useState("");

//     const handleSubmit = async () => {
//         if (!isGenerating && textBoxValue.length > 0) {
//             setIsGenerating(true);
//             await onSubmitMessage(textBoxValue);
//             setTextBoxValue("");
//             setIsGenerating(false);
//         }
//     };

//     useEffect(() => {
//         // Update conversation state when new messages are added
//         setConversation(initialConversation);
//     }, [initialConversation]);

//     return (
//         <div className="chat-container">
//             <div className="messages-container">
//                 {conversation.map((message, index) => (
//                     <div key={index} className={`message ${message.role}`}>
//                         <ReactView markdown={message.content} />
//                     </div>
//                 ))}
//             </div>
//             <div className="input-container">
//                 <textarea
//                     className="full_width_text_container"
//                     placeholder="Type something..."
//                     value={textBoxValue}
//                     onChange={(e) => setTextBoxValue(e.target.value)}
//                     onKeyDown={(e) => {
//                         if (e.key === "@" && !e.shiftKey) {
//                             e.preventDefault();
//                             setTextBoxValue(textBoxValue + "@");
//                             new InsertNoteModal(plugin.app, plugin, this).open();
//                         } else if (e.shiftKey && e.key === "Enter") {
//                             e.preventDefault();
//                             handleSubmit();
//                         }
//                     }}
//                 />
//                 <div className="button-container">
//                     <button onClick={handleSubmit}>Submit</button>
//                 </div>
//             </div>
//         </div>
//     );
// };
// export default ChatComponent;
