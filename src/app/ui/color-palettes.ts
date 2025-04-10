import { ColorPalette } from "@/app/lib/types";

// Color palette options for the graph
export const ColorPalettes: ColorPalette[] = [
    {
        id: "plasma",
        name: "Plasma",
        colors: [
            " #f3c615",
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
    {
        id: "viridis",
        name: "Viridis",
        colors: [
            " #bddf26",
            " #7ad151",
            " #44bf70",
            " #22a884",
            " #21918c",
            " #2a788e",
            " #355f8d",
            " #414487",
            " #482475",
            " #440154",
        ],
        nodeHighlight: " #f6ff00",
        linkHighlight: " #FFA500",
        textColor: "white"
    },
    {
        id: "balloons",
        name: "Balloons",
        colors: [
            " #ff7f00",
            " #ffd60b",
            " #d22657",
            " #9c0096",
            " #5833C8",
            " #86cd0a",
            " #059953",
            " #20b2ad",
            " #129edf",
            " #1912df",
        ],
        nodeHighlight: " #f6ff00",
        linkHighlight: " #FFA500",
        textColor: "white"
    },
    {
        id: "macaron",
        name: "Macaron",
        colors: [
            " #4F6D7A",
            " #DE9151",
            " #B892FF",
            " #519E8A",
            " #F76C5E",
            " #FFD166",
            " #6A4C93",
            " #CC79A7",
            " #56B4E9",
            " #0072B2"
        ],
        nodeHighlight: " #f6ff00",
        linkHighlight: " #FFA500",
        textColor: "white"
    },
    {
        id: "papyrus",
        name: "Papyrus",
        colors: [
            " #e8e8e4",
            " #e9edc9",
            " #ccd5ae",
            " #d8e2dc",
            " #fefae0",
            " #faedcd",
            " #ffe5d9",
            " #fae1dd",
            " #fcd5ce",
            " #ffd7ba"
        ],
        nodeHighlight: " #f6ff00",
        linkHighlight: " #FFA500",
        textColor: "#555"
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
        textColor: "#555"
    },
    {
        id: "aster",
        name: "Aster",
        colors: [
            " #2cc94e",
            " #18b986",
            " #2ba4a6",
            " #6A8FE5",
            " #8271ca",
            " #9e5fd5",
            " #d74ac7",
            " #d131a7",
            " #a825ba",
            " #f93c94"
        ],
        nodeHighlight: " #f6ff00",
        linkHighlight: " #FFA500",
        textColor: "white"
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
        id: "electric",
        name: "Electric",
        colors: [
            " #3bc4ff",
            " #4eb1ff",
            " #629dff",
            " #7689ff",
            " #8976ff",
            " #9d62ff",
            " #b14eff",
            " #c43bff",
            " #d827ff",
            " #eb14ff"
        ],
        nodeHighlight: " #f6ff00",
        linkHighlight: " #FFA500",
        textColor: "white"
    },
    {
        id: "teahouse",
        name: "Tea House",
        colors: [
            " #adc3cd",
            " #759ac1",
            " #6068b6",
            " #5b3196",
            " #3e1150",
            " #41123d",
            " #7b2150",
            " #a94950",
            " #c48065",
            " #d2b7a5"
        ],
        nodeHighlight: " #f6ff00",
        linkHighlight: " #FFA500",
        textColor: "white"
    },
    {
        id: "ocean",
        name: "Ocean",
        colors: [
            " #b4d3e9",
            " #9ac8e0",
            " #7ab6d9",
            " #5fa6d1",
            " #4594c7",
            " #3080bd",
            " #1d6cb1",
            " #0e58a2",
            " #084488",
            " #08306b"
        ],
        nodeHighlight: " #f6ff00",
        linkHighlight: " #FFA500",
        textColor: "white"
    },
    {
        id: "ember",
        name: "Ember",
        colors: [
            " #ff1744",
            " #ff3d00",
            " #ff6d00",
            " #ff4081",
            " #f50057",
            " #6f003f",
            " #580303",
            " #310638",
            " #3a012e",
            " #000000",
        ],
        nodeHighlight: " #f6ff00",
        linkHighlight: " #FFA500",
        textColor: "white"
    },
];

// Utility to look up color palette by string ID, with first palette used as the fallback
export const colorPaletteById: { [id: string]: ColorPalette } = {
    ...Object.fromEntries(ColorPalettes.map(palette => [palette.id, palette])),
    defaultPalette: ColorPalettes[0],
};