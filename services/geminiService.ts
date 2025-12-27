
import { GoogleGenAI } from "@google/genai";

/**
 * 사용자 정보를 바탕으로 오늘의 운세를 생성합니다.
 * @google/genai SDK 가이드라인에 따라 process.env.API_KEY를 직접 사용합니다.
 */
export async function getDailyFortune(birthDate: string, birthTime: string, targetDate: string) {
  // API 키는 process.env.API_KEY에서 직접 가져옵니다.
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return "API 키가 구성되지 않았습니다.";
  }

  try {
    // named parameter를 사용하여 GoogleGenAI 인스턴스 생성
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    const prompt = `당신은 유능한 명리학자이자 운세 상담가입니다. 
사용자의 생년월일(${birthDate})과 태어난 시간(${birthTime || '모름'}), 그리고 오늘의 날짜(${targetDate})를 바탕으로 한국어로 친절하고 희망적인 오늘의 운세를 작성해주세요. 
운세는 [총운], [금전운], [연애운], [건강운] 4가지 섹션으로 나누고, 각 섹션은 1-2문장으로 간략하게 작성하세요. 
마지막에는 오늘의 행운의 색과 행운의 숫자를 추천해주세요.`;

    // 모델 정의와 호출을 동시에 수행 (ai.models.generateContent 사용)
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.8,
        topK: 64,
        topP: 0.95,
      }
    });

    // response.text는 메서드가 아닌 프로퍼티입니다.
    if (response && response.text) {
      return response.text;
    } else {
      return "AI 응답 결과를 읽을 수 없습니다. 다시 시도해주세요.";
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return `운세를 가져오는 중 오류가 발생했습니다: ${error.message || "연결 상태 확인 필요"}`;
  }
}