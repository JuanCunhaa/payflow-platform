export type EmailTemplateId =
  | 'verify-email'
  | 'guardian-approved'
  | 'guardian-rejected'
  | 'invoice-created'
  | 'invoice-overdue'
  | 'invoice-paid';

type TemplateDefinition = {
  html: string;
  text: string;
};

const templates: Record<EmailTemplateId, TemplateDefinition> = {
  'verify-email': {
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
  <body>
    <p>Olá {{name}},</p>
    <p>
      Para confirmar seu e-mail no PayFlow da escola {{school}}, clique no link abaixo:
    </p>
    <p><a href="{{link}}">Confirmar e-mail</a></p>
    <p>Se você não fez este pedido, ignore esta mensagem.</p>
    <p>Abraços,<br />Equipe PayFlow</p>
  </body>
</html>
    `.trim(),
    text: `
Olá {{name}},

Para confirmar seu e-mail no PayFlow da escola {{school}}, clique no link abaixo:

{{link}}

Se você não fez este pedido, ignore esta mensagem.

Abraços,
Equipe PayFlow
    `.trim(),
  },
  'guardian-approved': {
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
  <body>
    <p>Olá {{name}},</p>
    <p>
      Sua conta de responsável no PayFlow da escola {{school}} foi aprovada.
    </p>
    <p>Você já pode acessar o portal utilizando seu e-mail e senha cadastrados.</p>
    <p><a href="{{link}}">Acessar o portal do responsável</a></p>
    <p>Abraços,<br />Equipe PayFlow</p>
  </body>
</html>
    `.trim(),
    text: `
Olá {{name}},

Sua conta de responsável no PayFlow da escola {{school}} foi aprovada.

Você já pode acessar o portal utilizando seu e-mail e senha cadastrados.

Acesse:
{{link}}

Abraços,
Equipe PayFlow
    `.trim(),
  },
  'guardian-rejected': {
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
  <body>
    <p>Olá {{name}},</p>
    <p>
      Sua solicitação de acesso ao portal do responsável da escola {{school}} não foi aprovada neste momento.
    </p>
    <p>Em caso de dúvidas, entre em contato diretamente com a escola.</p>
    <p>Abraços,<br />Equipe PayFlow</p>
  </body>
</html>
    `.trim(),
    text: `
Olá {{name}},

Sua solicitação de acesso ao portal do responsável da escola {{school}} não foi aprovada neste momento.

Em caso de dúvidas, entre em contato diretamente com a escola.

Abraços,
Equipe PayFlow
    `.trim(),
  },
  'invoice-created': {
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
  <body>
    <p>Olá {{name}},</p>
    <p>
      Uma nova cobrança foi criada para a escola {{school}} no valor de {{amount}}, com vencimento em {{dueDate}}.
    </p>
    <p>Você pode visualizar os detalhes e realizar o pagamento pelo link abaixo:</p>
    <p><a href="{{link}}">Visualizar cobrança</a></p>
    <p>Abraços,<br />Equipe PayFlow</p>
  </body>
</html>
    `.trim(),
    text: `
Olá {{name}},

Uma nova cobrança foi criada para a escola {{school}} no valor de {{amount}}, com vencimento em {{dueDate}}.

Você pode visualizar os detalhes e realizar o pagamento pelo link abaixo:

{{link}}

Abraços,
Equipe PayFlow
    `.trim(),
  },
  'invoice-overdue': {
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
  <body>
    <p>Olá {{name}},</p>
    <p>
      A cobrança da escola {{school}} no valor de {{amount}}, com vencimento em {{dueDate}}, está em atraso.
    </p>
    <p>Você pode regularizar o pagamento acessando o link abaixo:</p>
    <p><a href="{{link}}">Pagar cobrança em atraso</a></p>
    <p>Se o pagamento já foi realizado, por favor desconsidere este e-mail.</p>
    <p>Abraços,<br />Equipe PayFlow</p>
  </body>
</html>
    `.trim(),
    text: `
Olá {{name}},

A cobrança da escola {{school}} no valor de {{amount}}, com vencimento em {{dueDate}}, está em atraso.

Você pode regularizar o pagamento acessando o link abaixo:

{{link}}

Se o pagamento já foi realizado, por favor desconsidere este e-mail.

Abraços,
Equipe PayFlow
    `.trim(),
  },
  'invoice-paid': {
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
  <body>
    <p>Olá {{name}},</p>
    <p>
      Recebemos o pagamento da cobrança da escola {{school}} no valor de {{amount}}, com vencimento em {{dueDate}}.
    </p>
    <p>Obrigado! Você pode acompanhar o histórico de cobranças pelo portal.</p>
    <p>Abraços,<br />Equipe PayFlow</p>
  </body>
</html>
    `.trim(),
    text: `
Olá {{name}},

Recebemos o pagamento da cobrança da escola {{school}} no valor de {{amount}}, com vencimento em {{dueDate}}.

Obrigado! Você pode acompanhar o histórico de cobranças pelo portal.

Abraços,
Equipe PayFlow
    `.trim(),
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

