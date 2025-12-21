'use client';

import { useState } from 'react';
import ModelViewer from './ModelViewer';

interface FilePreviewProps {
    fileUrl?: string;
    previewUrl?: string | null; // STL preview URL for STEP files
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    mimeType?: string;
    status?: 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';
    processingError?: string;
}

// Supported file types
const SUPPORTED_3D_FORMATS = ['step', 'stp', 'stl', 'obj', 'gltf', 'glb', 'iges', 'igs'];
const SUPPORTED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
const SUPPORTED_DOCUMENT_FORMATS = ['pdf', 'txt', 'md', 'json', 'xml'];

function getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
}

function getPreviewType(fileName: string, mimeType?: string): 'model' | 'image' | 'document' | 'unsupported' {
    const ext = getFileExtension(fileName);

    if (SUPPORTED_3D_FORMATS.includes(ext)) {
        return 'model';
    }
    if (SUPPORTED_IMAGE_FORMATS.includes(ext)) {
        return 'image';
    }
    if (SUPPORTED_DOCUMENT_FORMATS.includes(ext)) {
        return 'document';
    }

    // Check by MIME type if extension didn't match
    if (mimeType) {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType === 'application/pdf') return 'document';
        if (mimeType.startsWith('text/')) return 'document';
    }

    return 'unsupported';
}

function ImagePreview({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);

    if (imageError) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-100">
                <div className="text-center">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-600">Failed to load image</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full bg-gray-900 flex items-center justify-center overflow-hidden">
            {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            )}
            <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain"
                onLoad={() => setImageLoading(false)}
                onError={() => {
                    setImageLoading(false);
                    setImageError(true);
                }}
            />
        </div>
    );
}

function DocumentPreview({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
    const ext = getFileExtension(fileName);

    if (ext === 'pdf') {
        return (
            <div className="w-full h-full">
                <iframe
                    src={fileUrl}
                    className="w-full h-full border-0"
                    title={fileName}
                />
            </div>
        );
    }

    // For text files, show in a text area (would need to fetch content)
    return (
        <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600 mb-4">Document preview not available</p>
                <a
                    href={fileUrl}
                    download={fileName}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
                >
                    Download File
                </a>
            </div>
        </div>
    );
}

function UnsupportedPreview({ fileName, fileUrl, status, processingError }: { 
    fileName: string; 
    fileUrl?: string; 
    status?: string;
    processingError?: string;
}) {
    // Show processing state
    if (status === 'UPLOADING') {
        return (
            <div className="flex items-center justify-center h-full bg-gray-100">
                <div className="text-center max-w-md px-4">
                    <svg className="w-16 h-16 text-blue-400 mx-auto mb-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Uploading...</h3>
                    <p className="text-gray-600">Your file is being uploaded to secure storage.</p>
                </div>
            </div>
        );
    }
    
    if (status === 'PROCESSING' || !fileUrl) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-100">
                <div className="text-center max-w-md px-4">
                    <svg className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing...</h3>
                    <p className="text-gray-600 mb-2">
                        Your file is being processed and a 3D preview is being generated.
                    </p>
                    <p className="text-sm text-gray-500">
                        This usually takes 10-30 seconds. The page will refresh automatically.
                    </p>
                </div>
            </div>
        );
    }

    if (status === 'FAILED') {
        return (
            <div className="flex items-center justify-center h-full bg-gray-100">
                <div className="text-center max-w-md px-4">
                    <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Failed</h3>
                    <p className="text-gray-600 mb-2">
                        {processingError || 'There was an error processing your file.'}
                    </p>
                    <p className="text-sm text-gray-500">Please try re-uploading the file.</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-center max-w-md px-4">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Preview not available</h3>
                <p className="text-gray-600 mb-4">
                    Preview is not supported for this file type.
                </p>
                {fileUrl && (
                    <a
                        href={fileUrl}
                        download={fileName}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
                    >
                        Download File
                    </a>
                )}
            </div>
        </div>
    );
}

export default function FilePreview({ fileUrl, previewUrl, fileName, fileType, fileSize, mimeType, status, processingError }: FilePreviewProps) {
    if (!fileName) {
        return <UnsupportedPreview fileName="Unknown" fileUrl={fileUrl} status={status} processingError={processingError} />;
    }

    const previewType = getPreviewType(fileName, mimeType);

    switch (previewType) {
        case 'model':
            // For 3D models, prefer preview_url (STL) over original file
            const modelUrl = previewUrl || fileUrl;
            
            if (!modelUrl) {
                return <UnsupportedPreview fileName={fileName} fileUrl={fileUrl} status={status} processingError={processingError} />;
            }
            
            return (
                <ModelViewer
                    modelUrl={modelUrl}
                    fileType={fileType || getFileExtension(fileName)}
                    fileName={fileName}
                />
            );

        case 'image':
            if (!fileUrl) {
                return <UnsupportedPreview fileName={fileName} fileUrl={fileUrl} status={status} processingError={processingError} />;
            }
            return <ImagePreview fileUrl={fileUrl} fileName={fileName} />;

        case 'document':
            if (!fileUrl) {
                return <UnsupportedPreview fileName={fileName} fileUrl={fileUrl} status={status} processingError={processingError} />;
            }
            return <DocumentPreview fileUrl={fileUrl} fileName={fileName} />;

        case 'unsupported':
        default:
            return <UnsupportedPreview fileName={fileName} fileUrl={fileUrl} status={status} processingError={processingError} />;
    }
}

export { getFileExtension, getPreviewType, SUPPORTED_3D_FORMATS, SUPPORTED_IMAGE_FORMATS, SUPPORTED_DOCUMENT_FORMATS };
