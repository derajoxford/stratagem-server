# Build frontend
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./    # root package.json used if you’re using workspaces (ok)
# If your frontend has its own package.json inside /web, copy it too:
# COPY web/package*.json ./web/
RUN npm ci || true
COPY . .
WORKDIR /app/web
RUN npm ci
RUN npm run build

# Serve with Nginx
FROM nginx:1.27-alpine
COPY --from=build /app/web/dist /usr/share/nginx/html
COPY web/nginx.conf /etc/nginx/conf.d/default.conf

