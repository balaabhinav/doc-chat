import { useState, useEffect } from 'react'
import { Box, Button, VStack, Text, Progress, Alert } from '@chakra-ui/react'
import { useFileUpload } from '../hooks/useFileUpload'
import { toaster } from '@/components/ui/toaster'
import {
    getDisplayIcon,
    getDisplayTitle,
    getDisplaySubtitle,
    getDisplayButtonText,
    getVisibilityFlags
} from './FileUploader.helpers'

export default function FileUploader() {
    const [isDragging, setIsDragging] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const { uploadStatus, uploadProgress, error, uploadFile, resetUpload } = useFileUpload()

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0])
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0])
        }
        // Reset input value to allow reselecting the same file
        e.target.value = ''
    }

    const handleFile = async (selectedFile: File) => {
        if (selectedFile.type === 'application/pdf') {
            setFile(selectedFile)
            // Automatically start upload
            try {
                await uploadFile(selectedFile)
            } catch (error) {
                console.error('Upload failed:', error)
            }
        } else {
            alert('Please select a PDF file')
        }
    }

    const handleRemoveFile = () => {
        setFile(null)
        resetUpload()
    }

    // Show success toast when file is uploaded successfully
    useEffect(() => {
        if (uploadStatus === 'success' && file) {
            toaster.create({
                title: 'Upload Successful',
                description: `${file.name} has been uploaded successfully`,
                type: 'success',
                duration: 5000,
            })
        }
    }, [uploadStatus, file])

    // Compute display values using helper functions
    const displayState = { uploadStatus, uploadProgress, file, error }
    const displayIcon = getDisplayIcon(displayState)
    const displayTitle = getDisplayTitle(displayState)
    const displaySubtitle = getDisplaySubtitle(displayState)
    const displayButtonText = getDisplayButtonText(uploadStatus)
    const { showSelectButton, showRemoveButton, showProgressBar, showErrorAlert } = getVisibilityFlags(displayState)

    return (
        <Box
            display="flex"
            minH="100vh"
            alignItems="center"
            justifyContent="center"
            bg="gray.50"
            p={10}
        >
            <Box
                position="relative"
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                w="60%"
                h="96"
                p={10}
                borderRadius="xl"
                border="2px dashed"
                borderColor={isDragging ? "blue.500" : "gray.300"}
                bg={isDragging ? "blue.50" : "white"}
                transition="all 0.2s"
                _hover={{
                    borderColor: "blue.400",
                    bg: "gray.50"
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <VStack gap={4} textAlign="center" w="100%">
                    <Box
                        p={4}
                        borderRadius="full"
                        bg="white"
                        boxShadow="sm"
                        border="1px solid"
                        borderColor="gray.200"
                    >
                        {displayIcon}
                    </Box>

                    <VStack gap={1} w="100%">
                        <Text fontSize="lg" fontWeight="semibold" letterSpacing="tight">
                            {displayTitle}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                            {displaySubtitle}
                        </Text>
                    </VStack>

                    {/* Progress Bar */}
                    {showProgressBar && (
                        <Box w="100%" px={4}>
                            <Progress.Root 
                                value={uploadProgress.percentage} 
                                size="sm"
                                colorPalette="blue"
                            >
                                <Progress.Track>
                                    <Progress.Range />
                                </Progress.Track>
                            </Progress.Root>
                        </Box>
                    )}

                    {/* Error Alert */}
                    {showErrorAlert && (
                        <Alert.Root status="error" w="100%">
                            <Alert.Indicator />
                            <Alert.Title>Error</Alert.Title>
                            <Alert.Description>{error}</Alert.Description>
                        </Alert.Root>
                    )}

                    {showSelectButton && (
                        <label htmlFor="file-input" style={{ cursor: 'pointer' }}>
                            <Button 
                                as="span" 
                                variant="outline" 
                                mt={2} 
                                px={6} 
                                py={2} 
                                cursor="pointer"
                            >
                                Select File
                            </Button>
                        </label>
                    )}

                    <input
                        id="file-input"
                        type="file"
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                        accept=".pdf"
                        disabled={uploadStatus === 'uploading'}
                    />

                    {showRemoveButton && (
                        <Button 
                            onClick={handleRemoveFile} 
                            variant="ghost" 
                            mt={2} 
                            px={6} 
                            py={2} 
                            colorPalette="red"
                        >
                            {displayButtonText}
                        </Button>
                    )}
                </VStack>
            </Box>
        </Box>
    )
}
