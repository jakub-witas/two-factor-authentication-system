const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: "student.tu.kielce.pl",
  port: 465,
  secure: true, // true because port 465 uses SSL/TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function send2FACodeEmail(to, code) {
  try {
    const info = await transporter.sendMail({
      from: `"System 2FA" <${process.env.SMTP_USER}>`,
      to,
      subject: "Twój kod weryfikacji dwuetapowej",
      text: `Twój kod weryfikacyjny to: ${code}
            Kod jest ważny przez 5 minut.`,
      html: `<p>Twój kod weryfikacyjny to: <b>${code}</b></p>
            <p>Kod jest ważny przez 5 minut.</p>`,
    });

    console.log("Email sent:", info.messageId);
    return true;
  } catch (err) {
    console.error("Error sending email:", err);
    return false;
  }
}

module.exports = send2FACodeEmail;