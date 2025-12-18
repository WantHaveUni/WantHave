from rest_framework import viewsets, permissions, status
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Product, UserProfile, Conversation, Message
from .serializers import ProductSerializer, UserProfileSerializer, ConversationSerializer, MessageSerializer, MyTokenObtainPairSerializer

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by('-created_at')
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)

    @action(detail=False, methods=['post'], url_path='ai-autofill')
    def ai_autofill(self, request):
        """
        Placeholder for AI auto-fill feature.
        In a real implementation, this would handle an image upload,
        send it to an AI service (e.g., GPT-4o with Vision, Google Cloud Vision),
        and return suggested title, description, and price.
        """
        # Logic to handle image from request.FILES['image']
        # prediction = ai_service.predict(image)
        return Response({
            "title": "Suggested Title (AI)",
            "description": "This looks like a vintage camera...",
            "price": 120.00
        }, status=status.HTTP_200_OK)

class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users see only their conversations
        return Conversation.objects.filter(participants=self.request.user)

    def perform_create(self, serializer):
        # Logic to ensure current user is a participant would be good here
        conversation = serializer.save()
        conversation.participants.add(self.request.user)

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users see messages for conversations they are in
        return Message.objects.filter(conversation__participants=self.request.user)

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)
