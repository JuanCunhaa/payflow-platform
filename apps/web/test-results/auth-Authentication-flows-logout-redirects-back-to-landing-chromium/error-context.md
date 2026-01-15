# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - main [ref=e3]:
    - navigation [ref=e4]:
      - link "Inglês" [ref=e5] [cursor=pointer]:
        - /url: /en-US
    - generic [ref=e6]:
      - strong
    - heading "Login" [level=1] [ref=e7]
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Email
        - textbox "Email" [ref=e11]:
          - /placeholder: user@example.com
      - generic [ref=e12]:
        - generic [ref=e13]: Senha
        - textbox "Senha" [ref=e14]
      - button "Entrar" [ref=e15] [cursor=pointer]
    - paragraph [ref=e16]:
      - text: Não tem conta?
      - link "Cadastre-se" [ref=e17] [cursor=pointer]:
        - /url: /pt-BR/signup
    - link "← Início" [ref=e18] [cursor=pointer]:
      - /url: /pt-BR
```