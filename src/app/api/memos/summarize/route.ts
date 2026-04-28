import { GoogleGenAI } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'

const MODEL_NAME = 'gemini-2.5-flash-lite'

const SYSTEM_INSTRUCTION = `당신은 메모 요약 전문가입니다.
사용자가 작성한 메모의 핵심 내용을 3줄 이내의 한국어로 간결하게 요약해 주세요.
마크다운 형식은 제거하고 평문으로 작성하며, 불필요한 접두어(예: "요약:", "핵심:") 없이 바로 요약 내용만 작성하세요.`

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.' },
      { status: 500 }
    )
  }

  let title: string
  let content: string

  try {
    const body = await request.json()
    title = body.title
    content = body.content
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json(
      { error: '제목과 내용은 필수 입력값입니다.' },
      { status: 400 }
    )
  }

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `제목: ${title}\n\n내용:\n${content}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.3,
        maxOutputTokens: 256,
      },
    })

    const summary = response.text
    if (!summary) {
      return NextResponse.json(
        { error: '요약 결과를 받아오지 못했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ summary })
  } catch (error) {
    console.error('[summarize] Gemini API 호출 실패:', error)
    return NextResponse.json(
      { error: 'AI 요약 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    )
  }
}
