document.addEventListener('DOMContentLoaded', function() {
    const flipCardInner = document.querySelector('.flip-card-inner');
    const flipToSignup = document.getElementById('flip-to-signup');
    const flipToSignin = document.getElementById('flip-to-signin');
    const notificationToast = document.querySelector('.notification-toast');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    // Flip card functionality
    if (flipToSignup && flipToSignin && flipCardInner) {
        flipToSignup.addEventListener('click', function(e) {
            e.preventDefault();
            flipCardInner.classList.add('is-flipped');
        });

        flipToSignin.addEventListener('click', function(e) {
            e.preventDefault();
            flipCardInner.classList.remove('is-flipped');
        });
    }

    // Show notification on load
    if (notificationToast) {
        setTimeout(() => {
            notificationToast.classList.add('show');

            // Hide notification after 3 seconds
            setTimeout(() => {
                notificationToast.classList.remove('show');
            }, 3000);
        }, 1000);
    }

    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault(); 
            const button = this.querySelector('.auth-button');

            // Show loading state
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            button.disabled = true;

            // Simulate API call
            setTimeout(() => {
                showToast('Login successful! Redirecting to dashboard...');

                setTimeout(() => {
                    window.location.href = '/html/index.html';
                }, 1500);
            }, 1500);
        });
    }

    // Signup form submission handling
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const button = this.querySelector('.auth-button');
            const buttonContent = button.innerHTML;

            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
            button.disabled = true;

            setTimeout(() => {
                showToast('Account created successfully! Please sign in.');

                setTimeout(() => {
                    if (flipCardInner) flipCardInner.classList.remove('is-flipped');
                    button.innerHTML = buttonContent;
                    button.disabled = false;
                    signupForm.reset();
                }, 2000);
            }, 1500);
        });
    }

    // A helper function for toasts
    function showToast(message) {
        if (notificationToast) {
            notificationToast.querySelector('p').textContent = message;
            notificationToast.classList.add('show');
            setTimeout(() => {
                notificationToast.classList.remove('show');
            }, 3000);
        }
    }

    // --- ENHANCEMENT: Parallax mouse effect for background elements ---
    const background = document.querySelector('.background-container');
    if (background) {
        document.addEventListener('mousemove', function(e) {
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;

            const x = (clientX / innerWidth - 0.5) * 2; 
            const y = (clientY / innerHeight - 0.5) * 2;

            background.style.transform = `translateX(${x * -10}px) translateY(${y * -10}px)`;
        });
    }
});