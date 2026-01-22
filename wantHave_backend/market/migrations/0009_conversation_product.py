# Generated migration for adding product to Conversation

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('market', '0008_order_payment_stripewebhookevent_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='conversation',
            name='product',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='conversations',
                to='market.product',
            ),
        ),
    ]
