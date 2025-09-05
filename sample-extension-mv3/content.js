/*
 * This is an example of how you would add ExtPay to a content script.
 * ExtPay is made available in this script through the manifest.json
 * "content_scripts" -> "js" array.
 */
const extpay = ExtPay("tunevo-test");

// Check user status and show appropriate buttons
extpay.getUser().then((user) => {
  // Create container for buttons
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 10000;
    background: white;
    border: 2px solid #333;
    padding: 10px;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  `;

  // Add status text
  const status = document.createElement("p");
  status.style.margin = "0 0 10px 0";
  status.style.fontSize = "14px";
  
  if (user.paid) {
    status.textContent = "✅ Premium Active";
  } else if (user.trialStartedAt) {
    const now = new Date();
    const trialEnd = new Date(user.trialStartedAt.getTime() + (7 * 24 * 60 * 60 * 1000));
    if (now < trialEnd) {
      const daysRemaining = Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000));
      status.textContent = `⏰ Trial: ${daysRemaining} days left`;
    } else {
      status.textContent = "❌ Trial Expired";
    }
  } else {
    status.textContent = "🚀 Try Premium Free";
  }
  
  container.appendChild(status);

  // Add appropriate button
  const button = document.createElement("button");
  button.style.cssText = `
    background: #007bff;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  `;
  
  if (user.paid) {
    button.textContent = "Manage Subscription";
    button.addEventListener("click", () => extpay.openPaymentPage());
  } else if (user.trialStartedAt) {
    const now = new Date();
    const trialEnd = new Date(user.trialStartedAt.getTime() + (7 * 24 * 60 * 60 * 1000));
    if (now < trialEnd) {
      button.textContent = "Upgrade Now";
      button.addEventListener("click", () => extpay.openPaymentPage());
    } else {
      button.textContent = "Upgrade Now";
      button.addEventListener("click", () => extpay.openPaymentPage());
    }
  } else {
    button.textContent = "Start Free Trial";
    button.addEventListener("click", () => extpay.openTrialPage("7-day"));
  }

  container.appendChild(button);
  document.body.prepend(container);
}).catch((err) => {
  console.error("ExtPay error in content script:", err);
});
