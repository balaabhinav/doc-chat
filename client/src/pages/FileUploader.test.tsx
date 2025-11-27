import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, beforeEach } from 'vitest'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import FileUploader from './FileUploader'
import * as useFileUploadModule from '../hooks/useFileUpload'

const renderWithChakra = (component: React.ReactElement) => {
    return render(
        <ChakraProvider value={defaultSystem}>
            {component}
        </ChakraProvider>
    )
}

// Mock the useFileUpload hook
vi.mock('../hooks/useFileUpload')

describe('FileUploader', () => {
    const mockUploadFile = vi.fn()
    const mockResetUpload = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        // Default mock implementation
        vi.mocked(useFileUploadModule.useFileUpload).mockReturnValue({
            uploadStatus: 'idle',
            uploadProgress: { loaded: 0, total: 0, percentage: 0 },
            error: null,
            uploadFile: mockUploadFile,
            resetUpload: mockResetUpload
        })
    })
    it('renders upload prompt initially', () => {
        renderWithChakra(<FileUploader />)
        expect(screen.getByText('Upload your PDF')).toBeInTheDocument()
        expect(screen.getByText('Drag and drop or click to select')).toBeInTheDocument()
    })

    it('handles file selection via button and triggers upload', async () => {
        mockUploadFile.mockResolvedValue(undefined)
        
        const { container } = renderWithChakra(<FileUploader />)
        const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' })

        // eslint-disable-next-line testing-library/no-node-access
        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement

        Object.defineProperty(fileInput, 'files', {
            value: [file],
        })

        fireEvent.change(fileInput)

        await waitFor(() => {
            expect(mockUploadFile).toHaveBeenCalledWith(file)
        })
    })

    it('shows error for non-pdf files', () => {
        // Mock window.alert
        window.alert = vi.fn()
        const alertMock = vi.spyOn(window, 'alert')

        const { container } = renderWithChakra(<FileUploader />)

        // eslint-disable-next-line testing-library/no-node-access
        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
        const file = new File(['dummy content'], 'test.txt', { type: 'text/plain' })

        Object.defineProperty(fileInput, 'files', {
            value: [file],
        })

        fireEvent.change(fileInput)

        expect(alertMock).toHaveBeenCalledWith('Please select a PDF file')
        alertMock.mockRestore()
    })

    it('displays upload progress when uploading', () => {
        vi.mocked(useFileUploadModule.useFileUpload).mockReturnValue({
            uploadStatus: 'uploading',
            uploadProgress: { loaded: 500000, total: 1000000, percentage: 50 },
            error: null,
            uploadFile: mockUploadFile,
            resetUpload: mockResetUpload
        })

        renderWithChakra(<FileUploader />)

        expect(screen.getByText(/Uploading\.\.\./)).toBeInTheDocument()
        expect(screen.getByText(/50%/)).toBeInTheDocument()
    })

    it('displays success message when upload completes', () => {
        vi.mocked(useFileUploadModule.useFileUpload).mockReturnValue({
            uploadStatus: 'success',
            uploadProgress: { loaded: 1000000, total: 1000000, percentage: 100 },
            error: null,
            uploadFile: mockUploadFile,
            resetUpload: mockResetUpload
        })

        renderWithChakra(<FileUploader />)

        expect(screen.getByText('Upload Complete!')).toBeInTheDocument()
    })

    it('displays error message when upload fails', () => {
        const errorMessage = 'Network error occurred'
        vi.mocked(useFileUploadModule.useFileUpload).mockReturnValue({
            uploadStatus: 'error',
            uploadProgress: { loaded: 0, total: 0, percentage: 0 },
            error: errorMessage,
            uploadFile: mockUploadFile,
            resetUpload: mockResetUpload
        })

        renderWithChakra(<FileUploader />)

        expect(screen.getByText('Upload Failed')).toBeInTheDocument()
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    it('calls resetUpload when remove button is clicked', () => {
        const { container } = renderWithChakra(<FileUploader />)
        const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' })

        // eslint-disable-next-line testing-library/no-node-access
        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement

        Object.defineProperty(fileInput, 'files', {
            value: [file],
        })

        fireEvent.change(fileInput)

        const removeButton = screen.getByText('Remove File')
        fireEvent.click(removeButton)

        expect(mockResetUpload).toHaveBeenCalled()
    })

    it('disables file input during upload', () => {
        vi.mocked(useFileUploadModule.useFileUpload).mockReturnValue({
            uploadStatus: 'uploading',
            uploadProgress: { loaded: 500000, total: 1000000, percentage: 50 },
            error: null,
            uploadFile: mockUploadFile,
            resetUpload: mockResetUpload
        })

        const { container } = renderWithChakra(<FileUploader />)

        // eslint-disable-next-line testing-library/no-node-access
        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement

        expect(fileInput).toBeDisabled()
    })

    it('shows "Upload Another" button after successful upload', () => {
        vi.mocked(useFileUploadModule.useFileUpload).mockReturnValue({
            uploadStatus: 'success',
            uploadProgress: { loaded: 1000000, total: 1000000, percentage: 100 },
            error: null,
            uploadFile: mockUploadFile,
            resetUpload: mockResetUpload
        })

        const { container } = renderWithChakra(<FileUploader />)
        const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' })

        // eslint-disable-next-line testing-library/no-node-access
        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement

        Object.defineProperty(fileInput, 'files', {
            value: [file],
        })

        fireEvent.change(fileInput)

        expect(screen.getByText('Upload Another')).toBeInTheDocument()
    })

    it('handles drag and drop file upload', async () => {
        mockUploadFile.mockResolvedValue(undefined)
        
        renderWithChakra(<FileUploader />)
        const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' })

        const dropZone = screen.getByText('Upload your PDF').closest('div')?.parentElement?.parentElement

        fireEvent.dragOver(dropZone!)
        fireEvent.drop(dropZone!, {
            dataTransfer: {
                files: [file],
            },
        })

        await waitFor(() => {
            expect(mockUploadFile).toHaveBeenCalledWith(file)
        })
    })
})
