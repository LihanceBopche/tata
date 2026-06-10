import mongoose from 'mongoose';

const PFMDataSchema = new mongoose.Schema({
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true, strict: false });

// Delete the old cached model so hot-reloading applies the new schema
delete mongoose.models.PFMData;

export default mongoose.model('PFMData', PFMDataSchema);
