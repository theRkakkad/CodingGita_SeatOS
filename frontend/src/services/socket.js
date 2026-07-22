import { io } from 'socket.io-client';

let socketURL = import.meta.env.VITE_SOCKET_URL || 
  (import.meta.env.DEV ? 'http://localhost:5000' : 'https://seat-booking-website.onrender.com');

if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && socketURL.includes('localhost')) {
  socketURL = 'https://seat-booking-website.onrender.com';
}

// Initialize the socket client but do not auto-connect
export const socket = io(socketURL, {
  autoConnect: false,
  transports: ['websocket'],
});

// Helper function to connect socket
export const connectSocket = () => {
  if (!socket.connected) {
    const token = localStorage.getItem('token');
    socket.auth = { token };
    socket.connect();
    console.log('Socket connection initiated');
  }
};

// Helper function to disconnect socket
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
    console.log('Socket disconnected');
  }
};
