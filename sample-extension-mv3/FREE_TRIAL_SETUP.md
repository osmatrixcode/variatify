# Free Trial System Setup

This extension now includes a simple free trial system using ExtPay. Here's how it works:

## Features

1. **7-Day Free Trial**: Users can start a 7-day free trial without payment
2. **Trial Status Display**: Shows remaining trial days in both popup and content script
3. **Automatic Expiration**: Trial automatically expires after 7 days
4. **Seamless Upgrade**: Users can upgrade to paid during or after trial

## How It Works

### User Flow
1. **New User**: Sees "Start Free Trial" button
2. **Trial Active**: Shows "Free trial active! X days remaining"
3. **Trial Expired**: Shows "Free trial expired. Please upgrade to continue!"
4. **Paid User**: Shows "User has paid! 🎉"

### Key Functions

- `isTrialActive(user)`: Checks if trial is still valid
- `getTrialDaysRemaining(user)`: Calculates days left in trial
- `updateUI(user)`: Updates interface based on user status

### ExtPay Integration

- `extpay.openTrialPage("7-day")`: Opens trial signup page
- `extpay.onTrialStarted.addListener()`: Handles trial start events
- `extpay.onPaid.addListener()`: Handles payment events

## Files Modified

- `popup.html`: Added trial button and status display
- `popup.js`: Added trial logic and UI updates
- `content.js`: Added trial-aware content script buttons

## Testing

1. Load the extension in development mode
2. Click "Start Free Trial" to test trial flow
3. Check that trial status updates correctly
4. Test payment flow after trial expires

## Configuration

To change trial duration, modify `TRIAL_DURATION` in `popup.js`:
```javascript
const TRIAL_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
```
