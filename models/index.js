/**
 * Main entrance to models
 * NOTE: this module not exporting anything, it's just loading up models
 */

import mongoose from 'mongoose';
import {RequireFiles} from '../helpers';

mongoose.set('useCreateIndex', true);
mongoose.Promise = global.Promise;
const mongooseConnect = () => mongoose.connect((
    'GAZAR_MONGO' in process.env ? process.env['GAZAR_MONGO'] : 'mongodb://gazar-api:pR9CF5jFu2TTg2vNq8TXenCmucMQmt4xC7j@ds046377.mlab.com:46377/gazar-am'
  ),
  {
    useNewUrlParser: true
  },
);

mongoose.connection.on('error', function (error) {
    console.log('MongoDB connection error -> ', error);
    // sleeping 10 seconds, and trying to re-connect
    setTimeout(mongooseConnect, 10000);
});

mongooseConnect();

// Loading up all modules
RequireFiles(__dirname);
