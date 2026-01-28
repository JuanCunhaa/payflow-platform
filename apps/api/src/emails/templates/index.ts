export type EmailTemplateId =
  | 'verify-email'
  | 'guardian-approved'
  | 'guardian-rejected'
  | 'invoice-created'
  | 'invoice-overdue'
  | 'invoice-paid'
  | 'auth.password_reset';

const BASE_STYLES = {
  body: 'font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; width: 100%;',
  container:
    'max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);',
  header: 'background-color: #22c55e; padding: 24px; color: #ffffff;',
  headerTitle: 'margin: 0; font-size: 20px; font-weight: 600;',
  content: 'padding: 32px 32px 48px; color: #374151; font-size: 16px; line-height: 1.6;',
  footer:
    'padding: 24px; text-align: center; color: #6b7280; font-size: 12px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;',
  button:
    'display: inline-block; background-color: #22c55e; color: #ffffff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 500; font-size: 16px; margin-top: 24px;',
  link: 'color: #22c55e; text-decoration: none;',
  highlight: 'font-weight: 700; color: #111827;',
};

// Email translations
const TRANSLATIONS = {
  'pt-BR': {
    footer: {
      copyright: 'Cobra Nex. Todos os direitos reservados.',
      reason: 'Você recebeu este e-mail porque tem vínculo com a escola {{school}} no Cobra Nex.',
      support: 'Precisa de ajuda? Acesse o suporte.',
    },
    templates: {
      'verify-email': {
        subject: 'Confirme seu e-mail no Cobra Nex',
        html: `
          <p style="margin-top: 0;">Olá {{name}},</p>
          <p>Para confirmar seu e-mail no Cobra Nex da escola <strong style="${BASE_STYLES.highlight}">{{school}}</strong>, clique no botão abaixo:</p>
          <div style="text-align: center;">
            <a href="{{link}}" style="${BASE_STYLES.button}">Confirmar e-mail</a>
          </div>
          <p style="margin-bottom: 0;">Se você não fez este pedido, ignore esta mensagem.</p>
          <p style="margin-top: 24px; margin-bottom: 0;">Abraços,<br />Equipe Cobra Nex</p>
        `,
        text: `Olá {{name}},\n\nPara confirmar seu e-mail no Cobra Nex da escola {{school}}, acesse: {{link}}\n\nSe você não fez este pedido, ignore esta mensagem.`,
      },
      'auth.password_reset': {
        subject: 'Instruções para redefinir sua senha',
        html: `
          <p style="margin-top: 0;">Olá,</p>
          <p>Recebemos um pedido para <strong style="${BASE_STYLES.highlight}">redefinir sua senha</strong>.</p>
          <p>Se você não fez este pedido, pode ignorar este e-mail com segurança.</p>
          <div style="text-align: center;">
            <a href="{{resetUrl}}" style="${BASE_STYLES.button}">Redefinir senha</a>
          </div>
          <p style="margin-top: 24px; margin-bottom: 0;">Abraços,<br />Equipe Cobra Nex</p>
        `,
        text: `Olá,\n\nRecebemos um pedido para redefinir sua senha. Acesse: {{resetUrl}}\n\nSe você não fez este pedido, ignore esta mensagem.`,
      },
      'guardian-approved': {
        subject: 'Sua conta de responsável foi aprovada',
        html: `
          <p style="margin-top: 0;">Olá {{name}},</p>
          <p>Sua conta de responsável no Cobra Nex da escola <strong style="${BASE_STYLES.highlight}">{{school}}</strong> foi <strong style="${BASE_STYLES.highlight}">aprovada</strong>!</p>
          <p>Você já pode acessar o portal utilizando seu e-mail e senha cadastrados.</p>
          <div style="text-align: center;">
            <a href="{{link}}" style="${BASE_STYLES.button}">Acessar o portal</a>
          </div>
          <p style="margin-top: 24px; margin-bottom: 0;">Abraços,<br />Equipe Cobra Nex</p>
        `,
        text: `Olá {{name}},\n\nSua conta de responsável no Cobra Nex da escola {{school}} foi aprovada.\n\nAcesse: {{link}}`,
      },
      'guardian-rejected': {
        subject: 'Sua solicitação de acesso não foi aprovada',
        html: `
          <p style="margin-top: 0;">Olá {{name}},</p>
          <p>Sua solicitação de acesso ao portal do responsável da escola <strong style="${BASE_STYLES.highlight}">{{school}}</strong> <strong style="${BASE_STYLES.highlight}">não foi aprovada</strong> neste momento.</p>
          <p>Em caso de dúvidas, entre em contato diretamente com a escola.</p>
          <p style="margin-top: 24px; margin-bottom: 0;">Abraços,<br />Equipe Cobra Nex</p>
        `,
        text: `Olá {{name}},\n\nSua solicitação de acesso ao portal do responsável da escola {{school}} não foi aprovada neste momento.`,
      },
      'invoice-created': {
        subject: 'Nova cobrança criada',
        html: `
          <p style="margin-top: 0;">Olá {{name}},</p>
          <p>Uma nova cobrança foi gerada pela escola <strong style="${BASE_STYLES.highlight}">{{school}}</strong>.</p>
          <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Valor</p>
            <p style="margin: 0 0 12px; font-size: 24px; font-weight: 700; color: #111827;">{{amount}}</p>
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Vencimento</p>
            <p style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">{{dueDate}}</p>
          </div>
          <p>Você pode visualizar os detalhes e realizar o pagamento pelo botão abaixo:</p>
          <div style="text-align: center;">
            <a href="{{link}}" style="${BASE_STYLES.button}">Visualizar cobrança</a>
          </div>
          <p style="margin-top: 24px; margin-bottom: 0;">Abraços,<br />Equipe Cobra Nex</p>
        `,
        text: `Olá {{name}},\n\nUma nova cobrança de {{amount}} com vencimento em {{dueDate}} foi gerada pela escola {{school}}.\n\nAcesse: {{link}}`,
      },
      'invoice-overdue': {
        subject: 'Cobrança em atraso',
        html: `
          <p style="margin-top: 0;">Olá {{name}},</p>
          <p>A cobrança da escola <strong style="${BASE_STYLES.highlight}">{{school}}</strong> venceu em <strong style="${BASE_STYLES.highlight}">{{dueDate}}</strong> e está <strong style="color: #ef4444;">em atraso</strong>.</p>
          <div style="background-color: #fff1f2; padding: 16px; border-radius: 8px; margin: 24px 0; border: 1px solid #fecaca;">
            <p style="margin: 0; font-size: 14px; color: #991b1b;">Valor original</p>
            <p style="margin: 0; font-size: 24px; font-weight: 700; color: #991b1b;">{{amount}}</p>
          </div>
          <p>Você pode regularizar o pagamento acessando o botão abaixo:</p>
          <div style="text-align: center;">
            <a href="{{link}}" style="${BASE_STYLES.button} background-color: #ef4444;">Pagar cobrança em atraso</a>
          </div>
          <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">Se o pagamento já foi realizado, por favor desconsidere este e-mail.</p>
          <p style="margin-top: 24px; margin-bottom: 0;">Abraços,<br />Equipe Cobra Nex</p>
        `,
        text: `Olá {{name}},\n\nA cobrança da escola {{school}} no valor de {{amount}} venceu em {{dueDate}} e está em atraso.\n\nRegularize em: {{link}}`,
      },
      'invoice-paid': {
        subject: 'Pagamento confirmado',
        html: `
          <p style="margin-top: 0;">Olá {{name}},</p>
          <p>Recebemos o pagamento da cobrança da escola <strong style="${BASE_STYLES.highlight}">{{school}}</strong> no valor de <strong style="${BASE_STYLES.highlight}">{{amount}}</strong>.</p>
          <div style="background-color: #ecfdf5; padding: 16px; border-radius: 8px; margin: 24px 0; border: 1px solid #a7f3d0;">
            <p style="margin: 0; font-size: 14px; color: #065f46;">Status</p>
            <p style="margin: 0; font-size: 20px; font-weight: 700; color: #059669;">Pago com sucesso</p>
            <p style="margin: 12px 0 0; font-size: 14px; color: #065f46;">Data do pagamento</p>
            <p style="margin: 0; font-size: 16px; font-weight: 600; color: #065f46;">{{paidDate}}</p>
          </div>
          <p>Você pode acompanhar o histórico de cobranças pelo portal.</p>
          <p style="margin-top: 24px; margin-bottom: 0;">Abraços,<br />Equipe Cobra Nex</p>
        `,
        text: `Olá {{name}},\n\nRecebemos o pagamento de {{amount}} referente a escola {{school}} em {{paidDate}}.\n\nObrigado!`,
      },
    },
  },
  'en-US': {
    footer: {
      copyright: 'Cobra Nex. All rights reserved.',
      reason: 'You received this email because you are linked to {{school}} on Cobra Nex.',
      support: 'Need help? Contact support.',
    },
    templates: {
      'verify-email': {
        subject: 'Confirm your email on Cobra Nex',
        html: `
          <p style="margin-top: 0;">Hello {{name}},</p>
          <p>To confirm your email on Cobra Nex for <strong style="${BASE_STYLES.highlight}">{{school}}</strong>, click the button below:</p>
          <div style="text-align: center;">
            <a href="{{link}}" style="${BASE_STYLES.button}">Confirm email</a>
          </div>
          <p style="margin-bottom: 0;">If you did not request this, please ignore this message.</p>
          <p style="margin-top: 24px; margin-bottom: 0;">Best regards,<br />Cobra Nex Team</p>
        `,
        text: `Hello {{name}},\n\nTo confirm your email on Cobra Nex for {{school}}, visit: {{link}}\n\nIf you did not request this, ignore this message.`,
      },
      'auth.password_reset': {
        subject: 'Reset your password',
        html: `
          <p style="margin-top: 0;">Hello,</p>
          <p>We received a request to <strong style="${BASE_STYLES.highlight}">reset your password</strong>.</p>
          <p>If you did not request this, you can safely ignore this email.</p>
          <div style="text-align: center;">
            <a href="{{resetUrl}}" style="${BASE_STYLES.button}">Reset password</a>
          </div>
          <p style="margin-top: 24px; margin-bottom: 0;">Best regards,<br />Cobra Nex Team</p>
        `,
        text: `Hello,\n\nWe received a request to reset your password. Visit: {{resetUrl}}\n\nIf you did not request this, ignore this message.`,
      },
      'guardian-approved': {
        subject: 'Your guardian account was approved',
        html: `
          <p style="margin-top: 0;">Hello {{name}},</p>
          <p>Your guardian account on Cobra Nex for <strong style="${BASE_STYLES.highlight}">{{school}}</strong> has been <strong style="${BASE_STYLES.highlight}">approved</strong>!</p>
          <p>You can now access the portal using your registered email and password.</p>
          <div style="text-align: center;">
            <a href="{{link}}" style="${BASE_STYLES.button}">Access Portal</a>
          </div>
          <p style="margin-top: 24px; margin-bottom: 0;">Best regards,<br />Cobra Nex Team</p>
        `,
        text: `Hello {{name}},\n\nYour guardian account on Cobra Nex for {{school}} has been approved.\n\nAccess: {{link}}`,
      },
      'guardian-rejected': {
        subject: 'Your access request was not approved',
        html: `
          <p style="margin-top: 0;">Hello {{name}},</p>
          <p>Your request to access the guardian portal for <strong style="${BASE_STYLES.highlight}">{{school}}</strong> was <strong style="${BASE_STYLES.highlight}">not approved</strong> at this time.</p>
          <p>If you have questions, please contact the school directly.</p>
          <p style="margin-top: 24px; margin-bottom: 0;">Best regards,<br />Cobra Nex Team</p>
        `,
        text: `Hello {{name}},\n\nYour request to access the guardian portal for {{school}} was not approved at this time.`,
      },
      'invoice-created': {
        subject: 'New invoice created',
        html: `
          <p style="margin-top: 0;">Hello {{name}},</p>
          <p>A new invoice was generated by <strong style="${BASE_STYLES.highlight}">{{school}}</strong>.</p>
          <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Amount</p>
            <p style="margin: 0 0 12px; font-size: 24px; font-weight: 700; color: #111827;">{{amount}}</p>
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Due Date</p>
            <p style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">{{dueDate}}</p>
          </div>
          <p>You can view details and pay by clicking the button below:</p>
          <div style="text-align: center;">
            <a href="{{link}}" style="${BASE_STYLES.button}">View Invoice</a>
          </div>
          <p style="margin-top: 24px; margin-bottom: 0;">Best regards,<br />Cobra Nex Team</p>
        `,
        text: `Hello {{name}},\n\nA new invoice of {{amount}} due on {{dueDate}} was generated by {{school}}.\n\nVisit: {{link}}`,
      },
      'invoice-overdue': {
        subject: 'Invoice overdue',
        html: `
          <p style="margin-top: 0;">Hello {{name}},</p>
          <p>The invoice for <strong style="${BASE_STYLES.highlight}">{{school}}</strong> was due on <strong style="${BASE_STYLES.highlight}">{{dueDate}}</strong> and is <strong style="color: #ef4444;">overdue</strong>.</p>
          <div style="background-color: #fff1f2; padding: 16px; border-radius: 8px; margin: 24px 0; border: 1px solid #fecaca;">
            <p style="margin: 0; font-size: 14px; color: #991b1b;">Original Amount</p>
            <p style="margin: 0; font-size: 24px; font-weight: 700; color: #991b1b;">{{amount}}</p>
          </div>
          <p>You can settle the payment by clicking the button below:</p>
          <div style="text-align: center;">
            <a href="{{link}}" style="${BASE_STYLES.button} background-color: #ef4444;">Pay Overdue Invoice</a>
          </div>
          <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">If payment has already been made, please disregard this email.</p>
          <p style="margin-top: 24px; margin-bottom: 0;">Best regards,<br />Cobra Nex Team</p>
        `,
        text: `Hello {{name}},\n\nThe invoice for {{school}} ({{amount}}) was due on {{dueDate}} and is overdue.\n\nPay at: {{link}}`,
      },
      'invoice-paid': {
        subject: 'Payment confirmed',
        html: `
          <p style="margin-top: 0;">Hello {{name}},</p>
          <p>We received payment for the invoice from <strong style="${BASE_STYLES.highlight}">{{school}}</strong> in the amount of <strong style="${BASE_STYLES.highlight}">{{amount}}</strong>.</p>
          <div style="background-color: #ecfdf5; padding: 16px; border-radius: 8px; margin: 24px 0; border: 1px solid #a7f3d0;">
            <p style="margin: 0; font-size: 14px; color: #065f46;">Status</p>
            <p style="margin: 0; font-size: 20px; font-weight: 700; color: #059669;">Paid successfully</p>
            <p style="margin: 12px 0 0; font-size: 14px; color: #065f46;">Payment Date</p>
            <p style="margin: 0; font-size: 16px; font-weight: 600; color: #065f46;">{{paidDate}}</p>
          </div>
          <p>You can track payment history in the portal.</p>
          <p style="margin-top: 24px; margin-bottom: 0;">Best regards,<br />Cobra Nex Team</p>
        `,
        text: `Hello {{name}},\n\nWe received payment of {{amount}} for {{school}} on {{paidDate}}.\n\nThank you!`,
      },
    },
  },
};

function getLayout(
  content: string,
  schoolName: string = 'Cobra Nex',
  locale: string = 'pt-BR'
): string {
  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS['pt-BR'];
  const footerReason = interpolate(t.footer.reason, { school: schoolName });

  return `
<!DOCTYPE html>
<html lang="${locale}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="${BASE_STYLES.body}">
    <div style="${BASE_STYLES.container}">
      <div style="${BASE_STYLES.header}">
        <h1 style="${BASE_STYLES.headerTitle}">Cobra Nex &middot; ${schoolName}</h1>
      </div>
      <div style="${BASE_STYLES.content}">
        ${content}
      </div>
      <div style="${BASE_STYLES.footer}">
        <p style="margin: 0 0 8px;">&copy; ${new Date().getFullYear()} ${t.footer.copyright}</p>
        <p style="margin: 0;">${footerReason}</p>
        <p style="margin: 8px 0 0;"><a href="#" style="${BASE_STYLES.link}">${t.footer.support}</a></p>
      </div>
    </div>
  </body>
</html>
  `.trim();
}

function interpolate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/{{\s*([\w]+)\s*}}/g, (_, key: string) => {
    const value = variables[key];
    if (value === undefined || value === null) {
      return '';
    }
    return String(value);
  });
}

export function renderEmailTemplate(
  id: EmailTemplateId,
  variables: Record<string, unknown>,
  locale: string = 'pt-BR'
): { html: string; text: string; subject: string } {
  const translations = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] || TRANSLATIONS['pt-BR'];
  const templateDef = translations.templates[id];

  if (!templateDef) {
    throw new Error(`Unknown email template: ${id} for locale ${locale}`);
  }

  const schoolName = (variables.school as string) || 'Cobra Nex';

  return {
    html: getLayout(interpolate(templateDef.html, variables), schoolName, locale),
    text: interpolate(templateDef.text, variables),
    subject: templateDef.subject,
  };
}
