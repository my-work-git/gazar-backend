import mongoose from 'mongoose';
import moment from 'moment';
import Translate from '../translate';
import { sendToTelegram, ORDER_STATUS } from "../helpers";

const ShopOrder = mongoose.model('ShopOrder');
const DailyTotal = mongoose.model('DailyTotal');

export default async () => {
  console.log('WORKER-DAILY-ORDERS: START');
  const currentUtc = moment().utc();
  const yesterdayUtc = moment().utc().subtract(1, 'day');
  const dateString = yesterdayUtc.format('DD-MM-YYYY');
  if (currentUtc.get('hour') === 1 && currentUtc.get('minute') > 30) {
    const dailyLog = await DailyTotal.countDocuments({ dateString });
    if (dailyLog > 0) {
      console.log('WORKER-DAILY-ORDERS: ALREADY THERE - C:', dailyLog);
      return;
    }
  } else { // if we have some other time just return
    console.log('WORKER-DAILY-ORDERS: NOT THIS TIME - ', currentUtc.toISOString());
    return;
  }

  // 5am for GMT+4
  const fromDate = yesterdayUtc.clone().set({ 'hour': '1', 'minute': '0' }).toISOString();
  // 4:59am for GMT+4
  const toDate = yesterdayUtc.clone().add(1, 'day').set({ 'hour': '0', 'minute': '59' }).toISOString();

  const orders = await ShopOrder.find({ created_at: { $gte: fromDate, $lte: toDate }, status: ORDER_STATUS.PENDING });
  let products = [];
  orders.map(order => {
    order.products.map(p => {
      const product = products.find(pp => p._id.toString() === pp._id.toString());
      if (product) {
        product.quantity = product.quantity ? product.quantity + p.quantity : p.quantity;
      } else {
        products.push(p);
      }
    });
  });

  if (products.length === 0) {
    console.log("WORKER-DAILY-ORDERS: NO PRODUCTS TO SEND!");
    return;
  }

  const messageText = `========================= ${dateString} =========================
${products.map(p => `\`${p.nameAm}: ${p.quantity} ${Translate(p.unit.toUpperCase(), 'am')}\``).join("\n")}
========================= ${dateString} =========================`;

  await sendToTelegram(messageText);

  await DailyTotal.create({
    orders: orders.map(o => o._id),
    products,
    dateString,
  });

  console.log('WORKER-DAILY-ORDERS: ADDED NEW ONE - ', dateString);
};
