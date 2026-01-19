from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserProfileViewSet, ProductViewSet, ProductDetailView, CategoryViewSet, RegisterView

router = DefaultRouter()
router.register(r'profiles', UserProfileViewSet, basename='profile')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'categories', CategoryViewSet, basename='category')

urlpatterns = [
    path('products/<int:pk>/detail/', ProductDetailView.as_view(), name='product-detail'),
    path('register/', RegisterView.as_view(), name='register'),
    path('', include(router.urls)),
]
