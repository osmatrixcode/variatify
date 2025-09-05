# Testing Guide for Tunevo Extension

## Setup Instructions

1. **Register on ExtensionPay.com**:
   - Go to [ExtensionPay.com](https://extensionpay.com)
   - Sign up for an account
   - Register your extension and get an extension ID
   - Configure a lifetime payment plan

2. **Update Extension ID**:
   - Replace `tunevo-test` with your actual extension ID in:
     - `background.js` (line 7)
     - `popup.js` (line 5)

3. **Install Extension**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select this folder
   - The extension should appear in your extensions list

## Testing Scenarios

### 1. New User Flow
1. **Fresh Install**: Install the extension for the first time
2. **Expected Behavior**: 
   - Popup shows "Start Free Trial" button
   - Status message: "🚀 Start your 7-day free trial to experience Tunevo Extension!"
3. **Action**: Click "Start Free Trial"
4. **Expected**: Opens ExtensionPay trial page where user enters email

### 2. Trial User Flow
1. **After Starting Trial**: User has started trial (check email confirmation)
2. **Expected Behavior**:
   - Popup shows countdown timer with time remaining
   - Status message: "🎉 You're enjoying your free trial!"
   - "Upgrade to Lifetime" button visible
3. **Action**: Check countdown timer updates every second
4. **Expected**: Timer shows decreasing time (days, hours, minutes, seconds)

### 3. Trial Expired Flow
1. **After 7 Days**: Wait for trial to expire (or modify time in code for testing)
2. **Expected Behavior**:
   - Popup shows "Expired" in countdown
   - Status message: "⏰ Your free trial has expired. Upgrade now for lifetime access!"
   - "Pay Now - Lifetime Access" button visible
3. **Action**: Click "Pay Now"
4. **Expected**: Opens ExtensionPay payment page

### 4. Paid User Flow
1. **After Payment**: Complete payment process
2. **Expected Behavior**:
   - Popup shows "✅ You have lifetime access to Tunevo Extension!"
   - "Manage Subscription" button visible
   - No countdown timer
3. **Action**: Click "Manage Subscription"
4. **Expected**: Opens ExtensionPay management page

### 5. Content Script Notifications
1. **On Any Web Page**: Navigate to any website
2. **Expected Behavior**:
   - New users: See "Start Your Free Trial" notification
   - Trial users: See "Free Trial Active" with time remaining
   - Expired users: See "Trial Expired" notification
   - Paid users: No notifications (or minimal notifications)

## Debugging

### Console Logs
Open browser DevTools (F12) and check console for:
- `Background: User data:` - Shows user status from background script
- `User data:` - Shows user status in popup
- `Content script: User has access` - Shows access status on web pages

### Common Issues

1. **Extension ID Mismatch**:
   - Error: "ExtPay error while fetching user"
   - Solution: Ensure all files use the same extension ID

2. **Trial Not Starting**:
   - Error: Trial page doesn't open
   - Solution: Check ExtensionPay configuration and internet connection

3. **Countdown Not Updating**:
   - Error: Timer shows static time
   - Solution: Check console for JavaScript errors

4. **Payment Not Working**:
   - Error: Payment page doesn't open
   - Solution: Verify ExtensionPay payment configuration

### Test Mode
- Use ExtensionPay's test mode for development
- Test with Stripe test cards (4242 4242 4242 4242)
- Verify trial countdown accuracy
- Test payment flow end-to-end

## Expected File Structure
```
├── background.js          # Background service worker
├── content.js            # Content script for notifications
├── ExtPay.js            # ExtensionPay library
├── manifest.json        # Extension manifest
├── popup.html           # Popup interface
├── popup.js             # Popup logic
├── README.md            # Documentation
└── TESTING.md           # This testing guide
```

## Success Criteria
- ✅ New users can start free trial
- ✅ Trial countdown shows accurate time remaining
- ✅ Trial expires after 7 days
- ✅ Users can upgrade to lifetime access
- ✅ Paid users have full access
- ✅ Content script shows appropriate notifications
- ✅ All buttons and links work correctly
- ✅ No JavaScript errors in console
