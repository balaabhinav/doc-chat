/**
 * API Service Layer
 * 
 * IMPORTANT ARCHITECTURAL DECISION:
 * 
 * This file uses XMLHttpRequest for file uploads ONLY because it's the only native
 * browser API that supports upload progress tracking. This is essential for providing
 * real-time upload progress feedback to users (progress bar showing KB/MB uploaded).
 * 
 * For ALL OTHER API calls (GET, POST, PUT, DELETE, etc.), we will use the modern
 * fetch API with async/await for cleaner, promise-based code.
 * 
 * Example for future API calls:
 * ```typescript
 * export async function getData(): Promise<DataResponse> {
 *   const response = await fetch(`${API_BASE_URL}/api/data`)
 *   if (!response.ok) throw new Error('Failed to fetch data')
 *   return response.json()
 * }
 * 
 * export async function postData(data: DataPayload): Promise<DataResponse> {
 *   const response = await fetch(`${API_BASE_URL}/api/data`, {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(data)
 *   })
 *   if (!response.ok) throw new Error('Failed to post data')
 *   return response.json()
 * }
 * ```
 * 
 * Why not use fetch for uploads?
 * - fetch() does not support tracking upload progress (only download progress)
 * - XMLHttpRequest.upload.onprogress is the only way to get real-time upload bytes
 * - This is a known limitation: https://github.com/whatwg/fetch/issues/607
 */

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface UploadResponse {
  success: boolean
  message?: string
  data?: any
}

export interface UploadError {
  message: string
  status?: number
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * Uploads a file to the server with progress tracking
 * @param file - The file to upload
 * @param onProgress - Optional callback to track upload progress
 * @returns Promise that resolves with the upload response
 */
export function uploadFile(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('file', file)

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress: UploadProgress = {
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100)
        }
        onProgress(progress)
      }
    })

    // Handle successful upload
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText)
          resolve({
            success: true,
            data: response
          })
        } catch (error) {
          resolve({
            success: true,
            message: 'Upload successful'
          })
        }
      } else {
        const error: UploadError = {
          message: `Upload failed with status ${xhr.status}`,
          status: xhr.status
        }
        reject(error)
      }
    })

    // Handle network errors
    xhr.addEventListener('error', () => {
      const error: UploadError = {
        message: 'Network error occurred during upload'
      }
      reject(error)
    })

    // Handle timeout
    xhr.addEventListener('timeout', () => {
      const error: UploadError = {
        message: 'Upload request timed out'
      }
      reject(error)
    })

    // Handle abort
    xhr.addEventListener('abort', () => {
      const error: UploadError = {
        message: 'Upload was cancelled'
      }
      reject(error)
    })

    // Configure and send request
    xhr.open('POST', `${API_BASE_URL}/api/upload`)
    xhr.timeout = 300000 // 5 minutes timeout
    xhr.send(formData)
  })
}
