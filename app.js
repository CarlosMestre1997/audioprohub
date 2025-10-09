// Audio Pro Suite Landing Page JavaScript

// Configuration
const AUTH_API_BASE = window.location.hostname === 'carlosmestre1997.github.io' 
    ? 'https://audio-hub-auth.onrender.com' 
    : 'http://localhost:3001';

// Global state
let currentUser = null;
let authToken = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Audio Hub Landing Page Loading...');
    console.log('🔗 AUTH_API_BASE:', AUTH_API_BASE);
    
    // Check if required elements exist
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const audioCleanerBtn = document.getElementById('audioCleanerBtn');
    const samplxBtn = document.getElementById('samplxBtn');
    
    console.log('🔍 Element check:');
    console.log('  loginBtn:', loginBtn);
    console.log('  signupBtn:', signupBtn);
    console.log('  audioCleanerBtn:', audioCleanerBtn);
    console.log('  samplxBtn:', samplxBtn);
    
    // Initialize the application
    try {
        initializeApp();
        checkAuthStatus();
        console.log('✅ App initialization complete');
    } catch (error) {
        console.error('❌ App initialization failed:', error);
    }
});

function initializeApp() {
    try {
        console.log('🔧 Initializing modal...');
        initializeModal();
        console.log('✅ Modal initialized');
        
        console.log('🔧 Initializing navigation...');
        initializeNavigation();
        console.log('✅ Navigation initialized');
        
        console.log('🔧 Initializing form handling...');
        initializeFormHandling();
        console.log('✅ Form handling initialized');
        
        console.log('🔧 Initializing CTA buttons...');
        initializeCTAButtons();
        console.log('✅ CTA buttons initialized');
        
        console.log('🔧 Initializing animations...');
        initializeAnimations();
        console.log('✅ Animations initialized');
    } catch (error) {
        console.error('❌ Error in initializeApp:', error);
    }
}

// Modal functionality
function initializeModal() {
    const loginModal = document.getElementById('loginModal');
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const closeModal = document.getElementById('closeModal');
    const modalBackdrop = document.getElementById('modalBackdrop');
    const switchToSignup = document.getElementById('switchToSignup');
    const switchToLogin = document.getElementById('switchToLogin');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    console.log('🔍 Modal elements check:');
    console.log('  loginModal:', loginModal);
    console.log('  loginBtn:', loginBtn);
    console.log('  signupBtn:', signupBtn);
    console.log('  closeModal:', closeModal);
    console.log('  modalBackdrop:', modalBackdrop);
    console.log('  switchToSignup:', switchToSignup);
    console.log('  switchToLogin:', switchToLogin);
    console.log('  loginForm:', loginForm);
    console.log('  signupForm:', signupForm);
    
    // Check if all required elements exist
    if (!loginModal || !loginBtn || !signupBtn) {
        console.error('❌ Missing required modal elements!');
        return;
    }

    // Open modal functions
    function openModal(showSignup = false) {
        console.log('📱 Opening modal, showSignup:', showSignup);
        loginModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        if (showSignup) {
            showSignupForm();
        } else {
            showLoginForm();
        }
    }

    function closeModalHandler() {
        loginModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        resetForms();
    }

    function showLoginForm() {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    }

    function showSignupForm() {
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    }

    function resetForms() {
        loginForm.reset();
        signupForm.reset();
    }

    // Event listeners
    loginBtn.addEventListener('click', () => {
        console.log('🔐 Login button clicked');
        openModal(false);
    });
    signupBtn.addEventListener('click', () => {
        console.log('📝 Signup button clicked');
        openModal(true);
    });
    closeModal.addEventListener('click', closeModalHandler);
    modalBackdrop.addEventListener('click', closeModalHandler);
    switchToSignup.addEventListener('click', (e) => {
        e.preventDefault();
        showSignupForm();
    });
    switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });

    // Form submissions
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin();
    });

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSignup();
    });
}

async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Basic validation
    if (!email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    showNotification('Logging in...', 'info');
    
    try {
        console.log('Attempting login to:', `${AUTH_API_BASE}/api/auth/login`);
        const response = await fetch(`${AUTH_API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        console.log('Login response status:', response.status);

        const data = await response.json();

        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            
            // Store token in localStorage
            localStorage.setItem('audioHub_token', authToken);
            localStorage.setItem('audioHub_user', JSON.stringify(currentUser));
            
            showNotification('Login successful! Welcome back!', 'success');
            document.getElementById('loginModal').classList.add('hidden');
            document.body.style.overflow = 'auto';
            
            updateUIForLoggedInUser(currentUser);
        } else {
            showNotification(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed. Please try again.', 'error');
    }
}

async function handleSignup() {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    // Basic validation
    if (!name || !email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('Password must be at least 6 characters long', 'error');
        return;
    }

    showNotification('Creating your account...', 'info');
    
    try {
        console.log('Attempting signup to:', `${AUTH_API_BASE}/api/auth/signup`);
        const response = await fetch(`${AUTH_API_BASE}/api/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        console.log('Signup response status:', response.status);

        const data = await response.json();

        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            
            // Store token in localStorage
            localStorage.setItem('audioHub_token', authToken);
            localStorage.setItem('audioHub_user', JSON.stringify(currentUser));
            
            showNotification('Account created successfully! Welcome to Audio Pro Suite!', 'success');
            document.getElementById('loginModal').classList.add('hidden');
            document.body.style.overflow = 'auto';
            
            updateUIForLoggedInUser(currentUser);
        } else {
            showNotification(data.error || 'Signup failed', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showNotification('Signup failed. Please try again.', 'error');
    }
}

// Navigation functionality
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav__link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Form handling
function initializeFormHandling() {
    // Additional form validation and handling can be added here
}

// CTA buttons functionality
function initializeCTAButtons() {
    const audioCleanerBtn = document.getElementById('audioCleanerBtn');
    const samplxBtn = document.getElementById('samplxBtn');
    
    audioCleanerBtn.addEventListener('click', () => {
        launchApp('audiocleaner');
    });
    
    samplxBtn.addEventListener('click', () => {
        launchApp('samplx');
    });
}

// App launching functionality
function launchApp(appName) {
    console.log('🚀 Launching app:', appName);
    
    // Check if user is logged in
    if (!currentUser) {
        showNotification('Please login to access our apps', 'info');
        document.getElementById('loginBtn').click();
        return;
    }
    
    // Launch the appropriate app
    switch (appName) {
        case 'audiocleaner':
            window.open('https://audiocleaner.site', '_blank');
            break;
        case 'samplx':
            window.open('https://carlosmestre1997.github.io/audioprohub/samplx/', '_blank');
            break;
        default:
            showNotification('App not found', 'error');
    }
}

// Animations
function initializeAnimations() {
    // Add any animation initialization here
    animateWaveBars();
}

function animateWaveBars() {
    const waveBars = document.querySelectorAll('.wave-bar');
    
    waveBars.forEach((bar, index) => {
        bar.style.animationDelay = `${index * 0.1}s`;
    });
}

// Auth status checking
async function checkAuthStatus() {
    const token = localStorage.getItem('audioHub_token');
    const userData = localStorage.getItem('audioHub_user');
    
    if (token && userData) {
        try {
            // Verify token with backend
            const response = await fetch(`${AUTH_API_BASE}/api/auth/verify`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    currentUser = data.user;
                    authToken = token;
                    updateUIForLoggedInUser(currentUser);
                    return;
                }
            }
        } catch (error) {
            console.error('Token verification failed:', error);
        }
        
        // If verification failed, clear stored data
        localStorage.removeItem('audioHub_token');
        localStorage.removeItem('audioHub_user');
    }
}

// UI updates for logged in users
function updateUIForLoggedInUser(user) {
    const headerAuth = document.querySelector('.header__auth');
    
    headerAuth.innerHTML = `
        <div class="user-menu">
            <span class="user-name">Welcome, ${user.name}</span>
            <div class="user-actions">
                <button class="btn btn--outline btn--sm" onclick="logout()">Logout</button>
            </div>
        </div>
    `;
}

// Logout functionality
function logout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('audioHub_token');
    localStorage.removeItem('audioHub_user');
    
    // Reset UI
    const headerAuth = document.querySelector('.header__auth');
    headerAuth.innerHTML = `
        <button class="btn btn--outline btn--sm" id="loginBtn">Login</button>
        <button class="btn btn--primary btn--sm" id="signupBtn">Sign Up</button>
    `;
    
    // Re-initialize modal
    initializeModal();
    
    showNotification('Logged out successfully', 'success');
}

// Utility functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#10b981';
            break;
        case 'error':
            notification.style.backgroundColor = '#ef4444';
            break;
        case 'info':
            notification.style.backgroundColor = '#3b82f6';
            break;
        default:
            notification.style.backgroundColor = '#6b7280';
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}
