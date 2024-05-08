interface MenuItem {
    class: string;
    type: string;
    icon: string;
    name: string;
    cat: string;
    selector: string;
    ctxmenu: boolean;
    enable: boolean;
    expanded: boolean;
}

interface SubMenuItem {
    class: string;
    type: string;
    icon: string;
    name: string;
    selector: string;
    enable: boolean;
}

interface CustomIcon {
    name: string;
    svgContent: string;
}

interface Config {
    [key: string]: {
        name: string;
        menuItems: MenuItem[];
        subMenuItems: {
            [key: string]: SubMenuItem[];
        };
        customIcons: CustomIcon[];
    };
}

interface TransformedSubMenuItems extends SubMenuItem {
    type: string;
}

export const defaultConfigs: Config = {
    default: {
        name: "Default",
        menuItems: [
            {
                class: "cs-border",
                type: "border",
                icon: "cs-style-border",
                name: "Border",
                cat: "",
                selector: "",
                ctxmenu: false,
                enable: true,
            },
            {
                class: "cs-bg",
                type: "bg",
                icon: "cs-background",
                name: "Background",
                cat: "",
                selector: "",
                ctxmenu: false,
                enable: true,
            },
            {
                class: "cs-rotate",
                type: "rotate",
                icon: "rotate-cw",
                name: "Rotate",
                cat: "",
                selector: "",
                ctxmenu: false,
                enable: true,
            },
            {
                class: "cs-shape",
                type: "shape",
                icon: "diamond",
                name: "Shape",
                cat: "",
                selector: "",
                ctxmenu: false,
                enable: true,
            },
            {
                class: "cs-highlight",
                type: "highlight",
                icon: "star",
                name: "Highlight",
                cat: "",
                selector: "",
                ctxmenu: false,
                enable: true,
            },
            {
                class: "cs-extra",
                type: "extra",
                icon: "more-horizontal",
                name: "Extra",
                cat: "",
                selector: "",
                ctxmenu: false,
                enable: true,
            },
            {
                class: "cs-line-type",
                type: "lineType",
                icon: "cs-border-corner-pill",
                name: "Line type",
                cat: "edge",
                selector: "",
                ctxmenu: false,
                enable: true,
            },
            {
                class: "cs-line-style",
                type: "lineStyle",
                icon: "cs-line-style",
                name: "Line style",
                cat: "edge",
                selector: "",
                ctxmenu: false,
                enable: true,
            },
            {
                class: "cs-line-thickness",
                type: "lineThickness",
                icon: "equal",
                name: "Line thickness",
                cat: "edge",
                selector: "",
                ctxmenu: false,
                enable: true,
            },
        ],
        subMenuItems: {
            border: [
                {
                    class: "cs-border-none",
                    type: "border",
                    icon: "cs-no-border",
                    name: "No border",
                    selector: "",
                    enable: true,
                },
                {
                    class: "cs-border-dashed",
                    type: "border",
                    icon: "box-select",
                    name: "Dashed",
                    selector: "",
                    enable: true,
                },
            ],
            bg: [
                {
                    class: "cs-bg-transparent",
                    type: "bg",
                    icon: "cs-transparent",
                    name: "Transparent",
                    selector: "",
                    enable: true,
                },
                {
                    class: "cs-bg-opacity-0",
                    type: "bg",
                    icon: "cs-opacity",
                    name: "Opacity 0",
                    selector: "",
                    enable: true,
                },
            ],
            rotate: [
                {
                    class: "cs-rotate-right-45",
                    type: "rotate",
                    icon: "redo",
                    name: "Right 45",
                    selector: "",
                    enable: true,
                },
                {
                    class: "cs-rotate-right-90",
                    type: "rotate",
                    icon: "redo",
                    name: "Right 90",
                    selector: "",
                    enable: true,
                },
                {
                    class: "cs-rotate-left-45",
                    type: "rotate",
                    icon: "undo",
                    name: "Left 45",
                    selector: "",
                    enable: true,
                },
                {
                    class: "cs-rotate-left-90",
                    type: "rotate",
                    icon: "undo",
                    name: "Left 90",
                    selector: "",
                    enable: true,
                },
            ],
            shape: [
                {
                    class: "cs-shape-circle",
                    type: "shape",
                    icon: "circle",
                    name: "Circle",
                    selector: "",
                    enable: true,
                },
                {
                    class: "cs-shape-parallelogram-right",
                    type: "shape",
                    icon: "cs-parallelogram-right",
                    name: "Parallelogram right",
                    selector: "",
                    enable: true,
                },
                {
                    class: "cs-shape-parallelogram-left",
                    type: "shape",
                    icon: "cs-parallelogram-left",
                    name: "Parallelogram left",
                    selector: "",
                    enable: true,
                },
            ],
            highlight: [],
            extra: [],
            lineType: [
                {
                    class: "cs-line-straight",
                    type: "lineType",
                    icon: "minus",
                    name: "Straight",
                    selector: "",
                    enable: true,
                },
                {
                    class: "cs-line-elbow",
                    type: "lineType",
                    icon: "cs-elbow",
                    name: "Elbow",
                    selector: "",
                    enable: true,
                },
            ],
            lineStyle: [
                {
                    class: "cs-line-dashed",
                    type: "lineStyle",
                    icon: "cs-line-dashed",
                    name: "Dashed",
                    selector: "",
                    enable: true,
                },
                {
                    class: "cs-line-dashed-round",
                    type: "lineStyle",
                    icon: "cs-line-dashed",
                    name: "Dashed round",
                    selector: "",
                    enable: true,
                },
                {
                    class: "cs-line-dotted",
                    type: "lineStyle",
                    icon: "cs-line-dotted",
                    name: "Dotted",
                    selector: "",
                    enable: true,
                },
                {
                    class: "cs-line-dotted-line",
                    type: "lineStyle",
                    icon: "cs-dotted-line",
                    name: "Dotted line",
                    selector: "",
                    enable: true,
                },
            ],
            lineThickness: [
                {
                    class: "cs-line-thick",
                    type: "lineThickness",
                    icon: "cs-thicker",
                    name: "Thicker",
                    selector: "",
                    enable: true,
                },
                {
                    class: "cs-line-thicker",
                    type: "lineThickness",
                    icon: "cs-thicker++",
                    name: "Thicker++",
                    selector: "",
                    enable: true,
                },
            ],
        },
        customIcons: [],
    },
};

export const csIcons: CustomIcon[] = [
    // Lucide Icons
    {
        name: "cs-no-border",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mouse-pointer-square-dashed"><path d="M5 3a2 2 0 0 0-2 2"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="m12 12 4 10 1.7-4.3L22 16Z"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M9 3h1"/><path d="M9 21h2"/><path d="M14 3h1"/><path d="M3 9v1"/><path d="M21 9v2"/><path d="M3 14v1"/></svg>`,
    },
    {
        name: "cs-thicker",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-tally-2"><path d="M4 4v16"/><path d="M9 4v16"/></svg>`,
    },
    {
        name: "cs-thicker++",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-tally-3"><path d="M4 4v16"/><path d="M9 4v16"/><path d="M14 4v16"/></svg>`,
    },
    {
        name: "cs-circle-dashed",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-dashed"><path d="M10.1 2.18a9.93 9.93 0 0 1 3.8 0"/><path d="M17.6 3.71a9.95 9.95 0 0 1 2.69 2.7"/><path d="M21.82 10.1a9.93 9.93 0 0 1 0 3.8"/><path d="M20.29 17.6a9.95 9.95 0 0 1-2.7 2.69"/><path d="M13.9 21.82a9.94 9.94 0 0 1-3.8 0"/><path d="M6.4 20.29a9.95 9.95 0 0 1-2.69-2.7"/><path d="M2.18 13.9a9.93 9.93 0 0 1 0-3.8"/><path d="M3.71 6.4a9.95 9.95 0 0 1 2.7-2.69"/></svg>`,
    },
    // Tabler Icons
    {
        name: "cs-background",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-background" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 8l4 -4" /><path d="M14 4l-10 10" /><path d="M4 20l16 -16" /><path d="M20 10l-10 10" /><path d="M20 16l-4 4" /></svg>`,
    },
    {
        name: "cs-transparent",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-droplet-half-2" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7.502 19.423c2.602 2.105 6.395 2.105 8.996 0c2.602 -2.105 3.262 -5.708 1.566 -8.546l-4.89 -7.26c-.42 -.625 -1.287 -.803 -1.936 -.397a1.376 1.376 0 0 0 -.41 .397l-4.893 7.26c-1.695 2.838 -1.035 6.441 1.567 8.546z" /><path d="M5 14h14" /></svg>`,
    },
    {
        name: "cs-opacity",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-droplet" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7.502 19.423c2.602 2.105 6.395 2.105 8.996 0c2.602 -2.105 3.262 -5.708 1.566 -8.546l-4.89 -7.26c-.42 -.625 -1.287 -.803 -1.936 -.397a1.376 1.376 0 0 0 -.41 .397l-4.893 7.26c-1.695 2.838 -1.035 6.441 1.567 8.546z" /></svg>`,
    },
    {
        name: "cs-border-corner-pill",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-border-corner-pill" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 20v-5c0 -6.075 4.925 -11 11 -11h5" /></svg>`,
    },
    {
        name: "cs-line-style",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-border-style-2" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 18v.01" /><path d="M8 18v.01" /><path d="M12 18v.01" /><path d="M16 18v.01" /><path d="M20 18v.01" /><path d="M18 12h2" /><path d="M11 12h2" /><path d="M4 12h2" /><path d="M4 6h16" /></svg>`,
    },
    {
        name: "cs-line-dashed",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-line-dashed" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12h2" /><path d="M17 12h2" /><path d="M11 12h2" /></svg>`,
    },
    {
        name: "cs-line-dotted",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-line-dotted" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 12v.01" /><path d="M8 12v.01" /><path d="M12 12v.01" /><path d="M16 12v.01" /><path d="M20 12v.01" /></svg>`,
    },
    {
        name: "cs-dotted-line",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-separator" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12l0 .01" /><path d="M7 12l10 0" /><path d="M21 12l0 .01" /></svg>`,
    },
    {
        name: "cs-input-check",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-input-check" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M20 13v-4a2 2 0 0 0 -2 -2h-12a2 2 0 0 0 -2 2v5a2 2 0 0 0 2 2h6" /><path d="M15 19l2 2l4 -4" /></svg>`,
    },
    // Custom Icons
    {
        name: "cs-style-border",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 2H8C4.68629 2 2 4.68629 2 8V16C2 19.3137 4.68629 22 8 22H16C19.3137 22 22 19.3137 22 16V8C22 4.68629 19.3137 2 16 2Z" stroke-width="1.5" stroke-dasharray="2 2"></path><path d="M16 5H8C6.34315 5 5 6.34315 5 8V16C5 17.6569 6.34315 19 8 19H16C17.6569 19 19 17.6569 19 16V8C19 6.34315 17.6569 5 16 5Z"></path></svg>`,
    },
    {
        name: "cs-parallelogram-right",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4.887 20h11.868c.893 0 1.664 -.665 1.847 -1.592l2.358 -12c.212 -1.081 -.442 -2.14 -1.462 -2.366a1.784 1.784 0 0 0 -.385 -.042h-11.868c-.893 0 -1.664 .665 -1.847 1.592l-2.358 12c-.212 1.081 .442 2.14 1.462 2.366c.127 .028 .256 .042 .385 .042z" /></svg>`,
    },
    {
        name: "cs-parallelogram-left",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M 19.113,20 H 7.245 C 6.352,20 5.581,19.335 5.398,18.408 L 3.04,6.408 C 2.828,5.327 3.482,4.268 4.502,4.042 A 1.784,1.784 0 0 1 4.887,4 h 11.868 c 0.893,0 1.664,0.665 1.847,1.592 l 2.358,12 c 0.212,1.081 -0.442,2.14 -1.462,2.366 C 19.371,19.986 19.242,20 19.113,20 Z" /></svg>`,
    },
    {
        name: "cs-elbow",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 17l6 -6l4 4l8 -8" /></svg>`,
    },
    {
        name: "cs-badge-cc",
        svgContent: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 15V9C1 5.68629 3.68629 3 7 3H17C20.3137 3 23 5.68629 23 9V15C23 18.3137 20.3137 21 17 21H7C3.68629 21 1 18.3137 1 15Z"></path><path d="M10.5 10L10.3284 9.82843C9.79799 9.29799 9.07857 9 8.32843 9V9C6.76633 9 5.5 10.2663 5.5 11.8284V12.1716C5.5 13.7337 6.76633 15 8.32843 15V15C9.07857 15 9.79799 14.702 10.3284 14.1716L10.5 14"></path><path d="M18.5 10L18.3284 9.82843C17.798 9.29799 17.0786 9 16.3284 9V9C14.7663 9 13.5 10.2663 13.5 11.8284V12.1716C13.5 13.7337 14.7663 15 16.3284 15V15C17.0786 15 17.798 14.702 18.3284 14.1716L18.5 14"></path></svg>`,
    },
    //{name: "xxx", svgContent: `yyy`},
];
