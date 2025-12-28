FROM node:18 AS build
WORKDIR /usr/src/app
COPY package.json package.json
RUN npm install --production=false
COPY . .
RUN npm run build

FROM node:18-slim
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY package.json package.json
RUN npm install --production
COPY --from=build /usr/src/app/dist ./dist
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s CMD curl -f http://localhost:3000/health || exit 1
CMD ["/usr/local/bin/node", "dist/main.js"]
