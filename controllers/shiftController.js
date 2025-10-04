// controllers/shiftController.js
const Shift = require("../models/Shift");
const ApiResponse = require("../utils/apiResponse");
const PatrolPlan = require("../models/PatrolPlan");

const moment = require("moment-timezone");

const mongoose = require("mongoose");

// exports.createShift = async (req, res) => {
//   try {
//     const { shiftName, shiftType, startTime, endTime, assignedGuards } =
//       req.body;

//     if (!shiftName || !startTime || !endTime || !assignedGuards?.length) {
//       return res
//         .status(400)
//         .json(
//           new ApiResponse(
//             false,
//             "Shift name, timings, and at least one guard are required"
//           )
//         );
//     }

//     // Parse incoming ISO strings as UTC
//     const start = new Date(startTime);
//     const end = new Date(endTime);
//     const now = new Date();

//     if (isNaN(start) || isNaN(end)) {
//       return res
//         .status(400)
//         .json(new ApiResponse(false, "Invalid start or end time format"));
//     }

//     // Compare timestamps
//     if (start.getTime() < now.getTime()) {
//       return res
//         .status(400)
//         .json(new ApiResponse(false, "Shift start time cannot be in the past"));
//     }

//     if (end.getTime() <= start.getTime()) {
//       return res
//         .status(400)
//         .json(new ApiResponse(false, "End time must be after start time"));
//     }

//     // Overlap check
//     const overlap = await Shift.findOne({
//       assignedGuards: { $in: assignedGuards },
//       isActive: true,
//       startTime: { $lt: end },
//       endTime: { $gt: start },
//     });

//     if (overlap) {
//       return res
//         .status(400)
//         .json(
//           new ApiResponse(
//             false,
//             "One or more guards already have an overlapping shift"
//           )
//         );
//     }

//     // Store as UTC ISO strings
//     const shift = await Shift.create({
//       shiftName,
//       assignedGuards,
//       startTime: start.toISOString(),
//       endTime: end.toISOString(),
//       shiftType: shiftType || "day",
//       createdBy: req.user.id,
//     });

//     return res
//       .status(201)
//       .json(new ApiResponse(true, "Shift created successfully", shift));
//   } catch (err) {
//     console.error("Error creating shift:", err);
//     return res.status(500).json(new ApiResponse(false, err.message));
//   }
// };




// Get active shifts





const getActiveShifts = async (req, res) => {
  try {
    const activeShifts = await Shift.findActiveShifts()
      .populate("assignedGuards", "name email phone")
      .populate("createdBy", "name");

    res.json({
      success: true,
      data: activeShifts,
      message: "Active shifts retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching active shifts",
      error: error.message,
    });
  }
};

// Create shift with validation
 exports.createShift = async (req, res) => {
  try {
    const {
      shiftName,
      startTime,
      endTime,
      shiftType,
      assignedGuards,
      timezone = "UTC",
    } = req.body;

    // Validate required fields
    if (!shiftName || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Shift name, start time, and end time are required",
      });
    }

    // Validate time format and logic
    const startMoment = moment(startTime);
    const endMoment = moment(endTime);

    if (!startMoment.isValid() || !endMoment.isValid()) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    if (endMoment.isBefore(startMoment)) {
      return res.status(400).json({
        success: false,
        message: "End time cannot be before start time",
      });
    }

         const overlappingShift = await Shift.findOne({
           assignedGuards: { $in: assignedGuards },
           startTime: { $lt: endTime },
           endTime: { $gt: startTime },
           isActive: true,
         });


    if (overlappingShift) {
      return res.status(400).json({
        success: false,
        message: "Shift overlaps with existing shift",
      });
    }

    const shift = new Shift({
      shiftName,
      startTime: startMoment.toDate(),
      endTime: endMoment.toDate(),
      shiftType,
      assignedGuards,
      timezone,
      createdBy: req.user.id,
    });

    await shift.save();
    await shift.populate("assignedGuards", "name email");

    res.status(201).json({
      success: true,
      data: shift,
      message: "Shift created successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating shift",
      error: error.message,
    });
  }
};



exports.getShifts = async (req, res) => {
  try {
    let filter = {};

    console.log('req.user.id',req.user);
    

    if (req.user.role === "supervisor") {
         filter = {
           createdBy: new mongoose.Types.ObjectId(req.user.id),
         };
    }

    const shifts = await Shift.find(filter).populate(
      "assignedGuards",
      "name email"
    );

    return res
      .status(200)
      .json(new ApiResponse(true, "Shifts fetched", shifts));
  } catch (err) {
    return res.status(500).json(new ApiResponse(false, err.message));
  }
};


exports.deleteShift = async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.role === "supervisor") {
      filter.createdBy = req.user.id;
    }

    const deleted = await Shift.findOneAndDelete(filter);

    if (!deleted) {
      return res.status(404).json(new ApiResponse(false, "Shift not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(true, "Shift deleted successfully"));
  } catch (err) {
    return res.status(500).json(new ApiResponse(false, err.message));
  }
};




// exports.updateShift = async (req, res) => {
//   try {
//     const { shiftName, startTime, endTime, shiftType, assignedGuards } = req.body;

//     const filter = { _id: req.params.id };
//     if (req.user.role === "supervisor") filter.createdBy = req.user.id;

//     const updateData = {};
//     const now = new Date();
//     let newStart, newEnd;

//     if (startTime) {
//       newStart = new Date(startTime);
//       if (isNaN(newStart)) return res.status(400).json(new ApiResponse(false, "Invalid start time format"));
//       if (newStart < now) return res.status(400).json(new ApiResponse(false, "Shift start time cannot be in the past"));
//       updateData.startTime = newStart.toISOString();
//     }

//     if (endTime) {
//       newEnd = new Date(endTime);
//       if (isNaN(newEnd)) return res.status(400).json(new ApiResponse(false, "Invalid end time format"));
//       updateData.endTime = newEnd.toISOString();
//     }

//     // Validate end > start
//     if (newStart && newEnd && newEnd <= newStart) {
//       return res.status(400).json(new ApiResponse(false, "End time must be after start time"));
//     }

//     if (shiftType) updateData.shiftType = shiftType;
//     if (assignedGuards?.length) updateData.assignedGuards = assignedGuards;

//     // Overlap check
//     if ((newStart || newEnd) && assignedGuards?.length) {
//       const currentShift = await Shift.findById(req.params.id);
//       if (!currentShift) return res.status(404).json(new ApiResponse(false, "Shift not found"));

//       const overlapStart = newStart || currentShift.startTime;
//       const overlapEnd = newEnd || currentShift.endTime;

//       const overlap = await Shift.findOne({
//         _id: { $ne: req.params.id },
//         assignedGuards: { $in: assignedGuards },
//         isActive: true,
//         startTime: { $lt: overlapEnd },
//         endTime: { $gt: overlapStart }
//       });

//       if (overlap) {
//         return res.status(400).json(new ApiResponse(false, "One or more guards already have an overlapping shift"));
//       }
//     }

//     const updated = await Shift.findOneAndUpdate(filter, updateData, { new: true })
//       .populate("assignedGuards", "name email role");

//     if (!updated) return res.status(404).json(new ApiResponse(false, "Shift not found"));

//     return res.status(200).json(new ApiResponse(true, "Shift updated", updated));

//   } catch (err) {
//     console.error("Error updating shift:", err);
//     return res.status(500).json(new ApiResponse(false, err.message));
//   }
// };


exports.updateShift = async (req, res) => {
  try {
    const {
      shiftName,
      startTime,
      endTime,
      shiftType,
      assignedGuards,
      timezone,
    } = req.body;

    const filter = { _id: req.params.id };
    if (req.user.role === "supervisor") filter.createdBy = req.user.id;

    const updateData = {};
    const now = moment();
    let startMoment, endMoment;

    // Validate and process startTime with moment
    if (startTime) {
      startMoment = moment(startTime);
      if (!startMoment.isValid()) {
        return res
          .status(400)
          .json(new ApiResponse(false, "Invalid start time format"));
      }
      if (startMoment.isBefore(now)) {
        return res
          .status(400)
          .json(
            new ApiResponse(false, "Shift start time cannot be in the past")
          );
      }
      updateData.startTime = startMoment.toDate();
    }

    // Validate and process endTime with moment
    if (endTime) {
      endMoment = moment(endTime);
      if (!endMoment.isValid()) {
        return res
          .status(400)
          .json(new ApiResponse(false, "Invalid end time format"));
      }
      updateData.endTime = endMoment.toDate();
    }

    // Validate end > start using moment
    if (startTime && endTime && endMoment.isSameOrBefore(startMoment)) {
      return res
        .status(400)
        .json(new ApiResponse(false, "End time must be after start time"));
    }

    // Handle other fields
    if (shiftName) updateData.shiftName = shiftName;
    if (shiftType) updateData.shiftType = shiftType;
    if (assignedGuards) updateData.assignedGuards = assignedGuards;
    if (timezone) updateData.timezone = timezone;

    // Overlap check with moment
    if ((startTime || endTime) && assignedGuards?.length) {
      const currentShift = await Shift.findById(req.params.id);
      if (!currentShift) {
        return res.status(404).json(new ApiResponse(false, "Shift not found"));
      }

      const overlapStart = startMoment
        ? startMoment.toDate()
        : currentShift.startTime;
      const overlapEnd = endMoment ? endMoment.toDate() : currentShift.endTime;

      const overlap = await Shift.findOne({
        _id: { $ne: req.params.id },
        assignedGuards: { $in: assignedGuards },
        isActive: true,
        startTime: { $lt: overlapEnd },
        endTime: { $gt: overlapStart },
      });

      if (overlap) {
        return res
          .status(400)
          .json(
            new ApiResponse(
              false,
              "One or more guards already have an overlapping shift"
            )
          );
      }
    }

    const updated = await Shift.findOneAndUpdate(filter, updateData, {
      new: true,
    }).populate("assignedGuards", "name email role");

    if (!updated) {
      return res.status(404).json(new ApiResponse(false, "Shift not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(true, "Shift updated", updated));
  } catch (err) {
    console.error("Error updating shift:", err);
    return res.status(500).json(new ApiResponse(false, err.message));
  }
};