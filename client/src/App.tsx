import { BrowserRouter, Routes, Route } from 'react-router-dom'
import FileUploader from '@/pages/FileUploader'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FileUploader />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
