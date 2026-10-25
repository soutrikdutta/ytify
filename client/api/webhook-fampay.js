// Automated FamPay / Gmail Webhook Endpoint for ytify
// Automatically receives credit alert notifications from Google Apps Script
// and activates 2-Month Premium directly into Firestore without user input.

const FIREBASE_API_KEY = "AIzaSyCnjYRViNVoiSOzl682ISJXb8G2hBddkvc";
const FIREBASE_PROJECT_ID = "ytify-c18ed";
const WEBHOOK_SECRET = "ytify_fampay_secret_2026";

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Webhook-Secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check / GET status
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      service: 'ytify FamPay Gmail Webhook',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const payload = req.body || {};
    const providedSecret = req.headers['x-webhook-secret'] || payload.secret || req.query.secret;

    if (providedSecret !== WEBHOOK_SECRET) {
      return res.status(403).json({ error: 'Unauthorized webhook request.' });
    }

    const {
      subject = '',
      body = '',
      amount = 10,
      utr: directUtr = '',
      note = '',
      sender = '',
      receivedAt = new Date().toISOString()
    } = payload;

    const fullContent = `${subject} ${body} ${note}`;

    // 1. Extract 12-digit UPI UTR / Reference number
    let detectedUtr = directUtr;
    if (!detectedUtr || !/^\d{12}$/.test(detectedUtr)) {
      const match = fullContent.match(/\b\d{12}\b/);
      if (match) {
        detectedUtr = match[0];
      }
    }

    if (!detectedUtr) {
      detectedUtr = `FAM_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    }

    // 2. Extract unique tracking Order ID (e.g. YT1234 or YT-1234)
    let orderTag = '';
    const tagMatch = fullContent.match(/\b(YT-?\d{4,6})\b/i);
    if (tagMatch) {
      orderTag = tagMatch[1].replace('-', '').toUpperCase();
    }

    // 3. Find matching pending payment in Firestore
    let matchedUid = null;
    let matchedEmail = '';
    let matchedName = '';

    // Step 3a: Match by order tag if available
    if (orderTag) {
      const orderDocUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/pending_payments/${orderTag}?key=${FIREBASE_API_KEY}`;
      try {
        const orderRes = await fetch(orderDocUrl);
        if (orderRes.ok) {
          const orderDoc = await orderRes.json();
          const f = orderDoc.fields || {};
          matchedUid = f.uid?.stringValue || null;
          matchedEmail = f.email?.stringValue || '';
          matchedName = f.name?.stringValue || '';
        }
      } catch (e) {
        console.warn('Error reading order tag doc:', e);
      }
    }

    // Step 3b: If no tag or tag doc missing, match the most recent active pending payment created in the last 20 minutes
    if (!matchedUid) {
      const listPendingUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/pending_payments?pageSize=20&key=${FIREBASE_API_KEY}`;
      try {
        const listRes = await fetch(listPendingUrl);
        if (listRes.ok) {
          const listData = await listRes.json();
          const docs = listData.documents || [];
          const nowMs = Date.now();
          const twentyMinsAgo = nowMs - (20 * 60 * 1000);

          // Find newest pending doc within 20 minutes
          let newestDoc = null;
          let newestTime = 0;

          for (const d of docs) {
            const f = d.fields || {};
            const created = parseInt(f.createdAt?.integerValue || '0', 10);
            if (created >= twentyMinsAgo && created > newestTime) {
              newestTime = created;
              newestDoc = d;
            }
          }

          if (newestDoc) {
            const f = newestDoc.fields || {};
            matchedUid = f.uid?.stringValue || null;
            matchedEmail = f.email?.stringValue || '';
            matchedName = f.name?.stringValue || '';
          }
        }
      } catch (e) {
        console.warn('Error querying recent pending payments:', e);
      }
    }

    const twoMonthsMs = 60 * 24 * 60 * 60 * 1000;
    const expiresAt = Date.now() + twoMonthsMs;

    // 4. If matched to a specific user, activate their Premium 1:1 in Firestore!
    if (matchedUid) {
      const userDocUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${matchedUid}?updateMask.fieldPaths=premiumExpiresAt&updateMask.fieldPaths=premiumUtr&key=${FIREBASE_API_KEY}`;
      await fetch(userDocUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            premiumExpiresAt: { integerValue: String(expiresAt) },
            premiumUtr: { stringValue: detectedUtr }
          }
        })
      });
    }

    // 5. Always record to permanent subscription ledger
    const subDocUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/premium_subscriptions/${detectedUtr}?key=${FIREBASE_API_KEY}`;
    await fetch(subDocUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          utr: { stringValue: detectedUtr },
          userId: { stringValue: matchedUid || 'unmatched_recent' },
          userEmail: { stringValue: matchedEmail || sender },
          userName: { stringValue: matchedName || 'FamPay User' },
          amount: { integerValue: String(amount || 10) },
          plan: { stringValue: '2_months' },
          verifiedBy: { stringValue: 'fampay_gmail_webhook' },
          createdAt: { stringValue: receivedAt },
          expiresAt: { stringValue: new Date(expiresAt).toISOString() },
          status: { stringValue: 'active' }
        }
      })
    });

    return res.status(200).json({
      success: true,
      verified: true,
      matchedUid,
      utr: detectedUtr,
      orderTag,
      message: 'FamPay payment verified and user subscription activated successfully.'
    });
  } catch (err) {
    console.error('FamPay Webhook Error:', err);
    return res.status(500).json({ error: 'Internal webhook execution error.' });
  }
}
