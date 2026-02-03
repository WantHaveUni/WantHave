from rest_framework import serializers
from market.models import Conversation, Message, Offer
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'profile_picture']

    def get_profile_picture(self, obj):
        try:
            if hasattr(obj, 'profile') and obj.profile.profile_picture:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.profile.profile_picture.url)
                return obj.profile.profile_picture.url
        except Exception:
            pass
        return None

class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'content', 'timestamp']

class ProductSummarySerializer(serializers.Serializer):
    """Lightweight product info for conversations"""
    id = serializers.IntegerField()
    title = serializers.CharField()

class ConversationSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    product = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'product', 'last_message', 'created_at']

    def get_last_message(self, obj):
        last_msg = obj.messages.order_by('-timestamp').first()
        if last_msg:
            return MessageSerializer(last_msg).data
        return None

    def get_product(self, obj):
        if obj.product:
            return {'id': obj.product.id, 'title': obj.product.title, 'price': str(obj.product.price), 'seller_id': obj.product.seller.id}
        return None


class OfferSerializer(serializers.ModelSerializer):
    buyer = UserSerializer(read_only=True)
    seller = UserSerializer(read_only=True)
    product_title = serializers.CharField(source='product.title', read_only=True)

    class Meta:
        model = Offer
        fields = [
            'id', 'conversation', 'product', 'product_title',
            'buyer', 'seller', 'amount', 'status',
            'created_at', 'responded_at'
        ]
        read_only_fields = ['id', 'buyer', 'seller', 'status', 'created_at', 'responded_at']
