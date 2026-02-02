import { prisma } from '@/lib/prisma';
import { createHmac } from 'crypto';

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
  organizationId: string;
}

// Emit webhook event to all registered webhooks for an integration
export async function emitWebhook(
  organizationId: string,
  eventType: string,
  data: any
): Promise<void> {
  try {
    // Find all active webhooks for this event type
    const webhooks = await prisma.webhook.findMany({
      where: {
        integration: {
          organizationId,
          isActive: true,
          status: 'ACTIVE',
        },
        eventType,
        isActive: true,
      },
      include: {
        integration: true,
      },
    });

    // Send webhook to each registered endpoint
    for (const webhook of webhooks) {
      await sendWebhook(webhook, eventType, data, organizationId);
    }
  } catch (error) {
    console.error('Error emitting webhook:', error);
  }
}

// Send individual webhook with retry logic
async function sendWebhook(
  webhook: any,
  eventType: string,
  data: any,
  organizationId: string,
  attemptNumber: number = 1
): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Build payload
    const payload: WebhookPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
      organizationId,
    };

    // Generate signature
    const signature = createHmac('sha256', webhook.secret || '')
      .update(JSON.stringify(payload))
      .digest('hex');

    // Send HTTP request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), webhook.timeoutSeconds * 1000);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': eventType,
        'X-Webhook-Timestamp': payload.timestamp,
        'User-Agent': 'YourBooks-Webhook/1.0',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const executionTime = Date.now() - startTime;
    const responseBody = await response.text();

    // Log webhook execution
    await prisma.webhookLog.create({
      data: {
        webhookId: webhook.id,
        eventType,
        payload,
        responseStatus: response.status,
        responseBody: responseBody.substring(0, 1000), // Limit to 1000 chars
        success: response.ok,
        errorMessage: response.ok ? null : `HTTP ${response.status}`,
        executionTime,
        attemptNumber,
      },
    });

    // Update webhook status
    if (response.ok) {
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          lastTriggeredAt: new Date(),
          lastSuccess: new Date(),
          retryCount: 0,
        },
      });
    } else {
      // Handle failure
      await handleWebhookFailure(webhook, eventType, data, organizationId, attemptNumber, `HTTP ${response.status}`);
    }
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    
    // Log error
    await prisma.webhookLog.create({
      data: {
        webhookId: webhook.id,
        eventType,
        payload: { event: eventType, data },
        responseStatus: 0,
        responseBody: null,
        success: false,
        errorMessage: error.message,
        executionTime,
        attemptNumber,
      },
    });

    // Handle failure with retry
    await handleWebhookFailure(webhook, eventType, data, organizationId, attemptNumber, error.message);
  }
}

// Handle webhook failure with retry logic
async function handleWebhookFailure(
  webhook: any,
  eventType: string,
  data: any,
  organizationId: string,
  attemptNumber: number,
  errorMessage: string
): Promise<void> {
  // Update failure info
  await prisma.webhook.update({
    where: { id: webhook.id },
    data: {
      lastTriggeredAt: new Date(),
      lastFailure: new Date(),
      failureReason: errorMessage,
      retryCount: { increment: 1 },
    },
  });

  // Retry if not exceeded max retries
  if (attemptNumber < webhook.maxRetries) {
    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    const delay = Math.pow(2, attemptNumber) * 1000;
    
    setTimeout(() => {
      sendWebhook(webhook, eventType, data, organizationId, attemptNumber + 1);
    }, delay);
  } else {
    // Max retries exceeded, log error
    console.error(`Webhook ${webhook.id} failed after ${attemptNumber} attempts`);
    
    // Optionally disable webhook after too many failures
    const failedCount = await prisma.webhookLog.count({
      where: {
        webhookId: webhook.id,
        success: false,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    if (failedCount > 50) {
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: { isActive: false },
      });
      console.warn(`Webhook ${webhook.id} disabled after ${failedCount} failures in 24h`);
    }
  }
}

// Specific event emitters for common events

export async function emitInvoiceCreated(organizationId: string, invoice: any): Promise<void> {
  await emitWebhook(organizationId, 'invoice.created', invoice);
}

export async function emitInvoiceSent(organizationId: string, invoice: any): Promise<void> {
  await emitWebhook(organizationId, 'invoice.sent', invoice);
}

export async function emitInvoicePaid(organizationId: string, invoice: any): Promise<void> {
  await emitWebhook(organizationId, 'invoice.paid', invoice);
}

export async function emitInvoiceOverdue(organizationId: string, invoice: any): Promise<void> {
  await emitWebhook(organizationId, 'invoice.overdue', invoice);
}

export async function emitPaymentReceived(organizationId: string, payment: any): Promise<void> {
  await emitWebhook(organizationId, 'payment.received', payment);
}

export async function emitBillCreated(organizationId: string, bill: any): Promise<void> {
  await emitWebhook(organizationId, 'bill.created', bill);
}

export async function emitBillPaid(organizationId: string, bill: any): Promise<void> {
  await emitWebhook(organizationId, 'bill.paid', bill);
}

export async function emitCustomerCreated(organizationId: string, customer: any): Promise<void> {
  await emitWebhook(organizationId, 'customer.created', customer);
}

export async function emitTransactionPosted(organizationId: string, transaction: any): Promise<void> {
  await emitWebhook(organizationId, 'transaction.posted', transaction);
}
