# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app/server

# install deps
COPY server/package*.json ./
RUN npm ci

# copy source
COPY server ./

# prisma client (if you have prisma/)
RUN [ -d prisma ] && npx prisma generate || echo "no prisma folder"

# build TS -> JS (ok if you don't have a build step yet)
RUN npm run build || echo "no build script"

# ---- runtime stage ----
FROM node:20-alpine
WORKDIR /app/server
ENV NODE_ENV=production

# install prod deps
COPY --from=build /app/server/package*.json ./
RUN npm ci --omit=dev

# bring built app + prisma schema
COPY --from=build /app/server ./

EXPOSE 8080

# run migrations if prisma exists, then start
CMD sh -c "[ -d prisma ] && npx prisma migrate deploy || true; npm run start"

