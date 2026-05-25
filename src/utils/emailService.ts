import emailjs from '@emailjs/browser';

// ============================================================
// EmailJS Configuration — SmartZone SMTP
// ============================================================
// HOW TO SET UP (one-time setup):
//
// 1. Go to https://www.emailjs.com/ and create a FREE account
//
// 2. Add Email Service:
//    Dashboard → Email Services → Add New Service → Custom SMTP
//    Name:       SmartZone
//    SMTP Host:  smtp.smartzone.com.lk
//    SMTP Port:  465
//    Username:   admin@smartzone.com.lk
//    Password:   Pamidu12345@
//    Security:   SSL/TLS
//    Click "Create Service" → copy the Service ID below
//
// 3. Create Template 1 — Order Notification (template_new_order):
//    Dashboard → Email Templates → Create New Template
//    Name it "template_new_order"
//    Required variables: {{to_email}}, {{to_name}}, {{order_id}},
//      {{customer_name}}, {{customer_email}}, {{customer_phone}},
//      {{shipping_address}}, {{order_items}}, {{subtotal}},
//      {{delivery_charge}}, {{total}}, {{payment_method}},
//      {{notes}}, {{order_date}}, {{subject}}
//
// 4. Create Template 2 — Status Update (template_status_update):
//    Name it "template_status_update"
//    Required variables: {{to_email}}, {{to_name}}, {{order_id}},
//      {{customer_name}}, {{new_status}}, {{status_message}},
//      {{total}}, {{tracking_number}}, {{subject}}
//
// 5. Create Template 3 — Password Reset (template_password_reset):
//    Name it "template_password_reset"
//    Required variables: {{to_email}}, {{to_name}}, {{reset_link}}, {{subject}}
//
// 6. Go to Account → General → Public Key → copy it below
// ============================================================

const EMAILJS_SERVICE_ID = 'service_smartzone';      // ← Replace with your EmailJS Service ID after setup
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';         // ← Replace with your EmailJS Public Key after setup

// Template IDs — must match what you created in EmailJS dashboard
const TEMPLATE_NEW_ORDER = 'template_new_order';      // Order confirmation (to customer + admin)
const TEMPLATE_STATUS_UPDATE = 'template_status_update'; // Order status update to customer
const TEMPLATE_PASSWORD_RESET = 'template_password_reset'; // Password reset link

// Admin email — all order notifications go here
const ADMIN_EMAIL = 'admin@smartzone.com.lk';

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

/**
 * Send password reset link email to user
 * Called after Firebase generates the reset link via sendPasswordResetEmail()
 */
export const sendPasswordResetNotification = async (
  userEmail: string,
  userName: string,
  resetLink: string
): Promise<void> => {
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_PASSWORD_RESET, {
      to_email: userEmail,
      to_name: userName || 'Valued Customer',
      from_name: 'SmartZone',
      subject: '🔑 Reset Your SmartZone Password',
      reset_link: resetLink,
    }, EMAILJS_PUBLIC_KEY);
    console.log('Password reset email sent successfully via SmartZone SMTP');
  } catch (error) {
    console.error('Failed to send password reset email via EmailJS:', error);
    // Firebase's built-in reset email is still sent as a fallback
  }
};
