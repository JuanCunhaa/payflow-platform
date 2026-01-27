
import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from apps/api
dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') });

async function testEmail() {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const toEmail = 'juangigliotticunha09062006@gmail.com';

    console.log('--- Resend Test Debug ---');
    console.log(`API Key present: ${!!apiKey}`);
    console.log(`From: ${fromEmail}`);
    console.log(`To: ${toEmail}`);

    if (!apiKey) {
        console.error('ERROR: RESEND_API_KEY is missing');
        return;
    }

    const resend = new Resend(apiKey);

    try {
        const data = await resend.emails.send({
            from: fromEmail,
            to: toEmail,
            subject: 'Teste de Configuração PayFlow/CobraNex',
            html: '<p>Se você recebeu isso, o Resend está configurado corretamente!</p>',
        });

        if (data.error) {
            console.error('FAILED (Resend Error):', data.error);
        } else {
            console.log('SUCCESS:', data.data);
        }
    } catch (err) {
        console.error('FAILED (Exception):', err);
    }
}

testEmail();
