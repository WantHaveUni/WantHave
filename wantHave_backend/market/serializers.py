from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Product

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    active_listings_count = serializers.SerializerMethodField()
    sold_items_count = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'bio', 'profile_picture', 'city', 'country',
            'latitude', 'longitude', 'address', 'rating',
            'active_listings_count', 'sold_items_count', 'member_since', 'updated_at'
        ]
        read_only_fields = ['id', 'rating', 'member_since', 'updated_at']

    def get_active_listings_count(self, obj):
        return obj.user.products.filter(status='AVAILABLE').count()

    def get_sold_items_count(self, obj):
        return obj.user.products.filter(status='SOLD').count()

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name', required=False)
    last_name = serializers.CharField(source='user.last_name', required=False)
    email = serializers.EmailField(source='user.email', required=False)

    class Meta:
        model = UserProfile
        fields = [
            'bio', 'profile_picture', 'city', 'country',
            'latitude', 'longitude', 'address',
            'first_name', 'last_name', 'email'
        ]

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        user = instance.user

        user.first_name = user_data.get('first_name', user.first_name)
        user.last_name = user_data.get('last_name', user.last_name)
        user.email = user_data.get('email', user.email)
        user.save()

        return super().update(instance, validated_data)

class ProductSerializer(serializers.ModelSerializer):
    seller_username = serializers.CharField(source='seller.username', read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'title', 'description', 'price', 'image', 'status', 'created_at', 'seller_username']
        read_only_fields = ['id', 'created_at', 'seller_username']

class MyTokenObtainPairSerializer(serializers.Serializer):
    # Add your custom token serializer implementation here
    pass

