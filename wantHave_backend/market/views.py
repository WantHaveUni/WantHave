from rest_framework import viewsets, permissions, status
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import UserProfile, Product
from .serializers import (
    UserProfileSerializer, UserProfileUpdateSerializer,
    ProductSerializer, MyTokenObtainPairSerializer
)

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
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action in ['update', 'partial_update', 'me']:
            return UserProfileUpdateSerializer
        return UserProfileSerializer

    @action(detail=False, methods=['get', 'patch', 'delete'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """Get, update, or delete current user's profile"""
        try:
            profile = request.user.profile
        except UserProfile.DoesNotExist:
            return Response(
                {'detail': 'Profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if request.method == 'GET':
            serializer = UserProfileSerializer(profile)
            return Response(serializer.data)
        
        elif request.method in ['PATCH', 'PUT']:
            serializer = UserProfileUpdateSerializer(
                profile, data=request.data, partial=True
            )
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == 'DELETE':
            user = request.user
            username = user.username
            user.delete()
            return Response(
                {'detail': f'Account {username} and all associated data has been deleted.'},
                status=status.HTTP_204_NO_CONTENT
            )

    @action(detail=True, methods=['get'])
    def listings(self, request, pk=None):
        """Get all listings by a user"""
        try:
            profile = self.get_object()
            products = Product.objects.filter(seller=profile.user).order_by('-created_at')
            serializer = ProductSerializer(products, many=True)
            return Response(serializer.data)
        except UserProfile.DoesNotExist:
            return Response(
                {'detail': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    def perform_create(self, serializer):
        """Prevent direct profile creation via API"""
        pass

    def create(self, request, *args, **kwargs):
        """Profiles should be created automatically with user registration"""
        return Response(
            {'detail': 'Profile creation is automatic upon user registration'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
