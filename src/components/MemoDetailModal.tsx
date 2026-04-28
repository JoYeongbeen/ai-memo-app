'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import '@uiw/react-markdown-preview/markdown.css'
import { Memo, MEMO_CATEGORIES } from '@/types/memo'

const MarkdownPreview = dynamic(
  () => import('@uiw/react-markdown-preview'),
  { ssr: false }
)

interface MemoDetailModalProps {
  memo: Memo | null
  onClose: () => void
  onEdit: (memo: Memo) => void
  onDelete: (id: string) => void | Promise<void>
  onUpdateTags: (id: string, tags: string[]) => void | Promise<void>
}

export default function MemoDetailModal({
  memo,
  onClose,
  onEdit,
  onDelete,
  onUpdateTags,
}: MemoDetailModalProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const [isTagging, setIsTagging] = useState(false)
  const [taggingError, setTaggingError] = useState<string | null>(null)
  const [tagSaved, setTagSaved] = useState(false)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setSummary(null)
    setSummaryError(null)
    setIsSummarizing(false)
    setIsTagging(false)
    setTaggingError(null)
    setTagSaved(false)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [memo?.id])

  useEffect(() => {
    if (!memo) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [memo, onClose])

  const handleSummarize = useCallback(async () => {
    if (!memo) return
    setIsSummarizing(true)
    setSummaryError(null)
    setSummary(null)

    try {
      const res = await fetch('/api/memos/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: memo.title, content: memo.content }),
      })
      const data: { summary?: string; error?: string } = await res.json()
      if (!res.ok || !data.summary) {
        setSummaryError(data.error ?? '요약 중 오류가 발생했습니다.')
      } else {
        setSummary(data.summary)
      }
    } catch {
      setSummaryError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSummarizing(false)
    }
  }, [memo])

  const handleAutoTag = useCallback(async () => {
    if (!memo) return
    setIsTagging(true)
    setTaggingError(null)
    setTagSaved(false)

    try {
      const res = await fetch('/api/memos/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: memo.title, content: memo.content }),
      })
      const data: { tags?: string[]; error?: string } = await res.json()
      if (!res.ok || !data.tags) {
        setTaggingError(data.error ?? '태그 생성 중 오류가 발생했습니다.')
      } else {
        const merged = Array.from(new Set([...memo.tags, ...data.tags]))
        onUpdateTags(memo.id, merged)
        setTagSaved(true)
      }
    } catch {
      setTaggingError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsTagging(false)
    }
  }, [memo, onUpdateTags])

  if (!memo) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      personal: 'bg-blue-100 text-blue-800',
      work: 'bg-green-100 text-green-800',
      study: 'bg-purple-100 text-purple-800',
      idea: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800',
    }
    return colors[category] ?? colors.other
  }

  const handleDelete = () => {
    if (window.confirm('정말로 이 메모를 삭제하시겠습니까?')) {
      onDelete(memo.id)
      onClose()
    }
  }

  const handleEdit = () => {
    onClose()
    onEdit(memo)
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label={memo.title}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div className="flex-1 pr-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2 break-words">
              {memo.title}
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(memo.category)}`}
              >
                {MEMO_CATEGORIES[memo.category as keyof typeof MEMO_CATEGORIES] ??
                  memo.category}
              </span>
              <span className="text-xs text-gray-500">
                작성: {formatDate(memo.createdAt)}
              </span>
              {memo.createdAt !== memo.updatedAt && (
                <span className="text-xs text-gray-400">
                  수정: {formatDate(memo.updatedAt)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="닫기"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* AI 요약 패널 */}
          <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <span className="text-sm font-medium text-blue-800">AI 요약</span>
              </div>
              <button
                onClick={handleSummarize}
                disabled={isSummarizing}
                data-testid="summarize-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed rounded-md transition-colors"
                aria-label="AI 요약 생성"
              >
                {isSummarizing ? (
                  <>
                    <svg
                      className="w-3 h-3 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    요약 중...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h10M4 18h7"
                      />
                    </svg>
                    {summary ? '다시 요약' : '요약하기'}
                  </>
                )}
              </button>
            </div>

            {summaryError && (
              <p
                className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2"
                data-testid="summary-error"
              >
                {summaryError}
              </p>
            )}

            {summary && !summaryError && (
              <p
                className="text-sm text-gray-700 leading-relaxed whitespace-pre-line"
                data-testid="summary-result"
              >
                {summary}
              </p>
            )}

            {!summary && !summaryError && !isSummarizing && (
              <p className="text-xs text-blue-500">
                버튼을 눌러 Gemini AI로 메모를 요약해보세요.
              </p>
            )}
          </div>

          <div data-color-mode="light">
            <MarkdownPreview
              source={memo.content}
              style={{ background: 'transparent', fontSize: '0.875rem' }}
            />
          </div>

          {/* AI 태그 자동 생성 패널 */}
          <div className="mt-6 rounded-lg border border-purple-100 bg-purple-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                <span className="text-sm font-medium text-purple-800">AI 태그 자동 생성</span>
              </div>
              <button
                onClick={handleAutoTag}
                disabled={isTagging}
                data-testid="auto-tag-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed rounded-md transition-colors"
                aria-label="AI 태그 자동 생성"
              >
                {isTagging ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    생성 중...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    태그 생성
                  </>
                )}
              </button>
            </div>

            {taggingError && (
              <p
                className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2"
                data-testid="tag-error"
              >
                {taggingError}
              </p>
            )}

            {tagSaved && !taggingError && (
              <p className="text-xs text-purple-600" data-testid="tag-saved">
                태그가 메모에 저장되었습니다.
              </p>
            )}

            {!tagSaved && !taggingError && !isTagging && (
              <p className="text-xs text-purple-500">
                버튼을 눌러 Gemini AI로 태그를 자동 생성해보세요.
              </p>
            )}
          </div>

          {/* 태그 */}
          {memo.tags.length > 0 && (
            <div className="mt-4 flex gap-2 flex-wrap" data-testid="tag-list">
              {memo.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 하단 액션 버튼 */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            삭제
          </button>
          <button
            onClick={handleEdit}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            편집
          </button>
        </div>
      </div>
    </div>
  )
}
