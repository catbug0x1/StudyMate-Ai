import { GoogleGenAI, Type, Chat, GenerateContentResponse } from "@google/genai";
import { StudentProfile, Preferences, StudyOutput } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const studyOutputSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "The main title of the summary, formatted as a Markdown H1 (e.g., '# Title')."},
                tl_dr: { type: Type.STRING, description: "A one-sentence summary, formatted using Markdown." },
                short: { type: Type.STRING, description: "A short summary of around 150 words. Use rich Markdown, LaTeX, and code blocks." },
                medium: { type: Type.STRING, description: "A medium summary of around 400 words. Use rich Markdown, LaTeX, and code blocks." },
                long: { type: Type.STRING, description: "A long, detailed summary over 1000 words. Use rich Markdown, LaTeX, and code blocks." },
                glossary: {
                    type: Type.ARRAY,
                    description: "A list of key terms and their definitions found in the summary.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            term: { type: Type.STRING, description: "The key term or phrase." },
                            definition: { type: Type.STRING, description: "A concise definition of the term." }
                        },
                        required: ["term", "definition"]
                    }
                }
            },
            required: ["title", "tl_dr", "short", "medium", "long", "glossary"]
        },
        flashcards: {
            type: Type.ARRAY,
            description: "A list of flashcards.",
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING, description: "Unique identifier, e.g., 'f1'." },
                    q: { type: Type.STRING, description: "The question on the flashcard." },
                    a: { type: Type.STRING, description: "The answer to the flashcard question." },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Relevant tags or topics for the flashcard." },
                    confidence: { type: Type.NUMBER, description: "Confidence score from 0.0 to 1.0." },
                },
                required: ["id", "q", "a", "tags", "confidence"]
            }
        },
        quiz: {
            type: Type.ARRAY,
            description: "A list of quiz questions.",
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING, description: "Unique identifier, e.g., 'q1'." },
                    q: { type: Type.STRING, description: "The quiz question." },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    answer_index: { type: Type.INTEGER, description: "The 0-based index of the correct option." },
                    difficulty: { type: Type.STRING, description: "Difficulty level: 'easy', 'medium', or 'hard'." },
                    explanation: { type: Type.STRING, description: "An explanation for the correct answer." },
                    confidence: { type: Type.NUMBER, description: "Confidence score from 0.0 to 1.0." },
                },
                required: ["id", "q", "options", "answer_index", "difficulty", "explanation", "confidence"]
            }
        },
        study_plan: {
            type: Type.OBJECT,
            properties: {
                total_weeks: { type: Type.INTEGER },
                schedule: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            day: { type: Type.INTEGER },
                            task: { type: Type.STRING },
                            time_mins: { type: Type.INTEGER },
                        },
                        required: ["day", "task", "time_mins"]
                    }
                }
            },
             required: ["total_weeks", "schedule"]
        }
    },
    required: ["summary", "flashcards", "quiz", "study_plan"]
};


export const generateStudyMaterials = async (
    academicContent: string,
    studentProfile: StudentProfile,
    preferences: Preferences,
    language: string = 'en',
    onStatusUpdate?: (message: string) => void
): Promise<StudyOutput> => {
    
    const enabledFeatures = [];
    if (preferences.flashcards.enabled) enabledFeatures.push(`${preferences.flashcards.count} Flashcards (Density: ${preferences.flashcards.density.replace('_', ' ')})`);
    if (preferences.quiz.enabled) enabledFeatures.push(`A ${preferences.quiz.count}-question Quiz (Depth: ${preferences.quiz.depth.replace('_', ' ')})`);
    if (preferences.study_plan.enabled) enabledFeatures.push(`A ${preferences.study_plan.weeks}-week study plan`);

    const prompt = `
    You are StudyMate AI, an expert academic writer and educator. Your primary goal is to produce clear, accurate, engaging, and professional-grade educational content. Your writing style is academic but accessible. Your entire output MUST be valid JSON that strictly follows the provided schema.

    Based on the following academic text, generate a comprehensive study guide.

    --- ACADEMIC CONTENT START ---
    ${academicContent}
    --- ACADEMIC CONTENT END ---

    The user's profile is:
    - Level: ${studentProfile.level}
    - Learning Style: ${studentProfile.learning_style}
    - Goals: ${studentProfile.goals.join(', ')}

    The user has requested the following outputs:
    - A summary (title, tl_dr, short, medium, and long versions) with an accompanying glossary.
    ${enabledFeatures.map(f => `- ${f}`).join('\n')}

    --- CRITICAL: OUTPUT FORMATTING RULES ---
    The quality and validity of your Markdown and JSON output are paramount. Adhere to these rules without exception.

    1.  **ABSOLUTE PROHIBITION OF CUSTOM SYNTAX:** This is the most important rule. Your output MUST NOT contain any non-standard characters, tags, or syntax. Specifically, characters like '@' or custom tags like '>>>' are strictly forbidden. You are to generate clean, universally-accepted Markdown. The presence of any artifact or non-standard syntax is a failure.
    2.  **NO EXTERNAL LINKS:** Do not add any URLs or links to the text, unless they were explicitly part of the original source content provided by the user.
    3.  **Summary Structure:**
        - The entire summary content begins with a single H1 title (e.g., \`# Main Title\`). This is for the \`summary.title\` field.
        - Use H3 titles for sections (e.g., \`### Section Title\`).
        - Use hyphens (\`-\`) for unordered lists.
    4.  **Text Styling and Glossary:**
        - **Bold text (\`**...**\`) is reserved exclusively for terms defined in the \`glossary\` array.** Do not bold any other text for emphasis.
        - Use italics (\`*...*\`) for general emphasis. Use bold-and-italic (\`***...***\`) for strong emphasis.
        - Use inline code backticks ( \`...\` ) to highlight other important, non-glossary terms or concepts.
    5.  **Mathematical Notation:** Use LaTeX for all math. Use \`$$...$$\` for block equations and \`$...$\` for inline math.
    6.  **Code Blocks:** Use standard fenced code blocks with language identifiers (e.g., \`\`\`python ... \`\`\`).
    7.  **Callout Blocks:** Use standard Markdown blockquotes, starting the first line with a keyword followed by a colon. Valid keywords are: \`Key Concept\`, \`Pro-Tip\`, \`Example\`, \`Warning\`.
        - Example: \`> Key Concept: This is the core idea.\`
        - Example: \`> Example: Here is a practical application.\`

    Please generate the entire output as a single, valid JSON object that strictly adheres to the provided schema. Do not include any text or markdown formatting outside of the JSON object itself.
    `;

    const MAX_RETRIES = 3;
    const INITIAL_DELAY_MS = 2000;
    let lastError: any = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: studyOutputSchema,
                },
            });
            
            const jsonText = response.text.trim();
            const parsedJson = JSON.parse(jsonText);
            
            const finalOutput: StudyOutput = {
              summary: parsedJson.summary || { title: '', tl_dr: '', short: '', medium: '', long: '', glossary: [] },
              flashcards: preferences.flashcards.enabled ? (parsedJson.flashcards || []) : [],
              quiz: preferences.quiz.enabled ? (parsedJson.quiz || []) : [],
              study_plan: preferences.study_plan.enabled ? (parsedJson.study_plan || { total_weeks: 0, schedule: [] }) : { total_weeks: 0, schedule: [] },
            };
    
            return finalOutput;

        } catch (error: any) {
            lastError = error;
            const status = error.cause?.status;

            if (status === 429 || status >= 500) {
                if (attempt === MAX_RETRIES) break; 

                const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
                const statusMessage = `Attempt ${attempt} failed. Service is busy. Retrying in ${delay / 1000}s...`;
                
                console.log(statusMessage);
                if (onStatusUpdate) onStatusUpdate(statusMessage);

                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                break;
            }
        }
    }
    
    const status = lastError.cause?.status;
    let userMessage = "Failed to generate study materials. An unknown error occurred.";

    if (status === 401 || status === 403) {
        userMessage = "Authentication failed. Please ensure the API key is configured correctly and has the necessary permissions.";
    } else if (status === 429) {
        userMessage = "The AI service is currently overloaded. Please try again in a few moments.";
    } else if (status >= 500) {
        userMessage = "The AI service is temporarily unavailable. Please try again later.";
    } else if (lastError.message.includes("INVALID_ARGUMENT")) {
        userMessage = "There was a problem with the input provided. It might be too long, malformed, or in an unsupported format.";
    } else if (lastError instanceof Error) {
        userMessage = lastError.message;
    }
    
    console.error("Final error after retries:", lastError);
    throw new Error(userMessage);
};

export const startFollowUpChat = (academicContent: string, studyOutput: StudyOutput): Chat => {
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: `You are StudyMate AI, an expert tutor. You have just generated a study guide for a student based on a text they provided. The study guide includes a summary, flashcards, and a quiz. Now, you will answer the student's follow-up questions about the material. Be helpful, clear, and stay on topic. Use Markdown for formatting when appropriate.`
        },
        history: [
            {
                role: 'user',
                parts: [{ text: `Here is the academic content I'm studying:\n\n${academicContent.substring(0, 10000)}` }]
            },
            {
                role: 'model',
                parts: [{ text: `Great! I have analyzed the text and created a study guide for you with the title "${studyOutput.summary.title}". I'm ready to help you with any questions you have about it.` }]
            }
        ]
    });
    return chat;
};

export const sendChatMessageStream = async (chat: Chat, message: string): Promise<AsyncGenerator<GenerateContentResponse>> => {
    return chat.sendMessageStream({ message });
};