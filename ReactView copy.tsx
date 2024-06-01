import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { IconButton } from '@mui/material';
import { createRoot } from 'react-dom/client';

interface ChatComponentProps {
  plugin: any;
  chat_id: string;
  initialConversation: Message[];
  onSubmitMessage: (message: string) => Promise<void>;
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
    <div style={{ position: 'relative', borderRadius: '4px' }}>
      <SyntaxHighlighter language={language} style={materialDark}>
        {value}
      </SyntaxHighlighter>
      <IconButton
        onClick={copyToClipboard}
        style={{ position: 'absolute', top: 0, right: 0, color: 'white' }}
      >
        <ContentCopyIcon />
      </IconButton>
      {copied && (
        <span style={{ position: 'absolute', top: 0, right: '40px', color: 'white', backgroundColor: 'black', padding: '2px 5px', borderRadius: '3px' }}>
          Code copied
        </span>
      )}
    </div>
  );
};

const ReactView: React.FC<{ markdown: string }> = ({ markdown }) => {
  return (
    <ReactMarkdown
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
}, ChatComponentProps>(({ plugin, chat_id, initialConversation, onSubmitMessage }, ref) => {
  const [conversation, setConversation] = useState(initialConversation);
  const [isGenerating, setIsGenerating] = useState(false);
  const [textBoxValue, setTextBoxValue] = useState("");

  useImperativeHandle(ref, () => ({
    addMessage: (message: Message) => {
      setConversation((prev) => [...prev, message]);
    },
    // updateLastMessage: (content: string) => {
    //   setConversation((prev) => {
    //     const updated = [...prev];
    //     updated[updated.length - 1].content += content;
    //     return updated;
    //   });
    // }
    updateLastMessage: (content: string) => {
      setConversation((prev) => {
          const updated = [...prev];
          // Replace the content instead of appending
          updated[updated.length - 1].content = content;
          return updated;
      });
  }
  }));

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
          <div key={index} className={`message ${message.role}`}>
            <ReactView markdown={message.content} />
          </div>
        ))}
      </div>
      <div className="input-container" style={{ position: 'sticky', bottom: 0, backgroundColor: 'white', padding: '10px', boxShadow: '0 -2px 5px rgba(0,0,0,0.1)' }}>
        <textarea
          className="full_width_text_container"
          placeholder="Type something..."
          value={textBoxValue}
          onChange={(e) => setTextBoxValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "@" && !e.shiftKey) {
              e.preventDefault();
              setTextBoxValue(textBoxValue + "@");
              // new InsertNoteModal(plugin.app, plugin, this).open();
            } else if (e.shiftKey && e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
        <div className="button-container" style={{ textAlign: 'right', marginTop: '10px' }}>
          <button onClick={handleSubmit}>Submit</button>
        </div>
      </div>
    </div>
  );
});

export default ChatComponent;