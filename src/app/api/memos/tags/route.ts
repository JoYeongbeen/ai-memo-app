import { GoogleGenAI, Type } from '@google/genai'
import { NextRequest, NextResponse } from 'next/server'

const MODEL_NAME = 'gemini-2.5-flash-lite'

const SYSTEM_INSTRUCTION = `당신은 메모 태그 생성 전문가입니다.
주어진 메모의 제목과 내용을 분석하여 핵심 키워드를 한국어 태그로 추출해주세요.
규칙:
- 태그는 짧은 단어 또는 짧은 구문(2~5자 내외)
- 최소 3개, 최대 7개 추출
- 메모의 주제, 카테고리, 핵심 개념을 반영
- 중복 없이 고유한 태그만 포함
- 특수문자나 공백 없이 단어 형태로만 작성`

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
        temperature: 0.4,
        maxOutputTokens: 128,
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: Type.OBJECT,
          properties: {
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '메모에서 추출한 한국어 키워드 태그 목록',
            },
          },
          required: ['tags'],
        },
      },
    })

    const rawText = response.text
    if (!rawText) {
      return NextResponse.json(
        { error: '태그 생성 결과를 받아오지 못했습니다.' },
        { status: 500 }
      )
    }

    const parsed: { tags?: string[] } = JSON.parse(rawText)
    const tags = (parsed.tags ?? [])
      .map((t: string) => t.trim().replace(/^#/, ''))
      .filter((t: string) => t.length > 0)

    return NextResponse.json({ tags })
  } catch (error) {
    console.error('[tags] Gemini API 호출 실패:', error)
    return NextResponse.json(
      { error: 'AI 태그 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    )
  }
}
