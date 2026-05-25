import emailjs from '@emailjs/browser';

// ============================================================
// EmailJS Configuration
// ============================================================
// IMPORTANT: Replace these with your actual EmailJS credentials
// 1. Go to https://www.emailjs.com/ and create a free account
// 2. Add Gmail service (smartzonelk101@gmail.com)
// 3. Create email templates (see below for template variables)
// 4. Copy the IDs here
// ============================================================

const EMAILJS_SERVICE_ID = 'service_smartzone';    // Replace with your EmailJS Service ID
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';       // Replace with your EmailJS Public Key

// Template IDs
const TEMPLATE_NEW_ORDER = 'template_new_order';           // For admin notification + customer confirmation
const TEMPLATE_STATUS_UPDATE = 'template_status_update';   // For status update emails

// Admin email
const ADMIN_EMAIL = 'smartzonelk101@gmail.com';

interface OrderEmailData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  items: {
    productName: string;
    price: number;
    quantity: number;
  }[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
  notes?: string;
  paymentMethod?: string;
}

/**
 * Format order items into a readable string for email
 */
const formatItems = (items: OrderEmailData['items']): string => {
  return items.map((item, i) =>
    `${i + 1}. ${item.productName} × ${item.quantity} — Rs. ${(item.price * item.quantity).toLocaleString()}`
  ).join('\n');
};

/**
 * Send order confirmation email to Admin
 */
export const sendOrderEmailToAdmin = async (order: OrderEmailData): Promise<void> => {
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_NEW_ORDER, {
      to_email: ADMIN_EMAIL,
      to_name: 'Admin',
      from_name: 'SmartZone Orders',
      subject: `🛒 New Order #${order.orderId.slice(0, 8).toUpperCase()} from ${order.customerName}`,
      order_id: order.orderId.slice(0, 8).toUpperCase(),
      customer_name: order.customerName,
      customer_email: order.customerEmail,
      customer_phone: order.customerPhone,
      shipping_address: order.shippingAddress,
      order_items: formatItems(order.items),
      subtotal: `Rs. ${order.subtotal.toLocaleString()}`,
      delivery_charge: `Rs. ${order.deliveryCharge.toLocaleString()}`,
      total: `Rs. ${order.total.toLocaleString()}`,
      payment_method: order.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'Cash on Delivery',
      notes: order.notes || 'No notes',
      order_date: new Date().toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'short',
      }),
    }, EMAILJS_PUBLIC_KEY);
    console.log('Admin email sent successfully');
  } catch (error) {
    console.error('Failed to send admin email:', error);
  }
};

/**
 * Send order confirmation email to Customer
 */
export const sendOrderEmailToCustomer = async (order: OrderEmailData): Promise<void> => {
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_NEW_ORDER, {
      to_email: order.customerEmail,
      to_name: order.customerName,
      from_name: 'SmartZone',
      subject: `✅ Order Confirmed #${order.orderId.slice(0, 8).toUpperCase()} — Thank You!`,
      order_id: order.orderId.slice(0, 8).toUpperCase(),
      customer_name: order.customerName,
      customer_email: order.customerEmail,
      customer_phone: order.customerPhone,
      shipping_address: order.shippingAddress,
      order_items: formatItems(order.items),
      subtotal: `Rs. ${order.subtotal.toLocaleString()}`,
      delivery_charge: `Rs. ${order.deliveryCharge.toLocaleString()}`,
      total: `Rs. ${order.total.toLocaleString()}`,
      payment_method: order.paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'Cash on Delivery',
      notes: order.notes || 'No notes',
      order_date: new Date().toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'short',
      }),
    }, EMAILJS_PUBLIC_KEY);
    console.log('Customer confirmation email sent successfully');
  } catch (error) {
    console.error('Failed to send customer email:', error);
  }
};

/**
 * Send order status update email to Customer
 */
export const sendStatusUpdateEmail = async (
  order: {
    id: string;
    customerName: string;
    customerEmail: string;
    total: number;
    trackingNumber?: string;
  },
  newStatus: string
): Promise<void> => {
  const statusMessages: Record<string, string> = {
    pending: 'Your order is pending confirmation.',
    processing: 'Great news! Your order is now being processed and prepared for shipment.',
    shipped: `Your order has been shipped! ${order.trackingNumber ? `Tracking number: ${order.trackingNumber}` : 'You will receive tracking details shortly.'}`,
    delivered: 'Your order has been delivered! Thank you for shopping with SmartZone. 🎉',
    cancelled: 'Your order has been cancelled. If you have any questions, please contact us.',
  };

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_STATUS_UPDATE, {
      to_email: order.customerEmail,
      to_name: order.customerName,
      from_name: 'SmartZone',
      subject: `📦 Order #${order.id.slice(0, 8).toUpperCase()} — Status: ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
      order_id: order.id.slice(0, 8).toUpperCase(),
      customer_name: order.customerName,
      new_status: newStatus.charAt(0).toUpperCase() + newStatus.slice(1),
      status_message: statusMessages[newStatus] || `Your order status has been updated to: ${newStatus}`,
      total: `Rs. ${order.total.toLocaleString()}`,
      tracking_number: order.trackingNumber || 'Not yet assigned',
    }, EMAILJS_PUBLIC_KEY);
    console.log('Status update email sent successfully');
  } catch (error) {
    console.error('Failed to send status update email:', error);
  }
};
