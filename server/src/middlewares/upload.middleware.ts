import multer from 'multer';

/**
 * Maximum file size in bytes (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Allowed MIME types for file uploads
 */
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
];

/**
 * File filter function to validate uploaded files
 */
const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  // Check if MIME type is allowed
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
};

/**
 * Multer configuration for file uploads
 * Uses memory storage to keep files in buffer for processing
 */
const multerConfig: multer.Options = {
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
};

/**
 * Multer upload middleware instance
 */
export const upload = multer(multerConfig);

/**
 * Middleware to handle single file upload
 * Field name: 'file'
 */
export const uploadSingle = upload.single('file');

/**
 * Error handler middleware for multer errors
 */
export const handleUploadError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: `Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      });
    }
    return res.status(400).json({
      error: 'Upload error',
      message: error.message,
    });
  }
  
  if (error) {
    return res.status(400).json({
      error: 'Upload error',
      message: error.message,
    });
  }
  
  next();
};
