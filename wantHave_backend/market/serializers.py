from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User
from .models import UserProfile, Product, Category

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
            'latitude', 'longitude', 'address',
            'active_listings_count', 'sold_items_count', 'member_since', 'updated_at'
        ]
        read_only_fields = ['id', 'member_since', 'updated_at']

    def get_active_listings_count(self, obj):
        return obj.user.products.filter(status='AVAILABLE').count()

    def get_sold_items_count(self, obj):
        return obj.user.products.filter(status='SOLD').count()

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name', required=False)
    last_name = serializers.CharField(source='user.last_name', required=False)
    email = serializers.EmailField(source='user.email', required=False)
    username = serializers.CharField(source='user.username', required=False)

    class Meta:
        model = UserProfile
        fields = [
            'bio', 'profile_picture', 'city', 'country',
            'latitude', 'longitude', 'address',
            'first_name', 'last_name', 'email', 'username'
        ]

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        user = instance.user

        user.first_name = user_data.get('first_name', user.first_name)
        user.last_name = user_data.get('last_name', user.last_name)
        user.email = user_data.get('email', user.email)
        
        # specific check for username to avoid integrity errors if duplicate
        new_username = user_data.get('username')
        if new_username and new_username != user.username:
            if User.objects.filter(username=new_username).exists():
                raise serializers.ValidationError({'username': 'This username is already taken.'})
            user.username = new_username

        user.save()

        return super().update(instance, validated_data)

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'parent']
        read_only_fields = ['id']

class ProductSerializer(serializers.ModelSerializer):
    seller_username = serializers.CharField(source='seller.username', read_only=True)
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        source='category',
        queryset=Category.objects.all(),
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = Product
        fields = [
            'id',
            'title',
            'description',
            'price',
            'image',
            'status',
            'created_at',
            'seller_username',
            'category',
            'category_id',
            'buyer',
            'sold_at',
        ]
        read_only_fields = ['id', 'created_at', 'seller_username', 'category', 'buyer', 'sold_at']

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    pass
