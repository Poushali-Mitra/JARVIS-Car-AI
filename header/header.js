// header.js
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const body = document.body;

// Function to apply the theme based on localStorage
function applyTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const icon = themeToggleBtn ? themeToggleBtn.querySelector('i') : null;

    if (savedTheme === 'light') {
        body.setAttribute('data-theme', 'light');
        if (icon) icon.className = 'fas fa-sun';
    } else {
        body.removeAttribute('data-theme');
        if (icon) icon.className = 'fas fa-moon';
    }
}

// Set the initial theme when the script loads
applyTheme();

// Add click listener for the toggle button
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = body.getAttribute('data-theme');
        if (currentTheme === 'light') {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
        applyTheme(); 
    });
}


// --- Navigation Management ---
const path = window.location.pathname;
const currentPage = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

const navItems = document.querySelectorAll('.nav-item');

navItems.forEach(item => {
    // Check if the item is a link (<a> tag) before proceeding
    if (item.tagName === 'A') {
        const href = item.getAttribute('href');
        if (href === currentPage) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    }
});


// --- Mobile Menu Toggle ---
const menuToggleBtn = document.querySelector('.menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
const navbar = document.querySelector('.navbar'); 

if (menuToggleBtn && mobileMenu && navbar) {
    menuToggleBtn.addEventListener('click', (event) => {
        event.stopPropagation(); 
        mobileMenu.classList.toggle('open');
        // Toggle the icon between bars and times (X)
        const toggleIcon = menuToggleBtn.querySelector('i');
        if (mobileMenu.classList.contains('open')) {
            toggleIcon.classList.remove('fa-bars');
            toggleIcon.classList.add('fa-times');
            // Close menu if a nav item is clicked (for single-page navigation)
            mobileMenu.querySelectorAll('.nav-item').forEach(item => {
                // Remove existing listeners to prevent duplicates
                const oldClickListener = item._mobileClickListener;
                if (oldClickListener) {
                    item.removeEventListener('click', oldClickListener);
                }

                // Add new listener
                const newClickListener = () => {
                    mobileMenu.classList.remove('open');
                    toggleIcon.classList.remove('fa-times');
                    toggleIcon.classList.add('fa-bars');
                };
                item.addEventListener('click', newClickListener);
                item._mobileClickListener = newClickListener; 
            });
        } else {
            toggleIcon.classList.remove('fa-times');
            toggleIcon.classList.add('fa-bars');
        }
    });

    // Close menu when clicking outside the navbar area
    document.addEventListener('click', (event) => {
        if (!navbar.contains(event.target) && mobileMenu.classList.contains('open')) {
            mobileMenu.classList.remove('open');
            const toggleIcon = menuToggleBtn.querySelector('i');
            toggleIcon.classList.remove('fa-times');
            toggleIcon.classList.add('fa-bars');
        }
    });
}
