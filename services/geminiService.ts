
import { GoogleGenAI } from "@google/genai";

export async function getDailyFortune(birthDate: string, birthTime: string, targetDate: string) {
  // 브라우저 전역 process 객체에서 키를 먼저 찾고, 없으면 시스템 환경변수 참조
  const apiKey = (window as any).process?.env?.API_KEY || process.env.API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    return "API 키가 설정되지 않았습니다. 프로필 설정에서 API 키를 입력해주세요.";
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
      return "AI 응답 결과를 읽을 수 없습니다. 다시 시도해주세요.";
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // 키 관련 에러인 경우 사용자 친화적인 메시지 출력
    if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("invalid key") || error.message?.includes("403") || error.message?.includes("401")) {
      return "입력하신 API 키가 유효하지 않거나 권한이 없습니다. 키를 다시 확인해주세요.";
    }
    return `운세를 가져오는 중 오류가 발생했습니다: ${error.message || "연결 상태 확인 필요"}`;
  }
}
