importScripts("ExtPay.js");const t=ExtPay("tunevo-test");t.startBackground(),t.getUser().then(s=>{console.log("Tunevo user status:",s)});
