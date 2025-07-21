import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { content, direction, apiKeys } = await request.json()

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    if (!apiKeys || (!apiKeys.openai && !apiKeys.googleTranslate)) {
      return NextResponse.json(
        {
          error: "API Key is required. Please set your OpenAI or Google Translate API Key in settings.",
        },
        { status: 401 },
      )
    }

    // HTMLからテキスト部分を抽出して翻訳
    const translatedContent = await translateHtmlContent(content, direction, apiKeys)

    return NextResponse.json({
      translatedContent,
    })
  } catch (error) {
    console.error("Translation error:", error)

    // エラーの詳細を返す
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: error.message,
          type: "translation_error",
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        error: "Translation failed due to an unexpected error",
        type: "unknown_error",
      },
      { status: 500 },
    )
  }
}

async function translateHtmlContent(
  htmlContent: string,
  direction: "ja-to-en" | "en-to-ja",
  apiKeys: { openai?: string; googleTranslate?: string },
): Promise<string> {
  // クライアントから提供されたAPI Keyのみを使用（サーバサイドには保存しない）
  const openaiKey = apiKeys.openai

  if (!openaiKey) {
    console.log("OpenAI API key not provided, using fallback translation")
    return await fallbackTranslation(htmlContent, direction, apiKeys)
  }

  // HTMLの構造を保持しながらテキスト部分のみを翻訳
  const sourceLanguage = direction === "ja-to-en" ? "Japanese" : "English"
  const targetLanguage = direction === "ja-to-en" ? "English" : "Japanese"

  const prompt = `Please translate the following HTML content from ${sourceLanguage} to ${targetLanguage}. 
  Keep all HTML tags, attributes, and structure exactly the same. Only translate the text content between tags.
  Preserve all formatting, links, and special characters.
  Do not add any prefixes like [EN] or [JP] to the translated text.

  HTML Content:
  ${htmlContent}`

  try {
    // OpenAI APIを使用した翻訳
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a professional translator. Translate HTML content while preserving all HTML structure and formatting. Never add language prefixes like [EN] or [JP] to the translated text.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`OpenAI API error: ${response.status} - ${errorText}`)

      // 具体的なエラー情報を含む例外を投げる
      let errorMessage = `OpenAI API error (${response.status})`

      try {
        const errorData = JSON.parse(errorText)
        if (errorData.error?.message) {
          errorMessage += `: ${errorData.error.message}`
        }
      } catch {
        // JSON解析に失敗した場合はそのまま
      }

      throw new Error(errorMessage)
    }

    const data = await response.json()
    const translatedContent = data.choices[0]?.message?.content

    if (!translatedContent) {
      throw new Error("No translation content received from OpenAI")
    }

    return translatedContent
  } catch (error) {
    console.error("OpenAI translation error:", error)

    // OpenAI APIのエラーを再投げして、上位でハンドリングする
    if (error instanceof Error && error.message.includes("OpenAI API error")) {
      throw error
    }

    // その他のエラーの場合はフォールバックを試行
    return await fallbackTranslation(htmlContent, direction, apiKeys)
  }
}

async function fallbackTranslation(
  htmlContent: string,
  direction: "ja-to-en" | "en-to-ja",
  apiKeys: { openai?: string; googleTranslate?: string },
): Promise<string> {
  // クライアントから提供されたAPI Keyのみを使用
  const googleKey = apiKeys.googleTranslate

  if (!googleKey) {
    console.log("Google Translate API key not provided, using mock translation")
    return mockTranslation(htmlContent, direction)
  }

  try {
    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${googleKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: htmlContent,
        source: direction === "ja-to-en" ? "ja" : "en",
        target: direction === "ja-to-en" ? "en" : "ja",
        format: "html",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Google Translate API error: ${response.status} - ${errorText}`)

      let errorMessage = `Google Translate API error (${response.status})`

      try {
        const errorData = JSON.parse(errorText)
        if (errorData.error?.message) {
          errorMessage += `: ${errorData.error.message}`
        }
      } catch {
        // JSON解析に失敗した場合はそのまま
      }

      throw new Error(errorMessage)
    }

    const data = await response.json()
    return data.data.translations[0].translatedText
  } catch (error) {
    console.error("Google Translate fallback error:", error)

    // Google Translate APIのエラーを再投げ
    if (error instanceof Error && error.message.includes("Google Translate API error")) {
      throw error
    }

    // 最終フォールバック: モック翻訳
    return mockTranslation(htmlContent, direction)
  }
}

// Mock translation for demo purposes when no API keys are available
function mockTranslation(htmlContent: string, direction: "ja-to-en" | "en-to-ja"): string {
  // Return original content as-is when no API keys are available
  // Remove any existing prefixes that might have been added previously
  const cleanedContent = htmlContent.replace(/\[EN\]\s*/g, "").replace(/\[JP\]\s*/g, "")
  return cleanedContent
}
