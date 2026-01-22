from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

# User Profile with Map Location
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True, null=True, max_length=500)
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    phone = models.CharField(max_length=30, blank=True, null=True)
    phone_verified = models.BooleanField(default=False)
    birth_year = models.IntegerField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True, null=True)  # female, male, diverse, none
    active_listings_count = models.IntegerField(default=0)
    sold_items_count = models.IntegerField(default=0)
    member_since = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s profile"

# Category for the Marketplace
class Category(models.Model):
    name = models.CharField(max_length=120)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children'
    )

    def __str__(self):
        return self.name

    def descendant_ids(self, include_self=True):
        ids = [self.id] if include_self else []
        queue = [self]

        while queue:
            current = queue.pop(0)
            children = list(current.children.all())
            for child in children:
                ids.append(child.id)
                queue.append(child)

        return ids

# Product for the Marketplace
class Product(models.Model):
    STATUS_CHOICES = (
        ('AVAILABLE', 'Available'),
        ('SOLD', 'Sold'),
    )

    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.PROTECT, null=True, blank=True, related_name='products')
    title = models.CharField(max_length=200)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to='product_images/')
    
    created_at = models.DateTimeField(auto_now_add=True)
    sold_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')
    buyer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchases')

    def __str__(self):
        return self.title

# Chat Models
class Conversation(models.Model):
    participants = models.ManyToManyField(User, related_name='conversations')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Conversation {self.id}"

class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"Message from {self.sender.username} at {self.timestamp}"


# Offer Model for price negotiations
class Offer(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),      # Waiting for seller response
        ('ACCEPTED', 'Accepted'),    # Seller accepted
        ('DECLINED', 'Declined'),    # Seller declined
        ('PAID', 'Paid'),            # Buyer completed payment
        ('CANCELLED', 'Cancelled'),  # Buyer cancelled after accept
    )

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='offers')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='offers')
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='offers_made')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='offers_received')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Offer #{self.id} - €{self.amount} for {self.product.title} ({self.status})"


# Payment Models
class Order(models.Model):
    """
    Represents a purchase order linking buyer, seller, and product.
    Created when checkout session is initiated.
    """
    STATUS_CHOICES = (
        ('PENDING', 'Pending Payment'),
        ('PAID', 'Paid'),
        ('FAILED', 'Payment Failed'),
        ('REFUNDED', 'Refunded'),
        ('CANCELLED', 'Cancelled'),
    )

    # Core relationships
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='orders')
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders_as_buyer')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders_as_seller')

    # Financial details
    price = models.DecimalField(max_digits=10, decimal_places=2)  # Snapshot at time of order
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    seller_amount = models.DecimalField(max_digits=10, decimal_places=2)  # Amount to payout

    # Status tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    # Stripe references
    stripe_checkout_session_id = models.CharField(max_length=255, unique=True, null=True, blank=True)

    # Polling metadata (for VPN environment where webhooks can't reach backend)
    last_polled_at = models.DateTimeField(null=True, blank=True)
    poll_count = models.IntegerField(default=0)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['buyer', 'status']),
            models.Index(fields=['seller', 'status']),
            models.Index(fields=['stripe_checkout_session_id']),
            models.Index(fields=['status', 'created_at']),  # Optimize polling queries
        ]

    def __str__(self):
        return f"Order #{self.id} - {self.product.title} - {self.status}"


class Payment(models.Model):
    """
    Records payment transactions via Stripe.
    One-to-one with Order for successful payments.
    """
    PAYMENT_METHOD_CHOICES = (
        ('CARD', 'Credit/Debit Card'),
        ('OTHER', 'Other'),
    )

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='payment')

    # Stripe details
    stripe_payment_intent_id = models.CharField(max_length=255, unique=True)
    stripe_charge_id = models.CharField(max_length=255, blank=True)

    # Payment details
    amount = models.DecimalField(max_digits=10, decimal_places=2)  # Total amount in EUR
    currency = models.CharField(max_length=3, default='EUR')
    payment_method_type = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='CARD')

    # Status
    successful = models.BooleanField(default=False)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    # Raw data for debugging
    stripe_raw_data = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment for Order #{self.order.id} - {'Success' if self.successful else 'Pending'}"


class StripeWebhookEvent(models.Model):
    """
    Logs all webhook events from Stripe for audit and debugging.
    """
    event_id = models.CharField(max_length=255, unique=True, db_index=True)
    event_type = models.CharField(max_length=100, db_index=True)
    event_data = models.JSONField()

    processed = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)

    # Link to related order if applicable
    related_order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True, related_name='webhook_events')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event_id']),
            models.Index(fields=['event_type', 'processed']),
        ]

    def __str__(self):
        return f"{self.event_type} - {self.event_id}"
