# Caret Obsidian Plugin

> **Note:** This plugin is no longer being actively maintained.

Caret is an Obsidian plugin that brings the power of LLMs into your Obsidian Vault. Caret follows all the main Obsidian philosophies. It's local-first, privacy preserving and stores all generated data as local files.


# Features:
- AI Canvas: Use LLMs in the Obsidian Canvas for non-linear chat and more.
- Chat: Chat directly in Obsidian. Reference other files in your vault. All chat logs are stored as vault files.
- Use Any LLMs: Use Caret OP with local or remote LLMs. Caret OP has built in support for Ollama, OpenAI, Anthropic, Groq, OpenRouter and you can add any additional models yourself.


## Docs 
The full docs for the plugin will be on the site:
https://www.caretplugin.ai/

## Design Principles
These are the principles that guide the design and development of Caret. If a potential feature doesn't follow these then it probably won't be included in Caret OP.
- Keep to local-first
- No external services outside of LLM providers. No external APIs, DBs, RAG providers etc. All Caret OP functionality should come from just Caret OP.
- All Caret OP data is should be stored as markdown files within the users vault. Anything that Caret creates or consumes should be savable as a local file.
  


## Contributing
PRs welcome! More guidelines to come on this. But essentially if it's good, readable code that fits the Caret OP design principles then I'll try my best to incorporate it.

Big emphasis on "follows Caret OP's design principles". Please don't start working on something that violates a design principle without running it past me first. I don't want you to possibly waste time if it's a feature that I won't be able to incorporate.

