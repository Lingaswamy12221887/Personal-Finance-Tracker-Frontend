// src/services/notificationService.js
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Send email notification
 */
export const sendEmailNotification = async (transactionData) => {
  try {
    const response = await fetch(`${API_URL}/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionData),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Email notification error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send SMS notification
 */
export const sendSMSNotification = async (transactionData) => {
  try {
    const response = await fetch(`${API_URL}/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionData),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('SMS notification error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send both email and SMS notifications
 */
export const sendAllNotifications = async (transactionData) => {
  try {
    const response = await fetch(`${API_URL}/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionData),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Notification error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if server is running
 */
export const checkServerHealth = async () => {
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Server health check failed:', error);
    return { status: 'offline' };
  }
};
