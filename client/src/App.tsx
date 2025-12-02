import { BrowserRouter, Routes, Route } from 'react-router-dom'
import FileUploader from '@/pages/FileUploader'
import { Toaster } from '@/components/ui/toaster'

function App() {
  return (
    <>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<FileUploader />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
