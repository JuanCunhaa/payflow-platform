# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - heading "Quero o PayFlow na minha escola" [level=1] [ref=e3]
    - paragraph [ref=e4]: Preencha os dados abaixo para que nossa equipe entre em contato e agende uma demonstração.
    - generic [ref=e5]: Não foi possível enviar seu pedido agora. Tente novamente em alguns minutos.
    - generic [ref=e6]:
      - generic [ref=e7]:
        - generic [ref=e8]: Nome do responsável
        - textbox "Nome do responsável" [ref=e9]: E2E Tester
      - generic [ref=e10]:
        - generic [ref=e11]: Nome da escola
        - textbox "Nome da escola" [ref=e12]: Escola E2E
      - generic [ref=e13]:
        - generic [ref=e14]: Email
        - textbox "Email" [ref=e15]: e2e+1768606027952@example.com
      - generic [ref=e16]:
        - generic [ref=e17]: Telefone
        - textbox "Telefone" [ref=e18]: "11999999999"
      - button "Solicitar demonstração" [ref=e19] [cursor=pointer]
  - alert [ref=e20]
```