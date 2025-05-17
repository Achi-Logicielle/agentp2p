import mongoose from 'mongoose';

const DeviceSchema = new mongoose.Schema({
  device_id: { type: String, required: true, unique: true },
  type: String,
  model: String,
  firmware_version: String,
  status: String,
  location: String,
  registration_date: { type: Date, default: Date.now },
  configuration: {
    sampling_interval_sec: Number,
    calibration_date: String,
  },
});

const Device = mongoose.model('Device', DeviceSchema);
export default Device;
