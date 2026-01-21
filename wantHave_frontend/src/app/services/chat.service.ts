import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Message {
    id?: number;
    conversation?: number;
    sender: any; // Using any for now, ideally User interface
    content: string;
    timestamp: string;
}

export interface Conversation {
    id: number;
    participants: any[];
    last_message?: Message;
}

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private apiUrl = '/api/chat';

    // Dynamically determine WebSocket URL based on current location
    private getWsUrl(): string {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        return `${protocol}//${host}/ws/chat`;
    }

    private socket: WebSocket | null = null;
    private messageSubject = new Subject<Message>();
    public messages$ = this.messageSubject.asObservable();

    constructor(private http: HttpClient) { }

    getConversations(): Observable<Conversation[]> {
        return this.http.get<Conversation[]>(`${this.apiUrl}/conversations/`);
    }

    getHistory(conversationId: number): Observable<Message[]> {
        return this.http.get<Message[]>(`${this.apiUrl}/conversations/${conversationId}/messages/`);
    }

    startConversation(userId: number): Observable<Conversation> {
        return this.http.post<Conversation>(`${this.apiUrl}/conversations/start/`, { user_id: userId });
    }

    connect(conversationId: number) {
        if (this.socket) {
            this.socket.close();
        }

        // Connect to WebSocket
        // Note: In production, you might want to pass the JWT token here if needed for custom auth middleware
        this.socket = new WebSocket(`${this.getWsUrl()}/${conversationId}/`);

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            // Transform incoming data to match Message interface if needed
            // The backend sends: { message: str, sender_id: int, timestamp: str }
            // We might need to map this to our frontend Message structure locally or trust the backend to send more data
            // For now, let's construct a partial message
            const message: Message = {
                content: data.message,
                sender: { id: data.sender_id }, // Partial user
                timestamp: data.timestamp,
                conversation: data.conversation
            };
            this.messageSubject.next(message);
        };

        this.socket.onopen = (event) => {
            console.log('WebSocket connected');
        };

        this.socket.onclose = (event) => {
            console.log('WebSocket disconnected', event);
        };

        this.socket.onerror = (event) => {
            console.error('WebSocket error', event);
        };
    }

    sendMessage(message: string, senderId: number) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                message: message,
                sender_id: senderId
            }));
        } else {
            console.error('WebSocket is not open');
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}
