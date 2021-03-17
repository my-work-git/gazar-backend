import mongoose, {Schema} from 'mongoose';

const schema = Schema({
  nameAm: String,
  nameEn: String,
  nameRu: String,
  slug: { type: String, unique: true },
  order: {type: Number, default: 0},

  isActive: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: Date,
});

schema.statics.checkSlug = slug => /^(\w){1,15}$/.test(slug);

// Registering schema here
mongoose.model('Category', schema);
