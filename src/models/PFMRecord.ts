import mongoose from 'mongoose';

const PFMRecordSchema = new mongoose.Schema({
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true, strict: false });

export default mongoose.models.PFMRecord || mongoose.model('PFMRecord', PFMRecordSchema);
