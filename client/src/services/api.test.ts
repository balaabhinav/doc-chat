import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { uploadFile } from './api'

describe('uploadFile', () => {
  let xhrMock: any
  let xhrInstance: any

  beforeEach(() => {
    // Create a mock XHR instance
    xhrInstance = {
      open: vi.fn(),
      send: vi.fn(),
      setRequestHeader: vi.fn(),
      upload: {
        addEventListener: vi.fn()
      },
      addEventListener: vi.fn(),
      status: 200,
      responseText: JSON.stringify({ success: true, fileId: '123' }),
      timeout: 0
    }

    // Mock the XMLHttpRequest constructor as a class
    xhrMock = vi.fn().mockImplementation(function(this: any) {
      return xhrInstance
    })
    ;(globalThis as any).XMLHttpRequest = xhrMock
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should create FormData and send file via XMLHttpRequest', async () => {
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    
    // Trigger load event immediately
    xhrInstance.addEventListener.mockImplementation((event: string, handler: Function) => {
      if (event === 'load') {
        setTimeout(() => handler(), 0)
      }
    })

    const uploadPromise = uploadFile(file)
    await uploadPromise

    expect(xhrInstance.open).toHaveBeenCalledWith('POST', 'http://localhost:3000/api/upload')
    expect(xhrInstance.send).toHaveBeenCalled()
    expect(xhrInstance.timeout).toBe(300000)
  })

  it('should call progress callback with correct values', async () => {
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    const onProgress = vi.fn()

    let progressHandler: Function

    xhrInstance.upload.addEventListener.mockImplementation((event: string, handler: Function) => {
      if (event === 'progress') {
        progressHandler = handler
      }
    })

    xhrInstance.addEventListener.mockImplementation((event: string, handler: Function) => {
      if (event === 'load') {
        setTimeout(() => handler(), 0)
      }
    })

    const uploadPromise = uploadFile(file, onProgress)

    // Simulate progress event
    progressHandler!({ lengthComputable: true, loaded: 500, total: 1000 })

    await uploadPromise

    expect(onProgress).toHaveBeenCalledWith({
      loaded: 500,
      total: 1000,
      percentage: 50
    })
  })

  it('should resolve with success response on successful upload', async () => {
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

    xhrInstance.addEventListener.mockImplementation((event: string, handler: Function) => {
      if (event === 'load') {
        setTimeout(() => handler(), 0)
      }
    })

    const result = await uploadFile(file)

    expect(result).toEqual({
      success: true,
      data: { success: true, fileId: '123' }
    })
  })

  it('should reject with error on network error', async () => {
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

    xhrInstance.addEventListener.mockImplementation((event: string, handler: Function) => {
      if (event === 'error') {
        setTimeout(() => handler(), 0)
      }
    })

    await expect(uploadFile(file)).rejects.toEqual({
      message: 'Network error occurred during upload'
    })
  })

  it('should reject with error on timeout', async () => {
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

    xhrInstance.addEventListener.mockImplementation((event: string, handler: Function) => {
      if (event === 'timeout') {
        setTimeout(() => handler(), 0)
      }
    })

    await expect(uploadFile(file)).rejects.toEqual({
      message: 'Upload request timed out'
    })
  })

  it('should reject with error on abort', async () => {
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

    xhrInstance.addEventListener.mockImplementation((event: string, handler: Function) => {
      if (event === 'abort') {
        setTimeout(() => handler(), 0)
      }
    })

    await expect(uploadFile(file)).rejects.toEqual({
      message: 'Upload was cancelled'
    })
  })

  it('should reject with error on non-2xx status code', async () => {
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    xhrInstance.status = 500

    xhrInstance.addEventListener.mockImplementation((event: string, handler: Function) => {
      if (event === 'load') {
        setTimeout(() => handler(), 0)
      }
    })

    await expect(uploadFile(file)).rejects.toEqual({
      message: 'Upload failed with status 500',
      status: 500
    })
  })

  it('should handle non-JSON response gracefully', async () => {
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    xhrInstance.responseText = 'Not JSON'

    xhrInstance.addEventListener.mockImplementation((event: string, handler: Function) => {
      if (event === 'load') {
        setTimeout(() => handler(), 0)
      }
    })

    const result = await uploadFile(file)

    expect(result).toEqual({
      success: true,
      message: 'Upload successful'
    })
  })

  it('should not call progress callback if event is not lengthComputable', async () => {
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    const onProgress = vi.fn()

    let progressHandler: Function

    xhrInstance.upload.addEventListener.mockImplementation((event: string, handler: Function) => {
      if (event === 'progress') {
        progressHandler = handler
      }
    })

    xhrInstance.addEventListener.mockImplementation((event: string, handler: Function) => {
      if (event === 'load') {
        setTimeout(() => handler(), 0)
      }
    })

    const uploadPromise = uploadFile(file, onProgress)

    // Simulate progress event without lengthComputable
    progressHandler!({ lengthComputable: false, loaded: 500, total: 1000 })

    await uploadPromise

    expect(onProgress).not.toHaveBeenCalled()
  })
})
