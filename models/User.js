/**
 * User Mongoose model
 */

import mongoose, {Schema} from 'mongoose';
import bcrypt from "bcrypt";
import nanoid from 'nanoid';
import { formatNumber, sendEmail } from '../helpers';
import {ProcessEmailTemplate} from "../templates/email";
import Translate from "../translate";

const saltRounds = 10;
const emailRe = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const schema = Schema({
  first_name: String,
  last_name: String,
  email: { type: String, unique: true },
  phoneNumber: { type: String, unique: true },
  password: String,
  photo: String,
  verifyCode: String,
  verified: { type: Boolean, default: false },
  madeFromSupportOrder: { type: Boolean, default: false },
  bonus: { type: Number, default: 0 },
  addresses: [{
    address: { type: String, index: true },
    notes: String,
    orderCount: 0,
  }],

  created_at: { type: Date, default: Date.now },
  last_login: { type: Date, default: Date.now },
});

/**
 * validating email using predefined RegEx
 * @param email String
 * @returns Boolean
 */
schema.statics.validateEmail = function (email) {
  return emailRe.test(email);
};

/**
 * validating password based on length
 * @param password String
 * @returns Boolean
 */
schema.statics.validatePassword = function (password) {
  return typeof password === 'string' && password.length > 8;
};

/**
 * Generate password hash and set it as a user password in database!
 * NOTE: this method could throw an exception
 * @param raw_password String
 */
schema.methods.setPassword = async function (raw_password) {
  this.password = await bcrypt.hash(raw_password, saltRounds);
};

/**
 * Checking raw password by comparing it with
 *  existing one
 * NOTE: this method could throw an exception
 * @param raw_password String
 */
schema.methods.checkPassword = async function(raw_password) {
  if (!this.password) return false;
  return await bcrypt.compare(raw_password, this.password);
};

schema.statics.generateVerifyCode = function(forEmail = false) {
  if (forEmail) {
    return nanoid();
  }

  // generating random 6 digits
  return Math.floor(100000 + Math.random() * 900000);
};

schema.methods.addOrderForAddress = async function (address, notes) {
  if (!this.addresses) {
    this.addresses = [];
  }

  let addressIndex = -1;

  for (let i = 0; i < this.addresses.length; i++) {
    if (this.addresses[i].address === address) {
      addressIndex = i;
      break;
    }
  }

  if (addressIndex === -1) {
    this.addresses.push({
      address, notes,
    });

    addressIndex = this.addresses.length - 1;
  }

  this.addresses[addressIndex].orderCount++;
  await this.save();
};

schema.statics.findOrCreate = async function(phoneNumberRaw, createOptions = {}) {
  let phoneNumber = phoneNumberRaw;
  try {
    phoneNumber = formatNumber(phoneNumberRaw);
  } catch(e) {
    console.log(`Invalid Phone Number: ${phoneNumber} -> `, e);
    return null;
  }

  let user = await this.findOne({ phoneNumber });
  if (!user) {
    user = await this.create({ phoneNumber, ...createOptions });
  }

  return user;
};

schema.methods.sendVerifyEmail = async function(lang) {
  const htmlText = await ProcessEmailTemplate('registration', {
    title: Translate('EMAIL_REGISTRATION_TITLE', lang),
    bodyText: Translate('EMAIL_REGISTRATION_BODY', lang),
    buttonText: Translate('EMAIL_REGISTRATION_BUTTON', lang),
    buttonHref: `https://gazar.am/verify-email/${this.verifyCode}`,
  });
  await sendEmail({
    to: this.email,
    subject: Translate('EMAIL_REGISTRATION_VERIFY_SUBJECT', lang),
    html: htmlText,
  });
};

schema.methods.sendPasswordResetEmail = async function(lang) {
  const htmlText = await ProcessEmailTemplate('registration', {
    title: Translate('EMAIL_PASSWORD_RESET_TITLE', lang),
    bodyText: Translate('EMAIL_PASSWORD_RESET_BODY', lang),
    buttonText: Translate('EMAIL_PASSWORD_RESET_BUTTON', lang),
    buttonHref: `https://gazar.am/password-reset/${this.verifyCode}`,
  });

  await sendEmail({
    to: this.email,
    subject: Translate('EMAIL_PASSWORD_RESET_SUBJECT', lang),
    html: htmlText,
  });
};

// Registering schema here
mongoose.model('User', schema);
