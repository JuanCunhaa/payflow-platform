# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - navigation [ref=e3]:
      - link "Inglês" [ref=e4] [cursor=pointer]:
        - /url: /en-US
    - generic [ref=e5]:
      - strong
    - heading "Login" [level=1] [ref=e6]
    - generic [ref=e7]: Muitas tentativas de login. Tente novamente em alguns minutos.
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Email
        - textbox "Email" [ref=e11]:
          - /placeholder: user@example.com
          - text: admin@vidal.com
      - generic [ref=e12]:
        - generic [ref=e13]: Senha
        - textbox "Senha" [ref=e14]: Admin@12345
      - button "Entrar" [ref=e15] [cursor=pointer]
    - paragraph [ref=e16]:
      - text: Não tem conta?
      - link "Cadastre-se" [ref=e17] [cursor=pointer]:
        - /url: /pt-BR/signup
    - link "← Início" [ref=e18] [cursor=pointer]:
      - /url: /pt-BR
  - alert [ref=e19]
```