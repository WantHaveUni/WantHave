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
# KORREKTUR: Der Pfad muss mit der tatsächlichen Angular-Ausgabe übereinstimmen
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# Falls Angular bei dir keinen "browser"-Unterordner erstellt, probiere:
# COPY --from=build /app/dist/frontend /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]