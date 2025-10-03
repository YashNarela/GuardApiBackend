// controllers/incidentController.js
const Incident = require("../models/Incident");
const User = require("../models/User");
const ApiResponse = require("../utils/apiResponse");
const fs = require("fs").promises;
const path = require("path");
const { uploadDir } = require("../middleware/multer");
const mongoose=require("mongoose")


// exports.reportIncident = async (req, res) => {
//   try {
//     let {
//       title,
//       description,
//       type,
//       severity = "medium",
//       location,
//       assignedTo = [],
//     } = req.body;

//     console.log("req.user", req.user);

//     // Process uploaded files
//     const photos = [];
//     let video = null;

//     if (req.files && req.files.length > 0) {
//       for (const file of req.files) {
//         const filePath = path.join(uploadDir, file.filename);
//         const fileData = await fs.readFile(filePath);
//         const base64Data = fileData.toString("base64");

//         if (file.mimetype.startsWith("image")) {
//           photos.push(base64Data);
//         } else if (file.mimetype.startsWith("video")) {
//           video = base64Data;
//         }

//         // Clean up temp file
//         await fs
//           .unlink(filePath)
//           .catch((e) => console.warn("File cleanup failed:", e.message));
//       }
//     }

//     // ✅ Set defaults if missing
//     if (!title) title = "Untitled Incident";
//     if (!description) description = "No description provided";
//     if (!type) type = "general"; // fallback type

//     // ✅ Ensure at least some data exists
//     if (!title && !description && !type && photos.length === 0 && !video) {
//       return res
//         .status(400)
//         .json(new ApiResponse(false, "Incident cannot be empty"));
//     }

//     // Parse location
//     let parsedLocation = null;
//     if (location) {
//       try {
//         parsedLocation =
//           typeof location === "string" ? JSON.parse(location) : location;
//       } catch (e) {
//         parsedLocation = null;
//       }
//     }

//     // Get guard info
//     const guard = await User.findById(req.user.id);

//     // Assign supervisor or provided users
//     let assignedToArray = [];
//     if (assignedTo && assignedTo.length > 0) {
//       assignedToArray = Array.isArray(assignedTo)
//         ? assignedTo
//         : JSON.parse(assignedTo);
//     } else if (guard.supervisor) {
//       assignedToArray = [guard.supervisor];
//     }

//     // 🚨 Assign companyId
//     const companyId = guard.companyId || null;

//     const incident = await Incident.create({
//       title,
//       description,
//       type,
//       severity,
//       location: parsedLocation,
//       reportedBy: req.user.id,
//       assignedTo: assignedToArray,
//       photos,
//       video,
//       status: "reported",
//       companyId,
//     });

//     const populatedIncident = await Incident.findById(incident._id)
//       .populate("reportedBy", "name email role")
//       .populate("assignedTo", "name email role")
//       .populate("companyId", "name email role");

//     return res.status(201).json(
//       new ApiResponse(true, "Incident reported successfully", {
//         incident: populatedIncident,
//       })
//     );
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json(new ApiResponse(false, err.message));
//   }
// };




// Get Incidents (Role-based access)



exports.reportIncident = async (req, res) => {
  try {
    let {
      title,
      description,
      type,
      severity = "medium",
      location,
      assignedTo = [],
    } = req.body;

    console.log("req.user", req.user);

    // Process uploaded files
    const photos = [];
    let video = null;

    console.log('req---files', req.files);
    

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileData = await fs.readFile(file.path);
        const base64Data = fileData.toString("base64");

        if (file.mimetype.startsWith("image")) {
          photos.push(`data:${file.mimetype};base64,${base64Data}`);
        } else if (file.mimetype.startsWith("video")) {
          video = `data:${file.mimetype};base64,${base64Data}`;
        }

        // Remove temp file
        await fs
          .unlink(file.path)
          .catch((e) => console.warn("File cleanup failed:", e.message));
      }
    }

    // Set defaults if missing
    if (!title) title = "Untitled Incident";
    if (!description) description = "No description provided";
    if (!type) type = "general";

    // Parse location
    let parsedLocation = null;
    if (location) {
      try {
        parsedLocation =
          typeof location === "string" ? JSON.parse(location) : location;
      } catch (e) {
        parsedLocation = null;
      }
    }

    // Get guard info
    const guard = await User.findById(req.user.id);

    // Assign supervisor or provided users
    let assignedToArray = [];
    if (assignedTo && assignedTo.length > 0) {
      assignedToArray = Array.isArray(assignedTo)
        ? assignedTo
        : JSON.parse(assignedTo);
    } else if (guard.supervisor) {
      assignedToArray = [guard.supervisor];
    }

    // Assign companyId
    const companyId = guard.companyId || null;

    // Create incident
    const incident = await Incident.create({
      title,
      description,
      type,
      severity,
      location: parsedLocation,
      reportedBy: req.user.id,
      assignedTo: assignedToArray,
      photos,
      video,
      status: "reported",
      companyId,
    });

    const populatedIncident = await Incident.findById(incident._id)
      .populate("reportedBy", "name email role")
      .populate("assignedTo", "name email role")
      .populate("companyId", "name email role");

    return res
      .status(201)
      .json(
        new ApiResponse(true, "Incident reported successfully", {
          incident: populatedIncident,
        })
      );
  } catch (err) {
    console.error(err);
    return res.status(500).json(new ApiResponse(false, err.message));
  }
};



exports.getIncidents = async (req, res) => {


  console.log('-----req.user----', req.user);
  
  try {
    const { status, type, severity, page = 1, limit = 20 } = req.query;
    const filter = {};

    // Role-based filtering
    if (req.user.role === "guard") {
      filter.reportedBy = req.user.id;
    } else if (req.user.role === "supervisor") {
      filter.assignedTo = req.user.id;
    } else if (req.user.role === "employee") {
      // Employee can see all incidents from their guards and supervisors
      // const guards = await User.find({ createdBy: req.user.id, role: "guard" });
      // const supervisors = await User.find({
      //   createdBy: req.user.id,
      //   role: "supervisor",
      // });

        const guards = await User.find({
          companyId: req.user.id,
          role: "guard",
        });
        const supervisors = await User.find({
          companyId: req.user.id,
          role: "supervisor",
        });

      const guardIds = guards.map((g) => g._id);
      const supervisorIds = supervisors.map((s) => s._id);

      filter.$or = [
        { reportedBy: { $in: guardIds } },
        { assignedTo: { $in: supervisorIds } },
        { companyId: req.user.id },
      ];
    }

    // Apply additional filters
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;

    const incidents = await Incident.find(filter)
      .populate("reportedBy", "name email role")
      .populate("assignedTo", "name email role")
      .populate("companyId", "name email role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Incident.countDocuments(filter);

    return res
      .status(200)
      .json(
        new ApiResponse(true, "Incidents fetched successfully", {
          incidents,
          total,
          page,
          limit,
        })
      );
  } catch (err) {
    return res.status(500).json(new ApiResponse(false, err.message));
  }
};

// Update Incident Status (Supervisor/Employee)
exports.updateIncidentStatus = async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;
    const incidentId = req.params.id;

    if (!status) {
      return res.status(400).json(new ApiResponse(false, "Status is required"));
    }

    const updateData = { status };

    if (status === "resolved" || status === "closed") {
      updateData.resolvedAt = new Date();
      if (resolutionNotes) {
        updateData.resolutionNotes = resolutionNotes;
      }
    }

    // Check if user has permission to update this incident
    const filter = { _id: incidentId };
    if (req.user.role === "supervisor") {
      filter.assignedTo = req.user.id;
    } else if (req.user.role === "employee") {
      // Employee can update incidents from their team
      const guards = await User.find({ createdBy: req.user.id, role: "guard" });
      const supervisors = await User.find({
        createdBy: req.user.id,
        role: "supervisor",
      });

      const guardIds = guards.map((g) => g._id);
      const supervisorIds = supervisors.map((s) => s._id);

      filter.$or = [
        { reportedBy: { $in: guardIds } },
        { assignedTo: { $in: supervisorIds } },
      ];
    }

    const incident = await Incident.findOneAndUpdate(filter, updateData, {
      new: true,
    })
      .populate("reportedBy", "name email role")
      .populate("assignedTo", "name email role");

    if (!incident) {
      return res
        .status(404)
        .json(new ApiResponse(false, "Incident not found or access denied"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(true, "Incident updated successfully", { incident })
      );
  } catch (err) {
    return res.status(500).json(new ApiResponse(false, err.message));
  }
};

// Get Incident Statistics
exports.getIncidentStats = async (req, res) => {
  try {
    const { period = "month" } = req.query;
    let startDate;

    const now = new Date();
    switch (period) {
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case "year":
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    // Build filter based on user role
    // let matchFilter = { createdAt: { $gte: startDate } };
    let matchFilter = {};
console.log("Match filter:", matchFilter);

    if (req.user.role === "supervisor") {
      // assignedTo is an array → must use $in
     matchFilter.assignedTo = { $in: [ new mongoose.Types.ObjectId(req.user.id)] };
    } else if (req.user.role === "employee") {
      const guards = await User.find({ createdBy: req.user.id, role: "guard" });
      const supervisors = await User.find({
        createdBy: req.user.id,
        role: "supervisor",
      });
  
      console.log("supervisot is ", supervisors);
      
      const guardIds = guards.map((g) => g._id);
      const supervisorIds = supervisors.map((s) => s._id);

      matchFilter.$or = [
        { reportedBy: { $in: guardIds } },
        { assignedTo: { $in: supervisorIds } },
      ];
    }

    const stats = await Incident.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$status", // group by status
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$count" },
          statusBreakdown: {
            $push: { k: "$_id", v: "$count" },
          },
        },
      },
      {
        $project: {
          _id: 0,
          total: 1,
          statusBreakdown: { $arrayToObject: "$statusBreakdown" },
        },
      },
    ]);

    return res.status(200).json(
      new ApiResponse(true, "Incident statistics", {
        stats: stats[0] || { total: 0, statusBreakdown: {} },
      })
    );
  } catch (err) {
    return res.status(500).json(new ApiResponse(false, err.message));
  }
};
