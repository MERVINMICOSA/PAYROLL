// ============================================
// SECURE AJAX HELPER
// ============================================

class SecureAjax {
    
    // Make secure fetch request
    static async request(url, options = {}) {
        const defaultOptions = {
            headers: {},
            credentials: 'include'
        };
        
        // Add CSRF token if available
        const csrfToken = window.CSRF?.getToken();
        if (csrfToken && options.method && options.method !== 'GET') {
            defaultOptions.headers['X-CSRF-Token'] = csrfToken;
        }
        
        // Add auth token
        const authToken = localStorage.getItem('token');
        if (authToken) {
            defaultOptions.headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        // Merge options
        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers,
                'Content-Type': 'application/json'
            }
        };
        
        try {
            const response = await fetch(url, finalOptions);
            const data = await response.json();
            
            if (!response.ok) {
                // Handle token expiry
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = 'index.html';
                }
                throw new Error(data.error || 'Request failed');
            }
            
            return data;
        } catch (error) {
            console.error('AJAX Error:', error);
            throw error;
        }
    }
    
    // GET request
    static async get(url, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = queryString ? `${url}?${queryString}` : url;
        return this.request(fullUrl, { method: 'GET' });
    }
    
    // POST request
    static async post(url, data = {}) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    // PUT request
    static async put(url, data = {}) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    // DELETE request
    static async delete(url) {
        return this.request(url, { method: 'DELETE' });
    }
}

window.SecureAjax = SecureAjax;