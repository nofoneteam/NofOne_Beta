const { Receiver } = require("@upstash/qstash");
const { db } = require("../config/firebase");
const ReminderModel = require("../models/reminder.model");
const env = require("../config/env");

let receiver = null;
if (process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY) {
  receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
  });
}

exports.createReminder = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { title, message, reminderTime } = req.body;
    
    // Calculate delay
    const rTime = new Date(reminderTime);
    const currentTime = new Date();
    const delay = Math.floor((rTime.getTime() - currentTime.getTime()) / 1000);

    if (delay < 0) {
      return res.status(400).json({ status: "error", message: "Reminder time must be in the future." });
    }

    // Save properly in Firestore
    const reminderData = ReminderModel.createPayload({
       userId,
       title,
       message,
       reminderTime: rTime.toISOString(),
       status: 'pending'
    });
    
    const docRef = await db.collection(ReminderModel.collectionName).add(reminderData);
    const reminderId = docRef.id;

    // Call QStash REST API
    const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
    const BASE_URL = process.env.BASE_URL;

    if (QSTASH_TOKEN && BASE_URL) {
      const qstashUrl = `https://qstash.upstash.io/v2/publish/${BASE_URL}/api/reminder/trigger`;
      const upstashResponse = await fetch(qstashUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${QSTASH_TOKEN}`,
          "Upstash-Delay": `${delay}s`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId, message, reminderId })
      });

      if (!upstashResponse.ok) {
        console.error("QStash response error:", await upstashResponse.text());
        return res.status(500).json({ status: "error", message: "Failed to schedule reminder." });
      }
    } else {
      console.warn("QSTASH_TOKEN or BASE_URL not set. Skipping scheduling.");
    }

    res.status(201).json({
      success: true,
      data: { id: reminderId, ...reminderData }
    });

  } catch (err) {
    next(err);
  }
};

exports.getReminders = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const snapshot = await db.collection(ReminderModel.collectionName)
      .where("userId", "==", userId)
      .get();

    const reminders = [];
    snapshot.forEach(doc => {
      reminders.push({ id: doc.id, ...doc.data() });
    });

    // Sort by createdAt descending in memory (avoids composite index requirement)
    reminders.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    res.status(200).json({
      success: true,
      data: reminders
    });
  } catch (err) {
    next(err);
  }
};

exports.triggerReminder = async (req, res, next) => {
  try {
     const signature = req.headers["upstash-signature"];
     
     // Verification
     if (receiver) {
        const bodyStr = req.rawBody ? req.rawBody.toString() : JSON.stringify(req.body);
        const isValid = await receiver.verify({
           body: bodyStr,
           signature,
           url: `${process.env.BASE_URL}/api/reminder/trigger`
        });
        if (!isValid) return res.status(401).send("Invalid signature");
     }

     const { userId, message, reminderId } = req.body;
     
     if (!reminderId) {
        return res.status(400).send("Missing reminderId");
     }

     // Update Firestore
     await db.collection(ReminderModel.collectionName).doc(reminderId).update({
        status: "triggered",
        triggeredAt: new Date().toISOString()
     });

     // Send to OneSignal
     if (process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY) {
        const osUrl = "https://onesignal.com/api/v1/notifications";
        const osRes = await fetch(osUrl, {
           method: "POST",
           headers: {
             "Authorization": `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
             "Content-Type": "application/json"
           },
           body: JSON.stringify({
             app_id: process.env.ONESIGNAL_APP_ID,
             include_external_user_ids: [userId],
             contents: { en: message }
           })
        });
        
        if (!osRes.ok) {
           console.error("OneSignal error:", await osRes.text());
        }
     } else {
        console.warn("ONESIGNAL credentials missing. Skipping push notification.");
     }

     res.status(200).json({ success: true });
  } catch(err) {
     console.error("Trigger error:", err);
     next(err);
  }
};
