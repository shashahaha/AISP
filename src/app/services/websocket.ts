// WebSocket client for real-time chat
import { useAuthStore } from '../stores/authStore';

export type WebSocketMessage = {
  type: 'start' | 'message' | 'end' | 'response' | 'thinking' | 'error' | 'session_started' | 'session_ended';
  case_id?: string;
  content?: string;
  diagnosis?: string;
  message?: string;
  session_id?: string;
  metadata?: any;
  turn_count?: number;
  case_info?: any;
  feedback?: any;
};

export type MessageHandler = (message: WebSocketMessage) => void;
export type ConnectionHandler = () => void;
export type ErrorHandler = (error: Event) => void;

export class ChatWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isIntentionallyClosed = false;

  private onMessageHandlers: Set<MessageHandler> = new Set();
  private onConnectHandlers: Set<ConnectionHandler> = new Set();
  private onDisconnectHandlers: Set<ConnectionHandler> = new Set();
  private onErrorHandlers: Set<ErrorHandler> = new Set();

  constructor() {
    const apiURL = import.meta.env.VITE_API_URL || 'http://10.21.1.5:8000';
    // Convert HTTP to WebSocket protocol
    const wsProtocol = apiURL.replace('http://', 'ws://').replace('https://', 'wss://');
    this.url = wsProtocol;
  }

  connect(sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const token = useAuthStore.getState().token;
        if (!token) {
          reject(new Error('No authentication token available'));
          return;
        }

        this.ws = new WebSocket(`${this.url}/ws/chat/${sessionId}?token=${token}`);
        this.isIntentionallyClosed = false;

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.onConnectHandlers.forEach(handler => handler());
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data: WebSocketMessage = JSON.parse(event.data);
            this.onMessageHandlers.forEach(handler => handler(data));
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          this.onDisconnectHandlers.forEach(handler => handler());
          if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
              this.reconnectAttempts++;
              this.connect(sessionId);
            }, this.reconnectDelay * this.reconnectAttempts);
          }
        };

        this.ws.onerror = (error) => {
          this.onErrorHandlers.forEach(handler => handler(error));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect() {
    this.isIntentionallyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: Omit<WebSocketMessage, 'session_id' | 'message' | 'metadata' | 'turn_count' | 'case_info' | 'feedback'>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  startSession(caseId: string) {
    this.send({
      type: 'start',
      case_id: caseId,
    });
  }

  sendMessage(content: string) {
    this.send({
      type: 'message',
      content: content,
    });
  }

  endSession(diagnosis: string) {
    this.send({
      type: 'end',
      diagnosis: diagnosis,
    });
  }

  onMessage(handler: MessageHandler) {
    this.onMessageHandlers.add(handler);
    return () => this.onMessageHandlers.delete(handler);
  }

  onConnect(handler: ConnectionHandler) {
    this.onConnectHandlers.add(handler);
    return () => this.onConnectHandlers.delete(handler);
  }

  onDisconnect(handler: ConnectionHandler) {
    this.onDisconnectHandlers.add(handler);
    return () => this.onDisconnectHandlers.delete(handler);
  }

  onError(handler: ErrorHandler) {
    this.onErrorHandlers.add(handler);
    return () => this.onErrorHandlers.delete(handler);
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let wsClient: ChatWebSocketClient | null = null;

export function getWebSocketClient(): ChatWebSocketClient {
  if (!wsClient) {
    wsClient = new ChatWebSocketClient();
  }
  return wsClient;
}
