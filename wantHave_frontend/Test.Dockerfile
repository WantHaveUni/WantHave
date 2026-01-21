FROM trion/ng-cli-karma:latest
ENV CI=true
WORKDIR /app
COPY . .
RUN npm ci