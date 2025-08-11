// File Upload Handler
// Manages file uploads, processing, and integration with AI providers

class FileHandler {
    constructor() {
        this.supportedImageTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'
        ];
        this.supportedDocumentTypes = [
            'text/plain', 'text/csv', 'text/markdown', 'text/html',
            'application/pdf', 'application/json',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel', 'application/msword'
        ];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB limit
        this.maxImageSize = 5 * 1024 * 1024; // 5MB limit for images
    }

    // Check if file type is supported
    isSupported(file) {
        return this.supportedImageTypes.includes(file.type) ||
               this.supportedDocumentTypes.includes(file.type);
    }

    // Check if file is an image
    isImage(file) {
        return this.supportedImageTypes.includes(file.type);
    }

    // Check if file is a document
    isDocument(file) {
        return this.supportedDocumentTypes.includes(file.type);
    }

    // Validate file before processing
    validateFile(file) {
        const errors = [];

        if (!file) {
            errors.push('No file selected');
            return { valid: false, errors };
        }

        if (!this.isSupported(file)) {
            errors.push(`File type ${file.type} is not supported`);
        }

        const maxSize = this.isImage(file) ? this.maxImageSize : this.maxFileSize;
        if (file.size > maxSize) {
            const maxSizeMB = Math.round(maxSize / (1024 * 1024));
            errors.push(`File size exceeds ${maxSizeMB}MB limit`);
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // Convert file to base64 for API transmission
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1]; // Remove data URL prefix
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Extract text content from various file types
    async extractTextContent(file) {
        switch (file.type) {
            case 'text/plain':
            case 'text/csv':
            case 'text/markdown':
            case 'text/html':
                return await this.readTextFile(file);

            case 'application/json':
                const jsonContent = await this.readTextFile(file);
                try {
                    const parsed = JSON.parse(jsonContent);
                    return JSON.stringify(parsed, null, 2);
                } catch (e) {
                    return jsonContent;
                }

            default:
                return `[${file.type} file: ${file.name}]`;
        }
    }

    // Read text file content
    async readTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    // Process image for vision-capable AI models
    async processImageForAI(file) {
        const validation = this.validateFile(file);
        if (!validation.valid) {
            throw new Error(validation.errors.join(', '));
        }

        if (!this.isImage(file)) {
            throw new Error('File is not an image');
        }

        const base64 = await this.fileToBase64(file);

        return {
            type: 'image',
            mimeType: file.type,
            base64: base64,
            filename: file.name,
            size: file.size
        };
    }

    // Process document for text extraction
    async processDocumentForAI(file) {
        const validation = this.validateFile(file);
        if (!validation.valid) {
            throw new Error(validation.errors.join(', '));
        }

        let content;
        if (this.isDocument(file)) {
            content = await this.extractTextContent(file);
        } else {
            throw new Error('File is not a supported document type');
        }

        return {
            type: 'document',
            mimeType: file.type,
            content: content,
            filename: file.name,
            size: file.size
        };
    }

    // Create file preview element for UI
    createFilePreview(file, processedData = null) {
        const preview = document.createElement('div');
        preview.className = 'file-preview';
        preview.dataset.filename = file.name;

        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';

        const fileName = document.createElement('span');
        fileName.className = 'file-name';
        fileName.textContent = file.name;

        const fileSize = document.createElement('span');
        fileSize.className = 'file-size';
        fileSize.textContent = this.formatFileSize(file.size);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'file-remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.title = 'Remove file';
        removeBtn.addEventListener('click', () => {
            preview.remove();
        });

        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileSize);
        preview.appendChild(fileInfo);
        preview.appendChild(removeBtn);

        // Add image thumbnail if it's an image
        if (this.isImage(file)) {
            const thumbnail = document.createElement('div');
            thumbnail.className = 'image-thumbnail';

            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.onload = () => URL.revokeObjectURL(img.src); // Clean up

            thumbnail.appendChild(img);
            preview.appendChild(thumbnail);
        }

        return preview;
    }

    // Format file size for display
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Get supported file types as a string for input accept attribute
    getSupportedTypesString() {
        return [...this.supportedImageTypes, ...this.supportedDocumentTypes].join(',');
    }

    // Create drag and drop zone
    createDropZone(targetElement, onFilesSelected) {
        let dragCounter = 0;

        const handleDrag = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        const handleDragEnter = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter++;
            targetElement.classList.add('drag-over');
        };

        const handleDragLeave = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter--;
            if (dragCounter === 0) {
                targetElement.classList.remove('drag-over');
            }
        };

        const handleDrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter = 0;
            targetElement.classList.remove('drag-over');

            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0 && onFilesSelected) {
                onFilesSelected(files);
            }
        };

        // Add event listeners
        targetElement.addEventListener('dragenter', handleDragEnter);
        targetElement.addEventListener('dragover', handleDrag);
        targetElement.addEventListener('dragleave', handleDragLeave);
        targetElement.addEventListener('drop', handleDrop);

        // Return cleanup function
        return () => {
            targetElement.removeEventListener('dragenter', handleDragEnter);
            targetElement.removeEventListener('dragover', handleDrag);
            targetElement.removeEventListener('dragleave', handleDragLeave);
            targetElement.removeEventListener('drop', handleDrop);
            targetElement.classList.remove('drag-over');
        };
    }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileHandler;
} else {
    window.FileHandler = FileHandler;
}
