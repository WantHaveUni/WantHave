import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, Conversation, Message } from '../../services/chat.service';
import { ProfileService } from '../../services/profile.service';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs/operators';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy {
    conversations: Conversation[] = []
    selectedConversation: Conversation | null = null;
    messages: Message[] = [];
    newMessage: string = '';
    currentUser: any = null;
    private queryParamsProcessed = false;

    constructor(
        private chatService: ChatService,
        private profileService: ProfileService,
        private route: ActivatedRoute,
        private location: Location,
        private ngZone: NgZone
    ) { }

    ngOnInit(): void {
        this.profileService.getMe().subscribe(profile => {
            this.currentUser = profile.user;
        });

        // Subscribe to incoming messages
        this.chatService.messages$.subscribe(msg => {
            this.ngZone.run(() => {
                if (this.selectedConversation && this.selectedConversation.id == msg.conversation) {
                    this.messages.push(msg);
                } else if (!this.selectedConversation || this.selectedConversation.id != msg.conversation) {
                    this.updateLastMessage(msg);
                }
            });
        });

        // Load conversations first, then handle query params once
        this.chatService.getConversations().subscribe(convos => {
            this.conversations = convos;
            this.handleQueryParams();
        });
    }

    ngOnDestroy(): void {
        this.chatService.disconnect();
    }

    private handleQueryParams(): void {
        if (this.queryParamsProcessed) return;

        this.route.queryParams.pipe(take(1)).subscribe(params => {
            const userId = params['userId'];
            const productId = params['productId'];
            const conversationId = params['conversationId'];

            if (userId) {
                this.queryParamsProcessed = true;
                this.startNewChat(userId, productId ? Number(productId) : undefined);
                // Clear the query params using location (doesn't trigger router events)
                this.location.replaceState('/chat');
            } else if (conversationId) {
                const target = this.conversations.find(c => c.id == conversationId);
                if (target) {
                    this.selectConversation(target);
                }
            }
        });
    }

    loadConversations() {
        this.chatService.getConversations().subscribe(convos => {
            this.conversations = convos;
        });
    }

    selectConversation(conversation: Conversation) {
        this.selectedConversation = conversation;
        this.messages = [];

        this.chatService.connect(conversation.id);

        this.chatService.getHistory(conversation.id).subscribe(msgs => {
            this.messages = msgs;
        });
    }

    sendMessage() {
        if (!this.newMessage.trim() || !this.selectedConversation) return;

        this.chatService.sendMessage(this.newMessage, this.currentUser.id);
        this.newMessage = '';
    }

    startNewChat(userIdStr: string, productId?: number) {
        const userId = Number(userIdStr);
        if (!userId) return;

        this.chatService.startConversation(userId, productId).subscribe({
            next: (conversation) => {
                // Add to conversations list if not already present
                if (!this.conversations.find(c => c.id === conversation.id)) {
                    this.conversations.unshift(conversation);
                }
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
