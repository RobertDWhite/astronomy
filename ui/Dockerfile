FROM node:24-slim AS builder
WORKDIR /app
COPY package.json .
# npm sometimes skips rollup's platform-specific native binary (npm/cli#4828);
# force the one matching the build's target arch (works under buildx emulation).
RUN npm install && \
    case "$(uname -m)" in \
      x86_64)  npm install --no-save @rollup/rollup-linux-x64-gnu ;; \
      aarch64) npm install --no-save @rollup/rollup-linux-arm64-gnu ;; \
    esac
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.31-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
