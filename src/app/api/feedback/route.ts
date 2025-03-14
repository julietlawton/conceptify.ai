var nodemailer = require('nodemailer');

export const maxDuration = 60;

export async function POST(req: Request) {
    const { feedbackMessage }: { feedbackMessage: string } = await req.json();

    // Create Nodemailer Transporter
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    try {
        // Send Email
        await transporter.sendMail({
            from: "LLM Concept Map User Feedback",
            to: process.env.EMAIL_USER,
            subject: "[LLM-CONCEPT-MAP] New User Feedback",
            text: feedbackMessage,
        });

        return new Response(JSON.stringify({ success: true, message: "Feedback sent successfully." }), { status: 200 });

    } catch (error) {
        console.error("Email sending error:", error);
        return new Response(JSON.stringify({ error: "Failed to send feedback." }), { status: 500 });
    }
}