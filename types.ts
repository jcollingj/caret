import { MarkdownView } from "obsidian";

export interface ViewportNode {
    alwaysKeepLoaded: boolean;
    app: any; // This should be more specific based on the actual type of 'app'
    aspectRatio: number;
    bbox: {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
    };
    canvas: any; // This should be more specific based on the actual type of 'canvas'
    child: any; // This should be more specific based on the actual type of 'child'
    color: string;
    containerEl: HTMLElement;
    contentBlockerEl: HTMLElement;
    contentEl: HTMLElement;
    destroyed: boolean;
    height: number;
    id: string;
    initialized: boolean;
    isContentMounted: boolean;
    isEditing: boolean;
    nodeEl: HTMLElement;
    placeholderEl: HTMLElement;
    renderedZIndex: number;
    resizeDirty: boolean;
    text: string;
    unknownData: {
        id: string;
        type: string;
        text: string;
    };
    width: number;
    x: number;
    y: number;
    zIndex: number;
}

export interface Node {
    id: string;
    type: string;
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    render(): void;
    file?: string;
}

// TODO - improve types for everyting
export interface Canvas {
    readonly: boolean;
    view: MarkdownView;
    x: number;
    y: number;
    nodes: Map<string, any>;
    edges: Map<string, any>;
    selection: Set<any>;
    menu: CanvasMenu;
    nodeIndex: any; // Gotta figure out the typing for this.
    requestSave(save?: boolean, triggerBySelf?: boolean): void;
    getData(): any;
    getViewportNodes(): any[];
    requestSave(save?: boolean, triggerBySelf?: boolean): void;
    zoomToSelection(): void;
    selectOnly(node: Node): void;
    importData({}): void;
    requestFrame(): void;
}

export interface CanvasMenu {
    containerEl: HTMLElement;
    menuEl: HTMLElement;
    canvas: Canvas;

    render(): void;
    updateZIndex(): void;
}

export type Message = {
    content: string;
    role: string;
};

export type Edge = {
    fromNode: string;
    toNode: string;
    fromSide: "left" | "right" | "top" | "bottom";
    toSide: "left" | "right" | "top" | "bottom";
};
