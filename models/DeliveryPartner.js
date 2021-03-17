import mongoose, {Schema} from 'mongoose';
import bcrypt from "bcrypt";

const saltRounds = 10;

const schema = Schema({
  first_name: String,
  last_name: String,
  password: String,
  phoneNumber: { type: String, unique: true },

  created_at: { type: Date, default: Date.now },
  created_by: { type: Schema.Types.ObjectId, ref: 'Admin' },
  last_login: Date,
});

/**
 * validating password based on length
 * @param password String
 * @returns Boolean
 */
schema.statics.validatePassword = function (password) {
  return typeof password === 'string' && password.length > 10;
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

// Registering schema here
mongoose.model('DeliveryPartner', schema);
