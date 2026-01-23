import 'dotenv/config';
import { Resend } from 'resend';
import { renderEmailTemplate, EmailTemplateId } from '../src/emails/templates';

async function main() {
    const targetEmail = process.argv[2];

    if (!targetEmail) {
        console.error('Please provide a target email address.');
        console.error('Usage: npm run test:email -- <email>');
        process.exit(1);
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.error('RESEND_API_KEY is not defined in .env');
        process.exit(1);
    }

    const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const resend = new Resend(apiKey);

    console.log(`Sending test emails to: ${targetEmail}`);
    console.log(`From: ${fromEmail}`);

    const templates: { id: EmailTemplateId; variables: Record<string, unknown> }[] = [
        {
            id: 'verify-email',
            variables: {
                name: 'Rodrigo Soueu',
                school: 'Escola Pequerruchos',
                link: 'https://payflow.work.gd/auth/verify?token=ey...example_token',
            },
        },
        {
            id: 'guardian-approved',
            variables: {
                name: 'Ana Maria Braga',
                school: 'Colégio Futuro Brilhante',
                link: 'https://payflow.work.gd/g',
            },
        },
        {
            id: 'guardian-rejected',
            variables: {
                name: 'João Kleber',
                school: 'Escola Estadual',
            },
        },
        {
            id: 'invoice-created',
            variables: {
                name: 'Mariana Ximenes',
                school: 'Escola de Música Tom Jobim',
                amount: 'R$ 1.250,50',
                dueDate: '10/02/2026',
                link: 'https://payflow.work.gd/pay/inv_12345abcdef',
            },
        },
        {
            id: 'invoice-overdue',
            variables: {
                name: 'Faustão Silva',
                school: 'Curso de Inglês The Book is on the Table',
                amount: 'R$ 89,90',
                dueDate: '15/01/2026',
                link: 'https://payflow.work.gd/pay/inv_overdue_98765',
            },
        },
        {
            id: 'invoice-paid',
            variables: {
                name: 'Silvio Santos',
                school: 'Natação Golfinho',
                amount: 'R$ 300,00',
                dueDate: '20/01/2026',
                paidDate: '18/01/2026',
            },
        },
        {
            id: 'auth.password_reset',
            variables: {
                resetUrl: 'https://payflow.work.gd/auth/reset-password?token=reset_token_example_123',
            },
        },
    ];

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    for (const template of templates) {
        try {
            console.log(`Sending template: ${template.id}...`);
            // Add en-US variant testing
            const { html, text, subject } = renderEmailTemplate(template.id, template.variables, 'en-US');

            const { data, error } = await resend.emails.send({
                from: fromEmail,
                to: targetEmail,
                subject: `[TEST] ${subject} (en-US)`,
                html,
                text,
            });

            if (error) {
                console.error(`Failed to send ${template.id}:`, error.message);
            } else {
                console.log(`Sent ${template.id} successfully! ID: ${data?.id}`);
            }

            await sleep(1000); // 1 second delay
        } catch (err) {
            console.error(`Error processing ${template.id}:`, err);
        }
    }

    console.log('Done!');
}

main();
