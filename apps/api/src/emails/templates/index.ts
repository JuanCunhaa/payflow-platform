export type EmailTemplateId =
  | 'verify-email'
  | 'guardian-approved'
  | 'guardian-rejected'
  | 'invoice-created'
  | 'invoice-overdue'
  | 'invoice-paid'
  | 'auth.password_reset';

type TemplateDefinition = {
  html: string;
  text: string;
};

const BASE_STYLES = {
  body: 'font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; width: 100%;',
  container: 'max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);',
  header: 'background-color: #22c55e; padding: 24px; color: #ffffff;',
  headerTitle: 'margin: 0; font-size: 20px; font-weight: 600;',
  content: 'padding: 32px 32px 48px; color: #374151; font-size: 16px; line-height: 1.6;',
  footer: 'padding: 24px; text-align: center; color: #6b7280; font-size: 12px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;',
  button: 'display: inline-block; background-color: #22c55e; color: #ffffff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 500; font-size: 16px; margin-top: 24px;',
  link: 'color: #22c55e; text-decoration: none;',
  highlight: 'font-weight: 700; color: #111827;',
};

function getLayout(content: string, schoolName: string = 'PayFlow'): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="${BASE_STYLES.body}">
    <div style="${BASE_STYLES.container}">
      <div style="${BASE_STYLES.header}">
        <h1 style="${BASE_STYLES.headerTitle}">PayFlow &middot; ${schoolName}</h1>
      </div>
      <div style="${BASE_STYLES.content}">
        ${content}
      </div>
      <div style="${BASE_STYLES.footer}">
        <p style="margin: 0 0 8px;">&copy; ${new Date().getFullYear()} PayFlow. Todos os direitos reservados.</p>
        <p style="margin: 0;">Você recebeu este e-mail porque tem vínculo com a escola ${schoolName} no PayFlow.</p>
        <p style="margin: 8px 0 0;"><a href="#" style="${BASE_STYLES.link}">Precisa de ajuda? Acesse o suporte.</a></p>
      </div>
    </div>
  </body>
</html>
  `.trim();
}

const templates: Record<EmailTemplateId, TemplateDefinition> = {
  'verify-email': {
    html: getLayout(
      `
      <p style="margin-top: 0;">Olá {{name}},</p>
      <p>Para confirmar seu e-mail no PayFlow da escola <strong style="${BASE_STYLES.highlight}">{{school}}</strong>, clique no botão abaixo:</p>
      <div style="text-align: center;">
        <a href="{{link}}" style="${BASE_STYLES.button}">Confirmar e-mail</a>
      </div>
      <p style="margin-bottom: 0;">Se você não fez este pedido, ignore esta mensagem.</p>
      <p style="margin-top: 24px; margin-bottom: 0;">Abraços,<br />Equipe PayFlow</p>
      `,
      '{{school}}'
    ),
    text: `Olá {{name}},\n\nPara confirmar seu e-mail no PayFlow da escola {{school}}, acesse: {{link}}\n\nSe você não fez este pedido, ignore esta mensagem.`,
  },
  'auth.password_reset': {
    html: getLayout(
      `
      <p style="margin-top: 0;">Olá,</p>
      <p>Recebemos um pedido para <strong style="${BASE_STYLES.highlight}">redefinir sua senha</strong>.</p>
      <p>Se você não fez este pedido, pode ignorar este e-mail com segurança.</p>
      <div style="text-align: center;">
        <a href="{{resetUrl}}" style="${BASE_STYLES.button}">Redefinir senha</a>
      </div>
      <p style="margin-top: 24px; margin-bottom: 0;">Abraços,<br />Equipe PayFlow</p>
      `,
      'Conta PayFlow'
    ),
    text: `Olá,\n\nRecebemos um pedido para redefinir sua senha. Acesse: {{resetUrl}}\n\nSe você não fez este pedido, ignore esta mensagem.`,
  },
  'guardian-approved': {
    html: getLayout(
      `
      <p style="margin-top: 0;">Olá {{name}},</p>
      <p>Sua conta de responsável no PayFlow da escola <strong style="${BASE_STYLES.highlight}">{{school}}</strong> foi <strong style="${BASE_STYLES.highlight}">aprovada</strong>!</p>
      <p>Você já pode acessar o portal utilizando seu e-mail e senha cadastrados.</p>
      <div style="text-align: center;">
        <a href="{{link}}" style="${BASE_STYLES.button}">Acessar o portal</a>
      </div>
      <p style="margin-top: 24px; margin-bottom: 0;">Abraços,<br />Equipe PayFlow</p>
      `,
      '{{school}}'
    ),
    text: `Olá {{name}},\n\nSua conta de responsável no PayFlow da escola {{school}} foi aprovada.\n\nAcesse: {{link}}`,
  },
  'guardian-rejected': {
    html: getLayout(
      `
      <p style="margin-top: 0;">Olá {{name}},</p>
      <p>Sua solicitação de acesso ao portal do responsável da escola <strong style="${BASE_STYLES.highlight}">{{school}}</strong> <strong style="${BASE_STYLES.highlight}">não foi aprovada</strong> neste momento.</p>
      <p>Em caso de dúvidas, entre em contato diretamente com a escola.</p>
      <p style="margin-top: 24px; margin-bottom: 0;">Abraços,<br />Equipe PayFlow</p>
      `,
      '{{school}}'
    ),
    text: `Olá {{name}},\n\nSua solicitação de acesso ao portal do responsável da escola {{school}} não foi aprovada neste momento.`,
  },
  'invoice-created': {
    html: getLayout(
      `
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
      <p style="margin-top: 24px; margin-bottom: 0;">Abraços,<br />Equipe PayFlow</p>
      `,
      '{{school}}'
    ),
    text: `Olá {{name}},\n\nUma nova cobrança de {{amount}} com vencimento em {{dueDate}} foi gerada pela escola {{school}}.\n\nAcesse: {{link}}`,
  },
  'invoice-overdue': {
    html: getLayout(
      `
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
      <p style="margin-top: 24px; margin-bottom: 0;">Abraços,<br />Equipe PayFlow</p>
      `,
      '{{school}}'
    ),
    text: `Olá {{name}},\n\nA cobrança da escola {{school}} no valor de {{amount}} venceu em {{dueDate}} e está em atraso.\n\nRegularize em: {{link}}`,
  },
  'invoice-paid': {
    html: getLayout(
      `
      <p style="margin-top: 0;">Olá {{name}},</p>
      <p>Recebemos o pagamento da cobrança da escola <strong style="${BASE_STYLES.highlight}">{{school}}</strong> no valor de <strong style="${BASE_STYLES.highlight}">{{amount}}</strong>.</p>
      <div style="background-color: #ecfdf5; padding: 16px; border-radius: 8px; margin: 24px 0; border: 1px solid #a7f3d0;">
        <p style="margin: 0; font-size: 14px; color: #065f46;">Status</p>
        <p style="margin: 0; font-size: 20px; font-weight: 700; color: #059669;">Pago com sucesso</p>
        <p style="margin: 12px 0 0; font-size: 14px; color: #065f46;">Data do pagamento</p>
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #065f46;">{{paidDate}}</p>
      </div>
      <p>Você pode acompanhar o histórico de cobranças pelo portal.</p>
      <p style="margin-top: 24px; margin-bottom: 0;">Abraços,<br />Equipe PayFlow</p>
      `,
      '{{school}}'
    ),
    text: `Olá {{name}},\n\nRecebemos o pagamento de {{amount}} referente a escola {{school}} em {{paidDate}}.\n\nObrigado!`,
  },
};

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
  variables: Record<string, unknown>
): { html: string; text: string } {
  const definition = templates[id];
  if (!definition) {
    throw new Error(`Unknown email template: ${id}`);
  }

  return {
    html: interpolate(definition.html, variables),
    text: interpolate(definition.text, variables),
  };
}
