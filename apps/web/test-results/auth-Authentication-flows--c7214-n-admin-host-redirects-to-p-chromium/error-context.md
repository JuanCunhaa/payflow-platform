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
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]: Email
        - textbox "Email" [ref=e10]:
          - /placeholder: user@example.com
          - text: platform.admin@payflow.com
      - generic [ref=e11]:
        - generic [ref=e12]: Senha
        - textbox "Senha" [ref=e13]: Admin@12345
      - button "Entrar" [ref=e14] [cursor=pointer]
    - paragraph [ref=e15]:
      - text: Não tem conta?
      - link "Cadastre-se" [ref=e16] [cursor=pointer]:
        - /url: /pt-BR/signup
    - link "← Início" [ref=e17] [cursor=pointer]:
      - /url: /pt-BR
  - alert [ref=e18]
```