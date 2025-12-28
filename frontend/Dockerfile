FROM node:18
WORKDIR /usr/src/app
COPY package.json package.json
RUN npm install
COPY . .
ENV PATH /usr/src/app/node_modules/.bin:$PATH
EXPOSE 5173
CMD ["npm", "run", "dev"]
