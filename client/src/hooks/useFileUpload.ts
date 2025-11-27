import { useState, useCallback } from 'react'
import { uploadFile as apiUploadFile } from '../services/api'
import type { UploadProgress, UploadError } from '../services/api'

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

export interface UseFileUploadReturn {
  uploadStatus: UploadStatus
  uploadProgress: UploadProgress
  error: string | null
  uploadFile: (file: File) => Promise<void>
  resetUpload: () => void
}

/**
 * Custom hook for managing file upload state and operations
 * @returns Object containing upload state and control functions
 */
export function useFileUpload(): UseFileUploadReturn {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0
  })
  const [error, setError] = useState<string | null>(null)

  const uploadFile = useCallback(async (file: File) => {
    try {
      // Reset state
      setError(null)
      setUploadStatus('uploading')
      setUploadProgress({ loaded: 0, total: 0, percentage: 0 })

      // Upload file with progress tracking
      await apiUploadFile(file, (progress) => {
        setUploadProgress(progress)
      })

      // Success
      setUploadStatus('success')
    } catch (err) {
      // Error handling
      const uploadError = err as UploadError
      setError(uploadError.message || 'An error occurred during upload')
      setUploadStatus('error')
      throw err
    }
  }, [])

  const resetUpload = useCallback(() => {
    setUploadStatus('idle')
    setUploadProgress({ loaded: 0, total: 0, percentage: 0 })
    setError(null)
  }, [])

  return {
    uploadStatus,
    uploadProgress,
    error,
    uploadFile,
    resetUpload
  }
}
