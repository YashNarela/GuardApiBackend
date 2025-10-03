const mongoose = require("mongoose");
const moment = require("moment-timezone");

const shiftSchema = new mongoose.Schema(
  {
    shiftName: { type: String, required: true },
    assignedGuards: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isActive: { type: Boolean, default: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    timezone: {
      type: String,
      default: "UTC",
      required: true,
    },
    shiftType: { type: String, enum: ["day", "night", "both"], default: "day" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Virtual for local start time
shiftSchema.virtual("localStartTime").get(function () {
  return moment(this.startTime).tz(this.timezone).format();
});

// Virtual for local end time
shiftSchema.virtual("localEndTime").get(function () {
  return moment(this.endTime).tz(this.timezone).format();
});

// Method to check if shift is currently active
shiftSchema.methods.isCurrentlyActive = function () {
  const now = moment().tz(this.timezone);
  const start = moment(this.startTime).tz(this.timezone);
  const end = moment(this.endTime).tz(this.timezone);

  return now.isBetween(start, end);
};

// Static method to find active shifts
shiftSchema.statics.findActiveShifts = function () {
  const now = moment().toDate(); // Current time in UTC
  return this.find({
    isActive: true,
    startTime: { $lte: now },
    endTime: { $gte: now },
  });
};

module.exports = mongoose.model("Shift", shiftSchema);
