import { AuthService } from './services/AuthService';
import { WebSocketService } from './services/WebSocketService';

// ...existing code...

async function autoLoginAndConnect() {
    const email = 'ratnaabinayan@gmail.com';
    const password = '123456789'; // secretKey from dashboard
    const authService = new AuthService();
    const wsService = new WebSocketService();

    try {
        const jwt = await authService.login(email, password);
        wsService.connect(jwt);
    } catch (err) {
        console.error('Auto-login failed:', err);
    }
}

autoLoginAndConnect();

// ...existing code...