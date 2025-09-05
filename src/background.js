// background.js

importScripts('ExtPay.js') // or `import` / `require` if using a bundler

var extpay = ExtPay('tunevo-test'); // Careful! See note below
extpay.startBackground(); 