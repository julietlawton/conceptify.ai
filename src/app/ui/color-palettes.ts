import { ColorPalette } from "@/app/lib/types";

export const ColorPalettes: ColorPalette[] = [
    { 
        id: "balloons", 
        name: "Balloons", 
        colors: [
            " #378d00",
            " #74b600",
            " #df5734",
            " #9c0096",
            " #ff7f00",
            " #eccd1d",
            " #20b2ad",
            " #e37bd0",
            " #129edf",
            " #1912df",
        ],
        nodeHighlight: " #f6ff00",
        linkHighlight: " #FFA500",
        textColor: "white"
    },
    { 
        id: "viridis", 
        name: "Viridis", 
        colors: [
            " #fde725",
            " #b5de2b",
            " #6ece58",
            " #35b779",
            " #1f9e89",
            " #26828e",
            " #31688e",
            " #3e4989",
            " #482878",
            " #440154",
        ],
        nodeHighlight: " #f6ff00",
        linkHighlight: " #FFA500",
        textColor: "white"
    },
    { 
        id: "pastel", 
        name: "Pastels", 
        colors: [
            " #fbf8cc",
            " #fde4cf",
            " #ffcfd2",
            " #f1c0e8",
            " #cfbaf0",
            " #a3c4f3",
            " #90dbf4",
            " #8eecf5",
            " #98f5e1",
            " #b9fbc0"
        ],
        nodeHighlight: " #f6ff00",
        linkHighlight: " #FFA500",
        textColor: "black"
    },
    { 
        id: "synthwave", 
        name: "Synthwave", 
        colors: [
            " #f72585",
            " #b5179e",
            " #7209b7",
            " #560bad",
            " #480ca8",
            " #3a0ca3",
            " #3f37c9",
            " #4361ee",
            " #4895ef",
            " #4cc9f0"
        ],
        nodeHighlight: " #f6ff00",
        linkHighlight: " #FFA500",
        textColor: "white"
    },
    { 
        id: "neon", 
        name: "Neon", 
        colors: [
            " #deff0a",
            " #a1ff0a",
            " #0aff99",
            " #0aefff",
            " #147df5",
            " #580aff",
            " #be0aff",
            " #e600ff",
            " #ff13f0",
            " #ff5c00",
        ],
        nodeHighlight: " #f6ff00",
        linkHighlight: " #FFA500",
        textColor: "black"
    },
    { 
        id: "plasma", 
        name: "Plasma", 
        colors: [
            " #fcce25",
            " #fca636",
            " #f2844b",
            " #e16462",
            " #cc4778",
            " #b12a90",
            " #8f0da4",
            " #6a00a8",
            " #41049d",
            " #0d0887"
        ],
        nodeHighlight: " #f6ff00",
        linkHighlight: " #FFA500",
        textColor: "white"
    },
];

export const colorPaletteById: { [id: string]: ColorPalette } = Object.fromEntries(
    ColorPalettes.map(palette => [palette.id, palette])
);