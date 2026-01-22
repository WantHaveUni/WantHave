
import os
import django
from django.urls import resolve, get_resolver

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "wantHave_com.settings")
django.setup()

path = '/api/market/products/ai-autofill/'
try:
    match = resolve(path)
    print(f"Successfully resolved {path}")
    print(f"View name: {match.view_name}")
    print(f"Func: {match.func}")
except Exception as e:
    print(f"Failed to resolve {path}: {e}")

# Also print all product URLs
from market.urls import router
print("\nRouter URLs:")
for url in router.urls:
    print(url)
