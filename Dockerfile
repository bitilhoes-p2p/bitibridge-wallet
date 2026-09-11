# Build da carteira BitiBridge.
#
# Não existe nenhum ARG nem ENV aqui, e isso é PROPOSITAL: a carteira não tem
# configuração, não tem chave, não tem endereço de servidor. O que você lê no
# repositório é exatamente o que roda — não há valor injetado em tempo de build
# que possa mudar o comportamento sem aparecer no código.

# Etapa 1: compilar
FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
# `npm ci` respeita o lock: o build de produção usa exatamente as versões testadas.
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# Etapa 2: servir arquivos estáticos
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
