import { chatBotAPIResponse, adminChatbotAIResponse, atsResumeAdviceAI } from "../ai/aiService.js";
import User from "../Models/User.js";
import Resume from "../Models/resume.js";
import Subscription from "../Models/subscription.js";
import Payment from "../Models/payment.js";
import ApiMetric from "../Models/ApiMetric.js";

export const ChatbotResponse = async (req, res) => {
  try {
    const { message, prevMsg, isLoggedIn } = req.body;

    /* ===============================
       CALL AI SERVICE
    =============================== */

    const aiResponse = await chatBotAPIResponse(
      message,
      prevMsg,
      isLoggedIn
    );

    let parsed;

    /* ===============================
       PARSE AI RESPONSE
    =============================== */

    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = { mode: "message", text: aiResponse };
      }
    } catch {
      parsed = {
        mode: "message",
        text: aiText || "Sorry, I couldn't generate a response."
      };
    }
    return res.json({ ...parsed });
  } catch (error) {
    console.error("❌ Chatbot Controller Error:", error);
    return res.status(500).json({
      reply: {
        mode: "message",
        text: "Something went wrong. Please try again later."
      }
    });
  }
};

export const AdminChatbotResponse = async (req, res) => {
  try {
    const { message, prevMsg } = req.body;

    // Fetch live stats from DB
    const last7Days = new Date(); last7Days.setDate(last7Days.getDate() - 7);
    const last30Days = new Date(); last30Days.setDate(last30Days.getDate() - 30);
    const lastSixMonths = new Date(); lastSixMonths.setMonth(lastSixMonths.getMonth() - 6);

    const [
      totalUsers, activeUsers, newUsers, totalResumes, activeSubscriptions,
      revenueAgg, apiStatsAgg, subBreakdown, dailyActiveAgg, userGrowthAgg,
      resumeChartAgg, templateAgg
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ lastLogin: { $gte: last7Days }, isAdmin: false }),
      User.countDocuments({ createdAt: { $gte: last30Days }, isAdmin: false }),
      Resume.countDocuments(),
      Subscription.countDocuments({ status: "active" }),
      Payment.aggregate([{ $match: { status: "success" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      ApiMetric.aggregate([
        { $match: { createdAt: { $gte: last30Days } } },
        { $group: { _id: { $cond: [{ $lt: ["$statusCode", 400] }, "success", "failure"] }, count: { $sum: 1 } } }
      ]),
      User.aggregate([{ $match: { isAdmin: false } }, { $group: { _id: "$plan", count: { $sum: 1 } } }]),
      User.aggregate([
        { $match: { lastLogin: { $gte: last7Days } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$lastLogin" } }, users: { $sum: 1 } } }
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: lastSixMonths } } },
        { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, total: { $sum: 1 } } }
      ]),
      Resume.aggregate([
        { $match: { createdAt: { $gte: lastSixMonths } } },
        { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, total: { $sum: 1 } } }
      ]),
      Resume.aggregate([
        { $match: { templateId: { $exists: true, $ne: null } } },
        { $group: { _id: "$templateId", count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 5 }
      ])
    ]);

    // Process stats
    let successCalls = 0, failureCalls = 0;
    apiStatsAgg.forEach(s => { if (s._id === "success") successCalls = s.count; else failureCalls = s.count; });
    const totalApiCalls = successCalls + failureCalls;
    const apiSuccessRate = totalApiCalls > 0 ? `${((successCalls / totalApiCalls) * 100).toFixed(1)}%` : "100%";

    const daysMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyMap = new Map(dailyActiveAgg.map(d => [d._id, d.users]));
    const dailyActiveUsers = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return { day: daysMap[d.getDay()], users: dailyMap.get(d.toISOString().slice(0, 10)) || 0 };
    });

    const growthMap = new Map(userGrowthAgg.map(g => [`${g._id.year}-${g._id.month}`, g.total]));
    const resumeMap = new Map(resumeChartAgg.map(r => [`${r._id.year}-${r._id.month}`, r.total]));
    const userGrowth = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      return { month: d.toLocaleString("default", { month: "short" }), users: growthMap.get(key) || 0, resumes: resumeMap.get(key) || 0 };
    });

    const stats = {
      totalUsers, activeUsers, newUsers, totalResumes, activeSubscriptions,
      totalRevenue: revenueAgg[0]?.total || 0,
      apiSuccessRate, totalApiCalls,
      subscriptionBreakdown: subBreakdown.map(s => ({ plan: s._id || "Free", count: s.count })),
      dailyActiveUsers,
      userGrowth,
      resumeChart: userGrowth,
      mostUsedTemplates: templateAgg.map(t => ({ template: String(t._id).substring(0, 20), count: t.count })),
      systemUptime: totalApiCalls > 0 ? `${Math.max(99.0, (successCalls / totalApiCalls) * 100).toFixed(2)}%` : "99.99%"
    };

    const aiResponse = await adminChatbotAIResponse(message, prevMsg || [], stats);

    let parsed;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { mode: "message", text: aiResponse };
    } catch {
      parsed = { mode: "message", text: aiResponse };
    }

    return res.json(parsed);
  } catch (error) {
    console.error("❌ Admin Chatbot Error:", error);
    return res.status(500).json({ mode: "message", text: "Something went wrong. Please try again." });
  }
};

export const ATSChatbotResponse = async (req, res) => {
  try {
    const { message, scanData } = req.body;
    if (!message || !scanData) {
      return res.status(400).json({ mode: "message", text: "Missing message or scan data." });
    }

    const aiResponse = await atsResumeAdviceAI(message, scanData);

    let parsed;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { mode: "message", text: aiResponse };
    } catch {
      parsed = { mode: "message", text: aiResponse };
    }

    return res.json(parsed);
  } catch (error) {
    console.error("❌ ATS Chatbot Error:", error);
    return res.status(500).json({ mode: "message", text: "Something went wrong. Please try again." });
  }
};
