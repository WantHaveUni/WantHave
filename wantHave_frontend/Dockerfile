# frontend/Dockerfile
# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration=production

# Stage 2: Serve via Nginx
FROM nginx:stable-alpine
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# Custom Nginx Config
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
