import nodemailer from "nodemailer";

export const mailer = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: "andreasskepp@gmail.com",
        pass: process.env.SMTP_PASSWORD // lägg i .env
    }
});

export async function sendChecklistReadyEmail(to: string[], checklistTitle: string, checklistUrl: string) {
    await mailer.sendMail({
        from: `"Administratör Ekonomiappen" <andreasskepp@gmail.com>`,
        to,
        subject: `Checklistan "${checklistTitle}" är klar för godkännande`,
        html: `
            <p>Checklistan <strong>${checklistTitle}</strong> är nu helt avklarad.</p>
            <p>Du kan granska och godkänna den här:</p>
            <p><a href="${checklistUrl}">${checklistUrl}</a></p>
        `
    });
}
