# syntax=docker/dockerfile:1

FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG API_BASE_URL=/api/v1
ENV API_BASE_URL=${API_BASE_URL}

RUN npm run build
RUN test -d dist && test -f dist/index.html

FROM nginx:alpine AS runtime

ENV BACKEND_ORIGIN=

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY docker-entrypoint-wrapper.sh /usr/local/bin/docker-entrypoint-wrapper.sh
RUN chmod +x /usr/local/bin/docker-entrypoint-wrapper.sh

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/docker-entrypoint-wrapper.sh"]
CMD ["nginx", "-g", "daemon off;"]
