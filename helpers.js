/**
 * This file just is for keeping generic helper functions, which
 * should be used in many places inside project
 */

import fs from "fs";
import moment from "moment-timezone";
import path from "path";
import { GraphQLObjectType, GraphQLBoolean, GraphQLString } from "graphql";
import mongoose from "mongoose";
import Telegram from "node-telegram-bot-api";
import { Storage as GoogleStorage } from "@google-cloud/storage";
import { PhoneNumberUtil, PhoneNumberFormat } from "google-libphonenumber";
import {
  NikitaConfig,
  TelegramGroupID,
  TelegramActivityGroupID,
  MailGunConfig
} from "./config";
import Translate from "./translate";
import jwt from "jsonwebtoken";
import { client as MG } from "mailgun.js";
import { JWTConfig } from "./config";

const phoneUtil = PhoneNumberUtil.getInstance();
const TelegramBot = new Telegram(
  "653288193:AAHmW6jxK_-Gqhaa0HU4li85Ejas0bxpPVw"
);

export const UNIT_TYPES = ["kg", "item", "litre"];
export const DELIVERY_TIMES = ["10-11am", "13-14pm", "16-17pm", "19-20pm"];
export const DELIVERY_TIME_MAX_HOURS = {
  "10-11am": 9,
  "13-14pm": 12,
  "16-17pm": 15,
  "19-20pm": 18
};

export const ORDER_STATUS = Object.freeze({
  DELIVERED: "delivered",
  PACKAGING: "packaging",
  ON_THE_WAY: "on-the-way",
  CANCELED: "canceled",
  PENDING: "pending"
});

export const BOT_STATES = {
  CHECK_START: "CHECK_START",
  PARSE_PRODUCTS: "PARSE_PRODUCTS",
  SET_PHONE: "SET_PHONE",
  SET_ADDRESS: "SET_ADDRESS",
  SET_NOTES: "SET_NOTES",
  ORDER_SUCCESS: "ORDER_SUCCESS",
  ORDER_ERROR: "ORDER_ERROR"
};

export const PAYMENT_METHODS = {
  CASH: "cash",
  CREDIT_CARD: "credit_card",
  IDRAM : "idram"
};

export const Storage = new GoogleStorage({
  projectId: "gazar-am",
  keyFilename: "gazar-gcs.json"
});

export const MIN_ORDER_LIMIT = 3000;

export const StorageBucket = Storage.bucket("gazar-am.appspot.com");

export const WEEKLY_DELIVERY = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];

/**
 * Loading all files to Node.js project inside given directory
 * Ignoring 'index.js' file, because it should be loaded as a generic module
 * NOTE: this is sync operation!
 * @param {String} directory
 */
export const RequireFiles = directory => {
  return fs.readdirSync(directory).map(name => {
    if (name.indexOf("index.js") !== -1) return;

    // loading up model from directory
    return require(path.join(directory, name));
  });
};

/**
 * Sending response from Mutation as a shortcut function
 * @param {Object} obj Object fields representation
 * @param {String} message Message to send if there is an error
 * @returns {Object}
 */
export const response = (obj, message = "") => ({
  ...obj,
  ...{ error: message.length > 0, message: message }
});

/**
 * Basic definition of generic error response used in mutation responses
 */
export const ErrorResp = response({}, "Unhandled server error.");

/**
 * Building generic GraphQL mutation object which contains error information if needed
 * @param {String} name Mutation GraphQL type name
 * @param {Object} fields addon fields for GraphQL mutation
 * @returns {GraphQLObjectType}
 */
export const getMutationObject = (name, fields) =>
  new GraphQLObjectType({
    name: name + "Mutation",
    fields: () => ({
      ...fields,
      error: { type: GraphQLBoolean },
      message: { type: GraphQLString }
    })
  });

/**
 * getJWT function create jwt token using "user_.id"
 * @param  {Schema} user
 * @param  {String} userType
 * @return {String}
 */
export const getJWT = (user, userType = "user") =>
  jwt.sign({ id: user._id.toString(), userType }, JWTConfig.secret);

export const require_auth = resolve => {
  return async (parentValue, args, context) => {
    const { user } = context;
    if (!user) {
      return response(
        {},
        "You should be authenticated to perform this action!"
      );
    }
    return await resolve(parentValue, args, context);
  };
};

export const require_super_admin = resolve => {
  return async (parentValue, args, context) => {
    const { superAdmin } = context;
    if (!superAdmin) {
      return response({}, `You don't have permissions to perform this action!`);
    }

    return await resolve(parentValue, args, context);
  };
};

export const require_admin = resolve => {
  return async (parentValue, args, context) => {
    const { admin } = context;
    if (!admin) {
      return response({}, `You don't have permissions to perform this action!`);
    }

    return await resolve(parentValue, args, context);
  };
};

export const require_deliveryPartner = resolve => {
  return async (parentValue, args, context) => {
    const { deliveryPartner, admin } = context;
    if (!deliveryPartner && !admin) {
      return response({}, `You don't have permissions to perform this action!`);
    }

    return await resolve(parentValue, args, context);
  };
};

export const formatNumber = rawPhoneNumber => {
  const number = phoneUtil.parseAndKeepRawInput(rawPhoneNumber, "AM");
  return phoneUtil.format(number, PhoneNumberFormat.E164);
};

export const sendSMS = async (rawPhoneNumber, text) => {
  const SMSLog = mongoose.model("SMSLog");
  const phoneNumber = formatNumber(rawPhoneNumber);
  const from = "GazarAM";
  const request = require("request");

  const auth =
    "Basic " +
    new Buffer(NikitaConfig.login + ":" + NikitaConfig.pass).toString("base64");
  const body = {
    messages: [
      {
        recipient: phoneNumber,
        "message-id": moment().format(),
        sms: {
          originator: "Gazar.am",
          ttl: "300",
          content: {
            text: text
          }
        }
      }
    ]
  };

  const options = {
    url: NikitaConfig.url,
    headers: {
      "Content-Type": "application/json",
      Authorization: auth
    },
    json: true,
    body: body
  };

  await request.post(options, (err, res, body) => {
    if (err) {
      return console.log(err);
    }
  });

  await SMSLog.create({ to: phoneNumber, from, message: text });
  return phoneNumber;
};

export const uploadBase64 = async (base64String, filename) => {
  const filePath = path.join("/tmp", filename);
  await new Promise((resolve, reject) =>
    fs.writeFile(filePath, new Buffer(base64String, "base64"), e =>
      e ? reject(e) : resolve()
    )
  );
  await StorageBucket.upload(filePath, { public: true, destination: filename });
  await new Promise((resolve, reject) =>
    fs.unlink(filePath, e => (e ? reject(e) : resolve()))
  );
};

export const removeFile = async filename => {
  const file = await StorageBucket.file(filename);
  const fileExists = await file.exists();
  if (fileExists) {
    await file.delete({ force: true });
  }
};

export const calcPrices = (price, discount, quantity) => ({
  price:
    Math.round((price - (price * (discount || 0)) / 100) * quantity * 10) / 10,
  discount: Math.round(price * quantity * 10) / 10
});

export const getTotalPrice = products => {
  let totalPrice = 0;
  if (products) {
    // eslint-disable-next-line
    products.map(p => {
      const { price } = calcPrices(p.price, p.discount, p.quantity);
      if (price) {
        totalPrice += price;
      }
    });
  }
  return totalPrice;
};

export const sendToTelegram = async (text, chatId = TelegramGroupID) =>
  await TelegramBot.sendMessage(chatId, text, { parse_mode: "Markdown" });

export const DeliveryTimeIsToday = (deliveryTime, timeFrom) => {
  const hour = moment(timeFrom)
    .tz("Asia/Yerevan")
    .get("hours");
  const deliveryTimeHour = DELIVERY_TIME_MAX_HOURS[deliveryTime];
  if (!deliveryTimeHour) return false;
  return deliveryTimeHour > hour;
};

export const sendOrderToMembers = async order => {
  let productsText = "";
  order.products.map(p => {
    const prices = calcPrices(p.price, p.discount, p.quantity);
    productsText +=
      "\n- " +
      `\`${p.nameAm} - ${p.quantity}${Translate(p.unit, "am")}\` | P: ${
        p.price
      } | D: ${p.discount} | T: ${prices.price}`;
  });
  const text = `Payment Type: ${order.paymentMethod.replace("_", "-")}
Product Count: ${order.products.length}
Address: ${order.address}
Phone: ${order.phoneNumber}
Price: ${order.price}
FromMobile: ${order.fromMobile ? "Yes" : "No"}
Delivery: ${moment(order.deliveryDate)
    .tz("Asia/Yerevan")
    .format("DD/MM/YYYY")} ${Translate(order.deliveryTime, "en")}
Notes: ${order.notes}
--------------
${productsText}
    `;

  await sendToTelegram(text);
};

export const sendActivityLogTelegram = async activity =>
  sendToTelegram(
    `Activity Log: \`${moment(activity.created_at)
      .tz("Asia/Yerevan")
      .format("MM/DD/YYYY HH:mm:ss")}\`
Type: \`${activity.type}\`
Made By: ${activity.admin.first_name} ${activity.admin.last_name}
${activity.description}`,
    TelegramActivityGroupID
  );

// (async () => {
//   const updates  = await TelegramBot.getUpdates();
//   console.log(JSON.stringify(updates));
// })();

export const retryCall = async (throwName, func, count, catchCallback) => {
  let retryCount = count;
  while (retryCount > 0) {
    try {
      await func();
      break;
    } catch (e) {
      catchCallback(e);
    }
    retryCount--;
  }

  if (retryCount <= 0) {
    throw new Error(
      `###### Tried to call ${throwName} ${count} times, but failed!!! ######`
    );
  }
};

export const sendEmail = async ({ to, html, subject }) => {
  const mailgun = MG({
    ...MailGunConfig
  });

  const msgData = {
    from: "Gazar.am <info@gazar.am>",
    to,
    subject,
    html,
    text: html
  };

  await mailgun.messages.create("mg.gazar.am", msgData);
};
