"""
Unit tests for AI autofill feature.
Uses mocking to avoid consuming actual API quota.
"""
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from io import BytesIO
from PIL import Image

from .models import Category


class AIAutofillTestCase(TestCase):
    """Test cases for the AI autofill endpoint."""

    def setUp(self):
        """Set up test client and create test user."""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

    def _create_test_image(self):
        """Create a simple test image in memory."""
        image = Image.new('RGB', (100, 100), color='red')
        image_io = BytesIO()
        image.save(image_io, 'JPEG')
        image_io.seek(0)
        image_io.name = 'test_image.jpg'
        return image_io

    @patch('market.ai_service.analyze_product_image')
    def test_ai_autofill_success(self, mock_analyze):
        """Test successful AI autofill with mocked response."""
        # Mock the analyze_product_image function return value
        mock_analyze.return_value = {
            'title': 'Vintage Camera',
            'description': 'A beautiful vintage film camera in excellent condition.',
            'category_suggestion': 'Electronics',
            'price_min': 50,
            'price_max': 100
        }

        # Create test image and make request
        image = self._create_test_image()
        response = self.client.post(
            '/api/market/products/ai-autofill/',
            {'image': image},
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Vintage Camera')
        self.assertEqual(response.data['price_min'], 50)
        self.assertEqual(response.data['price_max'], 100)
        self.assertIn('category_id', response.data)

    def test_ai_autofill_no_image(self):
        """Test error when no image is provided."""
        response = self.client.post(
            '/api/market/products/ai-autofill/',
            {},
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_ai_autofill_unauthenticated(self):
        """Test that unauthenticated users cannot use AI autofill."""
        self.client.force_authenticate(user=None)
        image = self._create_test_image()

        response = self.client.post(
            '/api/market/products/ai-autofill/',
            {'image': image},
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('market.ai_service.analyze_product_image')
    def test_ai_autofill_creates_new_category(self, mock_analyze):
        """Test that a new category is created if it doesn't exist."""
        # Mock the function return value with a new category
        mock_analyze.return_value = {
            'title': 'Test Product',
            'description': 'Test description',
            'category_suggestion': 'NewTestCategory',
            'price_min': 10,
            'price_max': 20
        }

        # Ensure category doesn't exist
        self.assertFalse(Category.objects.filter(name='NewTestCategory').exists())

        image = self._create_test_image()
        response = self.client.post(
            '/api/market/products/ai-autofill/',
            {'image': image},
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Category should now exist
        self.assertTrue(Category.objects.filter(name='NewTestCategory').exists())

    @patch('market.ai_service.analyze_product_image')
    def test_ai_autofill_api_error(self, mock_analyze):
        """Test handling of API errors."""
        # Mock an API error
        mock_analyze.side_effect = Exception("API Error")

        image = self._create_test_image()
        response = self.client.post(
            '/api/market/products/ai-autofill/',
            {'image': image},
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn('error', response.data)
