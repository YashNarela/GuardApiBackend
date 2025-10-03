const mongoose = require("mongoose");
const patrolSchema = new mongoose.Schema(
  {
    patrolPlanId: { type: mongoose.Schema.Types.ObjectId, ref: "PatrolPlan" },
    guard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shift: { type: mongoose.Schema.Types.ObjectId, ref: "Shift" },
    qrCodeId: { type: mongoose.Schema.Types.ObjectId, ref: "QR" },
    roundNumber: { type: Number, required: true }, // ✅ controller sets this

    location: { lat: Number, lng: Number },
    distanceMeters: Number,
    photo: String,
    isVerified: Boolean,

    firstScanAt: { type: Date },
    lastScanAt: { type: Date },
    scanCount: { type: Number, default: 1 },
  },
  { timestamps: true }
);
module.exports = mongoose.model("Patrol", patrolSchema);
  