"""
AI Service for product image analysis using Google Gemini Pro.
Analyzes uploaded product images and suggests title, description, category, and price.
"""
import os
import base64
import json
import google.generativeai as genai
from django.conf import settings


def analyze_product_image(image_file):
    """
    Analyze a product image using Gemini Pro Vision.
    
    Args:
        image_file: An uploaded image file (from request.FILES)
    
    Returns:
        dict with keys: title, description, category_suggestion, price_min, price_max
    """
    api_key = os.environ.get('GEMINI_API_KEY')
    
    if not api_key:
        return {
            'error': 'GEMINI_API_KEY environment variable not set',
            'title': '',
            'description': '',
            'category_suggestion': '',
            'price_min': 0,
            'price_max': 0
        }
    
    try:
        # Configure the Gemini API
        genai.configure(api_key=api_key)
        
        # Read image bytes
        image_bytes = image_file.read()
        image_file.seek(0)  # Reset file pointer for potential later use
        
        # Create the model - user has quota for this model (10 RPM, 20 RPD)
        model = genai.GenerativeModel('gemini-2.5-flash-lite')
        
        # Prepare the image for the API using PIL
        import io
        from PIL import Image
        
        # Load image with PIL for better compatibility
        img = Image.open(io.BytesIO(image_bytes))
        
        # Create the prompt
        prompt = """Analyze this product image for a second-hand marketplace listing.

Please provide the following information in JSON format:
{
    "title": "A concise, descriptive title for the product (max 100 chars)",
    "description": "A detailed description of the product including condition, features, and any visible details (2-3 sentences)",
    "category_suggestion": "The most appropriate category for this product (e.g., Electronics, Clothing, Furniture, Books, Sports, Toys, Home & Garden, etc.)",
    "price_min": <minimum suggested price in EUR as a number>,
    "price_max": <maximum suggested price in EUR as a number>
}

Consider the apparent condition of the item when suggesting prices.
Respond ONLY with valid JSON, no additional text."""

        # Generate content with image
        response = model.generate_content([prompt, img])
        
        # Parse the response
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            lines = response_text.split('\n')
            response_text = '\n'.join(lines[1:-1])
        
        result = json.loads(response_text)
        
        # Ensure all required fields exist
        return {
            'title': result.get('title', ''),
            'description': result.get('description', ''),
            'category_suggestion': result.get('category_suggestion', ''),
            'price_min': float(result.get('price_min', 0)),
            'price_max': float(result.get('price_max', 0))
        }
        
    except json.JSONDecodeError as e:
        return {
            'error': f'Failed to parse AI response: {str(e)}',
            'title': '',
            'description': '',
            'category_suggestion': '',
            'price_min': 0,
            'price_max': 0
        }
    except Exception as e:
        return {
            'error': f'AI analysis failed: {str(e)}',
            'title': '',
            'description': '',
            'category_suggestion': '',
            'price_min': 0,
            'price_max': 0
        }
