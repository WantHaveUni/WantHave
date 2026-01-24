# Generated manually to clean up orphan database columns

from django.db import migrations, connection


def remove_orphan_columns(apps, schema_editor):
    """Remove columns that exist in DB but not in model"""
    cursor = connection.cursor()
    
    # Get current columns
    cursor.execute("PRAGMA table_info(market_userprofile)")
    existing_columns = {row[1] for row in cursor.fetchall()}
    
    # Columns to remove (orphans not in model)
    orphan_columns = ['phone', 'phone_verified', 'gender', 'postal_code', 'date_of_birth', 'year']
    
    for col in orphan_columns:
        if col in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE market_userprofile DROP COLUMN {col}")
                print(f"Removed orphan column: {col}")
            except Exception as e:
                print(f"Could not remove {col}: {e}")


class Migration(migrations.Migration):

    dependencies = [
        ('market', '0014_watchlistitem'),
    ]

    operations = [
        migrations.RunPython(remove_orphan_columns, migrations.RunPython.noop),
    ]
