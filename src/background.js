// background.js

importScripts('ExtPay.js')

// Initialize ExtPay with your extension ID
const extpay = ExtPay('tunevo-test');
extpay.startBackground(); // Required to use ExtPay in the rest of your extension

// Log user status for debugging
extpay.getUser().then((user) => {
  console.log('Tunevo user status:', user);
}); 