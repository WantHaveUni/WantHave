from django.contrib import admin
from .models import Product, UserProfile, Conversation, Message, Category

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
