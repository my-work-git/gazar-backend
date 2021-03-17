import mongoose, { Schema } from 'mongoose';
import {UNIT_TYPES} from "../helpers";

const schema = Schema({
  orders: [{
    type: Schema.Types.ObjectId,
    ref: 'ShopOrder',
  }],

  // Snapshot of products with current state during ordering time
  products: [{
    // product ID
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

  dateString: { type: String, index: true },
  created_at: { type: Date, default: Date.now },
});

// Registering schema here
mongoose.model('DailyTotal', schema);
