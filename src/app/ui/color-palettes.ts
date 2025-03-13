import { ColorPalette } from "@/app/lib/types";

export const ColorPalettes: ColorPalette[] = [
    {
        id: "balloons",
        name: "Balloons",
        colors: [
            " #378d00",
            " #86cd0a",
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
    {
        id: "viridis",
        name: "Viridis",
        colors: [
            " #ead51d",
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
        id: "seafoam",
        name: "Sea Foam",
        colors: ['#008000',
            ' #005d17',
            ' #003a2e',
            ' #001746',
            ' #00518b',
            ' #0074a2',
            ' #1489b1',
            ' #2e97b9',
            ' #74b9d1',
            ' #89c4d8',
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
        id: "popart",
        name: "Pop Art",
        colors: [
            " #ffd926",
            " #ffb24d",
            " #ff8b74",
            " #ff649b",
            " #e63cc3",
            " #a915ea",
            " #6b00ff",
            " #2e00ff",
            " #00009d",
            " #000000"
        ],
        nodeHighlight: " #f6ff00",
        linkHighlight: " #FFA500",
        textColor: "white"
    },
    {
        id: "electric",
        name: "Electric",
        colors: [
            '#3bc4ff',
            '#4eb1ff',
            '#629dff',
            '#7689ff',
            '#8976ff',
            '#9d62ff',
            '#b14eff',
            '#c43bff',
            '#d827ff',
            '#eb14ff',
        ],
        nodeHighlight: " #f6ff00",
        linkHighlight: " #FFA500",
        textColor: "white"
    },
    {
        id: "teahouse",
        name: "Tea House",
        colors: [
            '#adc3cd',
            '#759ac1',
            '#6068b6',
            '#5b3196',
            '#3e1150',
            '#41123d',
            '#7b2150',
            '#a94950',
            '#c48065',
            '#d2b7a5',
        ],
        nodeHighlight: " #f6ff00",
        linkHighlight: " #FFA500",
        textColor: "white"
    },
    {
        id: "blues",
        name: "Blues",
        colors: [
            '#b4d3e9',
            '#9ac8e0',
            '#7ab6d9',
            '#5fa6d1',
            '#4594c7',
            '#3080bd',
            '#1d6cb1',
            '#0e58a2',
            '#084488',
            '#08306b'
        ],
        nodeHighlight: " #f6ff00",
        linkHighlight: " #FFA500",
        textColor: "white"
    },
];

export const colorPaletteById: { [id: string]: ColorPalette } = Object.fromEntries(
    ColorPalettes.map(palette => [palette.id, palette])
);