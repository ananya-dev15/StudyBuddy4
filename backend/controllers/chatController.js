import { GoogleGenerativeAI } from "@google/generative-ai";

export const handleChat = async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    let systemPrompt = `You are StudyBuddy AI 🤖, a personalized, patient, and motivating study mentor for students. 
Your job is to help students learn effectively, stay focused, and feel encouraged.

Guidelines:
1. Be friendly, supportive, and clear. Speak like an expert, encouraging study mentor.
2. Break complex concepts into simple, easy-to-understand explanations with examples.
3. Keep answers concise, clear, and focused on helping the student learn.
4. If a question is about study habits, tips, reminders, or focus, provide actionable advice.
`;

    if (context && context.source === "video_tracker") {
      systemPrompt += `\nCurrent Learning Context:
The student is currently watching a video in the Study Video Tracker.
- Video Title: "${context.videoTitle || 'Educational Lecture'}"
- Video ID: "${context.videoId || 'N/A'}"
When answering, reference this context if relevant, but answer the student's question accurately and clearly.
`;
    }

    const userPrompt = `${systemPrompt}\nStudent Question: "${message.trim()}"\n\nStudyBuddy AI Answer:`;

    if (apiKey && apiKey !== "YOUR_GEMINI_API_KEY_HERE") {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const candidateModels = [
          "gemini-3.6-flash",
          "gemini-3.5-flash",
          "gemini-2.5-flash-lite",
          "gemini-3.1-flash-lite",
          "gemini-flash-latest",
          "gemini-2.5-flash",
          "gemini-1.5-flash"
        ];

        for (const modelName of candidateModels) {
          try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(userPrompt);
            const response = await result.response;
            const reply = response.text();

            if (reply && reply.trim()) {
              return res.json({
                success: true,
                reply: reply.trim(),
              });
            }
          } catch (modelErr) {
            console.warn(`Model ${modelName} chat error:`, modelErr.message);
          }
        }
      } catch (aiErr) {
        console.error("Gemini API Chat error:", aiErr);
      }
    }

    // Smart fallback if API key is unconfigured or fails
    const lowMsg = message.toLowerCase();
    let fallbackReply = "That's a great question! Keep focusing on your study session. Let me know if you need help breaking down concepts, smart study tips, or assignment assistance.";

    if (lowMsg.includes("conditional") || lowMsg.includes("if else") || lowMsg.includes("switch")) {
      fallbackReply = "Conditional statements (like if, else if, else, and switch) allow code to make decisions and execute specific blocks depending on whether conditions evaluate to true or false!";
    } else if (lowMsg.includes("polymorphism")) {
      fallbackReply = "Polymorphism in OOP allows objects of different classes to be treated as objects of a common superclass. The two main types are Compile-time (Method Overloading) and Runtime (Method Overriding).";
    } else if (lowMsg.includes("inheritance")) {
      fallbackReply = "Inheritance in OOP allows a new child class to acquire properties and methods of an existing parent class, promoting code reuse and hierarchical organization.";
    } else if (lowMsg.includes("abstraction")) {
      fallbackReply = "Abstraction is hiding internal implementation details and showing only essential functionality to the user, typically achieved using Abstract Classes and Interfaces in Java.";
    } else if (lowMsg.includes("encapsulation")) {
      fallbackReply = "Encapsulation is bundling data and methods inside a single class and restricting direct variable access using private modifiers with getters and setters.";
    } else if (lowMsg.includes("loop") || lowMsg.includes("for") || lowMsg.includes("while")) {
      fallbackReply = "Loops (for, while, do-while) repeat a block of code multiple times as long as a specified condition remains true.";
    } else if (lowMsg.includes("array") || lowMsg.includes("list")) {
      fallbackReply = "An array is a linear data structure that stores elements of the same data type in contiguous memory locations.";
    } else if (lowMsg.includes("reminder") || lowMsg.includes("assignments")) {
      fallbackReply = "You can manage your smart reminders and assignments directly from your Dashboard or Reminders panel!";
    } else if (lowMsg.includes("streak") || lowMsg.includes("coins")) {
      fallbackReply = "Watching educational videos maintains your daily study streak and earns focus coins. Switching tabs costs 5 coins!";
    }

    return res.json({
      success: true,
      reply: fallbackReply,
    });
  } catch (err) {
    console.error("Chat controller error:", err);
    res.status(500).json({
      success: false,
      message: "Server error handling chat question.",
    });
  }
};
