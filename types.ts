import "obsidian";
import { MarkdownView, TFile } from "obsidian";
import { CanvasData } from "obsidian/canvas";

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

// Borrowed types start here

export interface CanvasNodeUnknownData {
    id: string;
    collapsed: boolean;

    [key: string]: any;
}

type CanvasNodeID = string;
type CanvasEdgeID = string;

export interface App {
    appId: string;
    plugins: {
        getPlugin(name: string): any;
    };
    commands: any;
}

interface View {
    contentEl: HTMLElement;

    file: TFile;
}

export interface Canvas {
    readonly: boolean;
    view: MarkdownView;
    x: number;
    y: number;
    nodes: Map<CanvasNodeID, CanvasNode>;
    edges: Map<string, CanvasEdge>;
    nodeInteractionLayer: CanvasInteractionLayer;
    selection: Set<CanvasNode>;

    menu: CanvasMenu;

    wrapperEl: HTMLElement;

    history: any;
    requestPushHistory: any;
    nodeIndex: any;

    importData(data: CanvasData): void;

    requestSave(save?: boolean, triggerBySelf?: boolean): void;

    getData(): CanvasData;

    setData(data: CanvasData): void;

    getEdgesForNode(node: CanvasNode): CanvasEdge[];

    getContainingNodes(coords: CanvasCoords): CanvasNode[];

    deselectAll(): void;

    select(nodes: CanvasNode): void;

    requestFrame(): void;

    getViewportNodes(): CanvasNode[];

    selectOnly(nodes: CanvasNode): void;

    requestSave(save?: boolean, triggerBySelf?: boolean): void;

    zoomToSelection(): void;
}

export interface ICanvasData {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
}

export interface CanvasMenu {
    containerEl: HTMLElement;
    menuEl: HTMLElement;
    canvas: Canvas;
    selection: CanvasSelection;

    render(): void;

    updateZIndex(): void;
}

interface CanvasSelection {
    selectionEl: HTMLElement;
    resizerEls: HTMLElement;
    canvas: Canvas;
    bbox: CanvasCoords | undefined;

    render(): void;

    hide(): void;

    onResizePointerDown(e: PointerEvent, direction: CanvasDirection): void;

    update(bbox: CanvasCoords): void;
}

interface CanvasInteractionLayer {
    interactionEl: HTMLElement;
    canvas: Canvas;
    target: CanvasNode | null;

    render(): void;

    setTarget(target: CanvasNode | null): void;
}

interface CanvasNode {
    id: CanvasNodeID;

    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    bbox: CanvasCoords;
    unknownData: CanvasNodeUnknownData;
    renderedZIndex: number;

    // headerComponent: Component;

    nodeEl: HTMLElement;
    labelEl: HTMLElement;
    contentEl: HTMLElement;
    containerEl: HTMLElement;

    canvas: Canvas;
    app: App;

    getBBox(containing?: boolean): CanvasCoords;

    moveTo({ x, y }: { x: number; y: number }): void;

    render(): void;
}

export interface CanvasTextNode extends CanvasNode {
    text: string;
    child: any;
}

export interface CanvasFileNode extends CanvasNode {
    file: TFile;
}

export interface CanvasLinkNode extends CanvasNode {
    url: string;
}

export interface CanvasGroupNode extends CanvasNode {
    label: string;
}

export interface CanvasEdge {
    id: CanvasEdgeID;

    label: string | undefined;
    lineStartGroupEl: SVGGElement;
    lineEndGroupEl: SVGGElement;
    lineGroupEl: SVGGElement;

    path: {
        display: SVGPathElement;
        interaction: SVGPathElement;
    };

    from: {
        node: CanvasNode;
    };

    to: {
        side: "left" | "right" | "top" | "bottom";
        node: CanvasNode;
    };

    canvas: Canvas;
    bbox: CanvasCoords;

    unknownData: CanvasNodeUnknownData;
}

export interface CanvasCoords {
    maxX: number;
    maxY: number;
    minX: number;
    minY: number;
}
