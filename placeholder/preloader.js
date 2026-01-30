// preloader-themed.js

(function() {
    // --- PART 1: THEME MANAGEMENT ---
    // This part runs instantly to prevent a flash of the wrong theme.

    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme); // Save the new theme choice
    };

    const getPreferredTheme = () => {
        // 1. Check for a theme saved in localStorage
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme;
        }

        // 2. If no saved theme, check the user's OS preference
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark' : 'light';
    };

    // Apply the theme as soon as this script loads
    const initialTheme = getPreferredTheme();
    applyTheme(initialTheme);


    // --- PART 2: PRELOADER INJECTION AND HIDING ---
    // This part creates and manages the preloader element.

    const initializePreloader = () => {
        // 1. Create the preloader HTML structure
        const preloaderHTML = `
            <div id="preloader">
                <div class="jarvis-loader">
                    <div class="loader-ring ring-1"></div>
                    <div class="loader-ring ring-2"></div>
                    <div class="loader-core"></div>
                </div>
                <p class="loading-text">INITIALIZING...</p>
            </div>
        `;

        // 2. Insert the preloader HTML at the beginning of the body
        if (document.body) {
             document.body.insertAdjacentHTML('afterbegin', preloaderHTML);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                 document.body.insertAdjacentHTML('afterbegin', preloaderHTML);
            });
        }

        // 3. Add the event listener to hide the preloader after everything loads
        window.addEventListener('load', function() {
            const preloader = document.getElementById('preloader');
            
            setTimeout(() => {
                if (preloader) {
                    preloader.classList.add('preloader-hidden');
                }
            }, 500);
        });
    };

    initializePreloader();

    // --- PART 3: THEME TOGGLE HANDLER ---
    // This new part listens for clicks on your theme toggle button.
    const initializeThemeToggle = () => {
        // IMPORTANT: Ensure you have an element with id="theme-toggle" in your HTML
        const themeToggleButton = document.getElementById('theme-toggle'); 

        if (themeToggleButton) {
            themeToggleButton.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                applyTheme(newTheme);
            });
        }
    };

    // Wait for the page to be interactive before setting up the click listener
    document.addEventListener('DOMContentLoaded', initializeThemeToggle);

})();

