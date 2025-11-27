import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import FileUploader from './FileUploader'

const renderWithChakra = (component: React.ReactElement) => {
    return render(
        <ChakraProvider value={defaultSystem}>
            {component}
        </ChakraProvider>
    )
}

describe('FileUploader', () => {
    it('renders upload prompt initially', () => {
        renderWithChakra(<FileUploader />)
        expect(screen.getByText('Upload your PDF')).toBeInTheDocument()
        expect(screen.getByText('Drag and drop or click to select')).toBeInTheDocument()
    })

    it('handles file selection via button', () => {
        const { container } = renderWithChakra(<FileUploader />)
        const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' })

        // eslint-disable-next-line testing-library/no-node-access
        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement

        Object.defineProperty(fileInput, 'files', {
            value: [file],
        })

        fireEvent.change(fileInput)

        expect(screen.getByText('test.pdf')).toBeInTheDocument()
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
})
