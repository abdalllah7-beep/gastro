import { PrismaClient } from '@prisma/client';

// Inline questions data
const questions = [
  {
    id: 1,
    chapter: "GI Haemorrhage",
    topic: "Glasgow-Blatchford Score",
    question: "A 52-year-old man presented to the emergency department reporting black, tarry stools. He had a history of gastric bypass surgery seven years ago for obesity but no other comorbidities. He had been using ibuprofen for back pain. Pulse was 110 beats per minute and blood pressure 100/58 mmHg. Which of these contributes to the Glasgow-Blatchford score (GBS)?",
    optionA: "Platelet count",
    optionB: "Presentation with melaena",
    optionC: "Previous gastric bypass surgery",
    optionD: "Prothrombin time",
    optionE: "Use of non-steroidal anti-inflammatory drugs (NSAIDs)",
    answer: "B",
    answerText: "Presentation with melaena",
    explanation: "The GBS is a pre-endoscopy scoring system used to stratify the need for endoscopic intervention. The score comprises urea, blood pressure, haemoglobin, pulse, syncope, melaena, history of liver disease, and cardiac failure.",
    keyPoints: ["GBS predicts need for intervention in upper GI bleeding", "Score includes: urea, BP, Hb, pulse, syncope, melaena, liver disease, cardiac failure"]
  }
  // ... other questions will be loaded from questions.json
];

const prisma = new PrismaClient();

async function main() {
  console.log('Initializing database...');
  
  // Create access control if not exists
  const existing = await prisma.accessControl.findFirst();
  if (!existing) {
    await prisma.accessControl.create({
      data: {
        isEnabled: true,
        password: process.env.USER_PASSWORD || 'good939ramadan'
      }
    });
    console.log('Created access control');
  }

  // Check questions count
  const count = await prisma.question.count();
  if (count === 0) {
    console.log('Questions will be loaded on first API call');
  } else {
    console.log(`Database has ${count} questions`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
