
import { GoogleGenAI } from "@google/genai";

/**
 * 사용자 정보를 바탕으로 오늘의 운세를 생성합니다.
 * 브라우저 로컬 저장소의 키를 우선 확인하고, 없으면 환경 변수를 사용합니다.
 */
export async function getDailyFortune(birthDate: string, birthTime: string, targetDate: string) {
  // 로컬 저장소에서 키 확인 (브라우저 보안 저장 방식)
  const localApiKey = localStorage.getItem('user_gemini_api_key');
  const envApiKey = process.env.API_KEY;
  
  const apiKey = localApiKey || envApiKey;

  if (!apiKey) {
    return "API 키가 설정되지 않았습니다. 프로필 설정에서 키를 입력해주세요.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
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
      return "AI가 응답을 생성하지 못했습니다. 키가 유효한지 확인해주세요.";
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("API_KEY_INVALID")) {
      return "입력하신 API 키가 유효하지 않습니다. 다시 확인해주세요.";
    }
    return `운세를 가져오는 중 오류가 발생했습니다: ${error.message || "연결 상태 확인 필요"}`;
  }
}
