// First of all importing and registering models
import './models';
import Worker from './worker';
import {
  createServer,
  Server,
} from 'http';
import {
  SubscriptionServer
} from 'subscriptions-transport-ws';
import {
  execute,
  subscribe,
} from 'graphql';
import GraphHTTP from 'express-graphql';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import {
  expressAuth,
  wsAuth
} from './auth_jwt';
import ChatBotApp from './chat-bot';
import AnswerIdram from './idram';

// Building schema types and keeping inside index
import schema from './schema_builder';

/** BASE Express server definition **/
const app = express();

const crypto = require('crypto')


// Sets "X-Frame-Options: SAMEORIGIN"
app.use(
  helmet.frameguard({
    action: 'sameorigin',
  })
);

app.use(expressAuth);
app.use('/chat-bot-api', ChatBotApp);

app.use('/payment', AnswerIdram);
// main endpoint for GraphQL Express
app.use('/api/ql', cors(), GraphHTTP({
  schema: schema,
  graphiql: process.env.NODE_ENV !== 'production',
}));

// Making plain HTTP server for Websocket usage
const server = Server(app);

/** GraphQL Websocket definition **/
SubscriptionServer.create({
  schema,
  execute,
  subscribe,
  onConnect: wsAuth
}, {
  server: server,
  path: '/api/ws',
}, );


server.listen('PORT' in process.env ? process.env['PORT'] : 4000);

// Starting cron worker
Worker();
