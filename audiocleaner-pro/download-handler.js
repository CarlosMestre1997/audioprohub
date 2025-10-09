// Download tracking and handling
// Render.com backend URL
const API_BASE = 'https://audiocleaner.onrender.com';

// Audio Hub integration
const AUTH_HUB_BASE = window.location.hostname === 'audiocleaner.site' || window.location.hostname === 'carlosmestre1997.github.io'
    ? 'https://audio-hub-auth.onrender.com' 
    : 'http://localhost:3001';

// Check for authentication token from Audio Hub
function checkAuthToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
        // Store token for future requests
        localStorage.setItem('audioHub_token', token);
        // Remove token from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        // Verify token with auth server
        verifyAuthToken(token);
    } else {
        // Check for existing token
        const existingToken = localStorage.getItem('audioHub_token');
        if (existingToken) {
            verifyAuthToken(existingToken);
        }
    }
}

async function verifyAuthToken(token) {
    try {
        const response = await fetch(`${AUTH_HUB_BASE}/api/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Authenticated user:', data.user);
            
            // Update UI to show authenticated state
            updateUIForAuthenticatedUser(data.user);
            
            // Check subscription status
            if (data.user.subscription === 'premium') {
                window.isPremiumUser = true;
                console.log('Premium user detected - unlimited downloads');
            }
        } else {
            // Invalid token, clear it
            localStorage.removeItem('audioHub_token');
        }
    } catch (error) {
        console.error('Auth verification error:', error);
    }
}

function updateUIForAuthenticatedUser(user) {
    // Add authenticated user indicator
    const existingIndicator = document.getElementById('auth-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    const authIndicator = document.createElement('div');
    authIndicator.id = 'auth-indicator';
    authIndicator.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: rgba(0, 180, 216, 0.9); color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; z-index: 1000; backdrop-filter: blur(10px);">
            👤 ${user.name} ${user.subscription === 'premium' ? '⭐ Premium' : '🆓 Free'}
        </div>
    `;
    document.body.appendChild(authIndicator);
    
    // Add logout button
    const logoutBtn = document.createElement('button');
    logoutBtn.innerHTML = 'Logout';
    logoutBtn.style.cssText = `
        position: fixed; top: 20px; right: 140px; background: rgba(255, 84, 89, 0.9); 
        color: white; padding: 8px 16px; border: none; border-radius: 20px; 
        font-size: 12px; cursor: pointer; z-index: 1000; backdrop-filter: blur(10px);
    `;
    logoutBtn.onclick = () => {
        localStorage.removeItem('audioHub_token');
        window.location.reload();
    };
    document.body.appendChild(logoutBtn);
}

// Cross-domain compatible user ID management
function getUserId() {
    let userId = localStorage.getItem('audiocleaner_userId');
    if (!userId) {
        // Create a more unique ID using browser fingerprint + timestamp
        const fingerprint = navigator.userAgent + screen.width + screen.height + new Date().getTimezoneOffset();
        userId = 'user_' + btoa(fingerprint).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16) + '_' + Date.now();
        localStorage.setItem('audiocleaner_userId', userId);
        console.log('Generated new user ID:', userId);
    } else {
        console.log('Using existing user ID:', userId);
    }
    return userId;
}

// Debug function to test API connectivity
window.testAPI = async function() {
    const userId = getUserId();
    console.log('Testing API with userId:', userId);
    
    try {
        const response = await fetch(`${API_BASE}/api/debug-user`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: userId })
        });
        
        const data = await response.json();
        console.log('Debug API response:', data);
        return data;
    } catch (error) {
        console.error('Debug API error:', error);
        return { error: error.message };
    }
};

window.downloadTracker = {
    async checkDownloadPermission() {
        try {
            console.log('Checking download permission...');
            const response = await fetch(`${API_BASE}/api/check-download`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: getUserId() })
            });
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Download permission check response:', data);
            return data;
        } catch (error) {
            console.error('Error checking download permission:', error);
            return { canDownload: false, error: error.message };
        }
    },

    async trackDownload() {
        try {
            // Check if user is premium from Audio Hub
            if (window.isPremiumUser) {
                console.log('Premium user - unlimited downloads');
                this.updateUsageStatus({ 
                    success: true, 
                    remainingDownloads: 'unlimited',
                    isPro: true 
                });
                return { success: true, remainingDownloads: 'unlimited', isPro: true };
            }
            
            const userId = getUserId();
            console.log('Sending track download request with userId:', userId);
            
            const response = await fetch(`${API_BASE}/api/track-download`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: userId })
            });
            const data = await response.json();
            console.log('Track download response:', data);
            console.log('Response status:', response.status);
            console.log('Data success:', data.success);
            console.log('Data remainingDownloads:', data.remainingDownloads);
            
            // Show subscription modal if download limit is reached or showUpgradeModal is true
            if ((!data.success && data.message && data.message.includes('limit reached')) || data.showUpgradeModal) {
                this.showSubscriptionPrompt();
            }
            
            // Update usage status display
            this.updateUsageStatus(data);
            
            return data;
        } catch (error) {
            console.error('Error tracking download:', error);
            return { success: false, error: error.message };
        }
    },

    updateUsageStatus(data) {
        const usageStatus = document.getElementById('usageStatus');
        if (usageStatus) {
			if (data.isPro || data.remainingDownloads === 'unlimited') {
				usageStatus.innerHTML = 'Downloads: unlimited';
				usageStatus.style.color = '#00ff88';
                
				return;
			}
            if (data.remainingDownloads !== undefined) {
                usageStatus.innerHTML = `Downloads remaining: ${data.remainingDownloads}`;
                usageStatus.style.color = data.remainingDownloads > 0 ? '#00ff88' : '#ff4444';
                // Show subscription modal if no downloads remaining
                if (data.remainingDownloads <= 0) {
                    this.showSubscriptionPrompt();
                }
            } else {
                usageStatus.innerHTML = 'Error checking downloads';
                usageStatus.style.color = '#ff4444';
            }
        }
    },

    showSubscriptionPrompt() {
		if (document.getElementById('subscriptionModal')) return;
            const backdrop = document.createElement('div');
            backdrop.id = 'subscriptionModal';
            backdrop.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 999;
                display: flex;
                justify-content: center;
                align-items: center;
                backdrop-filter: blur(5px);
            `;
		const modal = document.createElement('div');
		modal.style.cssText = `
			background: rgba(0, 0, 0, 0.95);
			border: 1px solid #00ff88;
			padding: 24px;
			border-radius: 8px;
			max-width: 720px;
			width: 90%;
			box-shadow: 0 0 30px rgba(0,255,136,0.2);
			color: #00ff88;
                font-family: 'Share Tech Mono', monospace;
		`;
		modal.innerHTML = `
			<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
				<h2 style="margin:0;color:#66ffaa;">Subscribe for Unlimited Downloads</h2>
				<button id="closeSubModal" style="background:transparent;border:1px solid #00ff88;color:#00ff88;padding:6px 10px;cursor:pointer;">✕</button>
			</div>
			<p style="margin:0 0 16px;color:#aaffcc;">Choose a plan that fits your needs.</p>
			<div style="display:grid;grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));gap:12px;">
				<div id="plan-free" style="border:1px solid #00ff88;padding:12px;border-radius:6px;background:rgba(0,255,136,0.05);">
					<div style="font-weight:bold;margin-bottom:8px;">Free</div>
					<div style="color:#aaffcc;font-size:12px;margin-bottom:12px;">3 downloads in 24 hours • Try it out</div>
					<button style="width:100%;background:transparent;border:1px solid #00ff88;color:#00ff88;padding:8px;cursor:pointer;">Continue Free</button>
				</div>
				<div id="plan-monthly" style="border:1px solid #00ff88;padding:12px;border-radius:6px;background:rgba(0,255,136,0.08);">
					<div style="font-weight:bold;margin-bottom:4px;">Monthly</div>
					<div style="color:#00ff88;font-weight:bold;margin-bottom:6px;">$9.99/mo</div>
					<div style="color:#aaffcc;font-size:12px;margin-bottom:12px;">Unlimited downloads • Cancel anytime</div>
					<button style="width:100%;background:#00ff88;border:1px solid #00ff88;color:#000;padding:8px;cursor:pointer;">Subscribe Monthly</button>
				</div>
				<div id="plan-yearly" style="border:1px solid #00ff88;padding:12px;border-radius:6px;background:rgba(0,255,136,0.08);">
					<div style="font-weight:bold;margin-bottom:4px;">Yearly</div>
					<div style="color:#00ff88;font-weight:bold;margin-bottom:6px;">$79.99/yr</div>
					<div style="color:#aaffcc;font-size:12px;margin-bottom:12px;">Unlimited downloads • Best value</div>
					<button style="width:100%;background:#00ff88;border:1px solid #00ff88;color:#000;padding:8px;cursor:pointer;">Subscribe Yearly</button>
				</div>
			</div>
			<div style="margin-top:12px;color:#aaffcc;font-size:12px;">
				Already subscribed on another device? <a href="#" id="restoreLink" style="color:#66ffaa;text-decoration:underline;">Restore with email</a>
			</div>
		`;
		backdrop.appendChild(modal);
		document.body.appendChild(backdrop);
		// Events
		modal.querySelector('#closeSubModal').onclick = () => window.downloadTracker.closeSubscriptionPrompt();
		modal.querySelector('#plan-free button').onclick = () => window.downloadTracker.closeSubscriptionPrompt();
		modal.querySelector('#plan-monthly button').onclick = () => window.downloadTracker.initiateSubscription('monthly');
		modal.querySelector('#plan-yearly button').onclick = () => window.downloadTracker.initiateSubscription('yearly');
		const restoreLink = modal.querySelector('#restoreLink');
		restoreLink.onclick = (e) => {
			e.preventDefault();
			window.downloadTracker.showRestoreByEmail();
		};
	},

	closeSubscriptionPrompt() {
		const existing = document.getElementById('subscriptionModal');
		if (existing) existing.remove();
	},

	async initiateSubscription(plan) {
        try {
			// Map your Stripe test Price IDs here
			const priceMap = {
				monthly: 'price_1SAdUnFZ7vA4ogcaqoy0uJoM',
				yearly: 'price_1SAdVwFZ7vA4ogcayfar2S8Q'
			};
			const priceId = priceMap[plan];
			if (!priceId) throw new Error('Unknown plan');
            const response = await fetch(`${API_BASE}/api/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
					priceId: priceId,
					plan: plan
                })
            });
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Error initiating subscription:', error);
            const errorMessage = document.createElement('div');
            errorMessage.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #ff4444;
                color: white;
                padding: 20px;
                border-radius: 5px;
                font-family: 'Share Tech Mono', monospace;
                z-index: 1001;
                text-align: center;
            `;
            errorMessage.innerHTML = 'Error initiating subscription.<br>Please try again.';
            document.body.appendChild(errorMessage);
            setTimeout(() => errorMessage.remove(), 3000);
        }
    },

	// Restore by email flow
	showRestoreByEmail() {
		const modal = document.getElementById('subscriptionModal');
		if (!modal) return;
		const formWrap = document.createElement('div');
		formWrap.style.cssText = 'margin-top:12px;padding-top:12px;border-top:1px solid #003322;';
		formWrap.innerHTML = `
			<div style="margin-bottom:8px;color:#aaffcc;">Enter the email you used at checkout</div>
			<div style="display:flex;gap:8px;">
				<input id="restoreEmail" type="email" placeholder="you@example.com" style="flex:1;padding:8px;background:#001a14;border:1px solid #00ff88;color:#aaffcc;" />
				<button id="restoreBtn" style="padding:8px 12px;background:#00ff88;border:1px solid #00ff88;color:#000;cursor:pointer;">Restore</button>
			</div>
			<div id="restoreMsg" style="margin-top:8px;font-size:12px;color:#aaffcc;"></div>
		`;
		modal.querySelector('div').appendChild(formWrap);
		const btn = formWrap.querySelector('#restoreBtn');
		const emailInput = formWrap.querySelector('#restoreEmail');
		const msg = formWrap.querySelector('#restoreMsg');
		btn.onclick = async () => {
			msg.textContent = 'Verifying...';
			try {
				const resp = await fetch(`${API_BASE}/api/auth/login-email`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ email: emailInput.value })
				});
				const data = await resp.json();
				if (data.success) {
					msg.textContent = data.isPro ? 'Pro access restored.' : 'Account found, but no active subscription.';
					// Update status based on response
					downloadTracker.updateUsageStatus({ remainingDownloads: data.isPro ? 'unlimited' : 3, isPro: data.isPro });
					if (data.isPro) window.downloadTracker.closeSubscriptionPrompt();
				} else {
					msg.textContent = data.message || 'No subscription found for this email.';
				}
			} catch (e) {
				msg.textContent = 'Error verifying email.';
			}
		};
    }
};

// Initialize usage status div on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check for authentication token from Audio Hub
    checkAuthToken();
    
    // Create usage status div if it doesn't exist
    if (!document.getElementById('usageStatus')) {
        const usageStatus = document.createElement('div');
        usageStatus.id = 'usageStatus';
        usageStatus.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 255, 136, 0.1);
            border: 1px solid #00ff88;
            padding: 10px;
            border-radius: 5px;
            font-family: 'Share Tech Mono', monospace;
            font-size: 0.8rem;
            z-index: 1000;
        `;
        document.body.appendChild(usageStatus);
    }

    // Initialize with default status - will be updated on first download attempt
    downloadTracker.updateUsageStatus({ remainingDownloads: 3, canDownload: true });

	// Handle success redirect: close modal and refresh status
	const params = new URLSearchParams(window.location.search);
	if (params.get('success') === 'subscription_activated') {
		window.downloadTracker.closeSubscriptionPrompt();
		// Show Pro status after successful payment
		downloadTracker.updateUsageStatus({ remainingDownloads: 'unlimited', isPro: true });
		// Clean URL
		params.delete('success');
		history.replaceState({}, '', `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`);
	}
});