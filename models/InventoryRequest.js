import mongoose, { Schema } from 'mongoose';
import {UNIT_TYPES} from "../helpers";

const schema = Schema({
  title: String,
  created_at: { type: Date, default: Date.now },
  updated_at: Date,
  products: [{
    _id: { type: Schema.Types.ObjectId, index: true },
    nameAm: String,
    nameEn: String,
    nameRu: String,
    price: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    unit: { type: String, enum: UNIT_TYPES },
    maxOrder: { type: Number, default: 20 },
    minOrder: { type: Number, default: 0.5 },
    photo: String,
    quantity: { type: Number, default: 0 },
  }],
  isCompleted: { type: Boolean, default: false },
  isPriceHandler: { type: Boolean, default: false },
});

// Registering schema here
mongoose.model('InventoryRequest', schema);
