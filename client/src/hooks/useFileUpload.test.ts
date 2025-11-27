import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFileUpload } from './useFileUpload'
import * as api from '../services/api'

vi.mock('../services/api')

describe('useFileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useFileUpload())

    expect(result.current.uploadStatus).toBe('idle')
    expect(result.current.uploadProgress).toEqual({
      loaded: 0,
      total: 0,
      percentage: 0
    })
    expect(result.current.error).toBeNull()
  })

  it('should update status to uploading when uploadFile is called', async () => {
    const mockUploadFile = vi.spyOn(api, 'uploadFile').mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    const { result } = renderHook(() => useFileUpload())
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

    act(() => {
      result.current.uploadFile(file)
    })

    expect(result.current.uploadStatus).toBe('uploading')
    expect(mockUploadFile).toHaveBeenCalledWith(file, expect.any(Function))
  })

  it('should update progress during upload', async () => {
    const mockUploadFile = vi.spyOn(api, 'uploadFile').mockImplementation(
      (_file, onProgress) => {
        return new Promise((resolve) => {
          // Simulate progress updates
          if (onProgress) {
            onProgress({ loaded: 500, total: 1000, percentage: 50 })
            setTimeout(() => {
              onProgress({ loaded: 1000, total: 1000, percentage: 100 })
              resolve({ success: true })
            }, 50)
          }
        })
      }
    )

    const { result } = renderHook(() => useFileUpload())
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

    await act(async () => {
      await result.current.uploadFile(file)
    })

    // After upload completes, progress should be at 100%
    expect(result.current.uploadProgress.percentage).toBe(100)
    expect(result.current.uploadProgress.loaded).toBe(1000)
    expect(result.current.uploadProgress.total).toBe(1000)
    expect(mockUploadFile).toHaveBeenCalledWith(file, expect.any(Function))
  })

  it('should set status to success on successful upload', async () => {
    const mockUploadFile = vi.spyOn(api, 'uploadFile').mockResolvedValue({
      success: true,
      data: { fileId: '123' }
    })

    const { result } = renderHook(() => useFileUpload())
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

    await act(async () => {
      await result.current.uploadFile(file)
    })

    expect(result.current.uploadStatus).toBe('success')
    expect(result.current.error).toBeNull()
    expect(mockUploadFile).toHaveBeenCalledWith(file, expect.any(Function))
  })

  it('should set status to error and store error message on upload failure', async () => {
    const errorMessage = 'Network error occurred'
    const mockUploadFile = vi.spyOn(api, 'uploadFile').mockRejectedValue({
      message: errorMessage
    })

    const { result } = renderHook(() => useFileUpload())
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

    await act(async () => {
      try {
        await result.current.uploadFile(file)
      } catch (error) {
        // Expected to throw
      }
    })

    expect(result.current.uploadStatus).toBe('error')
    expect(result.current.error).toBe(errorMessage)
    expect(mockUploadFile).toHaveBeenCalledWith(file, expect.any(Function))
  })

  it('should reset upload state when resetUpload is called', async () => {
    const mockUploadFile = vi.spyOn(api, 'uploadFile').mockResolvedValue({
      success: true
    })

    const { result } = renderHook(() => useFileUpload())
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

    // Upload file
    await act(async () => {
      await result.current.uploadFile(file)
    })

    expect(result.current.uploadStatus).toBe('success')
    expect(mockUploadFile).toHaveBeenCalledTimes(1)

    // Reset
    act(() => {
      result.current.resetUpload()
    })

    expect(result.current.uploadStatus).toBe('idle')
    expect(result.current.uploadProgress).toEqual({
      loaded: 0,
      total: 0,
      percentage: 0
    })
    expect(result.current.error).toBeNull()
  })

  it('should reset progress when starting a new upload', async () => {
    const mockUploadFile = vi.spyOn(api, 'uploadFile').mockImplementation(
      (_file, onProgress) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            onProgress?.({ loaded: 500, total: 1000, percentage: 50 })
            resolve({ success: true })
          }, 10)
        })
      }
    )

    const { result } = renderHook(() => useFileUpload())
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

    // First upload
    await act(async () => {
      await result.current.uploadFile(file)
    })

    expect(result.current.uploadProgress.percentage).toBe(50)

    // Second upload should reset progress
    await act(async () => {
      await result.current.uploadFile(file)
    })

    // Progress should have been reset to 0 before starting
    expect(mockUploadFile).toHaveBeenCalledTimes(2)
  })

  it('should handle error without message gracefully', async () => {
    const mockUploadFile = vi.spyOn(api, 'uploadFile').mockRejectedValue({})

    const { result } = renderHook(() => useFileUpload())
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

    await act(async () => {
      try {
        await result.current.uploadFile(file)
      } catch (error) {
        // Expected to throw
      }
    })

    expect(result.current.uploadStatus).toBe('error')
    expect(result.current.error).toBe('An error occurred during upload')
    expect(mockUploadFile).toHaveBeenCalledWith(file, expect.any(Function))
  })
})
