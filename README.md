## Caret

Caret enables new LLM-powered workflows in Obsidian.
## Known Issues

- **Sparkle Icon**: May render context incompletely if used immediately after editing a note on Canvas. *Workaround*: Allow a brief pause (Like 1 second) before using the sparkle icon.
- **Color Coding**: Highlighted canvas branches might retain the green color indefinitely if you don't click on the canvas before changing pages or exiting Obsidian.
	- Might add a toggle to disable this if I can't fix it quickly
	- I would avoid using this in heavily color coded graphs for now

## Installation Instructions

### Step 1: Install the BRAT Plugin from TfTHacker
1. BRAT is the **Beta Reviewers Auto-update Tool**
   - https://tfthacker.com/BRAT
2. You can install this through the Community Plugins within Obsidian.

### Step 2: Install Caret
   - Open up the BRAT Plugin
   - Add the Personal Access Token
	   - This enables read access to private Caret repo, which allows you to download the plugin
	   - PAT: `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`
   - Click Add Beta Plugin
   - For repo enter: `jcollingj/caret`
   - You can choose whether you want to auto update the plugins or not! It might be useful while I'm rapidly iterating on this

### Step 3: Configure Caret Settings
- Within your settings page open up the Caret settings
- Pick the model you want to use
- When you add API Keys you need to then reload the app for those changes to take effect. That's only for API keys. You can change the providers/models at any time without reloading.
- Note that there are a couple additional steps if you want to use ollama running locally

## Features
### Standard LLM Chat
- Like ChatGPT, but local first and the output is stored directly in your vault as markdown files. Meaning every conversation is instantly searchable and can be used as input to other Caret features.
- Open this from the chat icon added to the side bar.
- This does create a new folder `caret/chats` and stores all chats in this
### Chat in Canvas
- Explore non-linear chats in the Obsidian canvas. Easily remix conversations by moving, linking, and unlinking nodes
- Use the node icon within the menu to add new nodes that are pre-formatted for user messages.
- Click the Sparkle icon for initiating new conversations.
- Incorporate block refs by just using them! Caret will grab the context automatically
- ##### Chat Format
	- Within the canvas the nodes need to have a specific format for the chat to know which is which. Add a role xml tag with user in the middle to the beginning of text notes to make it be from the user.
		- The format is `<role>user</role>`
		- The easiest way to do this is to just click the "Add Child" button the menu
- ##### Custom Keybinds (Canvas)
	- **Graph Navigation**: Use `Mod + Arrow key` to navigate through nodes. (Note: Current limitations with multiple branches).
	- **Node Creation**: `Shift+Mod+Arrow Key` to create a new node in the specified direction.
	- **Activate Sparkle**: `Command + Shift + Enter`
- **Parallel Prompts**
	- You can save collections of prompts as special notes. You can then add these to the canvas, connect a node and sparkle! It will run all of the prompts stored in that note against your input node.
	- The structure of parallel prompt note is as follows:
		- **Note Properties** - Add two properties to the note.
			- `caret_prompt` set to `parallel_prompts`
				- This is text
			- `prompts` this is a list of the prompts you will add in the notes
		- **Note Content** - Add xml code blocks that contain an xml tag with the same name as what you listed in the `prompts` property. One code block per prompt.
		- So if I had a property called `best_season` my code block would look like:
			- ```xml 
				  <best_season> Whats the best time visit the following location? </best_season>``` 
		
### Inline Editing
- Inline editing can be used in markdown files. Either use the command pallette or CMD+J when you have text selected. That text will be used as the context. Add the prompt and then choose append or edit.
- The LLM will generate a response. This is added into your existing file. It will be formatted as a janky diff for now. So you can see what the changes would be before you apply them
- Then use the command "Apply Diffs" to apply those changes if you want them
