FROM node:10-alpine
ADD . /gazar-api
WORKDIR /gazar-api

RUN apk add --no-cache make gcc g++ python && \
  npm install --silent && \
  apk del make gcc g++ python

ENV NODE_ENV=production

ENTRYPOINT [ "npm", "start" ]
