import { useState } from 'react'
import { Upload, File } from 'lucide-react'
import { Box, Button, VStack, Text, Icon } from '@chakra-ui/react'

export default function FileUploader() {
    const [isDragging, setIsDragging] = useState(false)
    const [file, setFile] = useState<File | null>(null)

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

    const handleFile = (file: File) => {
        if (file.type === 'application/pdf') {
            setFile(file)
            console.log('File selected:', file)
        } else {
            alert('Please select a PDF file')
        }
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
                <VStack gap={4} textAlign="center">
                    <Box
                        p={4}
                        borderRadius="full"
                        bg="white"
                        boxShadow="sm"
                        border="1px solid"
                        borderColor="gray.200"
                    >
                        {file ? (
                            <Icon boxSize={8} color="blue.500">
                                <File />
                            </Icon>
                        ) : (
                            <Icon boxSize={8} color="gray.400">
                                <Upload />
                            </Icon>
                        )}
                    </Box>

                    <VStack gap={1}>
                        <Text fontSize="lg" fontWeight="semibold" letterSpacing="tight">
                            {file ? file.name : "Upload your PDF"}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                            {file
                                ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                                : "Drag and drop or click to select"
                            }
                        </Text>
                    </VStack>

                    {!file && (
                        <label htmlFor="file-input" style={{ cursor: 'pointer' }}>
                            <Button as="span" variant="outline" mt={2} px={6} py={2} cursor="pointer">
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
                    />

                    {file && (
                        <Button onClick={() => setFile(null)} variant="ghost" mt={2} px={6} py={2} colorPalette="red">
                            Remove File
                        </Button>
                    )}
                </VStack>
            </Box>
        </Box>
    )
}
