export const CognitionIcon = ({ className = "w-6 h-6 text-black" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg"
        viewBox="0 -960 960 960"
        fill="currentColor"
        className={className}
    >
        <path d="M491-339q70 0 119-45t49-109q0-57-36.5-96.5T534-629q-47 0-79.5 30T422-525q0 19 6.5 37.5T451-455q16 14 32 11.5t26-13.5q10-11 11.5-26.5T508-512q-2-2-4-5t-2-7q0-11 9-17.5t23-6.5q20 0 33 16.5t13 39.5q0 31-25.5 52.5T492-418q-47 0-79.5-38T380-549q0-19 4.5-37t13.5-34q8-15 8-31.5T394-680q-12-12-29-11.5T339-677q-20 28-30 60t-10 67q0 88 56 149.5T491-339Zm-251 87q-57-52-88.5-121.5T120-520q0-150 105-255t255-105q125 0 221.5 73.5T827-615l52 205q5 19-7 34.5T840-360h-80v120q0 33-23.5 56.5T680-160h-80v40q0 17-11.5 28.5T560-80q-17 0-28.5-11.5T520-120v-80q0-17 11.5-28.5T560-240h120v-160q0-17 11.5-28.5T720-440h68l-38-155q-23-91-98-148t-172-57q-116 0-198 81t-82 197q0 60 24.5 114t69.5 96l26 24v168q0 17-11.5 28.5T280-80q-17 0-28.5-11.5T240-120v-132Zm254-188Z" />
    </svg>
);

export const ColorGradientIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg"
        height="24px"
        viewBox="0 -960 960 960"
        width="24px"
        fill="#000000">
        <defs>
            <linearGradient id="myGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF00FF" />
                <stop offset="50%" stopColor="#7F00FF" />
                <stop offset="100%" stopColor="#0093FF" />
            </linearGradient>
        </defs>
        <path fill="url(#myGradient)" d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z" />
    </svg>
);

export const GraphIcon = ({ className = "w-6 h-6 text-gray-600" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg"
        viewBox="0 -960 960 960"
        fill="currentColor"
        className={className}
    >
        <path d="M482-80q-50 0-85-35t-35-85q0-38 22-68.5t56-43.5v-256L303-402q8 14 12.5 29.5T320-340q0 50-35 85t-85 35q-50 0-85-35t-35-85q0-50 35-85t85-35q11 0 21 1.5t20 5.5l172-208q-24-17-38.5-42.5T360-760q0-50 35-85t85-35q50 0 85 35t35 85q0 31-14.5 56.5T547-661l172 208q10-4 20-5.5t21-1.5q50 0 85 35t35 85q0 50-35 85t-85 35q-50 0-85-35t-35-85q0-17 4.5-32.5T657-402L520-568v254q36 12 59 43t23 71q0 50-35 85t-85 35Zm0-80q17 0 28.5-11.5T522-200q0-17-11.5-28.5T482-240q-17 0-28.5 11.5T442-200q0 17 11.5 28.5T482-160ZM200-300q17 0 28.5-11.5T240-340q0-17-11.5-28.5T200-380q-17 0-28.5 11.5T160-340q0 17 11.5 28.5T200-300Zm560 0q17 0 28.5-11.5T800-340q0-17-11.5-28.5T760-380q-17 0-28.5 11.5T720-340q0 17 11.5 28.5T760-300ZM480-720q17 0 28.5-11.5T520-760q0-17-11.5-28.5T480-800q-17 0-28.5 11.5T440-760q0 17 11.5 28.5T480-720Z" />
    </svg>
);