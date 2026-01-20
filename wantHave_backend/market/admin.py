from django.contrib import admin
from .models import Product, UserProfile, Conversation, Message, Category, Order, Payment, StripeWebhookEvent

class ProductAdmin(admin.ModelAdmin):
    list_display = ('title', 'seller', 'price', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('title', 'description', 'seller__username')

class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'latitude', 'longitude')
    search_fields = ('user__username', 'user__email')

class MessageInline(admin.TabularInline):
    model = Message
    extra = 1

class ConversationAdmin(admin.ModelAdmin):
    inlines = [MessageInline]
    list_display = ('id', 'created_at')
    filter_horizontal = ('participants',)

class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent')
    search_fields = ('name',)

admin.site.register(Product, ProductAdmin)
admin.site.register(UserProfile, UserProfileAdmin)
admin.site.register(Category, CategoryAdmin)
admin.site.register(Conversation, ConversationAdmin)
admin.site.register(Message)


# Payment Admin
@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'product_title', 'buyer', 'seller', 'price', 'status', 'created_at', 'paid_at']
    list_filter = ['status', 'created_at']
    search_fields = ['product__title', 'buyer__username', 'seller__username']
    readonly_fields = ['created_at', 'updated_at', 'stripe_checkout_session_id', 'paid_at']
    actions = ['mark_as_paid', 'mark_as_failed']

    fieldsets = (
        ('Order Information', {
            'fields': ('product', 'buyer', 'seller', 'status')
        }),
        ('Financial Details', {
            'fields': ('price', 'platform_fee', 'seller_amount')
        }),
        ('Stripe Details', {
            'fields': ('stripe_checkout_session_id',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'paid_at')
        }),
    )

    def product_title(self, obj):
        """Display product title in list view"""
        return obj.product.title
    product_title.short_description = 'Product'

    @admin.action(description='Mark selected orders as PAID (Demo)')
    def mark_as_paid(self, request, queryset):
        """Manually mark orders as paid - simulates webhook behavior for demo"""
        from django.utils import timezone

        updated = 0
        for order in queryset:
            if order.status == 'PENDING':
                order.status = 'PAID'
                order.paid_at = timezone.now()
                order.save()

                # Mark product as SOLD
                order.product.status = 'SOLD'
                order.product.save()

                updated += 1

        self.message_user(request, f'{updated} order(s) marked as PAID and product(s) marked as SOLD.')

    @admin.action(description='Mark selected orders as FAILED')
    def mark_as_failed(self, request, queryset):
        """Mark orders as failed"""
        updated = queryset.filter(status='PENDING').update(status='FAILED')
        self.message_user(request, f'{updated} order(s) marked as FAILED.')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'amount', 'currency', 'successful', 'processed_at']
    list_filter = ['successful', 'currency', 'created_at']
    search_fields = ['stripe_payment_intent_id', 'stripe_charge_id']
    readonly_fields = ['created_at', 'stripe_raw_data']


@admin.register(StripeWebhookEvent)
class StripeWebhookEventAdmin(admin.ModelAdmin):
    list_display = ['event_id', 'event_type', 'processed', 'created_at']
    list_filter = ['event_type', 'processed', 'created_at']
    search_fields = ['event_id', 'event_type']
    readonly_fields = ['event_data', 'created_at']
