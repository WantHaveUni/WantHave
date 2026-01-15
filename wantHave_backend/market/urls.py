from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserProfileViewSet, ProductViewSet, ProductDetailView

router = DefaultRouter()
router.register(r'profiles', UserProfileViewSet, basename='profile')
router.register(r'products', ProductViewSet, basename='product')

urlpatterns = [
    path('products/<int:pk>/detail/', ProductDetailView.as_view(), name='product-detail'),
    path('', include(router.urls)),
]
