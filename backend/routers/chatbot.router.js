import express from "express";
import { ChatbotResponse, AdminChatbotResponse } from "../controllers/chatbot.controller.js";
import isAuth from "../middlewares/isAuth.js";

const chatbotRouter = express.Router();

chatbotRouter.post('/chat', ChatbotResponse);
chatbotRouter.post('/admin-chat', isAuth, AdminChatbotResponse);

export default chatbotRouter;