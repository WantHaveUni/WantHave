from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q
from django.utils import timezone
from django.conf import settings
from market.models import Conversation, Product, Offer, Order
from .serializers import ConversationSerializer, MessageSerializer, OfferSerializer

class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from django.db.models import Max
        return Conversation.objects.filter(participants=self.request.user).annotate(
            last_message_time=Max('messages__timestamp')
        ).order_by('-last_message_time')

    def destroy(self, request, pk=None):
        """Delete a conversation - only participants can delete"""
        try:
            conversation = Conversation.objects.get(pk=pk)
        except Conversation.DoesNotExist:
            return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Verify user is a participant
        if request.user not in conversation.participants.all():
            return Response(
                {'error': 'You are not a participant of this conversation'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Delete the conversation (messages will be cascade deleted)
        conversation.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        messages = conversation.messages.all().order_by('timestamp')
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get total number of unread messages for the current user"""
        from market.models import Message
        
        unread_count = Message.objects.filter(
            conversation__participants=request.user,
            is_read=False
        ).exclude(sender=request.user).count()
        
        return Response({'unread_count': unread_count})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark all messages in conversation as read for current user"""
        conversation = self.get_object()
        # Mark messages sent by others as read
        conversation.messages.exclude(sender=request.user).update(is_read=True)
        return Response({'status': 'marked as read'})

    def create(self, request):
        """Create a new conversation or return existing one (REST-conform: POST /conversations/)"""
        other_user_id = request.data.get('user_id')
        product_id = request.data.get('product_id')

        if not other_user_id:
            return Response({'detail': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Build query for existing conversation between these users
        conversations = Conversation.objects.filter(
            participants=request.user
        ).filter(
            participants__id=other_user_id
        )

        # If product_id provided, filter by product as well
        if product_id:
            conversations = conversations.filter(product_id=product_id)
        else:
            conversations = conversations.filter(product__isnull=True)

        if conversations.exists():
            return Response(ConversationSerializer(conversations.first()).data)

        # Create new conversation
        conversation = Conversation.objects.create()
        conversation.participants.add(request.user, other_user_id)

        # Link to product if provided
        if product_id:
            try:
                product = Product.objects.get(id=product_id)
                conversation.product = product
                conversation.save()
            except Product.DoesNotExist:
                pass

        return Response(ConversationSerializer(conversation).data, status=status.HTTP_201_CREATED)


class OfferViewSet(viewsets.ModelViewSet):
    """ViewSet for handling price offers in chat"""
    serializer_class = OfferSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Return offers where user is buyer or seller"""
        return Offer.objects.filter(
            Q(buyer=self.request.user) | Q(seller=self.request.user)
        ).select_related('product', 'buyer', 'seller', 'conversation')

    def create(self, request):
        """Buyer creates an offer for a product in a conversation"""
        conversation_id = request.data.get('conversation_id')
        amount = request.data.get('amount')

        if not conversation_id or not amount:
            return Response(
                {'error': 'conversation_id and amount are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            conversation = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response(
                {'error': 'Conversation not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify user is participant
        if request.user not in conversation.participants.all():
            return Response(
                {'error': 'You are not a participant of this conversation'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Must have a product linked
        if not conversation.product:
            return Response(
                {'error': 'This conversation has no product to make an offer on'},
                status=status.HTTP_400_BAD_REQUEST
            )

        product = conversation.product

        # Buyer cannot be the seller
        if product.seller == request.user:
            return Response(
                {'error': 'You cannot make an offer on your own product'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Product must be available
        if product.status != 'AVAILABLE':
            return Response(
                {'error': 'This product is no longer available'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check for existing pending offer
        existing_offer = Offer.objects.filter(
            conversation=conversation,
            buyer=request.user,
            status='PENDING'
        ).first()

        if existing_offer:
            return Response(
                {'error': 'You already have a pending offer on this product'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create the offer
        offer = Offer.objects.create(
            conversation=conversation,
            product=product,
            buyer=request.user,
            seller=product.seller,
            amount=amount,
            status='PENDING'
        )

        serializer = OfferSerializer(offer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        """Update offer status (REST-conform: PATCH /offers/{id}/)

        For seller to respond: {status: 'ACCEPTED'} or {status: 'DECLINED'}
        For buyer to cancel: {status: 'CANCELLED'}
        """
        offer = self.get_object()
        new_status = request.data.get('status')

        if not new_status:
            return Response(
                {'detail': 'status is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        new_status = new_status.upper()

        # Handle seller response (accept/decline)
        if new_status in ['ACCEPTED', 'DECLINED']:
            if offer.seller != request.user:
                return Response(
                    {'detail': 'Only the seller can accept or decline this offer'},
                    status=status.HTTP_403_FORBIDDEN
                )

            if offer.status != 'PENDING':
                return Response(
                    {'detail': f'Cannot respond to an offer with status: {offer.status}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            offer.status = new_status
            offer.responded_at = timezone.now()
            offer.save()

            serializer = OfferSerializer(offer)
            return Response(serializer.data)

        # Handle buyer cancellation
        elif new_status == 'CANCELLED':
            if offer.buyer != request.user:
                return Response(
                    {'detail': 'Only the buyer can cancel this offer'},
                    status=status.HTTP_403_FORBIDDEN
                )

            if offer.status != 'ACCEPTED':
                return Response(
                    {'detail': f'Cannot cancel an offer with status: {offer.status}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            offer.status = 'CANCELLED'
            offer.save()

            serializer = OfferSerializer(offer)
            return Response(serializer.data)

        else:
            return Response(
                {'detail': 'Invalid status. Must be ACCEPTED, DECLINED, or CANCELLED'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'], url_path='payment', url_name='payment')
    def payment(self, request, pk=None):
        """Buyer pays for an accepted offer via Stripe (REST-conform: POST /offers/{id}/payment/)"""
        from market.stripe_service import StripeService
        import stripe

        offer = self.get_object()

        # Only buyer can pay
        if offer.buyer != request.user:
            return Response(
                {'error': 'Only the buyer can pay for this offer'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Must be accepted
        if offer.status != 'ACCEPTED':
            return Response(
                {'error': f'Cannot pay for an offer with status: {offer.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Product must still be available
        if offer.product.status != 'AVAILABLE':
            return Response(
                {'error': 'This product is no longer available'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get redirect URLs
        success_url = request.data.get('success_url')
        cancel_url = request.data.get('cancel_url')

        if not success_url or not cancel_url:
            return Response(
                {'error': 'success_url and cancel_url are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            session_data = StripeService.create_offer_checkout_session(
                offer=offer,
                success_url=success_url,
                cancel_url=cancel_url
            )
            return Response(session_data, status=status.HTTP_201_CREATED)

        except stripe.error.StripeError as e:
            return Response(
                {'error': f'Payment service error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def by_conversation(self, request):
        """Get all offers for a specific conversation"""
        conversation_id = request.query_params.get('conversation_id')

        if not conversation_id:
            return Response(
                {'error': 'conversation_id query param is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        offers = Offer.objects.filter(
            conversation_id=conversation_id
        ).filter(
            Q(buyer=request.user) | Q(seller=request.user)
        ).order_by('-created_at')

        serializer = OfferSerializer(offers, many=True)
        return Response(serializer.data)
