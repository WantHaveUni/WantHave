import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, Conversation, Message, Offer } from '../../services/chat.service';
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

    // Offer-related properties
    offers: Offer[] = [];
    showOfferModal = false;
    offerAmount: number | null = null;
    offerLoading = false;
    offerError: string | null = null;

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

        // Subscribe to offer updates
        this.chatService.offers$.subscribe(offer => {
            this.ngZone.run(() => {
                this.updateOrAddOffer(offer);
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
        this.offers = [];

        this.chatService.connect(conversation.id);

        this.chatService.getHistory(conversation.id).subscribe(msgs => {
            this.messages = msgs;
        });

        // Load offers for this conversation
        this.chatService.getConversationOffers(conversation.id).subscribe(offers => {
            this.offers = offers;
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

    // Offer-related methods
    isBuyer(): boolean {
        if (!this.selectedConversation?.product || !this.currentUser) return false;
        return this.selectedConversation.product.seller_id !== this.currentUser.id;
    }

    isSeller(): boolean {
        if (!this.selectedConversation?.product || !this.currentUser) return false;
        return this.selectedConversation.product.seller_id === this.currentUser.id;
    }

    canMakeOffer(): boolean {
        // Buyer can make offer if product exists and no pending/accepted offers
        if (!this.isBuyer()) return false;
        const hasActiveOffer = this.offers.some(o =>
            o.buyer.id === this.currentUser.id && (o.status === 'PENDING' || o.status === 'ACCEPTED')
        );
        return !hasActiveOffer;
    }

    openOfferModal(): void {
        this.showOfferModal = true;
        this.offerAmount = null;
        this.offerError = null;
    }

    closeOfferModal(): void {
        this.showOfferModal = false;
        this.offerAmount = null;
        this.offerError = null;
    }

    submitOffer(): void {
        if (!this.offerAmount || !this.selectedConversation) return;

        this.offerLoading = true;
        this.offerError = null;

        this.chatService.createOffer(this.selectedConversation.id, this.offerAmount).subscribe({
            next: (offer) => {
                this.offers.unshift(offer);
                this.chatService.broadcastOfferUpdate(offer);
                this.closeOfferModal();
                this.offerLoading = false;
            },
            error: (err) => {
                this.offerError = err.error?.error || 'Failed to create offer';
                this.offerLoading = false;
            }
        });
    }

    respondToOffer(offerId: number, accept: boolean): void {
        this.chatService.respondToOffer(offerId, accept).subscribe({
            next: (updatedOffer) => {
                this.updateOrAddOffer(updatedOffer);
                this.chatService.broadcastOfferUpdate(updatedOffer);
            },
            error: (err) => {
                alert('Error: ' + (err.error?.error || 'Failed to respond to offer'));
            }
        });
    }

    payOffer(offer: Offer): void {
        const successUrl = `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${window.location.origin}/chat?conversationId=${this.selectedConversation?.id}`;

        this.chatService.payOffer(offer.id, successUrl, cancelUrl).subscribe({
            next: (response) => {
                // Redirect to Stripe checkout
                window.location.href = response.url;
            },
            error: (err) => {
                alert('Payment error: ' + (err.error?.error || 'Failed to initiate payment'));
            }
        });
    }

    cancelOffer(offerId: number): void {
        this.chatService.cancelOffer(offerId).subscribe({
            next: (updatedOffer) => {
                this.updateOrAddOffer(updatedOffer);
                this.chatService.broadcastOfferUpdate(updatedOffer);
            },
            error: (err) => {
                alert('Error: ' + (err.error?.error || 'Failed to cancel offer'));
            }
        });
    }

    private updateOrAddOffer(offer: Offer): void {
        const index = this.offers.findIndex(o => o.id === offer.id);
        if (index >= 0) {
            this.offers[index] = offer;
        } else {
            this.offers.unshift(offer);
        }
    }

    getLatestActiveOffer(): Offer | null {
        // Get the most recent pending or accepted offer
        return this.offers.find(o => o.status === 'PENDING' || o.status === 'ACCEPTED') || null;
    }
}
