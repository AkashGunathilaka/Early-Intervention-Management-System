import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type DatasetContextValue = {
  datasetId: number | null
  setDatasetId: (id: number | null) => void
}

const DatasetContext = createContext<DatasetContextValue | undefined>(undefined)

const STORAGE_KEY = 'eims.datasetId'

function readStoredDatasetId(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export function DatasetProvider({ children }: { children: React.ReactNode }) {
  const [datasetId, setDatasetIdState] = useState<number | null>(() => readStoredDatasetId())

  const setDatasetId = (id: number | null) => {
    setDatasetIdState(id)
    try {
      if (id == null) localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, String(id))
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  }

  // If localStorage changes in another tab, keep in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      setDatasetIdState(readStoredDatasetId())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const value = useMemo(() => ({ datasetId, setDatasetId }), [datasetId])

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>
}

export function useDataset() {
  const ctx = useContext(DatasetContext)
  if (!ctx) throw new Error('useDataset must be used within DatasetProvider')
  return ctx
}

