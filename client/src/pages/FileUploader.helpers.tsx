import { Icon } from '@chakra-ui/react'
import { Upload, File, CheckCircle, XCircle } from 'lucide-react'
import type { UploadStatus } from '../hooks/useFileUpload'
import type { UploadProgress } from '../services/api'

/**
 * FileUploader Helper Functions
 * 
 * This file contains display logic and utility functions for the FileUploader component.
 * Separating these helpers keeps the main component clean and focused on UI structure.
 */

export interface DisplayState {
  uploadStatus: UploadStatus
  uploadProgress: UploadProgress
  file: File | null
  error: string | null
}

export interface VisibilityFlags {
  showSelectButton: boolean
  showRemoveButton: boolean
  showProgressBar: boolean
  showErrorAlert: boolean
}

/**
 * Formats bytes into human-readable file size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Returns the appropriate icon based on upload status
 */
export function getDisplayIcon(state: DisplayState): React.ReactElement {
  const { uploadStatus, file } = state

  if (uploadStatus === 'success') {
    return (
      <Icon boxSize={8} color="green.500">
        <CheckCircle />
      </Icon>
    )
  }

  if (uploadStatus === 'error') {
    return (
      <Icon boxSize={8} color="red.500">
        <XCircle />
      </Icon>
    )
  }

  if (file) {
    return (
      <Icon boxSize={8} color="blue.500">
        <File />
      </Icon>
    )
  }

  return (
    <Icon boxSize={8} color="gray.400">
      <Upload />
    </Icon>
  )
}

/**
 * Returns the main title text based on upload status
 */
export function getDisplayTitle(state: DisplayState): string {
  const { uploadStatus, file } = state

  if (uploadStatus === 'success') {
    return 'Upload Complete!'
  }

  if (uploadStatus === 'error') {
    return 'Upload Failed'
  }

  if (file) {
    return file.name
  }

  return 'Upload your PDF'
}

/**
 * Returns the subtitle text with upload progress or file info
 */
export function getDisplaySubtitle(state: DisplayState): string {
  const { uploadStatus, uploadProgress, file } = state

  if (uploadStatus === 'uploading') {
    return `Uploading... ${formatBytes(uploadProgress.loaded)} / ${formatBytes(uploadProgress.total)} (${uploadProgress.percentage}%)`
  }

  if (uploadStatus === 'success') {
    return `Successfully uploaded ${formatBytes(file?.size || 0)}`
  }

  if (file) {
    return `${(file.size / 1024 / 1024).toFixed(2)} MB`
  }

  return 'Drag and drop or click to select'
}

/**
 * Returns the button text based on upload status
 */
export function getDisplayButtonText(uploadStatus: UploadStatus): string {
  return uploadStatus === 'success' ? 'Upload Another' : 'Remove File'
}

/**
 * Returns visibility flags for conditional rendering
 */
export function getVisibilityFlags(state: DisplayState): VisibilityFlags {
  const { uploadStatus, file, error } = state

  return {
    showSelectButton: !file && uploadStatus === 'idle',
    showRemoveButton: !!file && uploadStatus !== 'uploading',
    showProgressBar: uploadStatus === 'uploading',
    showErrorAlert: uploadStatus === 'error' && !!error
  }
}
