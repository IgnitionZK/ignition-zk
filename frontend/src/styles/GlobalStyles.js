import { createGlobalStyle } from "styled-components";

/**
 * GlobalStyles component that defines global CSS styles and CSS variables for the application.
 * Uses styled-components' createGlobalStyle to inject global styles.
 *
 * CSS Variables:
 * - Grey scale colors (--color-grey-0 to --color-grey-900)
 * - Red scale colors (--color-red-50 to --color-red-900)
 * - Border radius utilities (--border-radius-tiny to --border-radius-lg)
 *
 * Global styles include:
 * - CSS reset and box-sizing
 * - Base font settings (Poppins)
 * - Responsive font sizing (62.5% base = 10px, making 1rem = 10px for easier calculations)
 * - Default styles for common elements (buttons, links, lists)
 * - Typography and image handling
 *
 * Font Sizing:
 * The base font size is set to 62.5% (10px) of the browser's default 16px,
 * making 1rem = 10px. This simplifies rem calculations:
 * - 1.6rem = 16px
 * - 2rem = 20px
 * - 2.4rem = 24px
 * etc.
 */
const GlobalStyles = createGlobalStyle`

:root {
    
    --color-grey-0: #fff;
    --color-grey-50: #f9fafb;
    --color-grey-100: #f3f4f6;
    --color-grey-200: #e5e7eb;
    --color-grey-300: #d1d5db;
    --color-grey-400: #9ca3af;
    --color-grey-500: #6b7280;
    --color-grey-600: #4b5563;
    --color-grey-700: #374151;
    --color-grey-800: #1f2937;
    --color-grey-900: #111827;

    --color-red-50: #fef2f2;
    --color-red-100: #fee2e2;
    --color-red-200: #fecaca;
    --color-red-300: #fca5a5;
    --color-red-400: #f87171;
    --color-red-500: #ef4444;
    --color-red-600: #dc2626;
    --color-red-700: #b91c1c;
    --color-red-800: #991b1b;
    --color-red-900: #7f1d1d;

    --border-radius-tiny: 3px;
    --border-radius-sm: 5px;
    --border-radius-md: 7px;
    --border-radius-lg: 9px;

    
}

*,
*::before,
*::after {
  box-sizing: border-box;
  padding: 0;
  margin: 0;

}

html {
  font-size: 62.5%;
  background-color: var(--background-color);
}

body {
  font-family: "Poppins", sans-serif;
  color: var(--brand-color);

  transition: color 0.3s, background-color 0.3s;
  min-height: 100vh;
  line-height: 1.5;
  font-size: 1.6rem;


}

button {
  cursor: pointer;
}

a {
  color: inherit;
  text-decoration: none;
}

ul {
  list-style: none;
}

p,
h1,
h2,
h3,
h4,
h5,
h6 {
  overflow-wrap: break-word;
  hyphens: auto;
}

img {
  max-width: 100%;
}



`;

export default GlobalStyles;
