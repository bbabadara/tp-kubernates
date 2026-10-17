# ----- Build stage -----
FROM node:18-alpine AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build the React app
COPY . .
RUN npm run build

# ----- Production stage (nginx running as non-root) -----
FROM nginxinc/nginx-unprivileged:1.27-alpine AS production

# Copy build output to nginx html dir
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx config (listens on 8080)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Unprivileged image already runs as non-root user (uid 101)
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
