from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from market.models import Conversation, Product
from .serializers import ConversationSerializer, MessageSerializer

class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        messages = conversation.messages.all().order_by('timestamp')
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def start(self, request):
        other_user_id = request.data.get('user_id')
        product_id = request.data.get('product_id')
        
        if not other_user_id:
            return Response({'error': 'User ID required'}, status=status.HTTP_400_BAD_REQUEST)
        
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

