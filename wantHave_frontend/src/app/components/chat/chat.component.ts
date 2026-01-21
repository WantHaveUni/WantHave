import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, Conversation, Message } from '../../services/chat.service';
import { ProfileService } from '../../services/profile.service';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy {
    conversations: Conversation[] = [];
    selectedConversation: Conversation | null = null;
    messages: Message[] = [];
    newMessage: string = '';
    currentUser: any = null;

    constructor(
        private chatService: ChatService,
        private profileService: ProfileService,
        private route: ActivatedRoute,
        private ngZone: NgZone
    ) { }

    ngOnInit(): void {
        this.profileService.getMe().subscribe(profile => {
            this.currentUser = profile.user;
        });
        this.loadConversations();

        // Subscribe to incoming messages
        this.chatService.messages$.subscribe(msg => {
            this.ngZone.run(() => {
                // Only append if it belongs to current conversation
                // We use loose equality (==) because ID might be string from WebSocket vs number from DB
                if (this.selectedConversation && this.selectedConversation.id == msg.conversation) {
                    this.messages.push(msg);
                } else if (!this.selectedConversation || this.selectedConversation.id != msg.conversation) {
                    // Maybe show a badge or update last message in conversation list
                    this.updateLastMessage(msg);
                }
            });
        });
    }

    ngOnDestroy(): void {
        this.chatService.disconnect();
    }

    loadConversations() {
        this.chatService.getConversations().subscribe(convos => {
            this.conversations = convos;

            // Check for query params
            this.route.queryParams.subscribe(params => {
                // If userId is provided, start a new chat with that user
                const userId = params['userId'];
                if (userId) {
                    this.startNewChat(userId);
                    return;
                }

                // If conversationId is provided, select that conversation
                const conversationId = params['conversationId'];
                if (conversationId) {
                    const target = this.conversations.find(c => c.id == conversationId);
                    if (target) {
                        this.selectConversation(target);
                    }
                }
            });
        });
    }

    selectConversation(conversation: Conversation) {
        this.selectedConversation = conversation;
        this.messages = []; // Clear current messages

        // Connect to WebSocket
        this.chatService.connect(conversation.id);

        // Load history
        this.chatService.getHistory(conversation.id).subscribe(msgs => {
            this.messages = msgs;
        });
    }

    sendMessage() {
        if (!this.newMessage.trim() || !this.selectedConversation) return;

        this.chatService.sendMessage(this.newMessage, this.currentUser.id);
        this.newMessage = '';
    }

    startNewChat(userIdStr: string) {
        const userId = Number(userIdStr);
        if (!userId) return;

        this.chatService.startConversation(userId).subscribe({
            next: (conversation) => {
                this.loadConversations();
                this.selectConversation(conversation);
            },
            error: (err) => alert('Could not start chat: ' + err.message)
        });
    }

    updateLastMessage(msg: Message) {
        const convo = this.conversations.find(c => c.id === msg.conversation);
        if (convo) {
            convo.last_message = msg;
        }
    }
}
