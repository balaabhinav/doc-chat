import { useState } from 'react'
import { Upload, File, CheckCircle, XCircle } from 'lucide-react'
import { Box, Button, VStack, Text, Icon, Progress, Alert } from '@chakra-ui/react'
import { useFileUpload } from '../hooks/useFileUpload'

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

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
    }

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
                        {uploadStatus === 'success' ? (
                            <Icon boxSize={8} color="green.500">
                                <CheckCircle />
                            </Icon>
                        ) : uploadStatus === 'error' ? (
                            <Icon boxSize={8} color="red.500">
                                <XCircle />
                            </Icon>
                        ) : file ? (
                            <Icon boxSize={8} color="blue.500">
                                <File />
                            </Icon>
                        ) : (
                            <Icon boxSize={8} color="gray.400">
                                <Upload />
                            </Icon>
                        )}
                    </Box>

                    <VStack gap={1} w="100%">
                        <Text fontSize="lg" fontWeight="semibold" letterSpacing="tight">
                            {uploadStatus === 'success' 
                                ? 'Upload Complete!' 
                                : uploadStatus === 'error'
                                ? 'Upload Failed'
                                : file 
                                ? file.name 
                                : "Upload your PDF"
                            }
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                            {uploadStatus === 'uploading' 
                                ? `Uploading... ${formatBytes(uploadProgress.loaded)} / ${formatBytes(uploadProgress.total)} (${uploadProgress.percentage}%)`
                                : uploadStatus === 'success'
                                ? `Successfully uploaded ${formatBytes(file?.size || 0)}`
                                : file
                                ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                                : "Drag and drop or click to select"
                            }
                        </Text>
                    </VStack>

                    {/* Progress Bar */}
                    {uploadStatus === 'uploading' && (
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
                    {uploadStatus === 'error' && error && (
                        <Alert.Root status="error" w="100%">
                            <Alert.Indicator />
                            <Alert.Title>Error</Alert.Title>
                            <Alert.Description>{error}</Alert.Description>
                        </Alert.Root>
                    )}

                    {!file && uploadStatus === 'idle' && (
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

                    {file && uploadStatus !== 'uploading' && (
                        <Button 
                            onClick={handleRemoveFile} 
                            variant="ghost" 
                            mt={2} 
                            px={6} 
                            py={2} 
                            colorPalette="red"
                        >
                            {uploadStatus === 'success' ? 'Upload Another' : 'Remove File'}
                        </Button>
                    )}
                </VStack>
            </Box>
        </Box>
    )
}
