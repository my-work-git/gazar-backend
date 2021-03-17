import mongoose, {Schema} from 'mongoose';
import { UNIT_TYPES, uploadBase64, removeFile} from "../helpers";

const schema = Schema({
  nameAm: String,
  nameEn: String,
  nameRu: String,
  price: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  unit: { type: String, enum: UNIT_TYPES },
  maxOrder: { type: Number, default: 20 },
  minOrder: { type: Number, default: 0.5 },
  category: { type: Schema.Types.ObjectId, ref: 'Category' },
  photo: String,
  isActive: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: Date,
  featured: { type: Boolean, default: false },

  keywords: { type: String },
  descriptionAm: { type: String },
  descriptionRu: { type: String },
  descriptionEn: { type: String },
});


schema.methods.setPhoto = async function(photoBase64) {
  const image_format = photoBase64.substring("data:image/".length, photoBase64.indexOf(";base64,"));
  const filename = `${this._id.toString()}.${image_format}`;
  await uploadBase64(photoBase64.replace(`data:image/${image_format};base64,`, ''), filename);
  this.photo = `https://storage.googleapis.com/gazar-am.appspot.com/${filename}`;
  await this.save();
};

schema.methods.removePhoto = async function() {
  await removeFile(this.photo.replace('https://storage.googleapis.com/gazar-am.appspot.com/', ''));
};

// Registering schema here
mongoose.model('Product', schema);
