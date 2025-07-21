"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Download, Eye, Edit, Link, Settings, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { convertMarkdownToHtml } from "@/lib/markdown-converter"

export default function MarkdownToHtmlConverter() {
  const [markdownContent, setMarkdownContent] = useState("")
  const [htmlContent, setHtmlContent] = useState("")
  const [fileName, setFileName] = useState("")
  const [urlInput, setUrlInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("upload")
  const { toast } = useToast()
  const [translatedContent, setTranslatedContent] = useState("")
  const [translationDirection, setTranslationDirection] = useState<"ja-to-en" | "en-to-ja">("ja-to-en")
  const [apiKeys, setApiKeys] = useState({ openai: "", googleTranslate: "" })
  const [showSettings, setShowSettings] = useState(false)
  const [previewTranslated, setPreviewTranslated] = useState(false)
  const [errorModal, setErrorModal] = useState<{ show: boolean; title: string; message: string }>({
    show: false,
    title: "",
    message: "",
  })

  useEffect(() => {
    // ブラウザのlocalStorageからAPI Keyを読み込み（サーバサイドには保存しない）
    const savedKeys = localStorage.getItem("translation-api-keys")
    if (savedKeys) {
      try {
        setApiKeys(JSON.parse(savedKeys))
      } catch (error) {
        console.error("Failed to parse saved API keys:", error)
        localStorage.removeItem("translation-api-keys")
      }
    }
  }, [])

  const showErrorModal = (title: string, message: string) => {
    setErrorModal({
      show: true,
      title,
      message,
    })
  }

  const closeErrorModal = () => {
    setErrorModal({
      show: false,
      title: "",
      message: "",
    })
  }

  const saveApiKeys = (keys: { openai: string; googleTranslate: string }) => {
    // ブラウザのlocalStorageにのみ保存（サーバサイドには送信しない）
    setApiKeys(keys)
    localStorage.setItem("translation-api-keys", JSON.stringify(keys))
    setShowSettings(false)
    toast({
      title: "設定保存完了",
      description: "API Keyがブラウザに保存されました。",
    })
  }

  const handleFileUpload = useCallback(
    async (file: File) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const content = e.target?.result as string
        setMarkdownContent(content)
        setFileName(file.name.replace(".md", ""))

        // 直接HTML生成を実行
        setIsLoading(true)
        try {
          const html = await convertMarkdownToHtml(content)
          setHtmlContent(html)
          setActiveTab("html-preview")
          toast({
            title: "変換完了",
            description: `${file.name} をHTMLに変換しました。`,
          })
        } catch (error) {
          toast({
            title: "エラー",
            description: "HTML生成中にエラーが発生しました。",
            variant: "destructive",
          })
        } finally {
          setIsLoading(false)
        }
      }
      reader.readAsText(file)
    },
    [toast],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const files = Array.from(e.dataTransfer.files)
      const markdownFile = files.find((file) => file.name.endsWith(".md") || file.name.endsWith(".markdown"))

      if (markdownFile) {
        handleFileUpload(markdownFile)
      } else {
        toast({
          title: "エラー",
          description: "Markdownファイル（.md または .markdown）をアップロードしてください。",
          variant: "destructive",
        })
      }
    },
    [handleFileUpload, toast],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleUrlFetch = async () => {
    if (!urlInput.trim()) {
      toast({
        title: "エラー",
        description: "URLを入力してください。",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/fetch-markdown?url=${encodeURIComponent(urlInput)}`)
      if (!response.ok) {
        throw new Error("Failed to fetch")
      }

      const data = await response.json()
      setMarkdownContent(data.content)
      setFileName(data.filename || "fetched-markdown")

      // 直接HTML生成を実行
      const html = await convertMarkdownToHtml(data.content)
      setHtmlContent(html)
      setActiveTab("html-preview")
      toast({
        title: "変換完了",
        description: "Markdownファイルを取得してHTMLに変換しました。",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: "URLからファイルを取得できませんでした。",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const downloadHtml = () => {
    if (!htmlContent) {
      toast({
        title: "エラー",
        description: "ダウンロードするHTMLコンテンツがありません。",
        variant: "destructive",
      })
      return
    }

    const blob = new Blob([htmlContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${fileName || "converted"}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "ダウンロード完了",
      description: "HTMLファイルをダウンロードしました。",
    })
  }

  const handleTranslationError = async (error: any, response?: Response) => {
    let errorTitle = "翻訳エラー"
    let errorMessage = "翻訳中に予期しないエラーが発生しました。"

    if (response) {
      // レスポンスからエラー詳細を取得
      let errorDetails = ""
      try {
        const errorData = await response.json()
        errorDetails = errorData.error || errorData.message || ""
      } catch {
        // JSON解析に失敗した場合は無視
      }

      switch (response.status) {
        case 400:
          errorTitle = "リクエストエラー (400)"
          errorMessage = "翻訳リクエストが無効です。コンテンツを確認してください。"
          if (errorDetails) errorMessage += `\n\n詳細: ${errorDetails}`
          break
        case 401:
          errorTitle = "認証エラー (401)"
          errorMessage = "API Keyが無効または期限切れです。設定画面でAPI Keyを確認してください。"
          if (errorDetails) errorMessage += `\n\n詳細: ${errorDetails}`
          break
        case 403:
          errorTitle = "アクセス拒否 (403)"
          errorMessage = "API Keyにアクセス権限がありません。API Keyの権限を確認してください。"
          if (errorDetails) errorMessage += `\n\n詳細: ${errorDetails}`
          break
        case 429:
          errorTitle = "レート制限エラー (429)"
          errorMessage =
            "API使用量の上限に達しました。以下の対処法をお試しください：\n\n• しばらく時間をおいてから再試行\n• API使用量の確認\n• 料金プランのアップグレード検討"
          if (errorDetails) errorMessage += `\n\n詳細: ${errorDetails}`
          break
        case 500:
          errorTitle = "サーバーエラー (500)"
          errorMessage = "翻訳サービスでサーバーエラーが発生しました。しばらく時間をおいてから再試行してください。"
          if (errorDetails) errorMessage += `\n\n詳細: ${errorDetails}`
          break
        case 502:
          errorTitle = "ゲートウェイエラー (502)"
          errorMessage = "翻訳サービスとの通信でエラーが発生しました。しばらく時間をおいてから再試行してください。"
          if (errorDetails) errorMessage += `\n\n詳細: ${errorDetails}`
          break
        case 503:
          errorTitle = "サービス利用不可 (503)"
          errorMessage =
            "翻訳サービスが一時的に利用できません。メンテナンス中の可能性があります。しばらく時間をおいてから再試行してください。"
          if (errorDetails) errorMessage += `\n\n詳細: ${errorDetails}`
          break
        case 504:
          errorTitle = "タイムアウトエラー (504)"
          errorMessage =
            "翻訳処理がタイムアウトしました。コンテンツが大きすぎる可能性があります。小さなセクションに分けて翻訳してください。"
          if (errorDetails) errorMessage += `\n\n詳細: ${errorDetails}`
          break
        default:
          errorTitle = `HTTPエラー (${response.status})`
          errorMessage = `翻訳APIからエラーが返されました。ステータスコード: ${response.status}`
          if (errorDetails) errorMessage += `\n\n詳細: ${errorDetails}`
      }
    } else if (error instanceof Error) {
      if (error.message.includes("fetch") || error.message.includes("network")) {
        errorTitle = "ネットワークエラー"
        errorMessage =
          "インターネット接続を確認してください。\n\n• Wi-Fi接続の確認\n• プロキシ設定の確認\n• ファイアウォール設定の確認"
      } else if (error.message.includes("timeout")) {
        errorTitle = "タイムアウトエラー"
        errorMessage =
          "翻訳処理がタイムアウトしました。コンテンツサイズを小さくするか、しばらく時間をおいてから再試行してください。"
      } else {
        errorMessage = `エラー詳細: ${error.message}`
      }
    }

    showErrorModal(errorTitle, errorMessage)
  }

  const performTranslation = async () => {
    if (!htmlContent.trim()) {
      showErrorModal("翻訳エラー", "翻訳するHTMLコンテンツがありません。")
      return null
    }

    if (!apiKeys.openai && !apiKeys.googleTranslate) {
      showErrorModal(
        "API Key未設定",
        "翻訳を実行するにはAPI Keyが必要です。\n設定画面でOpenAIまたはGoogle TranslateのAPI Keyを設定してください。",
      )
      return null
    }

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: htmlContent,
          direction: translationDirection,
          apiKeys: apiKeys, // ブラウザからAPI Keyを送信（サーバサイドには保存されない）
        }),
      })

      if (!response.ok) {
        await handleTranslationError(new Error("Translation failed"), response)
        return null
      }

      const data = await response.json()
      return data.translatedContent
    } catch (error) {
      console.error("Translation request error:", error)
      await handleTranslationError(error)
      return null
    }
  }

  const translateContent = async () => {
    setIsLoading(true)
    try {
      const result = await performTranslation()
      if (result) {
        setTranslatedContent(result)
        toast({
          title: "翻訳完了",
          description: `HTMLコンテンツを${translationDirection === "ja-to-en" ? "英語" : "日本語"}に翻訳しました。`,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const applyTranslation = () => {
    if (translatedContent) {
      setHtmlContent(translatedContent)
      setActiveTab("html-preview")
      toast({
        title: "翻訳適用完了",
        description: "翻訳結果をHTMLコンテンツに適用しました。",
      })
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8 text-center">
        <div className="flex justify-between items-center mb-4">
          <div></div>
          <h1 className="text-4xl font-bold">Markdown to HTML Converter</h1>
          <Button variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="w-4 h-4 mr-2" />
            設定
          </Button>
        </div>
        <p className="text-muted-foreground">
          Markdownファイルを美しいHTMLに変換します。画像、表、脚注、埋め込みHTMLに対応。
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            アップロード
          </TabsTrigger>
          <TabsTrigger value="html-preview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            HTML Preview
          </TabsTrigger>
          <TabsTrigger value="html-edit" className="flex items-center gap-2">
            <Edit className="w-4 h-4" />
            HTML Edit
          </TabsTrigger>
          <TabsTrigger value="download" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            ダウンロード
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  ファイルアップロード
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">Markdownファイルをドラッグ&ドロップ</p>
                  <p className="text-sm text-muted-foreground mb-4">または、クリックしてファイルを選択</p>
                  <p className="text-xs text-muted-foreground">対応形式: .md, .markdown</p>
                </div>
                <input
                  id="file-input"
                  type="file"
                  accept=".md,.markdown"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file)
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="w-5 h-5" />
                  URL指定
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="url-input">Markdown URL</Label>
                  <Input
                    id="url-input"
                    type="url"
                    placeholder="https://example.com/file.md"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                  />
                </div>
                <Button onClick={handleUrlFetch} disabled={isLoading} className="w-full">
                  {isLoading ? "取得中..." : "URLから取得"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="html-preview" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">HTMLプレビュー</h2>
            <div className="flex items-center space-x-4">
              {/* Translation Toggle */}
              <div className="flex items-center space-x-2">
                <span className="text-sm">日本語</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={previewTranslated}
                    onChange={async (e) => {
                      if (e.target.checked && !translatedContent) {
                        // 翻訳がまだされていない場合は翻訳を実行
                        setIsLoading(true)
                        try {
                          const result = await performTranslation()
                          if (result) {
                            setTranslatedContent(result)
                            setPreviewTranslated(true)
                            toast({
                              title: "翻訳完了",
                              description: `HTMLコンテンツを${translationDirection === "ja-to-en" ? "英語" : "日本語"}に翻訳しました。`,
                            })
                          } else {
                            e.target.checked = false
                          }
                        } finally {
                          setIsLoading(false)
                        }
                      } else {
                        setPreviewTranslated(e.target.checked)
                      }
                    }}
                    className="sr-only"
                    disabled={!htmlContent || isLoading}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
                <span className="text-sm">English</span>
              </div>

              <Button onClick={() => setActiveTab("html-edit")} disabled={!htmlContent}>
                編集モードへ
              </Button>
            </div>
          </div>

          {isLoading && (
            <div className="text-center py-4">
              <span className="text-sm text-muted-foreground">翻訳中...</span>
            </div>
          )}

          <Card>
            <CardContent className="p-6">
              {htmlContent ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: previewTranslated && translatedContent ? translatedContent : htmlContent,
                  }}
                />
              ) : (
                <p className="text-muted-foreground text-center py-8">まずMarkdownからHTMLを生成してください</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="html-edit" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">HTML編集</h2>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => setActiveTab("html-preview")} disabled={!htmlContent}>
                プレビューに戻る
              </Button>
              <Button onClick={downloadHtml} disabled={!htmlContent}>
                ダウンロード
              </Button>
            </div>
          </div>
          <Card>
            <CardContent className="p-6">
              <Textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="生成されたHTMLがここに表示されます..."
                className="min-h-96 font-mono text-sm"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="download" className="space-y-4">
          <h2 className="text-2xl font-bold">ダウンロード</h2>
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              {htmlContent ? (
                <>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">HTMLファイルの準備完了</h3>
                    <p className="text-muted-foreground">ファイル名: {fileName || "converted"}.html</p>
                  </div>
                  <Button onClick={downloadHtml} size="lg" className="w-full max-w-md">
                    <Download className="w-5 h-5 mr-2" />
                    HTMLファイルをダウンロード
                  </Button>
                </>
              ) : (
                <div className="py-8">
                  <p className="text-muted-foreground mb-4">ダウンロードするHTMLファイルがありません</p>
                  <Button onClick={() => setActiveTab("upload")} variant="outline">
                    最初からやり直す
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>API Key設定</CardTitle>
              <p className="text-sm text-muted-foreground">
                API Keyはブラウザにのみ保存され、サーバーには送信されません。
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="openai-key">OpenAI API Key</Label>
                <Input
                  id="openai-key"
                  type="password"
                  placeholder="sk-..."
                  defaultValue={apiKeys.openai}
                  onChange={(e) => setApiKeys((prev) => ({ ...prev, openai: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="google-key">Google Translate API Key</Label>
                <Input
                  id="google-key"
                  type="password"
                  placeholder="AIza..."
                  defaultValue={apiKeys.googleTranslate}
                  onChange={(e) => setApiKeys((prev) => ({ ...prev, googleTranslate: e.target.value }))}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowSettings(false)}>
                  キャンセル
                </Button>
                <Button onClick={() => saveApiKeys(apiKeys)}>保存</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Modal */}
      {errorModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                {errorModal.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-700 whitespace-pre-line max-h-64 overflow-y-auto">
                {errorModal.message}
              </div>
              <div className="flex justify-end">
                <Button onClick={closeErrorModal}>閉じる</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
