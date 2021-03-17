import moment from 'moment';
import mongoose from "mongoose";
import {sendToTelegram} from "../helpers";

const BusinessClient = mongoose.model('BusinessClient');

export default async () => {
  const currentWeekday = moment(new Date()).format('dddd').toLowerCase();
  const businessClients = await BusinessClient.find({ isActive: true });
  let notifiedClientsCounter = 0;

  console.log('WORKER-WEEKLY-DELIVERY: STARTING DELIVERY SUBSCRIPTION NOTIFIER FOR - ', currentWeekday);

  for (let client of businessClients) {
    const clientNotifiedDay = moment(client.notifiedDay).format('dddd').toLowerCase();

    if (typeof client.notifiedDay === "undefined" || clientNotifiedDay !== currentWeekday) {// haven't been notified yet
      if (typeof client.weeklyDelivery !== "undefined" && client.weeklyDelivery.includes(currentWeekday)) {
        client.notifiedDay = new Date();
        await client.save();
        notifiedClientsCounter++;

        console.log('WORKER-WEEKLY-DELIVERY: HAVE BEEN NOTIFIED - ', client.name);

        const messageText = `${client.name}: NEED TO DELIVER TODAY 🧺`;
        await sendToTelegram(messageText);
      }
    }
  }

  console.log('WORKER-WEEKLY-DELIVERY: BUSINESS CLIENTS HAVE BEEN NOTIFIED - ', notifiedClientsCounter);
};
