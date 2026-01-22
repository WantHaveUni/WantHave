from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserProfileViewSet, ProductViewSet, ProductDetailView,
    CategoryViewSet, RegisterView, OrderViewSet, stripe_webhook,
    UserViewSet, AIAutofillView
)

router = DefaultRouter()
router.register(r'profiles', UserProfileViewSet, basename='profile')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('products/ai-autofill/', AIAutofillView.as_view(), name='product-ai-autofill'),
    path('', include(router.urls)),
    path('products/<int:pk>/detail/', ProductDetailView.as_view(), name='product-detail'),
    path('register/', RegisterView.as_view(), name='register'),
    path('webhooks/stripe/', stripe_webhook, name='stripe-webhook'),
]
