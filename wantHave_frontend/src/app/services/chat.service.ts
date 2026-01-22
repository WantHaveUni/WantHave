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
    product?: { id: number; title: string; price: string; seller_id: number };
    last_message?: Message;
}

export interface Offer {
    id: number;
    conversation: number;
    product: number;
    product_title: string;
    buyer: any;
    seller: any;
    amount: string;
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'PAID' | 'CANCELLED';
    created_at: string;
    responded_at?: string;
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
    private offerSubject = new Subject<Offer>();
    public messages$ = this.messageSubject.asObservable();
    public offers$ = this.offerSubject.asObservable();

    constructor(private http: HttpClient) { }

    getConversations(): Observable<Conversation[]> {
        return this.http.get<Conversation[]>(`${this.apiUrl}/conversations/`);
    }

    getHistory(conversationId: number): Observable<Message[]> {
        return this.http.get<Message[]>(`${this.apiUrl}/conversations/${conversationId}/messages/`);
    }

    getUnreadCount(): Observable<{ unread_count: number }> {
        return this.http.get<{ unread_count: number }>(`${this.apiUrl}/conversations/unread_count/`);
    }

    startConversation(userId: number, productId?: number): Observable<Conversation> {
        const payload: any = { user_id: userId };
        if (productId) {
            payload.product_id = productId;
        }
        return this.http.post<Conversation>(`${this.apiUrl}/conversations/start/`, payload);
    }

    deleteConversation(conversationId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/conversations/${conversationId}/`);
    }

    // Offer-related methods
    getConversationOffers(conversationId: number): Observable<Offer[]> {
        return this.http.get<Offer[]>(`${this.apiUrl}/offers/by_conversation/?conversation_id=${conversationId}`);
    }

    createOffer(conversationId: number, amount: number): Observable<Offer> {
        return this.http.post<Offer>(`${this.apiUrl}/offers/`, {
            conversation_id: conversationId,
            amount: amount
        });
    }

    respondToOffer(offerId: number, accept: boolean): Observable<Offer> {
        return this.http.post<Offer>(`${this.apiUrl}/offers/${offerId}/respond/`, {
            action: accept ? 'accept' : 'decline'
        });
    }

    payOffer(offerId: number, successUrl: string, cancelUrl: string): Observable<{ url: string; session_id: string; order_id: number }> {
        return this.http.post<{ url: string; session_id: string; order_id: number }>(`${this.apiUrl}/offers/${offerId}/pay/`, {
            success_url: successUrl,
            cancel_url: cancelUrl
        });
    }

    cancelOffer(offerId: number): Observable<Offer> {
        return this.http.post<Offer>(`${this.apiUrl}/offers/${offerId}/cancel/`, {});
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
            const msgType = data.type || 'message';

            if (msgType === 'offer') {
                // Handle offer event
                this.offerSubject.next(data.offer);
            } else {
                // Handle regular message
                const message: Message = {
                    content: data.message,
                    sender: { id: data.sender_id },
                    timestamp: data.timestamp,
                    conversation: data.conversation
                };
                this.messageSubject.next(message);
            }
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
                type: 'message',
                message: message,
                sender_id: senderId
            }));
        } else {
            console.error('WebSocket is not open');
        }
    }

    // Broadcast offer update via WebSocket
    broadcastOfferUpdate(offer: Offer) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'offer',
                offer: offer
            }));
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}
