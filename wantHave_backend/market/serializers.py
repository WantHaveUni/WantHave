from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Product, UserProfile, Conversation, Message
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    active_listings_count = serializers.ReadOnlyField()
    sold_items_count = serializers.ReadOnlyField()
    member_since = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'bio', 'profile_picture',
            'city', 'country', 'latitude', 'longitude', 'address',
            'rating', 'active_listings_count', 'sold_items_count', 'member_since'
        ]
        read_only_fields = ['rating', 'member_since']

class ProductSerializer(serializers.ModelSerializer):
    seller = UserSerializer(read_only=True)
    
    class Meta:
        model = Product
        fields = ['id', 'seller', 'title', 'description', 'price', 'image', 'created_at', 'status']
        read_only_fields = ['created_at', 'seller']

class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'content', 'timestamp', 'is_read']
        read_only_fields = ['timestamp', 'sender', 'is_read']

class ConversationSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    messages = MessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'created_at', 'messages']
        read_only_fields = ['created_at', 'participants']

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        token['permissions'] = dict.fromkeys(user.get_all_permissions())
        
        return token

