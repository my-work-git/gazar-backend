import mongoose, { Schema } from 'mongoose';

const schema = Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product' },
  price: { type: Number, default: 0 },
  quantity: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: Date,
  updated_by_admin: { type: Schema.Types.ObjectId, ref: 'Admin' },
  expectedQuantity: { type: Number, default: 0 },
});

// Registering schema here
mongoose.model('Inventory', schema);
