import { Inject, Injectable, Logger } from '@nestjs/common';
import { envs, NATS_SERVICE } from 'src/config';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { Request, Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PaymentsService {
  private readonly stripe = new Stripe(envs.STRIPE_SECRET_KEY);
  private readonly logger = new Logger(PaymentsService.name);

  constructor(@Inject(NATS_SERVICE) private readonly natsClient: ClientProxy) {}

  async createPaymentSession(paymentSessionDto: PaymentSessionDto) {
    const { currency, items, orderId } = paymentSessionDto;

    const lineItems = items.map((item) => {
      return {
        price_data: {
          currency: currency,
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100), // 20.00 USD
        },
        quantity: item.quantity,
      };
    });

    const session = await this.stripe.checkout.sessions.create({
      payment_intent_data: {
        metadata: {
          orderId: orderId,
        },
      },
      line_items: lineItems,
      mode: 'payment',
      success_url: envs.STRIPE_SUCCESS_URL,
      cancel_url: envs.STRIPE_CANCEL_URL,
    });

    return {
      url: session.url,
      cancelUrl: session.cancel_url,
      successUrl: session.success_url,
    };
  }

  async stripeWebhookHandler(request: Request, response: Response) {
    const stripeSignature = request.headers['stripe-signature'];
    const body = request['rawBody'];
    const endpointSecret = envs.STRIPE_ENDPOINT_SECRET;

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        body,
        stripeSignature,
        endpointSecret,
      );
    } catch (error) {
      response.status(400).send(`Webhook Error: ${error.message}`);
      return;
    }

    switch (event.type) {
      case 'charge.succeeded':
        const paymentIntent = event.data.object;

        const payload = {
          stripePaymentId: paymentIntent.id,
          orderId: paymentIntent.metadata.orderId,
          receiptUrl: paymentIntent.receipt_url,
        };

        this.natsClient.emit('payment.succeeded', payload);

        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
        break;
    }

    return response.sendStatus(200);
  }
}
