# STAGE 1: Build
FROM node:22-alpine AS build
WORKDIR /app

# Abhängigkeiten kopieren und installieren
COPY package*.json ./
RUN npm install

# Quellcode kopieren und bauen
COPY . .
RUN npm run build --configuration=production

# STAGE 2: Run
FROM nginx:stable-alpine
# Kopiere das Build-Ergebnis in das Nginx-Verzeichnis
COPY --from=build /app/dist/want-have/browser /usr/share/nginx/html

# Eigene Nginx-Konfiguration für Angular-Routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]