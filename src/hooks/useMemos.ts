'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Memo, MemoFormData } from '@/types/memo'
import {
  getMemosAction,
  createMemoAction,
  updateMemoAction,
  deleteMemoAction,
} from '@/app/actions/memos'

export const useMemos = () => {
  const [memos, setMemos] = useState<Memo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    setLoading(true)
    setError(null)
    getMemosAction()
      .then(loadedMemos => setMemos(loadedMemos))
      .catch(err => {
        console.error('Failed to load memos:', err)
        setError('메모를 불러오는 중 오류가 발생했습니다.')
      })
      .finally(() => setLoading(false))
  }, [])

  const createMemo = useCallback(async (formData: MemoFormData): Promise<Memo> => {
    const newMemo = await createMemoAction(formData)
    setMemos(prev => [newMemo, ...prev])
    return newMemo
  }, [])

  const updateMemo = useCallback(async (id: string, formData: MemoFormData): Promise<void> => {
    const updatedMemo = await updateMemoAction(id, formData)
    setMemos(prev => prev.map(memo => (memo.id === id ? updatedMemo : memo)))
  }, [])

  const deleteMemo = useCallback(async (id: string): Promise<void> => {
    await deleteMemoAction(id)
    setMemos(prev => prev.filter(memo => memo.id !== id))
  }, [])

  const searchMemos = useCallback((query: string): void => {
    setSearchQuery(query)
  }, [])

  const filterByCategory = useCallback((category: string): void => {
    setSelectedCategory(category)
  }, [])

  const getMemoById = useCallback(
    (id: string): Memo | undefined => {
      return memos.find(memo => memo.id === id)
    },
    [memos]
  )

  const filteredMemos = useMemo(() => {
    let filtered = memos

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(memo => memo.category === selectedCategory)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        memo =>
          memo.title.toLowerCase().includes(query) ||
          memo.content.toLowerCase().includes(query) ||
          memo.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [memos, selectedCategory, searchQuery])

  const clearAllMemos = useCallback(async (): Promise<void> => {
    await Promise.all(memos.map(memo => deleteMemoAction(memo.id)))
    setMemos([])
    setSearchQuery('')
    setSelectedCategory('all')
  }, [memos])

  const stats = useMemo(() => {
    const totalMemos = memos.length
    const categoryCounts = memos.reduce(
      (acc, memo) => {
        acc[memo.category] = (acc[memo.category] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return {
      total: totalMemos,
      byCategory: categoryCounts,
      filtered: filteredMemos.length,
    }
  }, [memos, filteredMemos])

  return {
    memos: filteredMemos,
    allMemos: memos,
    loading,
    error,
    searchQuery,
    selectedCategory,
    stats,

    createMemo,
    updateMemo,
    deleteMemo,
    getMemoById,

    searchMemos,
    filterByCategory,

    clearAllMemos,
  }
}
