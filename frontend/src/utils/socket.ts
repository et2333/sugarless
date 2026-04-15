/**
 * Socket.IO Client Connection
 * Unified Socket.IO connection management
 */

import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

let socket: Socket | null = null;

export function initSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }

  const authStore = useAuthStore.getState();
  const token = authStore.token;
  const userId = authStore.user?.id || authStore.user?.userId;

  // Use correct backend port - Socket.IO needs direct connection (cannot use HTTP proxy)
  // Check if backend is on port 3000 or 3001
  const apiUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001';
  
  socket = io(apiUrl, {
    transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    auth: {
      token: token || '',
      userId: userId || ''
    },
  });

  socket.on('connect', () => {
    console.log('Socket.IO connected successfully:', socket?.id);
    
    // Join user room to receive reminders
    if (userId) {
      socket?.emit('join-reminders', userId);
      console.log(`Joined reminder room for user: ${userId}`);
    }
  });

  socket.on('connect_error', (error) => {
    console.error('Socket.IO connection error:', error.message);
    // Will automatically attempt reconnection based on configuration
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket.IO disconnected:', reason);
    if (reason === 'io server disconnect') {
      // Server disconnected the socket, reconnect manually
      socket?.connect();
    }
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('Socket.IO reconnected after', attemptNumber, 'attempts');
    // Rejoin room after reconnection
    if (userId) {
      socket?.emit('join-reminders', userId);
    }
  });

  socket.on('reconnect_error', (error) => {
    console.error('Socket.IO reconnection error:', error);
  });

  // Listen for reminder notifications
  socket.on('reminder-notification', (data: { reminder: any }) => {
    console.log('Received reminder notification:', data);
    // Dispatch custom event that ReminderScheduler can listen to
    window.dispatchEvent(new CustomEvent('socket-reminder-triggered', { detail: data }));
  });

  // Listen for check-in updates
  socket.on('checkin-update', (data: { checkIn: any }) => {
    console.log('Received check-in update:', data);
    // Dispatch custom event for check-in updates
    window.dispatchEvent(new CustomEvent('socket-checkin-update', { detail: data }));
    // Also trigger the existing checkins-update event
    window.dispatchEvent(new CustomEvent('checkins-update'));
  });

  socket.on('joined-room', (data: { room: string }) => {
    console.log('Successfully joined room:', data.room);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Send check-in update via Socket.IO
 */
export function emitCheckInUpdate(userId: string, checkIn: any) {
  if (socket?.connected) {
    socket.emit('new-checkin', { userId, checkIn });
  }
}

/**
 * Send reminder trigger event via Socket.IO
 */
export function emitReminderTriggered(userId: string, reminder: any) {
  if (socket?.connected) {
    socket.emit('reminder-triggered', { userId, reminder });
  }
}

