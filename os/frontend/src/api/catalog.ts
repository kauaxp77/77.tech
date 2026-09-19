import { api } from './http'
import type { PriceItem, PriceMultiplier } from './types'

export type PriceItemInput = {
  kind: PriceItem['kind']
  name: string
  priceCents: number
  weeks: number
}

export async function listItems(includeArchived = false): Promise<PriceItem[]> {
  return api.get<PriceItem[]>(`/admin/catalog/items?incluirArquivados=${String(includeArchived)}`)
}

export async function listMultipliers(): Promise<PriceMultiplier[]> {
  return api.get<PriceMultiplier[]>('/admin/catalog/multipliers')
}

export async function createItem(input: PriceItemInput): Promise<PriceItem> {
  return api.post<PriceItem>('/admin/catalog/items', input)
}

export async function updateItem(id: string, input: PriceItemInput): Promise<PriceItem> {
  return api.put<PriceItem>(`/admin/catalog/items/${id}`, input)
}

export async function archiveItem(id: string): Promise<void> {
  await api.post(`/admin/catalog/items/${id}/archive`)
}

export async function restoreItem(id: string): Promise<void> {
  await api.post(`/admin/catalog/items/${id}/restore`)
}

export async function updateMultiplier(
  id: string,
  input: { name: string; factor: string },
): Promise<PriceMultiplier> {
  return api.put<PriceMultiplier>(`/admin/catalog/multipliers/${id}`, input)
}

/** Arrastar na tela manda a lista inteira na ordem nova. */
export async function reorderItems(idsInOrder: string[]): Promise<void> {
  await api.put('/admin/catalog/items/order', idsInOrder)
}
