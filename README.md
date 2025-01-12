> [!note]
> Throughout this document:
> - "Caret OP" refers to this Obsidian plugin
> - "Caret" refers to a separate paid SaaS product (see note at bottom)


# Caret Obsidian Plugin
Caret OP is an Obsidian plugin that brings the power of LLMs into your Obsidian Vault. Caret OP follows all the main Obsidian philosophies. It's local-first, privacy preserving and stores all generated data as local files.


# Features:
- AI Canvas: Use LLMs in the Obsidian Canvas for non-linear chat and more.
- Chat: Chat directly in Obsidian. Reference other files in your vault. All chat logs are stored as vault files.
- Use Any LLMs: Use Caret OP with local or remote LLMs. Caret OP has built in support for Ollama, OpenAI, Anthropic, Groq, OpenRouter and you can add any additional models yourself.


## Discord
Come hang in the Discord! Everyone's welcome! Targeted for people using Obsidian, LLMs and AI tools.

https://discord.gg/8FyGfcH24N

The discord is for people to:
- Hang
- Ask questions 
- Talk shop
- Show what they're working on
- Discuss development of Caret OP

Good vibes only. Strongly enforced.

> [!note]
> Please note that this discord is also for my paid product, Caret. See note at the bottom.


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

## Supporting Caret OP and Caret 
Caret OP is free and open source and it always will be. You can support Caret OP by checking out https://www.caretai.app/.

This is a standalone web app created by me! Caret OP and Caret (the web app) are fully separate products, but they are thematically similar. Really Caret grew out of this plugin. If you are enjoying the plugin, I would love it if you would checkout my web app as well.