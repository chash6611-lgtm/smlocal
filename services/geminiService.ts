
import { GoogleGenAI } from "@google/genai";

export async function getDailyFortune(birthDate: string, birthTime: string, targetDate: string) {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "") {
    throw new Error("API_KEY가 설정되지 않았습니다.");
  }

  try {
    // 매 호출 시마다 새로운 인스턴스를 생성하여 최신 API 키 반영 보장
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `당신은 유능한 명리학자이자 운세 상담가입니다. 
사용자의 생년월일(${birthDate})과 태어난 시간(${birthTime || '모름'}), 그리고 오늘의 날짜(${targetDate})를 바탕으로 한국어로 친절하고 희망적인 오늘의 운세를 작성해주세요. 
운세는 [총운], [금전운], [연애운], [건강운] 4가지 섹션으로 나누고, 각 섹션은 1-2문장으로 간략하게 작성하세요. 
마지막에는 오늘의 행운의 색과 행운의 숫자를 추천해주세요.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.8,
        topK: 64,
        topP: 0.95,
      }
    });

    if (response && response.text) {
      return response.text;
    } else {
      return "AI가 응답을 생성했지만 내용을 읽을 수 없습니다.";
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error; // App 컴포넌트에서 에러 처리를 할 수 있도록 그대로 던짐
  }
}
