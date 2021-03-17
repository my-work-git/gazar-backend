import '../models';

import mongoose, { mongo } from 'mongoose';
import { SupportUsers } from '../config';
import { sendSMS } from '../helpers';

const User = mongoose.model('User');

const SMS_TEXT = `Եթե մտահոգ ես...🙂
Նստիր տանը, մենք կառաքենք!
www.gazar.am
`;

async function Run() {
  const users = await User.find({ phoneNumber: { $nin: SupportUsers } });
  for (const user of users) {
    console.log('SENDING TO: ', user.phoneNumber);
    try {
      await sendSMS(user.phoneNumber, SMS_TEXT);
      console.log('SENT!!!');
    } catch(e) {
      console.log('Unable to send SMS to number -> ', user.phoneNumber, ' ERROR -> ', e);
    }
  }
}

Run();
