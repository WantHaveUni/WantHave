"""
Django management command to poll Stripe API for pending payment status updates.
Used in VPN environments where webhooks cannot reach the backend.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from market.models import Order
from market.stripe_service import StripeService
import logging
import time

logger = logging.getLogger('market.payment_polling')


class Command(BaseCommand):
    help = 'Poll Stripe API for pending payment status updates'

    def add_arguments(self, parser):
        parser.add_argument(
            '--max-orders',
            type=int,
            default=100,
            help='Maximum number of orders to check per run (default: 100)'
        )
        parser.add_argument(
            '--age-hours',
            type=int,
            default=24,
            help='Only check orders created within N hours (default: 24)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview mode without making changes'
        )

    def handle(self, *args, **options):
        max_orders = options['max_orders']
        age_hours = options['age_hours']
        dry_run = options['dry_run']

        logger.info("=" * 60)
        logger.info("Starting payment polling run")
        if dry_run:
            logger.info("DRY RUN MODE - No changes will be saved")

        start_time = time.time()

        # Query pending orders created within last N hours
        cutoff_time = timezone.now() - timedelta(hours=age_hours)
        pending_orders = Order.objects.filter(
            status='PENDING',
            created_at__gte=cutoff_time
        ).order_by('created_at')[:max_orders]

        total_orders = pending_orders.count()
        logger.info(f"Found {total_orders} pending orders to check")

        if dry_run:
            for order in pending_orders:
                logger.info(f"Would poll Order #{order.id} (session: {order.stripe_checkout_session_id})")
            logger.info("=" * 60)
            return

        # Process each order
        updated_count = 0
        error_count = 0

        for order in pending_orders:
            try:
                result = StripeService.poll_checkout_session_status(order)

                if result.get('updated'):
                    updated_count += 1
                    logger.info(
                        f"Order #{result['order_id']}: "
                        f"{result['previous_status']} -> {result['new_status']} "
                        f"(payment_status: {result['payment_status']})"
                    )
                else:
                    logger.debug(
                        f"Order #{result['order_id']}: "
                        f"No change (payment_status: {result['payment_status']})"
                    )

                if result.get('error'):
                    error_count += 1

                # Rate limiting: ~1.5 requests/second (conservative)
                time.sleep(0.67)

            except Exception as e:
                error_count += 1
                logger.error(f"Error polling order {order.id}: {str(e)}")
                continue

        elapsed = time.time() - start_time
        logger.info(
            f"Completed: {total_orders} checked, {updated_count} updated, "
            f"{error_count} errors in {elapsed:.1f}s"
        )
        logger.info("=" * 60)
