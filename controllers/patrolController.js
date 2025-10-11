
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



const moment = require("moment-timezone");



exports.scanQR = async (req, res) => {
  try {
    const guardId = req.user.id;

    console.log('***req***', req.user);
    const companyId =  new mongoose.Types.ObjectId( req.user.companyId);

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
      companyId: companyId,
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

        companyId: patrol?.companyId,
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
            {
              $project: {
                _id: 1,
                shiftName: 1,
                startTime: 1,
                endTime: 1,
                shiftType: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: "$shiftInfo", preserveNullAndEmptyArrays: true } },
      // {
      //   $lookup: {
      //     from: "qrs",
      //     localField: "qrCodeId",
      //     foreignField: "_id",
      //     as: "qrInfo",
      //     pipeline: [
      //       {
      //         $project: {
      //           _id: 1,
      //           siteId: 1,
      //           description: 1,
      //           lat: 1,
      //           lng: 1,
      //           companyId: 1,
      //         },
      //       },
      //     ],
      //   },
      // },
      // { $unwind: { path: "$qrInfo", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "qrs",
          localField: "qrCodeId",
          foreignField: "_id",
          as: "qrInfo",
          pipeline: [
            {
              $project: {
                _id: 1,
                siteId: 1,
                description: 1,
                lat: 1,
                lng: 1,
                companyId: 1,
              },
            },
            // ADD ONLY THIS FOR COMPANY POPULATE:
            {
              $lookup: {
                from: "users",
                localField: "companyId",
                foreignField: "_id",
                as: "company",
                pipeline: [
                  { $project: { _id: 1, name: 1, email: 1, phone: 1 } },
                ],
              },
            },
            { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },
          ],
        },
      },
      { $unwind: { path: "$qrInfo", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "patrolplans",
          localField: "patrolPlanId",
          foreignField: "_id",
          as: "patrolPlanInfo",
          pipeline: [
            { $project: { _id: 1, planName: 1, description: 1, rounds: 1 } },
          ],
        },
      },
      {
        $unwind: { path: "$patrolPlanInfo", preserveNullAndEmptyArrays: true },
      },
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
    console.log("Generating guard performance report", req.body);

    const { guardId, startDate, endDate, shiftId } = req.body;

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

    // Date range with moment.js - FIXED for partial dates
    let start, end;
    if (startDate) {
      // If only start date is provided
      // start = moment(startDate).startOf("day").toDate();
        start = moment.utc(startDate).startOf("day").toDate();

      if (endDate) {
        // Both start and end dates provided
        // end = moment(endDate).endOf("day").toDate();
        end = moment(endDate).endOf("day").toDate();
      } else {
        // Only start date provided - set end date to same day
        // end = moment.utc(startDate).endOf("day").toDate();
            end = moment.utc(startDate).endOf("day").toDate();
      }
    } else if (endDate) {
      // Only end date provided
      // end = moment(endDate).endOf("day").toDate();
      // start = moment(endDate).startOf("day").toDate(); // Set start to same day

        end = moment.utc(endDate).endOf("day").toDate();
        start = moment.utc(endDate).startOf("day").toDate(); 
    } else {
      // No dates provided - default to last 30 days
      // end = moment().endOf("day").toDate();
      // start = moment().subtract(30, "days").startOf("day").toDate();

        end = moment.utc().endOf("day").toDate();
        start = moment.utc().subtract(30, "days").startOf("day").toDate();
    }

    console.log(
      `📊 Generating detailed report for guard ${guardId} from ${start} to ${end}`
    );
    console.log(`Frontend dates - start: ${startDate}, end: ${endDate}`);
    console.log(`Processed dates - start: ${start}, end: ${end}`);

    // Calculate total days correctly
    const totalDays = moment(end).diff(moment(start), "days") + 1;

    // Build query for patrol scans
    const scanQuery = {
      guard: guardId,
      createdAt: { $gte: start, $lte: end },
    };

    // Add shift filter if provided
    if (shiftId) {
      scanQuery.shift = shiftId;
    }

    // 1. GET ALL PATROL SCANS WITH DETAILED INFORMATION
    const patrolScans = await Patrol.find(scanQuery)
      .populate("patrolPlanId", "planName rounds")
      .populate("qrCodeId", "siteId description")
      .populate("shift", "shiftName")
      .sort({ createdAt: -1 });

    console.log(`Found ${patrolScans.length} patrol scans`);

    // 2. GET PATROL PLANS TO GET TOTAL ROUNDS INFORMATION
    const patrolPlanIds = [
      ...new Set(
        patrolScans.map((scan) => scan.patrolPlanId?._id).filter(Boolean)
      ),
    ];

    const patrolPlans = await PatrolPlan.find({
      _id: { $in: patrolPlanIds },
    }).populate("checkpoints.qrId", "siteId description");

    // 3. SIMPLE ANALYSIS BASED ON ACTUAL SCAN DATA
    const roundsData = {};
    let totalCompletedRounds = 0;
    let totalExpectedRounds = 0;
    let totalCompletedScans = 0;
    let totalExpectedScans = 0;

    // Calculate based on patrol plans
    patrolPlans.forEach((plan) => {
      const planId = plan._id.toString();
      const planRounds = plan.rounds || 1;
      const planCheckpoints = plan.checkpoints.length;

      totalExpectedRounds += planRounds;
      totalExpectedScans += planRounds * planCheckpoints;

      // Initialize rounds data for this plan
      roundsData[planId] = {
        planName: plan.planName,
        totalRounds: planRounds,
        totalCheckpoints: planCheckpoints,
        completedRounds: 0,
        completedScans: 0,
        rounds: {},
      };
    });

    // Group scans by plan and round number
    patrolScans.forEach((scan) => {
      const planId = scan.patrolPlanId?._id?.toString();
      const roundNumber = scan.roundNumber || 1;

      if (!planId || !roundsData[planId]) return;

      const roundKey = `round_${roundNumber}`;

      if (!roundsData[planId].rounds[roundKey]) {
        roundsData[planId].rounds[roundKey] = {
          roundNumber: roundNumber,
          scans: [],
          completedCheckpoints: 0,
          isComplete: false,
        };
      }

      // Add scan if not already recorded for this checkpoint
      const existingScan = roundsData[planId].rounds[roundKey].scans.find(
        (s) => s.qrCodeId?.toString() === scan.qrCodeId?._id?.toString()
      );

      if (!existingScan) {
        roundsData[planId].rounds[roundKey].scans.push({
          scanId: scan._id,
          siteId: scan.qrCodeId?.siteId,
          checkpointName: scan.qrCodeId?.siteId,
          checkpointDescription: scan.qrCodeId?.description,
          actualTime: scan.createdAt,
          distanceMeters: scan.distanceMeters,
          isVerified: scan.isVerified,
        });

        roundsData[planId].rounds[roundKey].completedCheckpoints++;

        // Check if round is complete
        const totalCheckpoints = roundsData[planId].totalCheckpoints;
        if (
          roundsData[planId].rounds[roundKey].completedCheckpoints >=
          totalCheckpoints
        ) {
          roundsData[planId].rounds[roundKey].isComplete = true;
          roundsData[planId].completedRounds++;
          totalCompletedRounds++;
        }

        roundsData[planId].completedScans++;
        totalCompletedScans++;
      }
    });

    // 4. CREATE DETAILED ROUNDS DATA FOR TABLE
    const detailedRoundsData = [];

    Object.values(roundsData).forEach((planData) => {
      Object.values(planData.rounds).forEach((round) => {
        round.scans.forEach((scan) => {
          detailedRoundsData.push({
            date: moment(scan.actualTime).format("YYYY-MM-DD"),
            roundNumber: round.roundNumber,
            planName: planData.planName,
            checkpointName: scan.checkpointName,
            checkpointDescription: scan.checkpointDescription,
            actualTime: scan.actualTime,
            status: "completed",
            scanId: scan.scanId,
            distanceMeters: scan.distanceMeters,
            isVerified: scan.isVerified,
          });
        });

        // Add missed checkpoints for incomplete rounds
        if (!round.isComplete) {
          const scannedSiteIds = round.scans.map((s) => s.siteId);
          const patrolPlan = patrolPlans.find(
            (p) =>
              p._id.toString() ===
              Object.keys(roundsData).find(
                (key) => roundsData[key].planName === planData.planName
              )
          );

          if (patrolPlan) {
            patrolPlan.checkpoints.forEach((checkpoint) => {
              const siteId = checkpoint.qrId.siteId;
              if (!scannedSiteIds.includes(siteId)) {
                detailedRoundsData.push({
                  date: round.scans[0]
                    ? moment(round.scans[0].actualTime).format("YYYY-MM-DD")
                    : moment().format("YYYY-MM-DD"),
                  roundNumber: round.roundNumber,
                  planName: planData.planName,
                  checkpointName: siteId,
                  checkpointDescription: checkpoint.qrId.description,
                  actualTime: null,
                  status: "missed",
                  scanId: null,
                });
              }
            });
          }
        }
      });
    });

    // Sort detailed data
    detailedRoundsData.sort((a, b) => {
      if (a.date === b.date) {
        if (a.roundNumber === b.roundNumber) {
          return a.checkpointName.localeCompare(b.checkpointName);
        }
        return a.roundNumber - b.roundNumber;
      }
      return new Date(b.date) - new Date(a.date);
    });

    // 5. CALCULATE PERFORMANCE METRICS - SIMPLE AND ACCURATE
    const missedRounds = totalExpectedRounds - totalCompletedRounds;
    const missedScans = totalExpectedScans - totalCompletedScans;

    const roundsCompletionRate =
      totalExpectedRounds > 0
        ? (totalCompletedRounds / totalExpectedRounds) * 100
        : 0;

    const scanCompletionRate =
      totalExpectedScans > 0
        ? (totalCompletedScans / totalExpectedScans) * 100
        : 0;

    // 6. GET ATTENDANCE DATA (optional)
    const attendanceRecords = await Attendance.find({
      guard: guardId,
      date: { $gte: start, $lte: end },
    });

    const attendanceTotalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(
      (record) =>
        record.status === "present" ||
        record.status === "on-duty" ||
        record.status === "late"
    ).length;

    const attendanceRate =
      attendanceTotalDays > 0 ? (presentDays / attendanceTotalDays) * 100 : 0;

    // Overall performance (focus on rounds completion)
    const overallPerformance = roundsCompletionRate;

    return res.status(200).json(
      new ApiResponse(true, "Guard performance report generated", {
        // Basic Info
        guard: {
          _id: guard._id,
          name: guard.name,
          phone: guard.phone,
        },

        // Report Period - FIXED with correct totalDays
        reportPeriod: {
          startDate: start,
          endDate: end,
          totalDays: totalDays, // Now correctly calculated
        },

        // Rounds Performance Summary - SIMPLE AND ACCURATE
        roundsPerformance: {
          summary: {
            totalExpectedRounds: totalExpectedRounds,
            totalCompletedRounds: totalCompletedRounds,
            totalMissedRounds: missedRounds,
            totalExpectedScans: totalExpectedScans,
            totalCompletedScans: totalCompletedScans,
            totalMissedScans: missedScans,
            roundsCompletionRate: roundsCompletionRate.toFixed(1) + "%",
            scanCompletionRate: scanCompletionRate.toFixed(1) + "%",
          },
          planBreakdown: Object.values(roundsData).map((plan) => ({
            planName: plan.planName,
            totalRounds: plan.totalRounds,
            completedRounds: plan.completedRounds,
            totalCheckpoints: plan.totalCheckpoints,
            completedScans: plan.completedScans,
            completionRate:
              ((plan.completedRounds / plan.totalRounds) * 100).toFixed(1) +
              "%",
          })),
        },

        // Detailed Rounds Data
        detailedRounds: detailedRoundsData,

        // Overall Performance
        performance: {
          overallScore: overallPerformance.toFixed(1),
          rating: getPerformanceRating(overallPerformance),
          breakdown: {
            roundsCompletionRate: roundsCompletionRate.toFixed(1),
            scanCompletionRate: scanCompletionRate.toFixed(1),
          },
        },

        // Simple Summary
        summary: {
          progress: `${totalCompletedRounds}/${totalExpectedRounds} rounds completed`,
          efficiency: roundsCompletionRate.toFixed(1) + "%",
          status: overallPerformance >= 70 ? "Good" : "Needs Improvement",
        },
      })
    );
  } catch (err) {
    console.error("❌ Error in getGuardPerformanceReport:", err);
    return res.status(500).json(new ApiResponse(false, err.message));
  }
};

// Helper function for performance rating
function getPerformanceRating(score) {
  const numericScore = parseFloat(score) || 0;
  if (numericScore >= 90) return "Excellent";
  if (numericScore >= 80) return "Good";
  if (numericScore >= 70) return "Satisfactory";
  if (numericScore >= 60) return "Needs Improvement";
  return "Poor";
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
//     const guardId = new mongoose.Types.ObjectId(req.user.id);
//     const now = new Date();

//     console.log('gyarf', guardId);
    

//     console.log("Now (UTC):", now.toISOString());

//     // Find current active shift where guard is assigned
//     const currentShift = await Shift.findOne({
//       assignedGuards: guardId,
//       // isActive: true,
//       // startTime: { $lte: now },
//       // endTime: { $gte: now },
//     });

//     // .sort({ startTime: 1 });
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
//       // Get current round for this guard, plan, AND current shift
//       const currentRound = await getCurrentRound(
//         guardId,
//         plan._id,
//         currentShift._id
//       );

//       // Skip if all rounds are completed for this shift
//       if (currentRound > plan.rounds) {
//         continue;
//       }

//       // Get all scans in current round for this plan AND shift
//       const currentRoundScans = await Patrol.find({
//         guard: guardId,
//         patrolPlanId: plan._id,
//         shift: currentShift._id, // CRITICAL: Only scans from current shift
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
//             progress: `${scannedQRIds.length}/${plan.checkpoints.length}`,
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

exports.getShiftQRCodes = async (req, res) => {
  try {
    const guardId = new mongoose.Types.ObjectId(req.user.id);
    const now = moment().utc(); // Use moment.js for consistent time handling

    console.log("Guard ID:", guardId);
    console.log("Now (UTC):", now.format());

    // Find current active shift where guard is assigned
    const currentShift = await Shift.findOne({
      assignedGuards: guardId,
      // isActive: true,
 
    }).sort({ startTime: 1 });

       startTime: { $lte: now.toDate() } // Convert moment to Date for MongoDB query
      endTime: { $gte: now.toDate() } // Convert moment to Date for MongoDB query

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

    console.log("Found shift:", {
      shiftName: currentShift.shiftName,
      startTime: currentShift.startTime,
      endTime: currentShift.endTime,
      isActive: currentShift.isActive,
    });

    // Get patrol plans assigned to this guard for current shift
    const patrolPlans = await PatrolPlan.find({
      "assignedGuards.guardId": guardId,
      "assignedGuards.assignedShifts": currentShift._id,
      isActive: true,
      // Additional check: ensure plan is active during current time
      $or: [{ startDate: { $lte: now.toDate() } }, { startDate: null }],
      $or: [{ endDate: { $gte: now.toDate() } }, { endDate: null }],
    }).populate("checkpoints.qrId");

    const qrCodes = [];

    for (const plan of patrolPlans) {
      // Additional time-based plan validation
      const planStart = plan.startDate ? moment.utc(plan.startDate) : null;
      const planEnd = plan.endDate ? moment.utc(plan.endDate) : null;

      // Skip if plan has date restrictions and current time is outside them
      if (planStart && now.isBefore(planStart)) {
        continue;
      }
      if (planEnd && now.isAfter(planEnd)) {
        continue;
      }

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
      return res.status(200).json(
        new ApiResponse(
          true,
          "No checkpoints assigned for your current shift. Please check with your supervisor.",
          {
            shift: {
              ...currentShift.toObject(),
              currentTime: now.format(),
              timezone: "UTC",
            },
            qrCodes: [],
          }
        )
      );
    }

    // Success
    return res.status(200).json(
      new ApiResponse(true, "QR codes for current shift", {
        shift: {
          ...currentShift.toObject(),
          currentTime: now.format(),
          timezone: "UTC",
        },
        qrCodes,
      })
    );
  } catch (err) {
    console.error("Error in getShiftQRCodes:", err);
    return res.status(500).json(new ApiResponse(false, err.message));
  }
};



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