import {
    streamText,
    StreamTextResult,
    CoreTool,
    generateText,
    generateObject,
    tool,
    ToolCallPart,
    CoreMessage,
} from "ai";
import { ai_sdk_streaming, isEligibleProvider, sdk_provider, get_provider, ai_sdk_completion } from "../llm_calls";
import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Clipboard } from "lucide-react";
import { NotebookPen, ChevronDown, ChevronUp, Mic, MicOff } from "lucide-react";
import remarkGfm from "remark-gfm";
import CaretPlugin from "../main";
import { z } from "zod";

interface ChatComponentProps {
    plugin: CaretPlugin;
    chat_id: string;
    initialConversation: Message[];
    onSubmitMessage: (message: string) => Promise<void>;
    onSave: (durationInSeconds: number) => void;
    onBulkConvert: (checkedContents: string[]) => void;
    onNewChat: () => void;
    onInsertNote: (callback: (note: string) => void) => void;
}

interface Message {
    content: string;
    role: "user" | "assistant" | "system";
}

interface ChatHistoryItem {
    summary: string;
    date: string;
    conversation: Message[];
    systemPrompt: string;
}

const CodeBlock: React.FC<{ language: string; value: string }> = ({ language, value }) => {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset the copied state after 2 seconds
    };

    return (
        <div style={{ position: "relative", borderRadius: "12px" }}>
            <SyntaxHighlighter language={language} style={materialDark}>
                {value}
            </SyntaxHighlighter>
            <div style={{ padding: "0 4px" }}>
                <Clipboard
                    size={24}
                    onClick={copyToClipboard}
                    className="caret-chat-copy-icon" // Apply the CSS class here
                />
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
            className="caret-markdown-body" // Add a proper class for styling
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
        getConversation: () => Message[];
        setConversation: (conversation: Message[]) => void;
    },
    ChatComponentProps
>(({ plugin, initialConversation, onSubmitMessage, onSave, onBulkConvert, onNewChat, onInsertNote }, ref) => {
    const convertToNote = (messageContent: string) => {
        onBulkConvert([messageContent]);
    };
    const bulkConvert = () => {
        const checkedContents = conversation.filter((_, i) => checkedMessages[i]).map((message) => message.content);
        onBulkConvert(checkedContents);
    };
    const insertNoteModal = () => {
        onInsertNote((note) => {
            insert_text_into_user_message(note);
        });
    };
    const insert_text_into_user_message = (text: string) => {
        setTextBoxValue(textBoxValue + text.trim() + " ");
    };

    const handleCheckboxChange = (index: number) => {
        setCheckedMessages((prev) => {
            const newCheckedMessages = { ...prev, [index]: !prev[index] };
            const checkedContents = conversation
                .filter((_, i) => newCheckedMessages[i])
                .map((message) => message.content);
            return newCheckedMessages;
        });
    };

    const handleSave = () => {
        onSave(sessionDuration); // Call the onSave prop
    };
    const handleNewChat = async () => {
        onNewChat();
    };
    const [conversation, setConversation] = useState(initialConversation);
    const [isGenerating, setIsGenerating] = useState(false);
    const [textBoxValue, setTextBoxValue] = useState("");
    const [checkedMessages, setCheckedMessages] = useState<{ [key: number]: boolean }>({});
    const [sessionStart] = useState(new Date());
    const [sessionDuration, setSessionDuration] = useState(0);
    const [systemPrompt, setSystemPrompt] = useState(plugin.settings.system_prompt || "");
    const [systemPromptHistory, setSystemPromptHistory] = useState<string[]>(() => {
        const saved = localStorage.getItem("caret_system_prompt_history");
        return saved ? JSON.parse(saved) : [];
    });
    const [showSystemPrompt, setShowSystemPrompt] = useState(false);
    const [historyDropdownOpen, setHistoryDropdownOpen] = useState(false);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>(() => {
        const saved = localStorage.getItem("caret_chat_history");
        return saved ? JSON.parse(saved) : [];
    });
    const [chatTitle, setChatTitle] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatMessagesRef = useRef<HTMLDivElement>(null);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        const timer = setInterval(() => {
            setSessionDuration(Math.floor((new Date().getTime() - sessionStart.getTime()) / 1000));
        }, 1000);
        return () => clearInterval(timer);
    }, [sessionStart]);

    useEffect(() => {
        plugin.settings.system_prompt = systemPrompt;
        plugin.saveSettings();
        if (systemPrompt.trim() && !systemPromptHistory.includes(systemPrompt.trim())) {
            const newHistory = [systemPrompt.trim(), ...systemPromptHistory].slice(0, 10);
            setSystemPromptHistory(newHistory);
            localStorage.setItem("caret_system_prompt_history", JSON.stringify(newHistory));
        }
    }, [systemPrompt]);

    const tools = {
        getCurrentNoteTitle: tool({
            description: "Get the title of the current active note in Obsidian.",
            parameters: z.object({}), // No parameters needed
            execute: async () => {
                const activeFile = plugin.app.workspace.getActiveFile();
                if (activeFile) {
                    return { title: activeFile.basename };
                } else {
                    return { error: "No active note found." };
                }
            },
        }),
    };

    // Inside your component
    const isGeneratingRef = useRef(isGenerating);

    useEffect(() => {
        isGeneratingRef.current = isGenerating;
    }, [isGenerating]);

    useImperativeHandle(ref, () => ({
        addMessage: (message: Message) => {
            setConversation((prev) => [...prev, message]);
        },
        updateLastMessage: (content: string) => {
            setConversation((prev) => {
                const updated = [...prev];
                if (updated.length > 0) {
                    updated[updated.length - 1].content = content;
                }
                return updated;
            });
        },
        getConversation: () => conversation,
        setConversation: (conv: Message[]) => setConversation(conv),
    }));

    function toCoreMessages(messages: any[]): CoreMessage[] {
        return messages.filter(
            (m) => m.role === "user" || m.role === "assistant" || m.role === "system"
        );
    }

    const handleConversationUpdate = async (newConversation: Message[]) => {
        let total_context_length = 0;
        let valid_conversation = [];

        if (systemPrompt.trim()) {
            valid_conversation.push({ role: 'system', content: systemPrompt });
        }

        for (let i = 0; i < newConversation.length; i++) {
            let message = newConversation[i];
            let modified_content = message.content;
            if (modified_content.length === 0) {
                continue;
            }
            if (plugin.settings.include_nested_block_refs) {
                const block_ref_content = await plugin.getRefBlocksContent(modified_content);
                if (block_ref_content.length > 0) {
                    modified_content += `Referenced content:\n${block_ref_content}`;
                }
            }

            const encoded_message = plugin.encoder.encode(modified_content);
            const message_length = encoded_message.length;
            if (total_context_length + message_length > plugin.settings.context_window) {
                break;
            }
            total_context_length += message_length;
            valid_conversation.push({ ...message, content: modified_content });
        }
        const provider = plugin.settings.llm_provider;
        const model = plugin.settings.model;
        const temperature = plugin.settings.temperature;

        if (!isEligibleProvider(provider)) {
            throw new Error(`Invalid provider: ${provider}`);
        }

        let sdk_provider: sdk_provider = get_provider(plugin, provider);

        try {
            const stream = await ai_sdk_streaming(
                sdk_provider,
                model,
                toCoreMessages(valid_conversation),
                temperature,
                provider,
                tools
            );
            streamMessage(stream, newConversation);
        } catch (error) {
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    const streamMessage = async (
        stream_response: StreamTextResult<Record<string, CoreTool<any, any>>, never>,
        conversation: CoreMessage[]
    ) => {
        let full_response = "";
        let tool_calls: ToolCallPart[] = [];
        setConversation((prev) => [...prev, { content: "", role: "assistant" }]);

        for await (const part of stream_response.fullStream) {
            switch (part.type) {
                case "text-delta":
                    full_response += part.textDelta;
                    setConversation((prev) => {
                        const updated = [...prev];
                        updated[updated.length - 1].content = full_response;
                        return updated;
                    });
                    break;
                case "tool-call":
                    tool_calls.push(part);
                    break;
            }
        }
        if (tool_calls.length > 0) {
            const tool_results = await Promise.all(
                tool_calls.map(async (tool_call) => {
                    const toolName = tool_call.toolName as keyof typeof tools;
                    const tool = tools[toolName];
                    if (!tool) {
                        return {
                            toolCallId: tool_call.toolCallId,
                            toolName: tool_call.toolName,
                            result: { error: `Tool not found: ${tool_call.toolName}` },
                        };
                    }
                    const result = await tool.execute(tool_call.args as {}, {
                        toolCallId: tool_call.toolCallId,
                        messages: conversation
                    });
                    return {
                        toolCallId: tool_call.toolCallId,
                        toolName: tool_call.toolName,
                        result,
                    };
                })
            );

            const new_conversation = [
                ...conversation,
                {
                    role: "assistant" as const,
                    content: tool_calls.map((tool_call) => ({
                        type: "tool-call" as const,
                        toolName: tool_call.toolName,
                        args: tool_call.args,
                        toolCallId: tool_call.toolCallId,
                    })),
                },
                {
                    role: "tool" as const,
                    content: tool_results.map((tool_result) => ({
                        type: "tool-result" as const,
                        ...tool_result,
                    })),
                },
            ];
            // @ts-ignore
            handleConversationUpdate(new_conversation);
        }
    };

    const handleSubmit = async () => {
        if (isGeneratingRef.current || textBoxValue.trim() === "") {
            return;
        }
        await onSubmitMessage(textBoxValue);
        setTextBoxValue("");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const sendShortcut = plugin.settings.chat_send_chat_shortcut;
        if (sendShortcut === "enter" && e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        } else if (sendShortcut === "shift_enter" && e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    // Função para salvar conversa no histórico
    const saveChatToHistory = (conversation: Message[], systemPrompt: string) => {
        if (conversation.length === 0) return;
        const summary = conversation[0]?.content?.slice(0, 40) || "(sem título)";
        const date = new Date().toLocaleString();
        const newHistory = [{ summary, date, conversation, systemPrompt }, ...chatHistory].slice(0, 20);
        setChatHistory(newHistory);
        localStorage.setItem("caret_chat_history", JSON.stringify(newHistory));
    };

    // Modal React customizado
    const HistoryModal: React.FC<{ onClose: () => void, chatHistory: ChatHistoryItem[], systemPromptHistory: string[], setSystemPrompt: (prompt: string) => void }> = ({ onClose, chatHistory, systemPromptHistory, setSystemPrompt }) => (
        <div style={{position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#000a', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div style={{background: '#232526', borderRadius: 12, padding: 24, minWidth: 350, maxWidth: 600, maxHeight: 600, overflowY: 'auto', boxShadow: '0 4px 24px #0008', position: 'relative'}}>
                <button onClick={onClose} style={{position: 'absolute', top: 8, right: 12, background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer'}}>×</button>
                <h2>Histórico de Conversas</h2>
                {chatHistory.length === 0 && <div>Nenhuma conversa salva.</div>}
                {chatHistory.map((item: ChatHistoryItem, idx: number) => (
                    <div key={idx} style={{marginBottom: 16, borderBottom: '1px solid #444', paddingBottom: 8}}>
                        <div style={{fontWeight: 500}}>{item.summary}</div>
                        <div style={{fontSize: '0.85em', color: '#aaa'}}>{item.date}</div>
                        <div style={{marginTop: 4}}>
                            {item.conversation.map((msg: Message, i: number) => (
                                <div key={i} style={{fontSize: '0.95em', color: msg.role === 'user' ? '#3a7bd5' : '#e0e0e0'}}>
                                    <b>{msg.role}:</b> {msg.content}
                                </div>
                            ))}
                        </div>
                        <div style={{marginTop: 4, fontSize: '0.9em', color: '#bbb'}}>
                            Prompt do Sistema: {item.systemPrompt || '(nenhum)'}
                        </div>
                    </div>
                ))}
                <h3>Prompts do Sistema</h3>
                {systemPromptHistory.length === 0 && <div>Nenhum prompt salvo.</div>}
                {systemPromptHistory.map((prompt: string, idx: number) => (
                    <div key={idx} style={{marginBottom: 4, color: '#3a7bd5', cursor: 'pointer'}} onClick={() => setSystemPrompt(prompt)}>
                        {prompt}
                    </div>
                ))}
            </div>
        </div>
    );

    // Função para rolar até o final
    const scrollToBottom = (smooth = true) => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
        }
    };

    // Rolar automaticamente ao adicionar mensagem
    useEffect(() => {
        setTimeout(() => {
            scrollToBottom();
        }, 0);
    }, [conversation]);

    // Detectar se está no final do chat
    const handleScroll = () => {
        if (!chatMessagesRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = chatMessagesRef.current;
        // Se está a menos de 40px do final, não mostra o botão
        setShowScrollToBottom(scrollTop + clientHeight < scrollHeight - 40);
    };

    // Função para iniciar/parar reconhecimento de voz
    const handleVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Reconhecimento de voz não suportado neste navegador.');
            return;
        }
        let SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!recognitionRef.current) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.lang = 'pt-BR';
            recognitionRef.current.interimResults = false;
            recognitionRef.current.maxAlternatives = 1;
            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setTextBoxValue((prev) => prev + (prev ? ' ' : '') + transcript);
            };
            recognitionRef.current.onend = () => {
                setIsRecording(false);
            };
            recognitionRef.current.onerror = () => {
                setIsRecording(false);
            };
        }
        if (!isRecording) {
            setIsRecording(true);
            recognitionRef.current.start();
        } else {
            setIsRecording(false);
            recognitionRef.current.stop();
        }
    };

    return (
        <div className="caret-chat-container">
            <div
                className="caret-chat-messages animated-chat-messages"
                ref={chatMessagesRef}
                onScroll={handleScroll}
                style={{ position: "relative", transition: "background 0.5s" }}
            >
                {conversation.map((message, index) => (
                    <div
                        key={index}
                        className={`caret-message-wrapper caret-${message.role} animated-message`}
                        style={{
                            animationDelay: `${index * 0.05}s`,
                            animationName: "caret-fadein-up",
                            animationDuration: "0.6s",
                            animationFillMode: "both",
                        }}
                    >
                        <input
                            type="checkbox"
                            className="message-checkbox"
                            checked={!!checkedMessages[index]}
                            onChange={() => handleCheckboxChange(index)}
                        />
                        <div className="caret-message-content animated-bounce-in">
                            <ReactView markdown={message.content} />
                            {message.role === "assistant" && (
                                <button
                                    onClick={() => convertToNote(message.content)}
                                    className="caret-chat-action-button"
                                >
                                    <NotebookPen size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
                {showScrollToBottom && (
                    <button
                        className="caret-scroll-to-bottom-button"
                        onClick={() => scrollToBottom()}
                        style={{
                            position: "fixed",
                            right: 32,
                            bottom: 120,
                            zIndex: 1001,
                            background: "linear-gradient(90deg, #3a7bd5 0%, #00d2ff 100%)",
                            color: "#fff",
                            border: "none",
                            borderRadius: 24,
                            padding: "10px 22px",
                            fontWeight: 600,
                            fontSize: "1.1em",
                            boxShadow: "0 2px 12px #0005",
                            cursor: "pointer",
                            transition: "background 0.2s, transform 0.18s cubic-bezier(0.4,0.2,0.2,1)",
                            animation: "caret-bounce 0.7s"
                        }}
                    >
                        ↓ Voltar ao final
                    </button>
                )}
            </div>
            <div className="caret-chat-input-container">
                <div style={{position: 'relative', marginBottom: 8}}>
                    <div
                        style={{fontWeight: 600, fontSize: '1.2em', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8}}
                        onClick={() => setHistoryDropdownOpen(v => !v)}
                        title="Clique para abrir o histórico"
                    >
                        {chatTitle || "Novo Chat"}
                    </div>
                    {historyDropdownOpen && (
                        <div style={{position: 'absolute', zIndex: 100, background: '#232526', border: '1px solid #444', borderRadius: 8, minWidth: 260, boxShadow: '0 2px 8px #0008', padding: 8, top: 48, left: 0}}>
                            <div style={{fontWeight: 500, marginBottom: 4}}>Conversas Recentes</div>
                            {chatHistory.length === 0 && <div style={{color: '#aaa'}}>Nenhuma conversa salva.</div>}
                            {chatHistory.map((item, idx) => (
                                <div key={idx} style={{padding: '4px 0', borderBottom: '1px solid #333', cursor: 'pointer'}} onClick={() => { setConversation(item.conversation); setSystemPrompt(item.systemPrompt); setHistoryDropdownOpen(false); }}>
                                    <div style={{fontWeight: 500}}>{item.summary}</div>
                                    <div style={{fontSize: '0.85em', color: '#aaa'}}>{item.date}</div>
                                </div>
                            ))}
                            <button className="caret-chat-button" style={{marginTop: 8, width: '100%'}} onClick={() => { setHistoryModalOpen(true); setHistoryDropdownOpen(false); }}>Ver tudo</button>
                            <div style={{fontWeight: 500, margin: '8px 0 4px 0'}}>Prompts do Sistema</div>
                            {systemPromptHistory.length === 0 && <div style={{color: '#aaa'}}>Nenhum prompt salvo.</div>}
                            {systemPromptHistory.map((prompt, idx) => (
                                <div key={idx} style={{padding: '2px 0', cursor: 'pointer', color: '#3a7bd5'}} onClick={() => setSystemPrompt(prompt)}>
                                    {prompt.length > 60 ? prompt.slice(0, 60) + '...' : prompt}
                                </div>
                            ))}
                        </div>
                    )}
                    {historyModalOpen && (
                        <HistoryModal onClose={() => setHistoryModalOpen(false)} chatHistory={chatHistory} systemPromptHistory={systemPromptHistory} setSystemPrompt={setSystemPrompt} />
                    )}
                </div>
                <div style={{fontWeight: 600, fontSize: '1.2em', marginBottom: 8}}>{chatTitle || "Novo Chat"}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <textarea
                        value={textBoxValue}
                        onChange={(e) => setTextBoxValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Digite sua mensagem aqui..."
                        className="caret-chat-textarea"
                    />
                    <button
                        onClick={handleVoiceInput}
                        className="caret-voice-button"
                        style={{
                            background: isRecording ? '#3a7bd5' : '#232526',
                            color: isRecording ? '#fff' : '#3a7bd5',
                            border: 'none',
                            borderRadius: 8,
                            padding: 8,
                            cursor: 'pointer',
                            transition: 'background 0.2s, color 0.2s',
                            outline: isRecording ? '2px solid #00d2ff' : 'none',
                            boxShadow: isRecording ? '0 0 8px #00d2ff88' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        title={isRecording ? 'Gravando...' : 'Falar'}
                    >
                        {isRecording ? <MicOff size={22} /> : <Mic size={22} />}
                    </button>
                </div>
                <div className="caret-system-prompt-toggle" onClick={() => setShowSystemPrompt((v) => !v)} style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginTop: 8}}>
                    <span style={{fontWeight: 500}}>Prompt do Sistema</span>
                    {showSystemPrompt ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                </div>
                {showSystemPrompt && (
                    <div className="caret-system-prompt-panel" style={{marginTop: 8, marginBottom: 8, background: '#232526', borderRadius: 8, padding: 10, border: '1px solid #444'}}>
                        <textarea
                            className="caret-system-prompt-textarea"
                            style={{width: '100%', minHeight: 80, marginBottom: 8, color: '#f3f3f3', background: '#2c2f34', borderRadius: 6, border: '1px solid #444', padding: 8}}
                            value={systemPrompt}
                            onChange={e => setSystemPrompt(e.target.value)}
                            placeholder="Defina o prompt do sistema para esta sessão..."
                        />
                        <div style={{fontSize: '0.95em', color: '#aaa', marginBottom: 4}}>Histórico de Prompts Utilizados:</div>
                        <ul style={{listStyle: 'disc', paddingLeft: 18, margin: 0, color: '#bbb', fontSize: '0.95em'}}>
                            {systemPromptHistory.length === 0 && <li>Nenhum prompt utilizado ainda.</li>}
                            {systemPromptHistory.map((prompt, idx) => (
                                <li key={idx} style={{marginBottom: 2, cursor: 'pointer'}} onClick={() => setSystemPrompt(prompt)}>
                                    {prompt.length > 80 ? prompt.slice(0, 80) + '...' : prompt}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <div className="caret-chat-buttons">
                    <button onClick={handleSubmit} className="caret-chat-button">
                        Enviar
                    </button>
                    <button onClick={handleNewChat} className="caret-chat-button">
                        Limpar
                    </button>
                    <button onClick={() => onSave(sessionDuration)} className="caret-chat-button">
                        Salvar conversa
                    </button>
                    <button onClick={bulkConvert} className="caret-chat-button">
                        Converter para Nota
                    </button>
                    <button onClick={insertNoteModal} className="caret-chat-button">
                        Inserir Nota
                    </button>
                </div>
                <div className="caret-chat-stats">
                    <span>Mensagens: {conversation.length}</span>
                </div>
            </div>
        </div>
    );
});

// Animações extras para o chat
const style = document.createElement('style');
style.innerHTML = `
@keyframes caret-fadein-up {
  from { opacity: 0; transform: translateY(32px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes caret-bounce {
  0% { transform: translateY(0); }
  30% { transform: translateY(-12px); }
  50% { transform: translateY(0); }
  70% { transform: translateY(-6px); }
  100% { transform: translateY(0); }
}
.animated-message { animation: caret-fadein-up 0.6s both; }
.animated-bounce-in { animation: caret-bounce 0.7s; }
.animated-chat-messages { transition: background 0.5s; }
`;
document.head.appendChild(style);

// Adicione um pouco de CSS para animação do botão de voz
const styleVoice = document.createElement('style');
styleVoice.innerHTML = `
.caret-voice-button:active {
  transform: scale(1.12) rotate(-6deg);
  background: #00d2ff;
  color: #fff;
}
.caret-voice-button {
  transition: background 0.2s, color 0.2s, transform 0.18s cubic-bezier(0.4,0.2,0.2,1);
}
`;
document.head.appendChild(styleVoice);

export default ChatComponent;
