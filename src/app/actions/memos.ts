'use server'

import { v4 as uuidv4 } from 'uuid'
import { supabase, rowToMemo, MemoRow } from '@/lib/supabase'
import { Memo, MemoFormData } from '@/types/memo'

export async function getMemosAction(): Promise<Memo[]> {
  const { data, error } = await supabase
    .from('memos')
    .select('*')
    .order('createdAt', { ascending: false })

  if (error) {
    throw new Error(`메모 목록 조회 실패: ${error.message}`)
  }

  return (data as MemoRow[]).map(rowToMemo)
}

export async function createMemoAction(formData: MemoFormData): Promise<Memo> {
  const now = new Date().toISOString()
  const newRow: MemoRow = {
    id: uuidv4(),
    title: formData.title,
    content: formData.content,
    category: formData.category,
    tags: formData.tags,
    createdAt: now,
    updatedAt: now,
  }

  const { data, error } = await supabase.from('memos').insert(newRow).select().single()

  if (error) {
    throw new Error(`메모 생성 실패: ${error.message}`)
  }

  return rowToMemo(data as MemoRow)
}

export async function updateMemoAction(id: string, formData: MemoFormData): Promise<Memo> {
  const updatedFields = {
    title: formData.title,
    content: formData.content,
    category: formData.category,
    tags: formData.tags,
    updatedAt: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('memos')
    .update(updatedFields)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`메모 수정 실패: ${error.message}`)
  }

  return rowToMemo(data as MemoRow)
}

export async function deleteMemoAction(id: string): Promise<void> {
  const { error } = await supabase.from('memos').delete().eq('id', id)

  if (error) {
    throw new Error(`메모 삭제 실패: ${error.message}`)
  }
}
