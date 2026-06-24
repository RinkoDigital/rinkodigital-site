CONFIGURAÇÃO OBRIGATÓRIA NO NETLIFY

Environment variables:
BREVO_API_KEY = sua chave API da Brevo

Listas por idioma:
BREVO_LIST_ID_pt = 9
BREVO_LIST_ID_us = 6
BREVO_LIST_ID_es = 12

Fallback opcional:
BREVO_LIST_ID = 6

No Brevo, crie estes Contact Attributes:
PHONE
LANGUAGE
BUSINESS
PREFERRED_CONTACT
BEST_TIME
BUDGET
SERVICE
MESSAGE
SOURCE

Depois faça deploy no Netlify.
