# Rinko Digital Decap CMS

Admin criado para o repositório:
https://github.com/RinkoDigital/rinkodigital-site-V2

## Arquivos adicionados
- admin/index.html
- admin/config.yml
- content/home.yml
- content/services.yml
- content/faq.yml
- content/payment.yml
- content/portfolio/*.yml
- static/uploads/

## Ativação no Netlify
1. Suba estes arquivos para o GitHub.
2. No Netlify, vá em Site configuration > Identity e ative Identity.
3. Em Registration preferences, use Invite only.
4. Em Services, ative Git Gateway.
5. Convide seu email em Identity > Invite users.
6. Acesse https://rinkodigital.com/admin

## Observação
O painel já edita os arquivos YAML em /content.
Para o HTML renderizar automaticamente esses dados, o próximo passo é conectar index.html e portfolio.html aos arquivos de conteúdo ou migrar para Eleventy/Next.js.
