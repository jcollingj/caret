# Caret
Caret is an Obsidian plugin that brings the power LLMs into your Obsidian Vault. Caret follows all the main Obsidian philosophies. It's local-first, privacy preserving and stores all data as local files.


# Features:
- AI Canvas: Use LLMs in the Obsidian Canvas for non-linear chat and more.
- Chat: Chat directly in Obsidian. Reference other files in your vault. All chat logs are stored as vault files.
- Use Any LLMs: Use Caret with local or remote LLMs. Caret has built in support for Ollama, OpenAI, Anthropic, Groq, OpenRouter and you can add any additional models yourself.


## Discord
Come hang in the Discord! Everyone's welcome! Targeted for people using Obsidian, LLMs and AI tools.

https://discord.com/invite/zazuUJdU

The discord is for people to:
- Hang
- Ask questions 
- Talk shop
- Show what they're working on
- Discuss development of Caret

Good vibes only. Strongly enforced.


## Docs 
The full docs for the plugin will be on the site:
https://www.caretplugin.ai/

## Design Principles
These are the principles that guide the design and development of Caret. If a potential feature doesn't follow these then it probably won't be included in Caret.
- Keep to local-first
- No external services outside of LLM providers. No external APIs, DBs, RAG providers etc. All Caret functionality should come from just Caret.
- All Caret data is should be stored as markdown files within the users vault. Anything that Caret creates or consumes should be savable as a local file.
  


## Contributing
PRs welcome! More guidelines to come on this. But essentially if it's good, readable code that fits the Caret design principles then I'll try my best to incorporate it.

Big emphasis on "follows Caret's design principles". Please don't start working on something that violates a design principle without running it past me first. I don't want you to possibly waste time if it's a feature that I won't be able to incorporate.

## Caret Bounties
Caret had about $2,000 in sales before I decided to opensource it. I'm not keeping any of that money, and instead it will be distributed as bounties for people contributing to Caret. The list of bounties and the contributors who completed them will be listed here.

To participate in bounties DM me about which bounty you want to complete. I'll send payouts via Venmo, Zelle, or some other method TBD. You should complete a bounty within about a week of taking it on. I will try to have it so only one person is working on a given bounty at a time.

Total Funds: $2,000
Funds Remaining: $2,000
Bounties Completed: 0
Funds Disbursed to communtiy members: $0
Bounties In Progress: 0
Bounties Open:

Open Bounties:
- **Sidebar Chat**: 
  - Extend chat so it can work in the sidebar as well. Include features to quickly add selected text into the chat.
  - Payout: $100
- **Canvas Cards Additional Actions**:
  - Create additional actions that go in the "magic wand" menu. These actions should be things like: Split node into multiple nodes, 
  - Payout: $100
- **Canvas UI Improvements Batch**:
  - Description: Expose more information to the user about what the canvas is currently doing.
  - Features:
    - Add a Heads Up Display / Mini map in the corner. Next to this HUD show the total number of tokens in the currently selected conversation
    - Improve how we indicate which nodes will be used as context.Show the main conversation thread as one color + the nodes used as context as a different color
  - Payout: $200
- **Canvas Groups**:
  - Description: Add support for referencing groups of nodes as context or conversational nodes.
  - Features:
    - You should be able to group a bunch of nodes, link that to a conversation and have all of that injected as context
  - Payout: $100
- **Image Support - Creating/Consuming**
  - Description: Add support for creating images on the canvas and for using images as
  - Features:
    - Command to create the image, save it to a Caret folder and then add it to the canvas
    - Ability to select images and use them as input on the canvas
    - Payout: $100

## Supporting Caret
Caret is not looking for financial support. The best way you can support Caret is by:
- Making a video of you using Caret, posting it on X and tagging me in it
- Contributing code


But if you do want to support financially, would you pay for a bounty? That could be a fun idea. DM if you would contribute $50-200 to have a feature created.
