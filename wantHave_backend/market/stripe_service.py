"""
Stripe integration service for WantHave marketplace.
Handles checkout session creation, webhook processing, and payment verification.
"""

import stripe
from django.conf import settings
from django.utils import timezone
from decimal import Decimal
from typing import Optional, Dict, Any
from .models import Order, Payment, Product, StripeWebhookEvent

# Initialize Stripe with secret key
stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeService:
    """Centralized service for Stripe operations"""

    PLATFORM_FEE_PERCENTAGE = Decimal('0.10')  # 10% platform fee

    @staticmethod
    def calculate_fees(product_price: Decimal) -> Dict[str, Decimal]:
        """
        Calculate platform fee and seller payout amount.

        Args:
            product_price: Original product price

        Returns:
            Dict with 'platform_fee' and 'seller_amount'
        """
        platform_fee = product_price * StripeService.PLATFORM_FEE_PERCENTAGE
        seller_amount = product_price - platform_fee

        return {
            'platform_fee': platform_fee.quantize(Decimal('0.01')),
            'seller_amount': seller_amount.quantize(Decimal('0.01'))
        }

    @staticmethod
    def create_checkout_session(
        product: Product,
        buyer_user,
        success_url: str,
        cancel_url: str
    ) -> Dict[str, Any]:
        """
        Create a Stripe Checkout session for product purchase.

        Args:
            product: Product to purchase
            buyer_user: User making the purchase
            success_url: URL to redirect after successful payment
            cancel_url: URL to redirect if checkout is cancelled

        Returns:
            Dict with 'session_id', 'url', and 'order_id'

        Raises:
            ValueError: If product is not available or user is seller
            stripe.error.StripeError: If Stripe API call fails
        """
        # Validation
        if product.status != 'AVAILABLE':
            raise ValueError('Product is not available for purchase')

        if product.seller == buyer_user:
            raise ValueError('Cannot purchase your own product')

        # Calculate fees
        fees = StripeService.calculate_fees(product.price)

        # Create Order record
        order = Order.objects.create(
            product=product,
            buyer=buyer_user,
            seller=product.seller,
            price=product.price,
            platform_fee=fees['platform_fee'],
            seller_amount=fees['seller_amount'],
            status='PENDING'
        )

        try:
            # Get product image URL (handle both absolute and relative URLs)
            product_images = []
            if product.image:
                image_url = product.image.url
                # If it's a relative URL, we need to make it absolute
                if not image_url.startswith('http'):
                    # For production, you'd use your actual domain
                    # For now, we'll skip the image if it's relative
                    pass
                else:
                    product_images = [image_url]

            # Create Stripe Checkout Session
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'eur',
                        'unit_amount': int(product.price * 100),  # Convert to cents
                        'product_data': {
                            'name': product.title,
                            'description': product.description[:500] if product.description else '',
                        },
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=success_url,
                cancel_url=cancel_url,
                customer_email=buyer_user.email if buyer_user.email else None,
                metadata={
                    'order_id': str(order.id),
                    'product_id': str(product.id),
                    'buyer_id': str(buyer_user.id),
                    'seller_id': str(product.seller.id),
                },
                payment_intent_data={
                    'metadata': {
                        'order_id': str(order.id),
                        'product_id': str(product.id),
                    }
                }
            )

            # Update order with session ID
            order.stripe_checkout_session_id = session.id
            order.save(update_fields=['stripe_checkout_session_id'])

            return {
                'session_id': session.id,
                'url': session.url,
                'order_id': order.id
            }

        except stripe.error.StripeError as e:
            # If Stripe fails, cancel the order
            order.status = 'FAILED'
            order.save(update_fields=['status'])
            raise

    @staticmethod
    def handle_checkout_session_completed(session_data: Dict[str, Any]) -> Optional[Order]:
        """
        Process successful checkout session completion.

        Args:
            session_data: Stripe checkout session data from webhook

        Returns:
            Order object if successful, None if order not found
        """
        session_id = session_data.get('id')
        payment_intent_id = session_data.get('payment_intent')

        try:
            order = Order.objects.get(stripe_checkout_session_id=session_id)
        except Order.DoesNotExist:
            return None

        # Don't process if already paid
        if order.status == 'PAID':
            return order

        # Update order status
        order.status = 'PAID'
        order.paid_at = timezone.now()
        order.save(update_fields=['status', 'paid_at'])

        # Update product status
        product = order.product
        product.status = 'SOLD'
        product.buyer = order.buyer
        product.sold_at = timezone.now()
        product.save(update_fields=['status', 'buyer', 'sold_at'])

        # Create payment record
        Payment.objects.create(
            order=order,
            stripe_payment_intent_id=payment_intent_id,
            amount=order.price,
            currency='EUR',
            successful=True,
            processed_at=timezone.now(),
            stripe_raw_data=session_data
        )

        return order

    @staticmethod
    def handle_payment_intent_succeeded(payment_intent_data: Dict[str, Any]) -> Optional[Payment]:
        """
        Process successful payment intent.

        Args:
            payment_intent_data: Stripe payment intent data from webhook

        Returns:
            Payment object if successful, None if not found
        """
        payment_intent_id = payment_intent_data.get('id')

        try:
            payment = Payment.objects.get(stripe_payment_intent_id=payment_intent_id)

            # Update charge ID if available
            charges = payment_intent_data.get('charges', {}).get('data', [])
            if charges:
                payment.stripe_charge_id = charges[0].get('id', '')
                payment.save(update_fields=['stripe_charge_id'])

            return payment

        except Payment.DoesNotExist:
            # Payment might not exist yet if checkout.session.completed hasn't fired
            return None

    @staticmethod
    def poll_checkout_session_status(order: Order) -> Dict[str, Any]:
        """
        Poll Stripe API for checkout session status and update order if paid.
        Used in VPN environments where webhooks cannot reach the backend.

        Args:
            order: Order object to check

        Returns:
            Dict with:
                - order_id: int
                - previous_status: str
                - new_status: str
                - payment_status: str
                - updated: bool
                - error: str (optional, if error occurred)
        """
        import logging
        logger = logging.getLogger('market.payment_polling')

        # Update polling metadata
        previous_status = order.status
        order.last_polled_at = timezone.now()
        order.poll_count += 1
        order.save(update_fields=['last_polled_at', 'poll_count'])

        try:
            # Retrieve session from Stripe
            session = stripe.checkout.Session.retrieve(
                order.stripe_checkout_session_id,
                expand=['payment_intent']
            )

            payment_status = session.payment_status  # 'paid', 'unpaid', 'no_payment_required'

            # If paid, use existing handler for idempotent processing
            if payment_status == 'paid' and order.status == 'PENDING':
                StripeService.handle_checkout_session_completed(session)
                return {
                    'order_id': order.id,
                    'previous_status': previous_status,
                    'new_status': 'PAID',
                    'payment_status': payment_status,
                    'updated': True
                }

            # If session expired, mark as failed
            elif session.status == 'expired' and order.status == 'PENDING':
                order.status = 'FAILED'
                order.save(update_fields=['status'])
                return {
                    'order_id': order.id,
                    'previous_status': previous_status,
                    'new_status': 'FAILED',
                    'payment_status': payment_status,
                    'updated': True
                }

            # No change
            return {
                'order_id': order.id,
                'previous_status': previous_status,
                'new_status': order.status,
                'payment_status': payment_status,
                'updated': False
            }

        except stripe.error.StripeError as e:
            # Log error but don't fail the entire polling run
            logger.error(f"Stripe API error polling order {order.id}: {str(e)}")
            return {
                'order_id': order.id,
                'previous_status': previous_status,
                'new_status': order.status,
                'payment_status': 'error',
                'updated': False,
                'error': str(e)
            }

    @staticmethod
    def create_offer_checkout_session(
        offer,
        success_url: str,
        cancel_url: str
    ) -> Dict[str, Any]:
        """
        Create a Stripe Checkout session for an accepted offer.
        Uses the negotiated offer amount instead of the product's original price.

        Args:
            offer: Offer object to pay for
            success_url: URL to redirect after successful payment
            cancel_url: URL to redirect if checkout is cancelled

        Returns:
            Dict with 'session_id', 'url', and 'order_id'

        Raises:
            ValueError: If offer is not eligible for payment
            stripe.error.StripeError: If Stripe API call fails
        """
        from .models import Offer  # Import here to avoid circular import

        product = offer.product

        # Validation
        if offer.status != 'ACCEPTED':
            raise ValueError('Offer must be accepted before payment')

        if product.status != 'AVAILABLE':
            raise ValueError('Product is not available for purchase')

        # Use offer amount for fees calculation
        amount = offer.amount
        fees = StripeService.calculate_fees(amount)

        # Create Order record with offer amount
        order = Order.objects.create(
            product=product,
            buyer=offer.buyer,
            seller=offer.seller,
            price=amount,  # Use offer amount, not product.price
            platform_fee=fees['platform_fee'],
            seller_amount=fees['seller_amount'],
            status='PENDING'
        )

        try:
            # Create Stripe Checkout Session
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'eur',
                        'unit_amount': int(amount * 100),  # Convert to cents
                        'product_data': {
                            'name': product.title,
                            'description': f'Negotiated price: €{amount} (Original: €{product.price})',
                        },
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=success_url,
                cancel_url=cancel_url,
                customer_email=offer.buyer.email if offer.buyer.email else None,
                metadata={
                    'order_id': str(order.id),
                    'product_id': str(product.id),
                    'offer_id': str(offer.id),
                    'buyer_id': str(offer.buyer.id),
                    'seller_id': str(offer.seller.id),
                },
                payment_intent_data={
                    'metadata': {
                        'order_id': str(order.id),
                        'product_id': str(product.id),
                        'offer_id': str(offer.id),
                    }
                }
            )

            # Update order with session ID
            order.stripe_checkout_session_id = session.id
            order.save(update_fields=['stripe_checkout_session_id'])

            # Update offer status to PAID will happen in webhook handler
            # For now, we just return the checkout URL

            return {
                'session_id': session.id,
                'url': session.url,
                'order_id': order.id
            }

        except stripe.error.StripeError as e:
            # If Stripe fails, cancel the order
            order.status = 'FAILED'
            order.save(update_fields=['status'])
            raise

    @staticmethod
    def verify_webhook_signature(payload: bytes, sig_header: str) -> Dict[str, Any]:
        """
        Verify Stripe webhook signature and return event data.

        Args:
            payload: Raw request body bytes
            sig_header: Stripe-Signature header value

        Returns:
            Verified event data

        Raises:
            stripe.error.SignatureVerificationError: If signature is invalid
        """
        return stripe.Webhook.construct_event(
            payload,
            sig_header,
            settings.STRIPE_WEBHOOK_SECRET
        )

