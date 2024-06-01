import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Clipboard } from 'lucide-react';
import { NotebookPen } from 'lucide-react';




import { createRoot } from 'react-dom/client';

interface ChatComponentProps {
  plugin: any;
  chat_id: string;
  initialConversation: Message[];
  onSubmitMessage: (message: string) => Promise<void>;
  onSave: () => void; // Add this line
  onBulkConvert: (checkedContents: string[]) => void;
  onNewChat: () => void;
  onInsertNote: (callback: (note: string) => void) => void; // Update this line


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
    setTimeout(() => setCopied(false), 2000); // Reset the copied state after 2 seconds
  };

  return (
    <div style={{ position: 'relative', borderRadius: '12px' }}>
      <SyntaxHighlighter language={language} style={materialDark}>
        {value}
      </SyntaxHighlighter>
      <div style={{ padding: "0 4px" }}>
        <Clipboard
          size={24}
          onClick={copyToClipboard}
          style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            color: 'white',
            cursor: 'pointer',
            borderRadius: '12px',
            transition: 'background-color 0.3s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'lightgray')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        />
        {copied && (
          <span style={{ position: 'absolute', top: '2px', right: '40px', color: 'white', backgroundColor: 'black', padding: '2px 5px', borderRadius: '12px' }}>
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
      className="react-markdown" // Add this line
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
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
const ChatComponent = forwardRef<{
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  submitMessage: (userMessage: string) => Promise<void>;
}, ChatComponentProps>(({ plugin, initialConversation, onSubmitMessage, onSave, onBulkConvert, onNewChat, onInsertNote }, ref) => {


  const convertToNote = (messageContent: string) => {
    onBulkConvert([messageContent]);
  };
  const bulkConvert = () => {
    const checkedContents = conversation
      .filter((_, i) => checkedMessages[i])
      .map((message) => message.content);
    onBulkConvert(checkedContents);
  };
  const insertNoteModal = () => {

    onInsertNote((note) => {
      insert_text_into_user_message(note);
    });
  };
  const insert_text_into_user_message = (text: string) => {
    setTextBoxValue(textBoxValue + text.trim() + " ");
}

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
    onSave(); // Call the onSave prop
  };
  const handleNewChat = async () =>{
    onNewChat()
  }
  const [conversation, setConversation] = useState(initialConversation);
  const [isGenerating, setIsGenerating] = useState(false);
  const [textBoxValue, setTextBoxValue] = useState("");
  const [checkedMessages, setCheckedMessages] = useState<{ [key: number]: boolean }>({});


  useImperativeHandle(ref, () => ({
    addMessage: (message: Message) => {
      setConversation((prev) => [...prev, message]);
    },
    updateLastMessage: (content: string) => {
      setConversation((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].content = content;
        return updated;
      });
    },
    submitMessage: async (userMessage: string) => {
      setIsGenerating(true);
      const user_message_tokens = plugin.encoder.encode(userMessage).length;
      if (user_message_tokens > plugin.settings.context_window) {
        // new Notice(
        //   `Single message exceeds model context window. Can't submit. Please shorten message and try again`
        // );
        setIsGenerating(false);
        return;
      }

      // Update the conversation state with the new user message
      setConversation((prev) => {
        const newConversation = [...prev, { content: userMessage, role: "user" }];
        handleConversationUpdate(newConversation);
        return newConversation;
      });
    },
    getConversation: () => conversation // Add this line
  }));

  const handleConversationUpdate = async (newConversation) => {
    let total_context_length = 0;
    let valid_conversation = [];

    for (let i = 0; i < newConversation.length; i++) {
      let message = newConversation[i];
      let modified_content = message.content;
      if (modified_content.length === 0) {
        continue;
      }

      const block_ref_content = await plugin.get_ref_blocks_content(modified_content);
      if (block_ref_content.length > 0) {
        modified_content += `Referenced content:\n${block_ref_content}`;
      }

      const encoded_message = plugin.encoder.encode(modified_content);
      const message_length = encoded_message.length;
      if (total_context_length + message_length > plugin.context_window) {
        break;
      }
      total_context_length += message_length;
      valid_conversation.push({ ...message, content: modified_content });
    }

    if (
      plugin.settings.llm_provider_options[plugin.settings.llm_provider][plugin.settings.model]
        .streaming
    ) {
      const response = await plugin.llm_call_streaming(
        plugin.settings.llm_provider,
        plugin.settings.model,
        valid_conversation
      );
      setConversation((prev) => [...prev, { content: "", role: "assistant" }]);
      await streamMessage(response);
      setIsGenerating(false);
      handleSave();
    } else {
      const content = await plugin.llm_call(
        plugin.settings.llm_provider,
        plugin.settings.model,
        valid_conversation
      );
      setConversation((prev) => [...prev, { content, role: "assistant" }]);
      setIsGenerating(false);
      handleSave();
    }
  };

  const streamMessage = async (stream_response) => {
    if (plugin.settings.llm_provider === "ollama") {
      for await (const part of stream_response) {
        setConversation((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].content += part.message.content;
          return updated;
        });
      }
    }
    if (plugin.settings.llm_provider === "openai" || "groq" || "custom") {
      for await (const part of stream_response) {
        const delta_content = part.choices[0]?.delta.content || "";
        setConversation((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].content += delta_content;
          return updated;
        });
      }
    }
  };
  

  const handleSubmit = async () => {
    if (!isGenerating && textBoxValue.length > 0) {
      setIsGenerating(true);
      await onSubmitMessage(textBoxValue);
      setTextBoxValue("");
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    // Update conversation state when new messages are added
    setConversation(initialConversation);
    
  }, [initialConversation]);

  return (
    <div className="chat-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div className="messages-container" style={{ flex: 1, overflowY: 'auto' }}>
      {conversation.map((message, index) => (
        <div className='message-container' key={index}>
          <div className={`message ${message.role}`}>
            <ReactView markdown={message.content} />
          </div>
          <div className='chat-message-actions'>
            <NotebookPen size={14} onClick={() => convertToNote(message.content)}  className='chat-message-convert-to-note'/>
            <div>
            <span className='bulk-convert-label'>Bulk Convert</span>
              <input
                type="checkbox"
                checked={!!checkedMessages[index]}
                onChange={() => handleCheckboxChange(index)}
                className='chat-message-checkbox'
              />
              
            </div>
          </div>
        </div>
      ))}
      </div>
      <div className="input-container" style={{ position: 'sticky', bottom: 0, padding: '10px' }}>
        <textarea
          className="full_width_text_container"
          placeholder="Type something..."
          value={textBoxValue}
          onChange={(e) => setTextBoxValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "@") {
              e.preventDefault();
              setTextBoxValue(textBoxValue + "@");
              // new InsertNoteModal(plugin.app, plugin, this).open();
              insertNoteModal()
            } else if (e.key === "Enter") {
              
              if (plugin.settings.chat_send_chat_shortcut === 'enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit()
              } else if (plugin.settings.chat_send_chat_shortcut === 'shift_enter' && e.shiftKey) {
                e.preventDefault();
                handleSubmit()
              }
            }
          }}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
        <div className="button-container" style={{ textAlign: 'right', marginTop: '10px', marginBottom: '4px' }}>
          <button onClick={handleSubmit}>Submit</button>
          <div className='right-button-container'>
            <button onClick={handleNewChat} style={{marginRight: '4px'}}>New Chat</button>
            {/* <button onClick={handleSave}>Save</button> */}
            <button onClick={bulkConvert}>Bulk Convert to Note</button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ChatComponent;

