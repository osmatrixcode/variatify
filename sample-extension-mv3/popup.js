// Replace 'sample-extension' with the id of the extension you
// registered on ExtensionPay.com to test payments. You may need to
// uninstall and reinstall the extension to make it work.
// Don't forget to change the ID in background.js too!
const extpay = ExtPay("tunevo-test");

// Trial duration in milliseconds (7 days)
const TRIAL_DURATION = 7 * 24 * 60 * 60 * 1000;

// Get DOM elements
const statusEl = document.getElementById("status");
const trialBtn = document.getElementById("trial-btn");
const payBtn = document.getElementById("pay-btn");
const manageBtn = document.getElementById("manage-btn");

// Check if trial is active
function isTrialActive(user) {
  if (!user.trialStartedAt) return false;
  const now = new Date();
  const trialEnd = new Date(user.trialStartedAt.getTime() + TRIAL_DURATION);
  return now < trialEnd;
}

// Get trial days remaining
function getTrialDaysRemaining(user) {
  if (!user.trialStartedAt) return 0;
  const now = new Date();
  const trialEnd = new Date(user.trialStartedAt.getTime() + TRIAL_DURATION);
  const diff = trialEnd - now;
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

// Update UI based on user status
function updateUI(user) {
  if (user.paid) {
    statusEl.innerHTML = "User has paid! 🎉";
    trialBtn.style.display = "none";
    payBtn.style.display = "none";
    manageBtn.style.display = "inline-block";
  } else if (isTrialActive(user)) {
    const daysRemaining = getTrialDaysRemaining(user);
    statusEl.innerHTML = `Free trial active! ${daysRemaining} days remaining ⏰`;
    trialBtn.style.display = "none";
    payBtn.style.display = "inline-block";
    manageBtn.style.display = "none";
  } else if (user.trialStartedAt) {
    statusEl.innerHTML = "Free trial expired. Please upgrade to continue! 💳";
    trialBtn.style.display = "none";
    payBtn.style.display = "inline-block";
    manageBtn.style.display = "none";
  } else {
    statusEl.innerHTML = "Start your free trial or pay to unlock premium features! 🚀";
    trialBtn.style.display = "inline-block";
    payBtn.style.display = "inline-block";
    manageBtn.style.display = "none";
  }
}

// Event listeners
trialBtn.addEventListener("click", function (evt) {
  evt.preventDefault();
  extpay.openTrialPage("7-day");
});

payBtn.addEventListener("click", function (evt) {
  evt.preventDefault();
  extpay.openPaymentPage();
});

manageBtn.addEventListener("click", function (evt) {
  evt.preventDefault();
  extpay.openPaymentPage();
});

// Load user status
extpay
  .getUser()
  .then((user) => {
    updateUI(user);
  })
  .catch((err) => {
    statusEl.innerHTML =
      "Error fetching data :( Check that your ExtensionPay id is correct and you're connected to the internet";
    console.error("ExtPay error:", err);
  });

// Listen for trial started events
extpay.onTrialStarted.addListener((user) => {
  console.log("Trial started!", user);
  updateUI(user);
});

// Listen for payment events
extpay.onPaid.addListener((user) => {
  console.log("User paid!", user);
  updateUI(user);
});
