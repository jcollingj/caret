import { streamText, StreamTextResult, CoreTool, generateText, generateObject } from "ai";
import { ai_sdk_streaming, isEligibleProvider, sdk_provider, get_provider, ai_sdk_completion } from "../llm_calls";
import React from "react";
import { createRoot } from "react-dom/client";
import { ConvertTextToNoteModal } from "../modals/convertTextToNoteModal";
import { InsertNoteModal } from "../modals/insertNoteModal";
import ChatComponent from "../components/chat";
import { Message } from "../types";
import { Notice, ItemView, WorkspaceLeaf } from "obsidian";
import CaretPlugin from "../main";
import { TFolder } from "obsidian";
import { CoreMessage } from "ai";

export const VIEW_CHAT = "main-caret";

// Adicionar instrucoesBot como constante global no início do arquivo
const instrucoesBot = `
# Instruções para o Bot Integrado ao Obsidian

## 1. Buscar Notas
- Sempre que o usuário pedir para buscar notas (ex: "busque notas sobre ideias e projetos"), utilize a função de busca nas notas do Obsidian.
- Liste as notas encontradas, mostrando nome e caminho.
- Exemplo de resposta:

> Foram encontradas 3 notas relacionadas a "ideias e projetos":
> - Ideias2024.md (Ideias/Ideias2024.md)
> - ProjetoApp.md (Projetos/ProjetoApp.md)
> - Brainstorm.md (Brainstorm/Brainstorm.md)

## 2. Resumir Notas
- Se o usuário pedir um resumo (ex: "faça um resumo das notas"), leia o conteúdo das notas encontradas e gere um resumo automático.
- Exemplo de resposta:

> Resumo das notas:
> - Ideias para novos aplicativos focados em acessibilidade.
> - Projetos em andamento: App de tradução, Plataforma de cursos.
> - Brainstorm inicial sobre funcionalidades inovadoras.

## 3. Não pedir para o usuário colar ou enviar notas
- Nunca peça para o usuário colar o texto das notas ou enviar arquivos, pois o bot já tem acesso ao vault do Obsidian.

## 4. Perguntas Contextuais
- Se o usuário pedir detalhes, análise ou contexto, busque nas notas e responda com base no conteúdo encontrado.
- Exemplo:

> "Quais projetos tratam de acessibilidade?"
> - ProjetoApp.md: "Funcionalidades para deficientes visuais..."

## 5. Sempre utilize as funções do plugin
- Use as funções de busca, leitura e resumo das notas para responder.
- Não responda como se não tivesse acesso ao conteúdo local.

---

**Respostas incorretas a evitar:**
- "Me envie o texto das notas."
- "Não tenho acesso aos seus arquivos."
- "Cole aqui o conteúdo."
`;

function toCoreMessages(messages: any[]): CoreMessage[] {
    return messages.filter(
        (m) => m.role === "user" || m.role === "assistant" || m.role === "system"
    );
}

export class FullPageChat extends ItemView {
    chat_id: string;
    plugin: CaretPlugin;
    conversation_title: string;
    textBox: HTMLTextAreaElement;
    messagesContainer: HTMLElement; // Container for messages
    conversation: Message[]; // List to store conversation messages
    is_generating: boolean;
    chatComponentRef: any;
    file_name: string;

    constructor(
        plugin: any,
        leaf: WorkspaceLeaf,
        chat_id?: string,
        conversation: Message[] = [],
        file_name: string = ""
    ) {
        super(leaf);
        this.plugin = plugin;
        this.chat_id = chat_id || this.generateRandomID(5);
        this.conversation = conversation; // Initialize conversation list with default or passed value
        this.file_name = file_name;
    }

    getViewType() {
        return VIEW_CHAT;
    }

    getDisplayText() {
        if (this.file_name.length > 1) {
            return `Chat: ${this.file_name}`;
        }
        return `Chat: ${this.chat_id}`;
    }

    async onOpen() {
        const metacontainer = this.containerEl.children[1];
        metacontainer.empty();
        const container = metacontainer.createEl("div", {
            cls: "caret-container",
        });
        metacontainer.prepend(container);

        // Create a container for messages
        this.messagesContainer = container.createEl("div", {
            cls: "caret-messages-container",
        });

        // Render the React component using createRoot
        // Render the React component using createRoot
        const root = createRoot(this.messagesContainer);
        const chatComponent = React.createElement(ChatComponent, {
            plugin: this.plugin,
            chat_id: this.chat_id,
            initialConversation: this.conversation,
            onSubmitMessage: this.submitMessage.bind(this),
            onSave: this.handleSave.bind(this), // Add this line
            onBulkConvert: this.bulkConvert.bind(this),
            onNewChat: this.newChat.bind(this),
            onInsertNote: this.handleInsertNote.bind(this),
            ref: (ref) => {
                this.chatComponentRef = ref;
            }, // Set the ref here
        });
        root.render(chatComponent);
    }
    async submitMessage(userMessage: string) {
        // Adiciona a mensagem do usuário ao array de conversas
        this.conversation.push({ content: userMessage, role: "user" });
        // Atualiza o componente React
        this.updateChatComponent();

        // ======== INTERCEPTAÇÃO E MEMÓRIA DE CONTEXTO ========
        // Memória simples: contexto das últimas 10 mensagens
        const contexto = this.conversation.slice(-10).map(m => `${m.role === 'user' ? 'Usuário' : 'Bot'}: ${m.content}`).join('\n');

        // Busca automática por comandos ou intenções
        const msg = userMessage.toLowerCase();
        let resposta = '';
        if (
            msg.includes('buscar nota') ||
            msg.startsWith('busque') ||
            msg.includes('procurar nota') ||
            msg.includes('pode buscar notas')
        ) {
            // 1. Se o usuário usar "busque por: termo", busca exata
            const termoExplicito = msg.match(/busque(?:r)? por:?\s*([^\n]+)/i);
            let palavrasChave: string[] = [];
            if (termoExplicito) {
                palavrasChave = [termoExplicito[1].trim()];
            } else {
                // 2. Extrai palavras-chave da frase (remove stopwords)
                const stopwords = ['sobre', 'notas', 'de', 'e', 'a', 'o', 'as', 'os', 'para', 'um', 'uma', 'por', 'em', 'do', 'da', 'dos', 'das', 'com', 'que', 'pode', 'buscar', 'procurar', 'nota', 'notas', 'pode', 'me', 'encontre', 'encontrar', 'mostre', 'mostrar', 'quero', 'preciso', 'favor', 'por', 'favor', 'porfavor', 'faça', 'fazer', 'procure', 'procurar'];
                palavrasChave = msg
                    .replace(/[?!.]/g, '')
                    .split(/\s+/)
                    .map(w => w.trim().toLowerCase())
                    .filter(w => w && !stopwords.includes(w));
            }

            // Busca para cada palavra-chave
            let resultados: any[] = [];
            for (const palavra of palavrasChave) {
                const notas = await this.plugin.buscarConteudo(palavra);
                const conversas = await this.plugin.buscarEmConversas(palavra);
                resultados = resultados.concat([...notas, ...conversas]);
            }
            // Remove duplicatas
            resultados = resultados.filter(
                (r, i, arr) => arr.findIndex(x => x.caminho === r.caminho && x.nome === r.nome) === i
            );

            // Salva no cache usando a combinação das palavras-chave
            await this.plugin.salvarCacheBusca(palavrasChave.join('+'), resultados);

            // Resposta
            if (resultados.length > 0) {
                let resposta = `Foram encontradas ${resultados.length} ocorrências relacionadas a "${palavrasChave.join(' + ')}":\n`;
                resposta += resultados.map((r: any) => `- ${r.nome} (${r.caminho})`).join('\n');
                this.conversation.push({ content: resposta, role: "assistant" });
                this.updateChatComponent();
            } else {
                this.conversation.push({ content: `Nenhuma nota ou conversa encontrada para "${palavrasChave.join(' + ')}".`, role: "assistant" });
                this.updateChatComponent();
            }
            return;
        }
        if (msg.includes('resumo') || msg.startsWith('resuma') || msg.startsWith('faça um resumo')) {
            // Resumir todas as notas
            const notas = this.plugin.listarNotas();
            let conteudo = '';
            for (const n of notas) {
                const file = this.plugin.app.vault.getFiles().find(f => f.name === n.nome);
                if (file) conteudo += await this.plugin.app.vault.read(file) + '\n';
            }
            // Resumo simples: pega as primeiras linhas de cada nota
            const linhas = conteudo.split('\n').filter(l => l.trim()).slice(0, 10);
            resposta = 'Resumo das notas:\n' + linhas.map(l => '- ' + l).join('\n');
            this.conversation.push({ content: resposta, role: "assistant" });
            this.updateChatComponent();
            return;
        }
        if (msg.includes('acessibilidade') || msg.includes('detalhe') || msg.includes('análise')) {
            // Busca contextual
            const resultados = await this.plugin.buscarConteudo('acessibilidade');
            if (resultados.length === 0) {
                resposta = 'Nenhuma nota encontrada sobre acessibilidade.';
            } else {
                resposta = 'Notas sobre acessibilidade:\n';
                resposta += resultados.map(r => `- ${r.nome}: ${r.trecho}`).join('\n');
            }
            this.conversation.push({ content: resposta, role: "assistant" });
            this.updateChatComponent();
            return;
        }
        // Resposta padrão: segue para o LLM, mas inclui contexto
        try {
            const respostaLLM = await this.getLLMResponse([
                ...this.conversation,
                { content: `Contexto recente:\n${contexto}\n\nSiga as instruções abaixo ao responder:\n${instrucoesBot}`, role: "user" }
            ]);
            this.conversation.push({ content: respostaLLM, role: "assistant" });
            this.updateChatComponent();
        } catch (error) {
            new Notice("Erro ao obter resposta do modelo: " + error.message);
        }
    }

    updateChatComponent() {
        if (this.chatComponentRef) {
            if (this.chatComponentRef.setConversation) {
                this.chatComponentRef.setConversation(this.conversation);
            }
        }
    }

    // Adicione um método fictício getLLMResponse para simular a resposta do modelo
    async getLLMResponse(conversation: Message[]) {
        // Chama o LLM/backend real e retorna a resposta
        const provider = this.plugin.settings.llm_provider;
        const model = this.plugin.settings.model;
        const temperature = this.plugin.settings.temperature;
        if (!isEligibleProvider(provider)) {
            throw new Error(`Invalid provider: ${provider}`);
        }
        let sdk_provider: sdk_provider = get_provider(this.plugin, provider);
        const resposta = await ai_sdk_completion(
            sdk_provider,
            model,
            toCoreMessages(conversation),
            temperature,
            provider
        );
        return resposta;
    }

    handleInsertNote(callback: (note: string) => void) {
        new InsertNoteModal(this.app, this.plugin, (note: string) => {
            callback(note); // Call the callback with the note value
        }).open();
    }
    bulkConvert(checkedContents: string[]) {
        if (checkedContents.length < 1) {
            new Notice("No selected messages to convert to note");
        }
        new ConvertTextToNoteModal(this.app, this.plugin, checkedContents).open();
    }
    handleSave() {
        // You can access the conversation state from the chatComponentRef if needed
        if (this.chatComponentRef) {
            const conversation = this.chatComponentRef.getConversation(); // Call the getConversation method
            // Save the conversation or perform any other actions
            this.conversation = conversation;
            this.saveChat();
        }
    }

    addMessage(text: string, sender: "user" | "assistant") {
        const newMessage = { content: text, role: sender };
        // Add message to the conversation array
        // this.conversation.push(newMessage);
        // Update the conversation in the React component
        if (this.chatComponentRef) {
            this.chatComponentRef.addMessage(newMessage);
        }
    }

    async streamMessage(stream_response: AsyncIterable<any>) {
        if (this.plugin.settings.llm_provider === "ollama") {
            for await (const part of stream_response) {
                this.conversation[this.conversation.length - 1].content += part.message.content;
                if (this.chatComponentRef) {
                    this.chatComponentRef.updateLastMessage(part.message.content);
                }
            }
        }
        if (this.plugin.settings.llm_provider === "openai" || "groq" || "custom") {
            for await (const part of stream_response) {
                const delta_content = part.choices[0]?.delta.content || "";
                this.conversation[this.conversation.length - 1].content += delta_content;
                if (this.chatComponentRef) {
                    this.chatComponentRef.updateLastMessage(delta_content);
                }
            }
        }
    }

    focusAndPositionCursorInTextBox() {
        this.textBox.focus();
    }

    insert_text_into_user_message(text: string) {
        this.textBox.value += text.trim() + " ";
    }

    escapeXml(unsafe: string): string {
        return unsafe.replace(/[<>&'"]/g, (c) => {
            switch (c) {
                case "<":
                    return "&lt;";
                case ">":
                    return "&gt;";
                case "&":
                    return "&amp;";
                case "'":
                    return "&apos;";
                case '"':
                    return "&quot;";
                default:
                    return c;
            }
        });
    }
    async newChat() {
        const currentLeaf = this.app.workspace.activeLeaf;
        if (currentLeaf) {
            // This would detach it if we wanted to it. But it causes bugs below.
            // I actually like the UX this way.
            // currentLeaf?.detach();
        }

        const new_leaf = await this.app.workspace.getLeaf(true);
        new_leaf.setViewState({
            type: VIEW_CHAT,
            active: true,
        });
    }

    async saveChat(durationInSeconds?: number) {
        const { settings } = this.plugin;
        const savePath = settings.chatSavePath;

        // ✅ 2.4. Evitar Criação Desnecessária
        const folder = this.app.vault.getAbstractFileByPath(savePath);
        if (!folder || !(folder instanceof TFolder)) {
            new Notice(`❌ Diretório de chat inválido ou não encontrado: "${savePath}". Verifique nas configurações.`);
            return;
        }

        // ✅ 2.3. Salvar Conversas
        const now = new Date();
        const date = now.toISOString().split("T")[0];
        const dateTimeLocale = now.toLocaleString();

        let baseFileName = `chat-session-${date}`;
        let fileName = `${baseFileName}.md`;
        let filePath = `${savePath}/${fileName}`;
        let counter = 1;

        // Check if the file already exists and iterate until we find a new name
        while (this.app.vault.getAbstractFileByPath(filePath)) {
            fileName = `${baseFileName}-${counter}.md`;
            filePath = `${savePath}/${fileName}`;
            counter++;
        }

        // Estrutura do arquivo
        let markdownContent = `## 🧠 Conversa – ${dateTimeLocale}\n\n`;

        this.conversation.forEach((msg) => {
            const role = msg.role === "user" ? "Usuário" : "Bot";
            markdownContent += `**${role}:** ${msg.content}\n`;
        });

        markdownContent += `\n---\n\n`;
        const safeDuration = durationInSeconds ?? 0;
        const durationMinutes = Math.floor(safeDuration / 60);
        const durationSeconds = safeDuration % 60;

        markdownContent += `Total de mensagens: ${this.conversation.length}\n`;
        markdownContent += `Duração: ${durationMinutes}m${durationSeconds}s\n`;

        try {
            await this.app.vault.create(filePath, markdownContent);
            new Notice(`✅ Conversa salva em: ${filePath}`);
        } catch (error) {
            console.error("Erro ao salvar o chat:", error);
            new Notice("❌ Falha ao salvar o arquivo de chat.");
        }
    }

    async name_new_chat(new_file: any) {
        let new_message = `
Please create a title for this conversation. Keep it to 3-5 words at max. Be as descriptive with that as you can be.\n\n

Respond in plain text with no formatting.
`;
        for (let i = 0; i < this.conversation.length; i++) {
            const message = this.conversation[i];
            new_message += `${message.role}:\n${message.content}`;
        }
        const conversation = [{ role: "user", content: new_message }];

        const provider = this.plugin.settings.llm_provider;
        const model = this.plugin.settings.model;
        const temperature = this.plugin.settings.temperature;

        // await this.update_node_content_streaming(node_id, stream, this.settings.llm_provider);
        if (!isEligibleProvider(provider)) {
            throw new Error(`Invalid provider: ${provider}`);
        }

        let sdk_provider: sdk_provider = get_provider(this.plugin, provider);
        const content = await ai_sdk_completion(sdk_provider, model, toCoreMessages(conversation), temperature, provider);

        const path = new_file.path;
        const newPath = `${path.substring(0, path.lastIndexOf("/"))}/${content}.md`;
        await this.app.vault.rename(new_file, newPath);
    }

    generateRandomID(length: number) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    async onClose() {
        // Cleanup logic if necessary
    }
}
