FROM node:26-slim AS client-build
WORKDIR /usr/src/app/client
COPY ./client/package.json .
RUN npm install
COPY ./client .
RUN npm run build

FROM node:26-slim
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY ./server/package.json .
RUN npm install --omit=dev
COPY ./server .

COPY --from=client-build /usr/src/app/client/dist ./client/dist

RUN mkdir -p /usr/src/app/data


EXPOSE 3000
CMD ["node","server.js"]