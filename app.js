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
    
    // Initialize the application
    initializeApp();
    checkAuthStatus();
    
    console.log('✅ App initialization complete');
});

function initializeApp() {
    initializeModal();
    initializeNavigation();
    initializeFormHandling();
    initializeCTAButtons();
    initializeAnimations();
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
        document.getElementById('loginModal').querySelector('.modal__title').textContent = 'Login to Your Account';
    }

    function showSignupForm() {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        document.getElementById('loginModal').querySelector('.modal__title').textContent = 'Create Your Account';
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

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !loginModal.classList.contains('hidden')) {
            closeModalHandler();
        }
    });
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
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Header scroll effect
    const header = document.querySelector('.header');
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        
        if (currentScrollY > 100) {
            header.style.background = 'rgba(10, 10, 10, 0.98)';
            header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.3)';
        } else {
            header.style.background = 'rgba(10, 10, 10, 0.95)';
            header.style.boxShadow = 'none';
        }
        
        lastScrollY = currentScrollY;
    });
}

// Form handling
function initializeFormHandling() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

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

// Authentication functions
async function checkAuthStatus() {
    const token = localStorage.getItem('audioHub_token');
    const userData = localStorage.getItem('audioHub_user');
    
    if (token && userData) {
        try {
            // Verify token with server
            const response = await fetch(`${AUTH_API_BASE}/api/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                authToken = token;
                currentUser = data.user;
                updateUIForLoggedInUser(data.user);
            } else {
                // Token invalid, clear storage
                localStorage.removeItem('audioHub_token');
                localStorage.removeItem('audioHub_user');
            }
        } catch (error) {
            console.error('Auth check error:', error);
            localStorage.removeItem('audioHub_token');
            localStorage.removeItem('audioHub_user');
        }
    }
}

function updateUIForLoggedInUser(user) {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    
    // Replace login/signup buttons with user menu
    const userMenu = document.createElement('div');
    userMenu.className = 'user-menu';
    userMenu.innerHTML = `
        <button class="btn btn--outline btn--sm" id="userMenuBtn">
            ${user.name} ${user.subscription === 'premium' ? '⭐' : ''}
        </button>
        <div class="user-dropdown hidden" id="userDropdown">
            <div class="user-dropdown__header">
                <div class="user-dropdown__name">${user.name}</div>
                <div class="user-dropdown__subscription">${user.subscription === 'premium' ? 'Premium' : 'Free'} Plan</div>
            </div>
            <a href="#" class="user-dropdown__item">Dashboard</a>
            <a href="#" class="user-dropdown__item">Settings</a>
            ${user.subscription === 'free' ? '<a href="#" class="user-dropdown__item" id="upgradeBtn">Upgrade to Premium</a>' : ''}
            <a href="#" class="user-dropdown__item" id="logoutBtn">Logout</a>
        </div>
    `;
    
    const authContainer = document.querySelector('.header__auth');
    authContainer.innerHTML = '';
    authContainer.appendChild(userMenu);
    
    // Add event listeners
    document.getElementById('userMenuBtn').addEventListener('click', (e) => {
        e.preventDefault();
        const dropdown = document.getElementById('userDropdown');
        dropdown.classList.toggle('hidden');
    });
    
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
    
    if (user.subscription === 'free') {
        const upgradeBtn = document.getElementById('upgradeBtn');
        if (upgradeBtn) {
            upgradeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showUpgradeModal();
            });
        }
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!userMenu.contains(e.target)) {
            document.getElementById('userDropdown').classList.add('hidden');
        }
    });
}

function logout() {
    // Clear authentication data
    localStorage.removeItem('audioHub_token');
    localStorage.removeItem('audioHub_user');
    authToken = null;
    currentUser = null;
    
    showNotification('Logged out successfully', 'info');
    
    // Restore original login/signup buttons
    const authContainer = document.querySelector('.header__auth');
    authContainer.innerHTML = `
        <button class="btn btn--outline btn--sm" id="loginBtn">Login</button>
        <button class="btn btn--primary btn--sm" id="signupBtn">Sign Up</button>
    `;
    
    // Re-initialize modal functionality
    initializeModal();
}

function showUpgradeModal() {
    // Create upgrade modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal__backdrop" id="upgradeModalBackdrop"></div>
        <div class="modal__content">
            <div class="modal__header">
                <h3 class="modal__title">Upgrade to Premium</h3>
                <button class="modal__close" id="closeUpgradeModal">&times;</button>
            </div>
            <div class="modal__body">
                <div class="upgrade-content">
                    <div class="upgrade-benefits">
                        <h4>Premium Benefits:</h4>
                        <ul>
                            <li>✅ Unlimited downloads in AudioCleaner Pro</li>
                            <li>✅ Advanced audio processing features</li>
                            <li>✅ Priority support</li>
                            <li>✅ Access to SamplX premium features</li>
                            <li>✅ No ads or limitations</li>
                        </ul>
                    </div>
                    <div class="upgrade-pricing">
                        <div class="pricing-option">
                            <h5>Monthly</h5>
                            <div class="price">$9.99<span>/month</span></div>
                            <button class="btn btn--primary btn--full-width" onclick="initiateUpgrade('monthly')">Upgrade Now</button>
                        </div>
                        <div class="pricing-option">
                            <h5>Yearly</h5>
                            <div class="price">$79.99<span>/year</span></div>
                            <div class="savings">Save 33%!</div>
                            <button class="btn btn--primary btn--full-width" onclick="initiateUpgrade('yearly')">Upgrade Now</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Event listeners
    document.getElementById('closeUpgradeModal').addEventListener('click', () => {
        document.body.removeChild(modal);
        document.body.style.overflow = 'auto';
    });
    
    document.getElementById('upgradeModalBackdrop').addEventListener('click', () => {
        document.body.removeChild(modal);
        document.body.style.overflow = 'auto';
    });
}

async function initiateUpgrade(plan) {
    if (!currentUser) {
        showNotification('Please log in to upgrade', 'error');
        return;
    }
    
    showNotification('Redirecting to checkout...', 'info');
    
    // Here you would integrate with Stripe
    // For now, we'll simulate the upgrade
    setTimeout(() => {
        showNotification('Upgrade successful! Welcome to Premium!', 'success');
        currentUser.subscription = 'premium';
        updateUIForLoggedInUser(currentUser);
        
        // Close modal
        const modal = document.querySelector('.modal');
        if (modal) {
            document.body.removeChild(modal);
            document.body.style.overflow = 'auto';
        }
    }, 2000);
}

// CTA button handlers
function initializeCTAButtons() {
    // AudioCleaner Pro buttons
    const audioCleanerBtn = document.getElementById('audioCleanerBtn');
    if (audioCleanerBtn) {
        audioCleanerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🎵 AudioCleaner Pro button clicked');
            handleAppLaunch('AudioCleaner Pro');
        });
    }
    
    // SamplX buttons
    const samplxBtn = document.getElementById('samplxBtn');
    if (samplxBtn) {
        samplxBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🎛️ SamplX button clicked');
            handleAppLaunch('SamplX');
        });
    }
    
    // Also handle buttons without IDs
    document.addEventListener('click', (e) => {
        if (e.target.textContent.includes('AudioCleaner') && !e.target.id) {
            e.preventDefault();
            console.log('🎵 AudioCleaner Pro button (no ID) clicked');
            handleAppLaunch('AudioCleaner Pro');
        }
        
        if (e.target.textContent.includes('SamplX') && !e.target.id) {
            e.preventDefault();
            console.log('🎛️ SamplX button (no ID) clicked');
            handleAppLaunch('SamplX');
        }
    });
}

function handleAppLaunch(appName) {
    if (!currentUser) {
        showNotification('Please log in to access our apps', 'warning');
        // Open login modal
        document.getElementById('loginBtn').click();
        return;
    }
    
    showNotification(`Launching ${appName}...`, 'info');
    
    setTimeout(() => {
        // Redirect to the actual app with authentication token
        let appUrl;
        if (appName.includes('AudioCleaner')) {
            // Handle both local and GitHub Pages paths
            const basePath = window.location.hostname === 'carlosmestre1997.github.io' 
                ? '/audioprohub' 
                : '';
            appUrl = window.location.origin + basePath + '/audiocleaner-pro.html';
        } else if (appName.includes('SamplX')) {
            appUrl = 'https://carlosmestre1997.github.io/audioprohub/samplx/';
        } else {
            showNotification('App not found', 'error');
            return;
        }
        
        // Pass authentication token via URL parameter
        const authUrl = `${appUrl}?token=${encodeURIComponent(authToken)}`;
        
        // Open in new tab
        window.open(authUrl, '_blank');
        showNotification(`${appName} opened in new tab`, 'success');
    }, 1000);
}

// Animation and visual effects
function initializeAnimations() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe sections for animations
    const sections = document.querySelectorAll('.apps, .features, .pricing');
    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });

    // Card hover effects
    const cards = document.querySelectorAll('.app-card, .feature-card, .pricing-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Sound wave animation enhancement
    const waveBars = document.querySelectorAll('.wave-bar');
    let animationInterval;

    function enhanceWaveAnimation() {
        let index = 0;
        animationInterval = setInterval(() => {
            waveBars.forEach((bar, i) => {
                const height = Math.random() * 80 + 20;
                const delay = Math.abs(i - index) * 0.1;
                setTimeout(() => {
                    bar.style.height = height + '%';
                }, delay * 100);
            });
            index = (index + 1) % waveBars.length;
        }, 500);
    }

    // Start enhanced animation when hero is visible
    const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                enhanceWaveAnimation();
            } else {
                clearInterval(animationInterval);
            }
        });
    }, { threshold: 0.5 });

    const hero = document.querySelector('.hero');
    if (hero) {
        heroObserver.observe(hero);
    }
}

// Utility functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.innerHTML = `
        <div class="notification__content">
            <span class="notification__message">${message}</span>
            <button class="notification__close">&times;</button>
        </div>
    `;

    // Add notification styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 3000;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 400px;
        font-size: 14px;
    `;

    notification.querySelector('.notification__content').style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    `;

    notification.querySelector('.notification__close').style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        opacity: 0.8;
        transition: opacity 0.2s ease;
    `;

    // Add to DOM
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Close functionality
    const closeBtn = notification.querySelector('.notification__close');
    closeBtn.addEventListener('click', () => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    });

    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.opacity = '1';
        closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    });

    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.opacity = '0.8';
        closeBtn.style.background = 'none';
    });

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function getNotificationColor(type) {
    const colors = {
        success: '#00b4d8',
        error: '#ff5459',
        warning: '#e6813a',
        info: '#626c71'
    };
    return colors[type] || colors.info;
}

// Smooth scroll polyfill for older browsers
if (!('scrollBehavior' in document.documentElement.style)) {
    const smoothScrollPolyfill = function(target, duration = 500) {
        const start = window.pageYOffset;
        const distance = target - start;
        let startTime = null;

        function animation(currentTime) {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const run = easeInOutQuad(timeElapsed, start, distance, duration);
            window.scrollTo(0, run);
            if (timeElapsed < duration) requestAnimationFrame(animation);
        }

        function easeInOutQuad(t, b, c, d) {
            t /= d / 2;
            if (t < 1) return c / 2 * t * t + b;
            t--;
            return -c / 2 * (t * (t - 2) - 1) + b;
        }

        requestAnimationFrame(animation);
    };

    // Override the smooth scroll behavior
    window.smoothScrollTo = smoothScrollPolyfill;
}

// Performance optimization: Debounce scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply debounced scroll handler
window.addEventListener('scroll', debounce(() => {
    // Any additional scroll-based functionality can go here
}, 10));