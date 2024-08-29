import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Clipboard, NotebookPen } from "lucide-react";
import remarkGfm from "remark-gfm";
import {
    ReactFlow,
    ReactFlowProvider,
    addEdge,
    useNodesState,
    useEdgesState,
    Controls,
    Background,
    MiniMap,
    Handle,
    Position,
    Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface ChatComponentProps {
    plugin: any;
    chat_id: string;
    initialConversation: Message[];
    onSubmitMessage: (message: string) => Promise<void>;
    onSave: () => void;
    onBulkConvert: (checkedContents: string[]) => void;
    onNewChat: () => void;
    onInsertNote: (callback: (note: string) => void) => void;
}

interface Message {
    content: string;
    role: "user" | "assistant";
}

const CodeBlock: React.FC<{ language: string; value: string }> = ({ language, value }) => {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{ position: "relative", borderRadius: "12px" }}>
            <SyntaxHighlighter language={language} style={materialDark}>
                {value}
            </SyntaxHighlighter>
            <div style={{ padding: "0 4px" }}>
                <Clipboard size={24} onClick={copyToClipboard} className="caret-chat-copy-icon" />
                {copied && (
                    <span
                        style={{
                            position: "absolute",
                            top: "2px",
                            right: "40px",
                            color: "white",
                            backgroundColor: "black",
                            padding: "2px 5px",
                            borderRadius: "12px",
                        }}
                    >
                        Code copied
                    </span>
                )}
            </div>
        </div>
    );
};

const ReactView: React.FC<{ markdown: string }> = ({ markdown }) => {
    return (
        <ReactMarkdown
            className="caret-markdown-body"
            remarkPlugins={[remarkGfm]}
            components={{
                code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                        <CodeBlock language={match[1]} value={String(children).replace(/\n$/, "")} />
                    ) : (
                        <code className={className} {...props}>
                            {children}
                        </code>
                    );
                },
            }}
        >
            {markdown}
        </ReactMarkdown>
    );
};

const ChatComponent = forwardRef<
    {
        addMessage: (message: Message) => void;
        updateLastMessage: (content: string) => void;
        submitMessage: (userMessage: string) => Promise<void>;
        getConversation: () => Message[];
    },
    ChatComponentProps
>(({ plugin, initialConversation, onSubmitMessage, onSave, onBulkConvert, onNewChat, onInsertNote }, ref) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [conversation, setConversation] = useState(initialConversation);
    const [isGenerating, setIsGenerating] = useState(false);
    const [textBoxValue, setTextBoxValue] = useState("");
    const [checkedMessages, setCheckedMessages] = useState<{ [key: number]: boolean }>({});
    const isGeneratingRef = useRef(isGenerating);

    useEffect(() => {
        isGeneratingRef.current = isGenerating;
    }, [isGenerating]);

    useEffect(() => {
        setConversation(initialConversation);
        updateNodes(initialConversation);
    }, [initialConversation]);

    const updateNodes = useCallback(
        (messages: Message[]) => {
            const newNodes = messages.map((message, index) => ({
                id: `${index}`,
                type: "messageNode",
                data: { message },
                position: { x: 0, y: index * 150 },
            }));
            setNodes(newNodes);

            const newEdges = messages.slice(1).map((_, index) => ({
                id: `e${index}-${index + 1}`,
                source: `${index}`,
                target: `${index + 1}`,
            }));
            setEdges(newEdges);
        },
        [setNodes, setEdges]
    );

    useImperativeHandle(ref, () => ({
        addMessage: (message: Message) => {
            setConversation((prev) => {
                const newConversation = [...prev, message];
                updateNodes(newConversation);
                return newConversation;
            });
        },
        updateLastMessage: (content: string) => {
            setConversation((prev) => {
                const updated = [...prev];
                updated[updated.length - 1].content = content;
                updateNodes(updated);
                return updated;
            });
        },
        submitMessage: async (userMessage: string) => {
            const user_message_tokens = plugin.encoder.encode(userMessage).length;
            if (user_message_tokens > plugin.settings.context_window) {
                console.error(
                    `Single message exceeds model context window. Can't submit. Please shorten message and try again`
                );
                setIsGenerating(false);
                return;
            }

            setConversation((prev: any) => {
                const newConversation = [...prev, { content: userMessage, role: "user" }];
                handleConversationUpdate(newConversation);
                return newConversation;
            });
        },
        getConversation: () => conversation,
    }));

    const handleConversationUpdate = async (newConversation: any) => {
        // ... (keep the existing logic for handling conversation updates)
    };

    const streamMessage = async (stream_response: any) => {
        // ... (keep the existing logic for streaming messages)
    };

    const handleSubmit = async () => {
        if (!isGeneratingRef.current && textBoxValue.length > 0) {
            await setIsGenerating(true);
            await onSubmitMessage(textBoxValue);
            setTextBoxValue("");
        }
    };

    const MessageNode = ({ data }: { data: { message: Message } }) => (
        <div className={`caret-message ${data.message.role}`}>
            <Handle type="target" position={Position.Top} />
            <ReactView markdown={data.message.content} />
            <Handle type="source" position={Position.Bottom} />
        </div>
    );

    const nodeTypes = {
        messageNode: MessageNode,
    };

    return (
        <ReactFlowProvider>
            <div style={{ height: "100vh", width: "100%" }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                >
                    <Background />
                    <Controls />
                    <MiniMap />
                    <Panel position="bottom-center">
                        <textarea
                            className="caret-full_width_text_container"
                            placeholder="Type something..."
                            value={textBoxValue}
                            onChange={(e) => setTextBoxValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "@") {
                                    e.preventDefault();
                                    setTextBoxValue(textBoxValue + "@");
                                    onInsertNote((note) => {
                                        setTextBoxValue((prev) => prev + note.trim() + " ");
                                    });
                                } else if (e.key === "Enter") {
                                    if (plugin.settings.chat_send_chat_shortcut === "enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit();
                                    } else if (
                                        plugin.settings.chat_send_chat_shortcut === "shift_enter" &&
                                        e.shiftKey
                                    ) {
                                        e.preventDefault();
                                        handleSubmit();
                                    }
                                }
                            }}
                            style={{ width: "100%", boxSizing: "border-box" }}
                        />
                        <div
                            className="caret-button-container"
                            style={{ textAlign: "right", marginTop: "10px", marginBottom: "4px" }}
                        >
                            <button onClick={handleSubmit}>Submit</button>
                            <div className="caret-right-button-container">
                                <button onClick={onNewChat} style={{ marginRight: "4px" }}>
                                    New Chat
                                </button>
                                <button
                                    onClick={() =>
                                        onBulkConvert(
                                            conversation.filter((_, i) => checkedMessages[i]).map((m) => m.content)
                                        )
                                    }
                                >
                                    Bulk convert to note
                                </button>
                            </div>
                        </div>
                    </Panel>
                </ReactFlow>
            </div>
        </ReactFlowProvider>
    );
});

export default ChatComponent;
