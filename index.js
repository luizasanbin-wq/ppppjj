const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms * 1000));

app.post('/api/send', async (req, res) => {
    const { sender_email, sender_pass, target_email, subject, message, count, interval } = req.body;

    // إعداد الهيدر ليدعم التدفق (Streaming)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    if (!sender_email || !sender_pass || !target_email || !subject || !message || !count || !interval) {
        res.write(JSON.stringify({ type: 'error', msg: 'بيانات ناقصة' }) + "\n");
        res.end();
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: sender_email, pass: sender_pass }
    });

    console.log(`[START] Job started: ${count} emails`);

    for (let i = 1; i <= count; i++) {
        try {
            await transporter.sendMail({
                from: `"System" <${sender_email}>`,
                to: target_email,
                subject: `${subject} (${i})`,
                text: message,
                html: `<div dir="rtl">${message}<br><small>Message ID: ${i}-${Date.now()}</small></div>`
            });
            
            // إرسال إشعار نجاح للمتصفح
            res.write(JSON.stringify({ type: 'progress', status: 'success', index: i }) + "\n");
            console.log(`✅ Sent ${i}`);

        } catch (error) {
            // إرسال إشعار فشل للمتصفح
            res.write(JSON.stringify({ type: 'progress', status: 'failed', index: i, error: error.message }) + "\n");
            console.error(`❌ Failed ${i}`);
        }

        // الانتظار (إلا إذا كانت الأخيرة)
        if (i < count) await sleep(interval);
    }

    // إشعار بالانتهاء
    res.write(JSON.stringify({ type: 'done' }) + "\n");
    res.end();
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});