
const Patrol = require("../models/Patrol");
const QR = require("../models/QR");
const User = require("../models/User"); 
const { validateLocation } = require("../utils/qrValidator");
const { verifyQRSignature } = require("../utils/qrVerifier");
const ApiResponse = require("../utils/apiResponse");
const fs = require("fs").promises;
const path = require("path");
const { uploadDir } = require("../middleware/multer");
const mongoose = require("mongoose");
const Shift = require("../models/Shift");
const Attendance = require("../models/Attendance");

const Incident=require("../models/Incident")
const PatrolPlan=require("../models/PatrolPlan");
const { log } = require("console");








// exports.scanQR = async (req, res) => {
//   try {
//     const guardId = req.user.id;
//     console.log("scanQR hit", req.user, req.body, req.file);

//     const { qrData, guardLat, guardLng, distanceMeters, isVerified } = req.body;

//     if (
//       !qrData ||
//       guardLat == null ||
//       guardLng == null ||
//       distanceMeters == null ||
//       isVerified == null
//     ) {
//       return res
//         .status(400)
//         .json(new ApiResponse(false, "All fields required"));
//     }

//     const guard = await User.findById(guardId).populate("createdBy");
//     if (!guard || guard.role !== "guard") {
//       return res.status(403).json(new ApiResponse(false, "Invalid guard"));
//     }

//     // Handle photo upload
//     let photoBase64 = null;
//     if (req.file) {
//       const full = path.join(uploadDir, req.file.filename);
//       const data = await fs.readFile(full);
//       photoBase64 = data.toString("base64");
//       await fs
//         .unlink(full)
//         .catch((e) => console.warn("unlink failed:", e.message));
//     }

//     const now = new Date();

//     // Find active shift for the guard
//     const activeShift = await Shift.findOne({
//       assignedGuards: new mongoose.Types.ObjectId(guardId),
//       startTime: { $lte: now },
//       endTime: { $gte: now },
//       isActive: true,
//     });
//     console.log("Active shift found:", activeShift ? activeShift._id : "none");

//     // Validate QR code
//     let qrDoc = null;
//     if (mongoose.Types.ObjectId.isValid(qrData)) {
//       qrDoc = await QR.findById(qrData);
//     }
//     if (!qrDoc) {
//       return res
//         .status(404)
//         .json(new ApiResponse(false, "Invalid or expired QR"));
//     }

//     // Find the patrol plan that contains this QR and is assigned to this guard
//     let patrolPlan = await PatrolPlan.findOne({
//       "assignedGuards.guardId": new mongoose.Types.ObjectId(guardId),
//       "checkpoints.qrId": new mongoose.Types.ObjectId(qrDoc._id),
//       isActive: true,
//     });
//     if (!patrolPlan) {
//       return res
//         .status(404)
//         .json(
//           new ApiResponse(false, "No active patrol plan assigned with this QR")
//         );
//     }

//     // Check guard assignment to current shift
//     if (activeShift) {
//       const guardAssignment = patrolPlan.assignedGuards.find(
//         (ag) => ag.guardId.toString() === guardId
//       );
//       if (
//         guardAssignment?.assignedShifts?.length &&
//         !guardAssignment.assignedShifts.some(
//           (shiftId) => shiftId.toString() === activeShift._id.toString()
//         )
//       ) {
//         return res
//           .status(403)
//           .json(
//             new ApiResponse(
//               false,
//               "You are not assigned to scan this QR code during current shift"
//             )
//           );
//       }
//     }

//     // ✅ Calculate current round number
//     const totalScansForGuard = await Patrol.countDocuments({
//       guard: guardId,
//       patrolPlanId: patrolPlan._id,
//     });
//     const roundNumber =
//       Math.floor(totalScansForGuard / patrolPlan.checkpoints.length) + 1;

//     // Optional: Check if all rounds completed
//     if (roundNumber > patrolPlan.rounds) {
//       return res
//         .status(400)
//         .json(
//           new ApiResponse(
//             false,
//             "All rounds for this patrol plan are completed"
//           )
//         );
//     }

//     // Create new patrol record
//     const patrol = await Patrol.create({
//       guard: new mongoose.Types.ObjectId(guardId),
//       shift: activeShift ? activeShift._id : null,
//       patrolPlanId: patrolPlan._id,
//       qrCodeId: qrDoc._id,
//       roundNumber, // ✅ track round
//       location: { lat: Number(guardLat), lng: Number(guardLng) },
//       distanceMeters: Number(distanceMeters),
//       photo: photoBase64,
//       isVerified: Boolean(isVerified),
//       firstScanAt: now,
//       lastScanAt: now,
//       scanCount: 1,
//     });

//     return res.status(201).json(
//       new ApiResponse(true, "Checkpoint scanned successfully", {
//         patrolId: patrol._id,
//         qrCodeId: qrDoc._id,
//         siteId: qrDoc.siteId,
//         patrolPlanId: patrolPlan._id,
//         patrolPlanName: patrolPlan.planName,
//         isVerified: Boolean(isVerified),
//         distanceMeters: Number(distanceMeters),
//         timestamp: patrol.createdAt,
//         roundNumber,
//         scanCount: 1,
//       })
//     );
//   } catch (err) {
//     console.error("Error in scanQR:", err);
//     return res.status(500).json(new ApiResponse(false, err.message));
//   }
// };







// exports.scanQR = async (req, res) => {
//   try {
//     const guardId = req.user.id;
//     const { qrData, guardLat, guardLng, distanceMeters, isVerified } = req.body;

//     if (
//       !qrData ||
//       guardLat == null ||
//       guardLng == null ||
//       distanceMeters == null ||
//       isVerified == null
//     ) {
//       return res
//         .status(400)
//         .json(new ApiResponse(false, "All fields required"));
//     }

//     const guard = await User.findById(guardId).populate("createdBy");
//     if (!guard || guard.role !== "guard") {
//       return res.status(403).json(new ApiResponse(false, "Invalid guard"));
//     }

//     // Handle photo upload
//     let photoBase64 = null;
//     if (req.file) {
//       const full = path.join(uploadDir, req.file.filename);
//       const data = await fs.readFile(full);
//       photoBase64 = data.toString("base64");
//       await fs
//         .unlink(full)
//         .catch((e) => console.warn("unlink failed:", e.message));
//     }

//     const now = new Date();

//     // Find active shift for the guard
//     const activeShift = await Shift.findOne({
//       assignedGuards: guardId,
//       startTime: { $lte: now },
//       endTime: { $gte: now },
//       isActive: true,
//     });

//     // Validate QR code
//     let qrDoc = null;
//     if (mongoose.Types.ObjectId.isValid(qrData)) {
//       qrDoc = await QR.findById(qrData);
//     }
//     if (!qrDoc) {
//       return res
//         .status(404)
//         .json(new ApiResponse(false, "Invalid or expired QR"));
//     }

//     // Find the patrol plan that contains this QR and is assigned to this guard
//     let patrolPlan = await PatrolPlan.findOne({
//       "assignedGuards.guardId": guardId,
//       "checkpoints.qrId": qrDoc._id,
//       isActive: true,
//     });

//     if (!patrolPlan) {
//       return res
//         .status(404)
//         .json(
//           new ApiResponse(false, "No active patrol plan assigned with this QR")
//         );
//     }

//     // Check guard assignment to current shift
//     if (activeShift) {
//       const guardAssignment = patrolPlan.assignedGuards.find(
//         (ag) => ag.guardId.toString() === guardId
//       );
//       if (
//         guardAssignment?.assignedShifts?.length &&
//         !guardAssignment.assignedShifts.some(
//           (shiftId) => shiftId.toString() === activeShift._id.toString()
//         )
//       ) {
//         return res
//           .status(403)
//           .json(
//             new ApiResponse(
//               false,
//               "You are not assigned to scan this QR code during current shift"
//             )
//           );
//       }
//     }

//     // --- NEW ROUND LOGIC STARTS HERE ---
//     // How many checkpoints in this plan
//     const totalCheckpoints = patrolPlan.checkpoints.length;

//     // Find all scans by this guard for this patrol plan
//     const totalScansForGuard = await Patrol.countDocuments({
//       guard: guardId,
//       patrolPlanId: patrolPlan._id,
//     });

//     // Calculate current round number (1-indexed)
//     const roundNumber = Math.floor(totalScansForGuard / totalCheckpoints) + 1;

//     // Find which checkpoints already scanned in this round
//     const currentRoundScans = await Patrol.find({
//       guard: guardId,
//       patrolPlanId: patrolPlan._id,
//       roundNumber,
//     }).select("qrCodeId");

//     const scannedCheckpointIds = currentRoundScans.map((scan) =>
//       scan.qrCodeId.toString()
//     );

//     // Check if current checkpoint already scanned in this round
//     if (scannedCheckpointIds.includes(qrDoc._id.toString())) {
//       return res
//         .status(400)
//         .json(
//           new ApiResponse(
//             false,
//             "You have already scanned this checkpoint for the current round"
//           )
//         );
//     }

//     // If all checkpoints scanned in this round, restrict further scans until the next round
//     if (scannedCheckpointIds.length >= totalCheckpoints) {
//       return res
//         .status(400)
//         .json(
//           new ApiResponse(
//             false,
//             "All checkpoints have been scanned for this round. Wait for next round."
//           )
//         );
//     }

//     // Optional: Check if all rounds completed
//     if (roundNumber > patrolPlan.rounds) {
//       return res
//         .status(400)
//         .json(
//           new ApiResponse(
//             false,
//             "All rounds for this patrol plan are completed"
//           )
//         );
//     }
//     // --- NEW ROUND LOGIC ENDS HERE ---

//     // Create new patrol record
//     const patrol = await Patrol.create({
//       guard: guardId,
//       shift: activeShift ? activeShift._id : null,
//       patrolPlanId: patrolPlan._id,
//       qrCodeId: qrDoc._id,
//       roundNumber,
//       location: { lat: Number(guardLat), lng: Number(guardLng) },
//       distanceMeters: Number(distanceMeters),
//       photo: photoBase64,
//       isVerified: Boolean(isVerified),
//       firstScanAt: now,
//       lastScanAt: now,
//       scanCount: 1,
//     });

//     return res.status(201).json(
//       new ApiResponse(true, "Checkpoint scanned successfully", {
//         patrolId: patrol._id,
//         qrCodeId: qrDoc._id,
//         siteId: qrDoc.siteId,
//         patrolPlanId: patrolPlan._id,
//         patrolPlanName: patrolPlan.planName,
//         isVerified: Boolean(isVerified),
//         distanceMeters: Number(distanceMeters),
//         timestamp: patrol.createdAt,
//         roundNumber,
//         scanCount: 1,
//       })
//     );
//   } catch (err) {
//     console.error("Error in scanQR:", err);
//     return res.status(500).json(new ApiResponse(false, err.message));
//   }
// };

// exports.scanQR = async (req, res) => {
//   try {
//     const guardId = req.user.id;
//     const { qrData, guardLat, guardLng, distanceMeters, isVerified } = req.body;

//     if (
//       !qrData ||
//       guardLat == null ||
//       guardLng == null ||
//       distanceMeters == null ||
//       isVerified == null
//     ) {
//       return res
//         .status(400)
//         .json(new ApiResponse(false, "All fields required"));
//     }

//     const guard = await User.findById(guardId).populate("createdBy");
//     if (!guard || guard.role !== "guard") {
//       return res.status(403).json(new ApiResponse(false, "Invalid guard"));
//     }

//     // Handle photo upload
//     let photoBase64 = null;
//     if (req.file) {
//       const full = path.join(uploadDir, req.file.filename);
//       const data = await fs.readFile(full);
//       photoBase64 = data.toString("base64");
//       await fs
//         .unlink(full)
//         .catch((e) => console.warn("unlink failed:", e.message));
//     }

//     const now = new Date();

//     // Find active shift for the guard
//     const activeShift = await Shift.findOne({
//       assignedGuards: guardId,
//       startTime: { $lte: now },
//       endTime: { $gte: now },
//       isActive: true,
//     });

//     // Validate QR code
//     let qrDoc = null;
//     if (mongoose.Types.ObjectId.isValid(qrData)) {
//       qrDoc = await QR.findById(qrData);
//     }
//     if (!qrDoc) {
//       return res
//         .status(404)
//         .json(new ApiResponse(false, "Invalid or expired QR"));
//     }

//     // Find the patrol plan that contains this QR and is assigned to this guard
//     let patrolPlan = await PatrolPlan.findOne({
//       "assignedGuards.guardId": guardId,
//       "checkpoints.qrId": qrDoc._id,
//       isActive: true,
//     });

//     if (!patrolPlan) {
//       return res
//         .status(404)
//         .json(
//           new ApiResponse(false, "No active patrol plan assigned with this QR")
//         );
//     }

//     // Check guard assignment to current shift
//     if (activeShift) {
//       const guardAssignment = patrolPlan.assignedGuards.find(
//         (ag) => ag.guardId.toString() === guardId
//       );
//       if (
//         guardAssignment?.assignedShifts?.length &&
//         !guardAssignment.assignedShifts.some(
//           (shiftId) => shiftId.toString() === activeShift._id.toString()
//         )
//       ) {
//         return res
//           .status(403)
//           .json(
//             new ApiResponse(
//               false,
//               "You are not assigned to scan this QR code during current shift"
//             )
//           );
//       }
//     }

//     // --- ROUND LOGIC STARTS HERE ---
//     const totalCheckpoints = patrolPlan.checkpoints.length;
//     const totalScansForGuard = await Patrol.countDocuments({
//       guard: guardId,
//       patrolPlanId: patrolPlan._id,
//     });

//     // Calculate current round number (1-indexed)
//     const roundNumber = Math.floor(totalScansForGuard / totalCheckpoints) + 1;

//     // Don't allow scanning beyond the total rounds
//     if (roundNumber > patrolPlan.rounds) {
//       return res
//         .status(400)
//         .json(
//           new ApiResponse(
//             false,
//             "All rounds for this patrol plan are completed"
//           )
//         );
//     }

//     // Find which checkpoints already scanned in this round
//     const currentRoundScans = await Patrol.find({
//       guard: guardId,
//       patrolPlanId: patrolPlan._id,
//       roundNumber,
//     }).select("qrCodeId");

//     const scannedCheckpointIds = currentRoundScans.map((scan) =>
//       scan.qrCodeId.toString()
//     );

//     // Check if current checkpoint already scanned in this round
//     if (scannedCheckpointIds.includes(qrDoc._id.toString())) {
//       return res
//         .status(400)
//         .json(
//           new ApiResponse(
//             false,
//             "You have already scanned this checkpoint for the current round"
//           )
//         );
//     }

//     // If all checkpoints scanned in this round, restrict further scans until the next round
//     if (scannedCheckpointIds.length >= totalCheckpoints) {
//       return res
//         .status(400)
//         .json(
//           new ApiResponse(
//             false,
//             "All checkpoints have been scanned for this round. Wait for next round."
//           )
//         );
//     }
//     // --- ROUND LOGIC ENDS HERE ---

//     // Create new patrol record
//     const patrol = await Patrol.create({
//       guard: guardId,
//       shift: activeShift ? activeShift._id : null,
//       patrolPlanId: patrolPlan._id,
//       qrCodeId: qrDoc._id,
//       roundNumber,
//       location: { lat: Number(guardLat), lng: Number(guardLng) },
//       distanceMeters: Number(distanceMeters),
//       photo: photoBase64,
//       isVerified: Boolean(isVerified),
//       firstScanAt: now,
//       lastScanAt: now,
//       scanCount: 1,
//     });

//     return res.status(201).json(
//       new ApiResponse(true, "Checkpoint scanned successfully", {
//         patrolId: patrol._id,
//         qrCodeId: qrDoc._id,
//         siteId: qrDoc.siteId,
//         patrolPlanId: patrolPlan._id,
//         patrolPlanName: patrolPlan.planName,
//         isVerified: Boolean(isVerified),
//         distanceMeters: Number(distanceMeters),
//         timestamp: patrol.createdAt,
//         roundNumber,
//         scanCount: 1,
//       })
//     );
//   } catch (err) {
//     console.error("Error in scanQR:", err);
//     return res.status(500).json(new ApiResponse(false, err.message));
//   }
// };

// exports.scanQR = async (req, res) => {
//   try {
//     const guardId = req.user.id;
//     const { qrData, guardLat, guardLng, distanceMeters, isVerified } = req.body;

//     if (
//       !qrData ||
//       guardLat == null ||
//       guardLng == null ||
//       distanceMeters == null ||
//       isVerified == null
//     ) {
//       return res
//         .status(400)
//         .json(new ApiResponse(false, "All fields required"));
//     }

//     const guard = await User.findById(guardId).populate("createdBy");
//     if (!guard || guard.role !== "guard") {
//       return res.status(403).json(new ApiResponse(false, "Invalid guard"));
//     }

//     // Handle photo upload
//     let photoBase64 = null;
//     if (req.file) {
//       const full = path.join(uploadDir, req.file.filename);
//       const data = await fs.readFile(full);
//       photoBase64 = data.toString("base64");
//       await fs
//         .unlink(full)
//         .catch((e) => console.warn("unlink failed:", e.message));
//     }

//     const now = new Date();

//     // Find active shift for the guard
//     const activeShift = await Shift.findOne({
//       assignedGuards: guardId,
//       startTime: { $lte: now },
//       endTime: { $gte: now },
//       isActive: true,
//     });

//     // Validate QR code
//     let qrDoc = null;
//     if (mongoose.Types.ObjectId.isValid(qrData)) {
//       qrDoc = await QR.findById(qrData);
//     }
//     if (!qrDoc) {
//       return res
//         .status(404)
//         .json(new ApiResponse(false, "Invalid or expired QR"));
//     }

//     // Find the patrol plan that contains this QR and is assigned to this guard
//     let patrolPlan = await PatrolPlan.findOne({
//       "assignedGuards.guardId": guardId,
//       "checkpoints.qrId": qrDoc._id,
//       isActive: true,
//     });

//     if (!patrolPlan) {
//       return res
//         .status(404)
//         .json(
//           new ApiResponse(false, "No active patrol plan assigned with this QR")
//         );
//     }

//     // Check guard assignment to current shift
//     if (activeShift) {
//       const guardAssignment = patrolPlan.assignedGuards.find(
//         (ag) => ag.guardId.toString() === guardId
//       );
//       if (
//         guardAssignment?.assignedShifts?.length &&
//         !guardAssignment.assignedShifts.some(
//           (shiftId) => shiftId.toString() === activeShift._id.toString()
//         )
//       ) {
//         return res
//           .status(403)
//           .json(
//             new ApiResponse(
//               false,
//               "You are not assigned to scan this QR code during current shift"
//             )
//           );
//       }
//     }

//     // --- IMPROVED ROUND LOGIC STARTS HERE ---
//     const totalCheckpoints = patrolPlan.checkpoints.length;

//     // Get all scans for this guard and patrol plan, sorted by creation time
//     const allScans = await Patrol.find({
//       guard: guardId,
//       patrolPlanId: patrolPlan._id,
//     }).sort({ createdAt: 1 });

//     // Determine current round number
//     let currentRound = 1;
//     let scansInCurrentRound = [];

//     if (allScans.length > 0) {
//       // Group scans by round number stored in DB
//       const scansByRound = {};
//       allScans.forEach((scan) => {
//         const rNum = scan.roundNumber || 1;
//         if (!scansByRound[rNum]) scansByRound[rNum] = [];
//         scansByRound[rNum].push(scan);
//       });

//       // Find the latest incomplete round or start a new one
//       const roundNumbers = Object.keys(scansByRound)
//         .map(Number)
//         .sort((a, b) => a - b);

//       for (const rNum of roundNumbers) {
//         const scansInRound = scansByRound[rNum];
//         if (scansInRound.length < totalCheckpoints) {
//           // This round is incomplete
//           currentRound = rNum;
//           scansInCurrentRound = scansInRound;
//           break;
//         } else if (rNum === roundNumbers[roundNumbers.length - 1]) {
//           // Last round is complete, start new round
//           currentRound = rNum + 1;
//           scansInCurrentRound = [];
//         }
//       }
//     }

//     // Don't allow scanning beyond the total rounds
//     if (currentRound > patrolPlan.rounds) {
//       return res
//         .status(400)
//         .json(
//           new ApiResponse(
//             false,
//             `All ${patrolPlan.rounds} rounds for this patrol plan are completed`
//           )
//         );
//     }

//     // Get checkpoint IDs already scanned in current round
//     const scannedCheckpointIds = scansInCurrentRound.map((scan) =>
//       scan.qrCodeId.toString()
//     );

//     // Check if current checkpoint already scanned in this round
//     if (scannedCheckpointIds.includes(qrDoc._id.toString())) {
//       return res
//         .status(400)
//         .json(
//           new ApiResponse(
//             false,
//             `You have already scanned this checkpoint in round ${currentRound}. Progress: ${scannedCheckpointIds.length}/${totalCheckpoints} checkpoints completed.`
//           )
//         );
//     }

//     // Optional: Enforce sequence order (uncomment if you want strict sequential scanning)
//     /*
//     const currentCheckpoint = patrolPlan.checkpoints.find(
//       cp => cp.qrId.toString() === qrDoc._id.toString()
//     );
    
//     if (currentCheckpoint) {
//       const expectedSequence = scannedCheckpointIds.length + 1;
//       if (currentCheckpoint.sequence !== expectedSequence) {
//         const nextCheckpoint = patrolPlan.checkpoints.find(
//           cp => cp.sequence === expectedSequence
//         );
//         return res.status(400).json(
//           new ApiResponse(
//             false,
//             `Please scan checkpoints in sequence. Next checkpoint: ${nextCheckpoint?.siteId || 'unknown'}`
//           )
//         );
//       }
//     }
//     */

//     // --- ROUND LOGIC ENDS HERE ---

//     // Create new patrol record
//     const patrol = await Patrol.create({
//       guard: guardId,
//       shift: activeShift ? activeShift._id : null,
//       patrolPlanId: patrolPlan._id,
//       qrCodeId: qrDoc._id,
//       roundNumber: currentRound,
//       location: { lat: Number(guardLat), lng: Number(guardLng) },
//       distanceMeters: Number(distanceMeters),
//       photo: photoBase64,
//       isVerified: Boolean(isVerified),
//       firstScanAt: now,
//       lastScanAt: now,
//       scanCount: 1,
//     });

//     // Calculate progress
//     const scannedCount = scannedCheckpointIds.length + 1;
//     const isRoundComplete = scannedCount === totalCheckpoints;
//     const progressMessage = isRoundComplete
//       ? `Round ${currentRound} completed! ${
//           currentRound < patrolPlan.rounds
//             ? "Ready for next round."
//             : "All rounds completed!"
//         }`
//       : `Progress: ${scannedCount}/${totalCheckpoints} checkpoints in round ${currentRound}`;

//     return res.status(201).json(
//       new ApiResponse(true, progressMessage, {
//         patrolId: patrol._id,
//         qrCodeId: qrDoc._id,
//         siteId: qrDoc.siteId,
//         patrolPlanId: patrolPlan._id,
//         patrolPlanName: patrolPlan.planName,
//         isVerified: Boolean(isVerified),
//         distanceMeters: Number(distanceMeters),
//         timestamp: patrol.createdAt,
//         roundNumber: currentRound,
//         scanCount: 1,
//         progress: {
//           currentRound,
//           totalRounds: patrolPlan.rounds,
//           checkpointsScanned: scannedCount,
//           totalCheckpoints,
//           isRoundComplete,
//           remainingCheckpoints: totalCheckpoints - scannedCount,
//         },
//       })
//     );
//   } catch (err) {
//     console.error("Error in scanQR:", err);
//     return res.status(500).json(new ApiResponse(false, err.message));
//   }
// };



exports.scanQR = async (req, res) => {
  try {
    const guardId = req.user.id;

    console.log('guardId:', guardId);
    
    console.log('scanQR hit', req.user, req.body, req.file);
    
    const { qrData, guardLat, guardLng, distanceMeters, isVerified } = req.body;

    if (
      !qrData ||
      guardLat == null ||
      guardLng == null ||
      distanceMeters == null ||
      isVerified == null
    ) {
      return res
        .status(400)
        .json(new ApiResponse(false, "All fields required"));
    }

   const guard = await User.findById(new mongoose.Types.ObjectId(guardId)).populate(
     "createdBy"
   );

   console.log('guard:', guard);
   

    if (!guard || guard.role !== "guard") {
      return res.status(403).json(new ApiResponse(false, "Invalid guard"));
    }

    // Handle photo upload
    let photoBase64 = null;
    if (req.file) {
      const full = path.join(uploadDir, req.file.filename);
      const data = await fs.readFile(full);
      photoBase64 = data.toString("base64");
      await fs
        .unlink(full)
        .catch((e) => console.warn("unlink failed:", e.message));
    }

    const now = new Date();

    // Find active shift for the guard
    const activeShift = await Shift.findOne({
      assignedGuards: guardId,
      startTime: { $lte: now },
      endTime: { $gte: now },
      isActive: true,
    });

    if (!activeShift) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            false,
            "No active shift found. You can only scan QR codes during your assigned shift."
          )
        );
    }

    // Validate QR code
    let qrDoc = null;
    if (mongoose.Types.ObjectId.isValid(qrData)) {
      qrDoc = await QR.findById(qrData);
    }
    if (!qrDoc) {
      return res
        .status(404)
        .json(new ApiResponse(false, "Invalid or expired QR"));
    }

    // Find the patrol plan that contains this QR and is assigned to this guard
    let patrolPlan = await PatrolPlan.findOne({
      "assignedGuards.guardId": guardId,
      "checkpoints.qrId": qrDoc._id,
      isActive: true,
    });

    if (!patrolPlan) {
      return res
        .status(404)
        .json(
          new ApiResponse(false, "No active patrol plan assigned with this QR")
        );
    }

    // Check guard assignment to current shift
    if (activeShift) {
      const guardAssignment = patrolPlan.assignedGuards.find(
        (ag) => ag.guardId.toString() === guardId
      );
      if (
        guardAssignment?.assignedShifts?.length &&
        !guardAssignment.assignedShifts.some(
          (shiftId) => shiftId.toString() === activeShift._id.toString()
        )
      ) {
        return res
          .status(403)
          .json(
            new ApiResponse(
              false,
              "You are not assigned to scan this QR code during current shift"
            )
          );
      }
    }

    // --- SHIFT-SPECIFIC ROUND LOGIC ---
    const totalCheckpoints = patrolPlan.checkpoints.length;

    // Get all scans for this guard, patrol plan, AND current shift
    const allScans = await Patrol.find({
      guard: guardId,
      patrolPlanId: patrolPlan._id,
      shift: activeShift._id, // CRITICAL: Only scans from current shift
    }).sort({ createdAt: 1 });

    // Determine current round number (shift-specific)
    let currentRound = 1;
    let scansInCurrentRound = [];

    if (allScans.length > 0) {
      // Group scans by round number stored in DB
      const scansByRound = {};
      allScans.forEach((scan) => {
        const rNum = scan.roundNumber || 1;
        if (!scansByRound[rNum]) scansByRound[rNum] = [];
        scansByRound[rNum].push(scan);
      });

      // Find the latest incomplete round or start a new one
      const roundNumbers = Object.keys(scansByRound)
        .map(Number)
        .sort((a, b) => a - b);

      for (const rNum of roundNumbers) {
        const scansInRound = scansByRound[rNum];
        if (scansInRound.length < totalCheckpoints) {
          // This round is incomplete
          currentRound = rNum;
          scansInCurrentRound = scansInRound;
          break;
        } else if (rNum === roundNumbers[roundNumbers.length - 1]) {
          // Last round is complete, start new round
          currentRound = rNum + 1;
          scansInCurrentRound = [];
        }
      }
    }

    // Don't allow scanning beyond the total rounds
    if (currentRound > patrolPlan.rounds) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            false,
            `All ${patrolPlan.rounds} rounds for this patrol plan are completed in this shift`
          )
        );
    }

    // Get checkpoint IDs already scanned in current round
    const scannedCheckpointIds = scansInCurrentRound.map((scan) =>
      scan.qrCodeId.toString()
    );

    // Check if current checkpoint already scanned in this round
    if (scannedCheckpointIds.includes(qrDoc._id.toString())) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            false,
            `You have already scanned this checkpoint in round ${currentRound}. Progress: ${scannedCheckpointIds.length}/${totalCheckpoints} checkpoints completed.`
          )
        );
    }

    // Optional: Enforce sequence order (uncomment if you want strict sequential scanning)
    /*
    const currentCheckpoint = patrolPlan.checkpoints.find(
      cp => cp.qrId.toString() === qrDoc._id.toString()
    );
    
    if (currentCheckpoint) {
      const expectedSequence = scannedCheckpointIds.length + 1;
      if (currentCheckpoint.sequence !== expectedSequence) {
        const nextCheckpoint = patrolPlan.checkpoints.find(
          cp => cp.sequence === expectedSequence
        );
        return res.status(400).json(
          new ApiResponse(
            false,
            `Please scan checkpoints in sequence. Next checkpoint: ${nextCheckpoint?.siteId || 'unknown'}`
          )
        );
      }
    }
    */

    // Create new patrol record WITH SHIFT ID
    const patrol = await Patrol.create({
      guard: guardId,
      shift: activeShift._id, // CRITICAL: Store shift reference
      patrolPlanId: patrolPlan._id,
      qrCodeId: qrDoc._id,
      roundNumber: currentRound,
      location: { lat: Number(guardLat), lng: Number(guardLng) },
      distanceMeters: Number(distanceMeters),
      photo: photoBase64,
      isVerified: Boolean(isVerified),
      firstScanAt: now,
      lastScanAt: now,
      scanCount: 1,
    });

    // Calculate progress
    const scannedCount = scannedCheckpointIds.length + 1;
    const isRoundComplete = scannedCount === totalCheckpoints;
    const progressMessage = isRoundComplete
      ? `Round ${currentRound} completed! ${
          currentRound < patrolPlan.rounds
            ? "Ready for next round."
            : "All rounds completed for this shift!"
        }`
      : `Progress: ${scannedCount}/${totalCheckpoints} checkpoints in round ${currentRound}`;

    return res.status(201).json(
      new ApiResponse(true, progressMessage, {
        patrolId: patrol._id,
        qrCodeId: qrDoc._id,
        siteId: qrDoc.siteId,
        patrolPlanId: patrolPlan._id,
        patrolPlanName: patrolPlan.planName,
        isVerified: Boolean(isVerified),
        distanceMeters: Number(distanceMeters),
        timestamp: patrol.createdAt,
        roundNumber: currentRound,
        scanCount: 1,
        progress: {
          currentRound,
          totalRounds: patrolPlan.rounds,
          checkpointsScanned: scannedCount,
          totalCheckpoints,
          isRoundComplete,
          remainingCheckpoints: totalCheckpoints - scannedCount,
        },
      })
    );
  } catch (err) {
    console.error("Error in scanQR:", err);
    return res.status(500).json(new ApiResponse(false, err.message));
  }
};


exports.getPatrolLogs = async (req, res) => {
  try {
    const {
      guardId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sort = "desc",
      patrolPlanId,
      shiftId,
    } = req.body;

    const { ObjectId } = mongoose.Types;
    const match = {};


    console.log("req is ", req.body);
    

    // Normalize guardId
    let guardObjectId = null;
    if (guardId && mongoose.isValidObjectId(guardId)) {
      guardObjectId = new ObjectId(guardId);
    }

    // Role-based access
    if (req.user.role === "employee") {
      const guards = await User.find({ role: "guard", companyId: req.user.id }).select("_id");
      if (!guards.length) {
        return res.status(200).json(
          new ApiResponse(true, "No guards found", { logs: [], page, limit })
        );
      }
      match.guard = { $in: guards.map((g) => g._id) };

      if (guardObjectId && !guards.some((g) => g._id.equals(guardObjectId))) {
        return res.status(403).json(new ApiResponse(false, "No access to this guard's logs"));
      }
      if (guardObjectId) match.guard = guardObjectId;
    } else if (req.user.role === "supervisor") {
      const guards = await User.find({ role: "guard", supervisor: req.user.id }).select("_id");
      if (!guards.length) {
        return res.status(200).json(
          new ApiResponse(true, "No guards found", { logs: [], page, limit })
        );
      }
      match.guard = { $in: guards.map((g) => g._id) };

      if (guardObjectId && !guards.some((g) => g._id.equals(guardObjectId))) {
        return res.status(403).json(new ApiResponse(false, "No access to this guard's logs"));
      }
      if (guardObjectId) match.guard = guardObjectId;
    } else if (guardObjectId) {
      match.guard = guardObjectId;
    }

    // Date filtering (ignore empty strings)
    if ((startDate && startDate.trim()) || (endDate && endDate.trim())) {
      match.createdAt = {};
      if (startDate && startDate.trim()) {
        const s = new Date(startDate);
        if (!isNaN(s)) match.createdAt.$gte = s;
      }
      if (endDate && endDate.trim()) {
        const e = new Date(endDate);
        if (!isNaN(e)) {
          e.setHours(23, 59, 59, 999);
          match.createdAt.$lte = e;
        }
      }
    }

    // Plan & Shift filters
    if (patrolPlanId && mongoose.isValidObjectId(patrolPlanId)) {
      match.patrolPlanId = new ObjectId(patrolPlanId);
    }
    if (shiftId && mongoose.isValidObjectId(shiftId)) {
      match.shift = new ObjectId(shiftId);
    }

    // Pagination + sort
    const sortDir = sort === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;

    // Aggregate
    const logs = await Patrol.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "users",
          localField: "guard",
          foreignField: "_id",
          as: "guardInfo",
          pipeline: [{ $project: { _id: 1, name: 1, email: 1, phone: 1 } }],
        },
      },
      { $unwind: "$guardInfo" },
      {
        $lookup: {
          from: "shifts",
          localField: "shift",
          foreignField: "_id",
          as: "shiftInfo",
          pipeline: [
            { $project: { _id: 1, shiftName: 1, startTime: 1, endTime: 1, shiftType: 1 } },
          ],
        },
      },
      { $unwind: { path: "$shiftInfo", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "qrs",
          localField: "qrCodeId",
          foreignField: "_id",
          as: "qrInfo",
          pipeline: [{ $project: { _id: 1, siteId: 1, description: 1, lat: 1, lng: 1 } }],
        },
      },
      { $unwind: { path: "$qrInfo", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "patrolplans",
          localField: "patrolPlanId",
          foreignField: "_id",
          as: "patrolPlanInfo",
          pipeline: [{ $project: { _id: 1, planName: 1, description: 1, rounds: 1 } }],
        },
      },
      { $unwind: { path: "$patrolPlanInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          guard: "$guardInfo",
          shift: "$shiftInfo",
          patrolPlan: "$patrolPlanInfo",
          qrCode: "$qrInfo",
          location: 1,
          distanceMeters: 1,
          photo: 1,
          isVerified: 1,
          scanTime: "$createdAt",
          updatedAt: 1,
        },
      },
      { $sort: { scanTime: sortDir } },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ]);

    const totalLogs = await Patrol.countDocuments(match);

    return res.status(200).json(
      new ApiResponse(true, "Patrol logs fetched successfully", {
        logs,
        pagination: {
          total: totalLogs,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalLogs / limit),
        },
      })
    );
  } catch (err) {
    console.error("Error in getPatrolLogs:", err);
    return res.status(500).json(new ApiResponse(false, err.message));
  }
};



exports.getGuardPerformanceReport = async (req, res) => {
  try {

    console.log('dsdssdsd', req.body);
    
    const { guardId, startDate, endDate } = req.body;

    if (!guardId)
      return res.status(400).json(new ApiResponse(false, "Guard ID required"));

    // Access control
    let guard;
    if (req.user.role === "employee") {
      guard = await User.findOne({
        _id: guardId,
        role: "guard",
        companyId: req.user.id,
      });
    } else if (req.user.role === "supervisor") {
      guard = await User.findOne({
        _id: guardId,
        role: "guard",
        supervisor: req.user.id,
      });
    }
    if (!guard)
      return res
        .status(403)
        .json(new ApiResponse(false, "No access to this guard"));

    // Date range
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Default to last 30 days
      end = new Date();
      start = new Date();
      start.setDate(start.getDate() - 30);
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    console.log(`📊 Generating detailed report for guard ${guardId}`);

    // 1. ATTENDANCE - Simple login-based attendance
    const attendanceRecords = await Attendance.find({
      guard: guardId,
      date: { $gte: start, $lte: end },
    })
      .populate("shift", "shiftName startTime endTime")
      .sort({ date: -1 });

    // Calculate attendance summary
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(
      (record) =>
        record.status === "present" ||
        record.status === "on-duty" ||
        record.status === "late"
    ).length;

    const absentDays = totalDays - presentDays;
    const lateDays = attendanceRecords.filter(
      (record) => record.status === "late"
    ).length;

    // 2. GET ALL PATROL SCANS WITH DETAILED INFORMATION
    const patrolScans = await Patrol.find({
      guard: guardId,
      createdAt: { $gte: start, $lte: end },
    })
      .populate("patrolPlanId", "planName rounds")
      .populate("qrCodeId", "siteId description location latitude longitude")
      .sort({ createdAt: -1 });

    // 3. GET ALL PATROL PLANS ASSIGNED TO THIS GUARD
    const patrolPlans = await PatrolPlan.find({
      "assignedGuards.guardId": guardId,
      isActive: true,
    }).populate(
      "checkpoints.qrId",
      "siteId description location latitude longitude"
    );

    // 4. CREATE DETAILED ROUNDS TABLE DATA
    const detailedRoundsData = [];
    let totalExpectedRounds = 0;
    let totalCompletedRounds = 0;
    let totalMissedRounds = 0;

    // Process each patrol plan
    for (const plan of patrolPlans) {
      const planRounds = plan.rounds || 1;
      const totalCheckpoints = plan.checkpoints.length;

      // Calculate expected rounds for the report period
      const planStart = new Date(
        Math.max(plan.startDate.getTime(), start.getTime())
      );
      const planEnd = plan.endDate
        ? new Date(Math.min(plan.endDate.getTime(), end.getTime()))
        : end;

      const totalPlanDays =
        Math.ceil((planEnd - planStart) / (1000 * 60 * 60 * 24)) + 1;
      const planExpectedRounds = totalPlanDays * planRounds;
      totalExpectedRounds += planExpectedRounds;

      // Process each day and round
      for (let day = 0; day < totalPlanDays; day++) {
        const currentDate = new Date(planStart);
        currentDate.setDate(planStart.getDate() + day);

        for (let roundNumber = 1; roundNumber <= planRounds; roundNumber++) {
          const dayStart = new Date(currentDate);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(currentDate);
          dayEnd.setHours(23, 59, 59, 999);

          // Find scans for this specific round and date
          const roundScans = patrolScans.filter((scan) => {
            const scanDate = new Date(scan.createdAt);
            return (
              scan.patrolPlanId?._id?.toString() === plan._id.toString() &&
              scan.roundNumber === roundNumber &&
              scanDate >= dayStart &&
              scanDate <= dayEnd
            );
          });

          // Process each checkpoint in the plan
          for (const checkpoint of plan.checkpoints) {
            const checkpointScan = roundScans.find(
              (scan) =>
                scan.qrCodeId?._id?.toString() ===
                checkpoint.qrId._id.toString()
            );

            // Calculate expected time (you might want to adjust this logic based on your business rules)
            const expectedTime = new Date(currentDate);
            // Add some logic to calculate expected time based on round number and checkpoint order
            expectedTime.setHours(8 + (roundNumber - 1) * 4); // Example: 8AM, 12PM, 4PM for rounds

            detailedRoundsData.push({
              date: new Date(currentDate),
              roundNumber: roundNumber,
              planName: plan.planName,
              planId: plan._id,
              checkpointName: checkpoint.qrId.siteId,
              checkpointDescription: checkpoint.qrId.description,
              location: checkpoint.qrId.location,
              latitude: checkpoint.qrId.latitude,
              longitude: checkpoint.qrId.longitude,
              expectedTime: expectedTime,
              actualTime: checkpointScan?.createdAt || null,
              status: checkpointScan ? "completed" : "missed",
              delay: checkpointScan
                ? Math.round(
                    (new Date(checkpointScan.createdAt) - expectedTime) /
                      (1000 * 60)
                  )
                : null, // delay in minutes
              scanId: checkpointScan?._id,
            });
          }

          // Check if round is completed (all checkpoints scanned)
          const roundCheckpoints = plan.checkpoints.length;
          const scannedCheckpoints = roundScans.length;
          const isRoundCompleted = scannedCheckpoints === roundCheckpoints;

          if (isRoundCompleted) {
            totalCompletedRounds++;
          } else if (scannedCheckpoints > 0) {
            // Partially completed round
            totalCompletedRounds += scannedCheckpoints / roundCheckpoints;
          } else {
            totalMissedRounds++;
          }
        }
      }
    }

    // Also include scans that don't belong to any active plan (orphaned scans)
    const orphanedScans = patrolScans.filter(
      (scan) =>
        !patrolPlans.some(
          (plan) => plan._id.toString() === scan.patrolPlanId?._id?.toString()
        )
    );

    for (const scan of orphanedScans) {
      detailedRoundsData.push({
        date: new Date(scan.createdAt),
        roundNumber: scan.roundNumber || 1,
        planName: scan.patrolPlanId?.planName || "Unassigned Plan",
        planId: scan.patrolPlanId?._id || null,
        checkpointName: scan.qrCodeId?.siteId || "Unknown Checkpoint",
        checkpointDescription: scan.qrCodeId?.description || "",
        location: scan.qrCodeId?.location || "",
        latitude: scan.qrCodeId?.latitude || null,
        longitude: scan.qrCodeId?.longitude || null,
        expectedTime: null,
        actualTime: scan.createdAt,
        status: "completed",
        delay: null,
        scanId: scan._id,
        isOrphaned: true,
      });
    }

    // Sort detailed data by date and round number
    detailedRoundsData.sort((a, b) => {
      if (a.date.getTime() === b.date.getTime()) {
        return a.roundNumber - b.roundNumber;
      }
      return b.date.getTime() - a.date.getTime();
    });

    // 5. CALCULATE OVERALL PERFORMANCE
    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
    const roundsCompletionRate =
      totalExpectedRounds > 0
        ? (totalCompletedRounds / totalExpectedRounds) * 100
        : 0;

    // Simple performance score (50% attendance + 50% rounds completion)
    const overallPerformance =
      attendanceRate * 0.5 + roundsCompletionRate * 0.5;

    // 6. GET TODAY'S STATUS
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await Attendance.findOne({
      guard: guardId,
      date: { $gte: today, $lt: tomorrow },
    }).populate("shift", "shiftName");

    // 7. GET RECENT ACTIVITY SUMMARY
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    lastWeek.setHours(0, 0, 0, 0);

    const recentScans = patrolScans.filter(
      (scan) => new Date(scan.createdAt) >= lastWeek
    );

    // Calculate performance metrics for the table
    const completedScans = detailedRoundsData.filter(
      (item) => item.status === "completed"
    ).length;
    const missedScans = detailedRoundsData.filter(
      (item) => item.status === "missed"
    ).length;
    const totalScans = detailedRoundsData.length;
    const scanCompletionRate =
      totalScans > 0 ? (completedScans / totalScans) * 100 : 0;

    return res.status(200).json(
      new ApiResponse(true, "Guard performance report generated", {
        // Basic Info
        guard: {
          _id: guard._id,
          name: guard.name,
          phone: guard.phone,
          currentStatus: todayAttendance?.status || "unknown",
          currentShift: todayAttendance?.shift?.shiftName || "Not assigned",
        },

        // Report Period
        reportPeriod: {
          startDate: start,
          endDate: end,
          totalDays: Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1,
        },

        // Attendance Summary
        attendance: {
          totalDays: totalDays,
          presentDays: presentDays,
          absentDays: absentDays,
          lateDays: lateDays,
          attendanceRate: attendanceRate.toFixed(2) + "%",
        },

        // Detailed Rounds Performance Data for Table
        detailedRounds: detailedRoundsData,

        // Rounds Performance Summary
        roundsPerformance: {
          summary: {
            totalExpectedRounds: totalExpectedRounds,
            totalCompletedRounds: Math.round(totalCompletedRounds),
            totalMissedRounds: totalMissedRounds,
            totalScans: totalScans,
            completedScans: completedScans,
            missedScans: missedScans,
            completionRate: scanCompletionRate.toFixed(2) + "%",
            roundsCompletionRate: roundsCompletionRate.toFixed(2) + "%",
          },
        },

        // Overall Performance
        performance: {
          overallScore: overallPerformance.toFixed(2),
          rating: getPerformanceRating(overallPerformance),
          breakdown: {
            attendanceScore: attendanceRate.toFixed(2),
            roundsScore: roundsCompletionRate.toFixed(2),
          },
        },

        // Recent Activity Summary
        recentActivity: {
          period: "Last 7 days",
          totalRoundsScanned: recentScans.length,
          scansBreakdown: recentScans.map((scan) => ({
            date: scan.createdAt,
            planName: scan.patrolPlanId?.planName || "Unassigned",
            checkpoint: scan.qrCodeId?.siteId || "Unknown",
            roundNumber: scan.roundNumber,
            scanTime: scan.createdAt,
          })),
        },

        // Performance Summary
        summary: {
          status: overallPerformance >= 70 ? "Good" : "Needs Improvement",
          strength: presentDays > 0 ? "Regular Attendance" : "New Guard",
          areaToImprove:
            roundsCompletionRate < 80
              ? "Complete more patrol rounds"
              : "Maintain current performance",
          totalCheckpoints: totalScans,
          completedCheckpoints: completedScans,
          efficiency: scanCompletionRate.toFixed(1) + "%",
        },
      })
    );
  } catch (err) {
    console.error("❌ Error in getGuardPerformanceReport:", err);
    return res.status(500).json(new ApiResponse(false, err.message));
  }
};

// Helper function to calculate performance rating
function getPerformanceRating(score) {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Very Good";
  if (score >= 70) return "Good";
  if (score >= 60) return "Average";
  if (score >= 50) return "Below Average";
  return "Needs Improvement";
}
exports.getPatrolSummary = async (req, res) => {
  try {
    const match = {};

    // Agar employee hai toh sirf apne guards ka data
    if (req.user.role === "employee") {
      const guards = await User.find({ createdBy: req.user.id, role: "guard" }).select("_id");
const guardIds = guards.map((g) =>
  mongoose.Types.ObjectId.isValid(g._id)
    ? new mongoose.Types.ObjectId(g._id)
    : g._id
);
      match.guard = { $in: guardIds };
    }

    const summary = await Patrol.aggregate([
      { $match: match }, // ✅ pehle filter lagao
      {
        $group: {
          _id: { guard: "$guard", qr: "$qrCodeId" },
          count: { $sum: 1 },
          firstScan: { $min: "$createdAt" },
          lastScan: { $max: "$createdAt" },
        },
      },
      { $lookup: { from: "users", localField: "_id.guard", foreignField: "_id", as: "guardInfo" } },
      { $unwind: "$guardInfo" },
      {
        $project: {
          guardId: "$_id.guard",
          guardName: "$guardInfo.name",
          qrCodeId: "$_id.qr",
          count: 1,
          firstScan: 1,
          lastScan: 1,
        },
      },
      { $sort: { lastScan: -1 } },
    ]);

    return res.status(200).json(new ApiResponse(true, "Patrol summary", { summary }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(new ApiResponse(false, err.message));
  }
};




exports.getGuardDashboard = async (req, res) => {
  try {
    const guardId = req.user.id;

    const guardObjectId = new mongoose.Types.ObjectId(guardId);

    const now = new Date();

    // Find current shift where guard is assigned
    const currentShift = await Shift.findOne({
      assignedGuards: guardObjectId,
      startTime: { $lte: now },
      endTime: { $gte: now },
      isActive: true,
    });

    // Today's patrols
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayPatrols = await Patrol.find({
      guard: guardId,
      createdAt: { $gte: today, $lt: tomorrow },
    }).populate("qrCodeId", "siteId description");

    // Assigned patrol plans
    const assignedPlans = await PatrolPlan.find({
      assignedGuards: guardObjectId,
      isActive: true,
    }).populate("checkpoints.qrId", "siteId description lat lng qrImageBase64");

    // Recent incidents reported
    const recentIncidents = await Incident.find({
      reportedBy: guardId,
    })
      .sort({ createdAt: -1 })
      .limit(5);

    // Calculate completion statistics
    const totalAssignedCheckpoints = assignedPlans.reduce((total, plan) => {
      return total + plan.checkpoints.length;
    }, 0);

    const completedCheckpoints = await Patrol.countDocuments({
      guard: guardId,
      isVerified: true,
      createdAt: { $gte: today, $lt: tomorrow },
    });

    const dashboardData = {
      currentShift: currentShift || null,
      todayStats: {
        patrols: todayPatrols.length,
        completedCheckpoints,
        totalAssignedCheckpoints,
        completionRate:
          totalAssignedCheckpoints > 0
            ? Math.round(
                (completedCheckpoints / totalAssignedCheckpoints) * 100
              )
            : 0,
      },
      assignedPlans,
      recentIncidents,
      todayPatrols,
    };

    // Return success even if no active shift
    if (!currentShift) {
      return res
        .status(200)
        .json(new ApiResponse(false, "No active shift found", dashboardData));
    }

    return res
      .status(200)
      .json(new ApiResponse(true, "Guard dashboard", dashboardData));
  } catch (err) {
    console.error("Error in getGuardDashboard:", err);
    return res.status(500).json(new ApiResponse(false, err.message));
  }
};




// exports.getShiftQRCodes = async (req, res) => {
//   try {
//     const guardId = new mongoose.Types.ObjectId(req.user.id)
//     const now = new Date();

//     console.log('now:', now.toISOString());

//         const todayStart = new Date();
//     todayStart.setHours(0, 0, 0, 0);

//     const todayEnd = new Date(todayStart);
//     todayEnd.setDate(todayEnd.getDate() + 1);


//     // Find current active shift where guard is assigned
//     // const currentShift = await Shift.findOne({
//     //   assignedGuards: guardId,
//     //   startTime: { $lte: now },
//     //   endTime: { $gte: now },
//     //   isActive: true,
//     // });
//    const currentShift = await Shift.findOne({
//       assignedGuards: guardId,
//       isActive: true,
//       $or: [
//         { startTime: { $lte: now }, endTime: { $gte: now } }, // exactly now
//         { startTime: { $lt: todayEnd }, endTime: { $gte: todayStart } }, // any shift overlapping today
//       ],
//     }).sort({ startTime: 1 }); // pick earliest matching shift

//     if (!currentShift) {
//       return res
//         .status(404)
//         .json(new ApiResponse(false, "No active shift found"));
//     }

//     // Get patrol plans assigned to this guard for current shift
//     const patrolPlans = await PatrolPlan.find({
//       "assignedGuards.guardId": guardId,
//       "assignedGuards.assignedShifts": currentShift._id,
//       isActive: true,
//     }).populate("checkpoints.qrId");

//     // Prepare today's date for scan check
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     const tomorrow = new Date(today);
//     tomorrow.setDate(tomorrow.getDate() + 1);

//     const qrCodes = [];

//     for (const plan of patrolPlans) {
//       for (const checkpoint of plan.checkpoints) {
//         if (checkpoint.qrId) {
//           const isScanned = await Patrol.findOne({
//             guard: guardId,
//             qrCodeId: checkpoint.qrId._id,
//             createdAt: { $gte: today, $lt: tomorrow },
//           });

//           qrCodes.push({
//             ...checkpoint.qrId.toObject(),
//             planName: plan.planName,
//             isCompleted: !!isScanned,
//             expectedTime: checkpoint.expectedTime,
//           });
//         }
//       }
//     }

//     return res.status(200).json(
//       new ApiResponse(true, "QR codes for current shift", {
//         shift: currentShift,
//         qrCodes,
//       })
//     );
//   } catch (err) {
//     console.error("Error in getShiftQRCodes:", err);
//     return res.status(500).json(new ApiResponse(false, err.message));
//   }
// };

// Mark Patrol Plan Checkpoint as Complete

// exports.getShiftQRCodes = async (req, res) => {
//   try {
//     const guardId = new mongoose.Types.ObjectId(req.user.id);
//     const now = new Date(); // Always UTC with MongoDB

//     console.log("Now (UTC):", now.toISOString());

//     // Find current active shift where guard is assigned (works for any shift type)
//     const currentShift = await Shift.findOne({
//       assignedGuards: guardId,
//       isActive: true,
//       startTime: { $lte: now },
//       endTime: { $gte: now },
//     }).sort({ startTime: 1 });

//     if (!currentShift) {
//       return res
//         .status(404)
//         .json(
//           new ApiResponse(
//             false,
//             "No active shift found for your account at this time. Please check your schedule or contact your supervisor if you believe this is an error.",
//             null
//           )
//         );
//     }

//     // Get patrol plans assigned to this guard for current shift
//     const patrolPlans = await PatrolPlan.find({
//       "assignedGuards.guardId": guardId,
//       "assignedGuards.assignedShifts": currentShift._id,
//       isActive: true,
//     }).populate("checkpoints.qrId");

//     // Prepare today's date (UTC midnight)
//     const today = new Date();
//     today.setUTCHours(0, 0, 0, 0);
//     const tomorrow = new Date(today);
//     tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

//     const qrCodes = [];

//     for (const plan of patrolPlans) {
//       for (const checkpoint of plan.checkpoints) {
//         if (checkpoint.qrId) {
//           const isScanned = await Patrol.findOne({
//             guard: guardId,
//             qrCodeId: checkpoint.qrId._id,
//             createdAt: { $gte: today, $lt: tomorrow },
//           });

//           qrCodes.push({
//             ...checkpoint.qrId.toObject(),
//             planName: plan.planName,
//             isCompleted: !!isScanned,
//             expectedTime: checkpoint.expectedTime,
//           });
//         }
//       }
//     }

//     // No QR codes assigned for this shift
//     if (qrCodes.length === 0) {
//       return res
//         .status(200)
//         .json(
//           new ApiResponse(
//             true,
//             "No checkpoints assigned for your current shift. Please check with your supervisor.",
//             { shift: currentShift, qrCodes: [] }
//           )
//         );
//     }

//     // Success
//     return res.status(200).json(
//       new ApiResponse(true, "QR codes for current shift", {
//         shift: currentShift,
//         qrCodes,
//       })
//     );
//   } catch (err) {
//     console.error("Error in getShiftQRCodes:", err);
//     return res.status(500).json(new ApiResponse(false, err.message));
//   }
// };




// exports.getShiftQRCodes = async (req, res) => {
//   try {
//     const guardId = new mongoose.Types.ObjectId(req.user.id);
//     const now = new Date();

//     console.log("Now (UTC):", now.toISOString());

//     // Find current active shift where guard is assigned
//     const currentShift = await Shift.findOne({
//       assignedGuards: guardId,
//       isActive: true,
//       startTime: { $lte: now },
//       endTime: { $gte: now },
//     }).sort({ startTime: 1 });

//     if (!currentShift) {
//       return res
//         .status(404)
//         .json(
//           new ApiResponse(
//             false,
//             "No active shift found for your account at this time. Please check your schedule or contact your supervisor if you believe this is an error.",
//             null
//           )
//         );
//     }

//     // Get patrol plans assigned to this guard for current shift
//     const patrolPlans = await PatrolPlan.find({
//       "assignedGuards.guardId": guardId,
//       "assignedGuards.assignedShifts": currentShift._id,
//       isActive: true,
//     }).populate("checkpoints.qrId");

//     const qrCodes = [];

//     for (const plan of patrolPlans) {
//       // Get current round for this guard and plan
//       const currentRound = await getCurrentRound(guardId, plan._id);

//       // Skip if all rounds are completed
//       if (currentRound > plan.rounds) {
//         continue;
//       }

//       // Get all scans in current round for this plan
//       const currentRoundScans = await Patrol.find({
//         guard: guardId,
//         patrolPlanId: plan._id,
//         roundNumber: currentRound,
//       });

//       const scannedQRIds = currentRoundScans.map((scan) =>
//         scan.qrCodeId.toString()
//       );

//       for (const checkpoint of plan.checkpoints) {
//         if (checkpoint.qrId) {
//           qrCodes.push({
//             ...checkpoint.qrId.toObject(),
//             planName: plan.planName,
//             isCompleted: scannedQRIds.includes(checkpoint.qrId._id.toString()),
//             expectedTime: checkpoint.expectedTime,
//             currentRound: currentRound,
//             totalRounds: plan.rounds,
//           });
//         }
//       }
//     }

//     // No QR codes assigned for this shift
//     if (qrCodes.length === 0) {
//       return res
//         .status(200)
//         .json(
//           new ApiResponse(
//             true,
//             "No checkpoints assigned for your current shift. Please check with your supervisor.",
//             { shift: currentShift, qrCodes: [] }
//           )
//         );
//     }

//     // Success
//     return res.status(200).json(
//       new ApiResponse(true, "QR codes for current shift", {
//         shift: currentShift,
//         qrCodes,
//       })
//     );
//   } catch (err) {
//     console.error("Error in getShiftQRCodes:", err);
//     return res.status(500).json(new ApiResponse(false, err.message));
//   }
// };

// Helper function to calculate current round





// async function getCurrentRound(guardId, patrolPlanId) {
//   const plan = await PatrolPlan.findById(patrolPlanId);
//   const totalCheckpoints = plan.checkpoints.length;

//   // Get all scans for this guard and plan, sorted by creation time
//   const allScans = await Patrol.find({
//     guard: guardId,
//     patrolPlanId: patrolPlanId,
//   }).sort({ createdAt: 1 });

//   if (allScans.length === 0) {
//     return 1; // Start with round 1 if no scans
//   }

//   // Group scans by round number
//   const scansByRound = {};
//   allScans.forEach((scan) => {
//     const roundNum = scan.roundNumber || 1;
//     if (!scansByRound[roundNum]) scansByRound[roundNum] = [];
//     scansByRound[roundNum].push(scan);
//   });

//   // Find rounds in order
//   const roundNumbers = Object.keys(scansByRound)
//     .map(Number)
//     .sort((a, b) => a - b);

//   // Find the first incomplete round
//   for (const roundNum of roundNumbers) {
//     const scansInRound = scansByRound[roundNum];
//     if (scansInRound.length < totalCheckpoints) {
//       return roundNum; // Return this incomplete round
//     }
//   }

//   // All existing rounds are complete, check if we can start a new round
//   const lastRound = roundNumbers[roundNumbers.length - 1];
//   return lastRound < plan.rounds ? lastRound + 1 : lastRound;
// }

exports.getShiftQRCodes = async (req, res) => {
  try {
    const guardId = new mongoose.Types.ObjectId(req.user.id);
    const now = new Date();

    console.log('gyarf', guardId);
    

    console.log("Now (UTC):", now.toISOString());

    // Find current active shift where guard is assigned
    const currentShift = await Shift.findOne({
      assignedGuards: guardId,
      // isActive: true,
      // startTime: { $lte: now },
      // endTime: { $gte: now },
    });

    // .sort({ startTime: 1 });
    if (!currentShift) {
      return res
        .status(404)
        .json(
          new ApiResponse(
            false,
            "No active shift found for your account at this time. Please check your schedule or contact your supervisor if you believe this is an error.",
            null
          )
        );
    }

    // Get patrol plans assigned to this guard for current shift
    const patrolPlans = await PatrolPlan.find({
      "assignedGuards.guardId": guardId,
      "assignedGuards.assignedShifts": currentShift._id,
      isActive: true,
    }).populate("checkpoints.qrId");

    const qrCodes = [];

    for (const plan of patrolPlans) {
      // Get current round for this guard, plan, AND current shift
      const currentRound = await getCurrentRound(
        guardId,
        plan._id,
        currentShift._id
      );

      // Skip if all rounds are completed for this shift
      if (currentRound > plan.rounds) {
        continue;
      }

      // Get all scans in current round for this plan AND shift
      const currentRoundScans = await Patrol.find({
        guard: guardId,
        patrolPlanId: plan._id,
        shift: currentShift._id, // CRITICAL: Only scans from current shift
        roundNumber: currentRound,
      });

      const scannedQRIds = currentRoundScans.map((scan) =>
        scan.qrCodeId.toString()
      );

      for (const checkpoint of plan.checkpoints) {
        if (checkpoint.qrId) {
          qrCodes.push({
            ...checkpoint.qrId.toObject(),
            planName: plan.planName,
            isCompleted: scannedQRIds.includes(checkpoint.qrId._id.toString()),
            expectedTime: checkpoint.expectedTime,
            currentRound: currentRound,
            totalRounds: plan.rounds,
            progress: `${scannedQRIds.length}/${plan.checkpoints.length}`,
          });
        }
      }
    }

    // No QR codes assigned for this shift
    if (qrCodes.length === 0) {
      return res
        .status(200)
        .json(
          new ApiResponse(
            true,
            "No checkpoints assigned for your current shift. Please check with your supervisor.",
            { shift: currentShift, qrCodes: [] }
          )
        );
    }

    // Success
    return res.status(200).json(
      new ApiResponse(true, "QR codes for current shift", {
        shift: currentShift,
        qrCodes,
      })
    );
  } catch (err) {
    console.error("Error in getShiftQRCodes:", err);
    return res.status(500).json(new ApiResponse(false, err.message));
  }
};

// UPDATED Helper function to calculate current round - SHIFT SPECIFIC

// exports.getShiftQRCodes = async (req, res) => {
//   try {
//     const guardId = new mongoose.Types.ObjectId(req.user.id);
//     const now = new Date();

//     console.log("Now (UTC):", now.toISOString());
//     console.log("=== DEBUG getShiftQRCodes ===");
//     console.log("Guard ID:", guardId.toString());
//     console.log("Current Time (UTC):", now.toISOString());
//     console.log("Current Time (Local):", now.toString());

//     // Find current active shift where guard is assigned
//     const currentShift = await Shift.findOne({
//       assignedGuards: guardId,
//       isActive: true,
//       startTime: { $lte: now },
//       endTime: { $gte: now },
//     }).sort({ startTime: 1 });

//     if (!currentShift) {
//       console.log("❌ No active shift found for guard");
//       return res
//         .status(404)
//         .json(
//           new ApiResponse(
//             false,
//             "No active shift found for your account at this time. Please check your schedule or contact your supervisor if you believe this is an error.",
//             null
//           )
//         );
//     }

//     console.log("✅ Found active shift:", {
//       shiftId: currentShift._id.toString(),
//       shiftName: currentShift.shiftName,
//       startTime: currentShift.startTime,
//       endTime: currentShift.endTime,
//       assignedGuards: currentShift.assignedGuards,
//     });

//     // DEBUG: Check if guard is in assignedGuards
//     const isGuardAssigned = currentShift.assignedGuards.some(
//       (gid) => gid.toString() === guardId.toString()
//     );
//     console.log(
//       `🔍 Guard ${guardId.toString()} assigned to shift: ${isGuardAssigned}`
//     );

//     // Get patrol plans assigned to this guard for current shift
//     const patrolPlans = await PatrolPlan.find({
//       "assignedGuards.guardId": guardId,
//       "assignedGuards.assignedShifts": currentShift._id,
//       isActive: true,
//     }).populate("checkpoints.qrId");

//         console.log(`📋 Found ${patrolPlans.length} patrol plans`);
//     const qrCodes = [];

//     for (const plan of patrolPlans) {
//       // --- SHIFT-SPECIFIC ROUND LOGIC (Same as scanQR) ---
//       const totalCheckpoints = plan.checkpoints.length;

//       // Get all scans for this guard, patrol plan, AND current shift
//       const allScans = await Patrol.find({
//         guard: guardId,
//         patrolPlanId: plan._id,
//         shift: currentShift._id, // CRITICAL: Only scans from current shift
//       }).sort({ createdAt: 1 });

//         console.log(`   📊 Found ${allScans.length} scans in current shift`);
//       // Determine current round number (shift-specific)
//       let currentRound = 1;
//       let scansInCurrentRound = [];

//       if (allScans.length > 0) {
//         // Group scans by round number stored in DB
//         const scansByRound = {};
//         allScans.forEach((scan) => {
//           const rNum = scan.roundNumber || 1;
//           if (!scansByRound[rNum]) scansByRound[rNum] = [];
//           scansByRound[rNum].push(scan);
//         });

//         // Find the latest incomplete round or start a new one
//         const roundNumbers = Object.keys(scansByRound)
//           .map(Number)
//           .sort((a, b) => a - b);

//         for (const rNum of roundNumbers) {
//           const scansInRound = scansByRound[rNum];
//           if (scansInRound.length < totalCheckpoints) {
//             // This round is incomplete
//             currentRound = rNum;
//             scansInCurrentRound = scansInRound;
//             break;
//           } else if (rNum === roundNumbers[roundNumbers.length - 1]) {
//             // Last round is complete, start new round
//             currentRound = rNum + 1;
//             scansInCurrentRound = [];
//           }
//         }
//       }

//       // Skip if all rounds are completed for this shift
//       if (currentRound > plan.rounds) {
//         continue;
//       }

//       // Get checkpoint IDs already scanned in current round
//       const scannedCheckpointIds = scansInCurrentRound.map((scan) =>
//         scan.qrCodeId.toString()
//       );

//       for (const checkpoint of plan.checkpoints) {
//         if (checkpoint.qrId) {
//           qrCodes.push({
//             ...checkpoint.qrId.toObject(),
//             planName: plan.planName,
//             isCompleted: scannedCheckpointIds.includes(
//               checkpoint.qrId._id.toString()
//             ),
//             expectedTime: checkpoint.expectedTime,
//             currentRound: currentRound,
//             totalRounds: plan.rounds,
//             progress: `${scannedCheckpointIds.length}/${totalCheckpoints}`,
//           });
//         }
//       }
//     }

//     // No QR codes assigned for this shift
//     if (qrCodes.length === 0) {
//       return res
//         .status(200)
//         .json(
//           new ApiResponse(
//             true,
//             "No checkpoints assigned for your current shift. Please check with your supervisor.",
//             { shift: currentShift, qrCodes: [] }
//           )
//         );
//     }

//     // Success
//     return res.status(200).json(
//       new ApiResponse(true, "QR codes for current shift", {
//         shift: currentShift,
//         qrCodes,
//       })
//     );
//   } catch (err) {
//     console.error("Error in getShiftQRCodes:", err);
//     return res.status(500).json(new ApiResponse(false, err.message));
//   }
// };

// exports.getShiftQRCodes = async (req, res) => {
//   try {
//     const guardId = new mongoose.Types.ObjectId(req.user.id);
//     const now = new Date();

//     console.log("=== DEBUG getShiftQRCodes ===");
//     console.log("Guard ID:", guardId.toString());
//     console.log("Current Time (UTC):", now.toISOString());

//     // Find current active shift where guard is assigned
//     const currentShift = await Shift.findOne({
//       assignedGuards: guardId,
//       isActive: true,
//       startTime: { $lte: now },
//       endTime: { $gte: now },
//     }).sort({ startTime: 1 });

//     if (!currentShift) {
//       console.log("❌ No active shift found for guard");
//       return res
//         .status(404)
//         .json(
//           new ApiResponse(
//             false,
//             "No active shift found for your account at this time. Please check your schedule or contact your supervisor if you believe this is an error.",
//             null
//           )
//         );
//     }

//     console.log("✅ Found active shift:", currentShift.shiftName);
//     console.log("🔍 Shift ID:", currentShift._id.toString());

//     // FIXED: Use $elemMatch for proper array querying
//     const patrolPlans = await PatrolPlan.find({
//       assignedGuards: {
//         $elemMatch: {
//           guardId: guardId,
//           assignedShifts: currentShift._id,
//         },
//       },
//       isActive: true,
//     }).populate("checkpoints.qrId");

//     console.log(`\n🎯 Found patrol plans: ${patrolPlans.length}`);

//     const qrCodes = [];

//     for (const plan of patrolPlans) {
//       console.log(`\n🔄 Processing plan: ${plan.planName}`);
//       console.log(`   Plan rounds: ${plan.rounds}`);
//       console.log(`   Checkpoints: ${plan.checkpoints.length}`);

//       // --- SHIFT-SPECIFIC ROUND LOGIC ---
//       const totalCheckpoints = plan.checkpoints.length;

//       // Get all scans for this guard, patrol plan, AND current shift
//       const allScans = await Patrol.find({
//         guard: guardId,
//         patrolPlanId: plan._id,
//         shift: currentShift._id,
//       }).sort({ createdAt: 1 });

//       console.log(`   📊 Found ${allScans.length} scans in current shift`);

//       // Determine current round number (shift-specific)
//       let currentRound = 1;
//       let scansInCurrentRound = [];

//       if (allScans.length > 0) {
//         // Group scans by round number stored in DB
//         const scansByRound = {};
//         allScans.forEach((scan) => {
//           const rNum = scan.roundNumber || 1;
//           if (!scansByRound[rNum]) scansByRound[rNum] = [];
//           scansByRound[rNum].push(scan);
//         });

//         console.log(`   🔢 Scans by round:`, Object.keys(scansByRound));

//         // Find the latest incomplete round or start a new one
//         const roundNumbers = Object.keys(scansByRound)
//           .map(Number)
//           .sort((a, b) => a - b);

//         console.log(`   📈 Round numbers:`, roundNumbers);

//         for (const rNum of roundNumbers) {
//           const scansInRound = scansByRound[rNum];
//           console.log(
//             `   🔍 Round ${rNum}: ${scansInRound.length}/${totalCheckpoints} scans`
//           );

//           if (scansInRound.length < totalCheckpoints) {
//             // This round is incomplete
//             currentRound = rNum;
//             scansInCurrentRound = scansInRound;
//             console.log(`   ✅ Using incomplete round ${currentRound}`);
//             break;
//           } else if (rNum === roundNumbers[roundNumbers.length - 1]) {
//             // Last round is complete, start new round
//             currentRound = rNum + 1;
//             scansInCurrentRound = [];
//             console.log(`   🔄 Starting new round ${currentRound}`);
//           }
//         }
//       } else {
//         console.log(`   🆕 Starting fresh at round ${currentRound}`);
//       }

//       console.log(`   🎯 Final current round: ${currentRound}`);

//       // **CRITICAL FIX**: Don't show any QR codes if all rounds are completed
//       if (currentRound > plan.rounds) {
//         console.log(
//           `   ⏹️  SKIPPING PLAN: All ${plan.rounds} rounds completed for this shift`
//         );
//         // **CHANGED**: Don't add any QR codes - just skip the entire plan
//         continue;
//       }

//       // Get checkpoint IDs already scanned in current round
//       const scannedCheckpointIds = scansInCurrentRound.map((scan) =>
//         scan.qrCodeId.toString()
//       );

//       console.log(
//         `   📍 Scanned in current round: ${scannedCheckpointIds.length} checkpoints`
//       );

//       // Add all checkpoints to QR codes
//       for (const checkpoint of plan.checkpoints) {
//         if (checkpoint.qrId) {
//           const isCompleted = scannedCheckpointIds.includes(
//             checkpoint.qrId._id.toString()
//           );
//           console.log(
//             `   🎯 QR ${checkpoint.qrId.siteId}: completed=${isCompleted}`
//           );

//           qrCodes.push({
//             ...checkpoint.qrId.toObject(),
//             planName: plan.planName,
//             isCompleted: isCompleted,
//             expectedTime: checkpoint.expectedTime,
//             currentRound: currentRound,
//             totalRounds: plan.rounds,
//             progress: `${scannedCheckpointIds.length}/${totalCheckpoints}`,
//           });
//         }
//       }

//       console.log(
//         `   ✅ Added ${plan.checkpoints.length} QR codes from this plan`
//       );
//     }

//     console.log(`\n📦 Final QR codes count: ${qrCodes.length}`);

//     // No QR codes assigned for this shift
//     if (qrCodes.length === 0) {
//       console.log("❌ No QR codes found after processing all plans");
//       return res
//         .status(200)
//         .json(
//           new ApiResponse(
//             true,
//             "All patrol rounds completed for this shift. No more checkpoints available.",
//             { shift: currentShift, qrCodes: [] }
//           )
//         );
//     }

//     console.log("✅ Successfully returning QR codes");
//     console.log("=== END DEBUG ===");

//     // Success
//     return res.status(200).json(
//       new ApiResponse(true, "QR codes for current shift", {
//         shift: currentShift,
//         qrCodes,
//       })
//     );
//   } catch (err) {
//     console.error("❌ Error in getShiftQRCodes:", err);
//     return res.status(500).json(new ApiResponse(false, err.message));
//   }
// };
async function getCurrentRound(guardId, patrolPlanId, shiftId) {
  const plan = await PatrolPlan.findById(patrolPlanId);
  const totalCheckpoints = plan.checkpoints.length;

  // Get all scans for this guard, plan, AND specific shift
  const allScans = await Patrol.find({
    guard: guardId,
    patrolPlanId: patrolPlanId,
    shift: shiftId, // CRITICAL: Only consider scans from this shift
  }).sort({ createdAt: 1 });

  if (allScans.length === 0) {
    return 1; // Start with round 1 if no scans in this shift
  }

  // Group scans by round number
  const scansByRound = {};
  allScans.forEach((scan) => {
    const roundNum = scan.roundNumber || 1;
    if (!scansByRound[roundNum]) scansByRound[roundNum] = [];
    scansByRound[roundNum].push(scan);
  });

  // Find rounds in order
  const roundNumbers = Object.keys(scansByRound)
    .map(Number)
    .sort((a, b) => a - b);

  // Find the first incomplete round
  for (const roundNum of roundNumbers) {
    const scansInRound = scansByRound[roundNum];
    if (scansInRound.length < totalCheckpoints) {
      return roundNum; // Return this incomplete round
    }
  }

  // All existing rounds are complete, check if we can start a new round
  const lastRound = roundNumbers[roundNumbers.length - 1];
  return lastRound < plan.rounds ? lastRound + 1 : lastRound;
}





exports.completeCheckpoint = async (req, res) => {
  try {
    const { patrolPlanId, qrId } = req.body;
    const guardId = req.user.id;

    const patrolPlan = await PatrolPlan.findOne({
      _id: patrolPlanId,
      assignedGuards: guardId
    });

    if (!patrolPlan) {
      return res.status(404).json(
        new ApiResponse(false, "Patrol plan not found or not assigned to you")
      );
    }

    // Find checkpoint and mark as completed
    const checkpoint = patrolPlan.checkpoints.find(
      cp => cp.qrId.toString() === qrId
    );

    if (!checkpoint) {
      return res.status(404).json(
        new ApiResponse(false, "Checkpoint not found in patrol plan")
      );
    }

    checkpoint.isCompleted = true;
    checkpoint.completedAt = new Date();
    await patrolPlan.save();

    return res.status(200).json(
      new ApiResponse(true, "Checkpoint marked as complete", { checkpoint })
    );
  } catch (err) {
    return res.status(500).json(new ApiResponse(false, err.message));
  }
};