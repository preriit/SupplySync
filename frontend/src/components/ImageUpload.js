import React, { useState, useCallback } from 'react';
import { Upload, X, Star, Image as ImageIcon, Loader2 } from 'lucide-react';
import api from '../utils/api';

const ImageUpload = ({ productId, images = [], onImagesChange }) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFiles(e.dataTransfer.files);
    }
  }, [productId]);

  const handleChange = async (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      await handleFiles(e.target.files);
    }
  };

  const handleFiles = async (fileList) => {
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(fileList).forEach(file => {
        formData.append('files', file);
      });

      const response = await api.post(
        `/dealer/products/${productId}/images/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          transformRequest: [(data, headers) => {
            // Let browser set the Content-Type with boundary for FormData
            delete headers['Content-Type'];
            return data;
          }],
        }
      );

      // Refresh images
      if (onImagesChange) {
        const updatedImages = await api.get(`/dealer/products/${productId}/images`);
        onImagesChange(updatedImages.data);
      }
      
      alert(`Successfully uploaded ${response.data.length} image(s)!`);
    } catch (error) {
      console.error('Upload error:', error);
      alert(error.response?.data?.detail || 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimary = async (imageId) => {
    try {
      await api.put(`/dealer/products/${productId}/images/${imageId}/primary`);
      
      // Refresh images
      if (onImagesChange) {
        const updatedImages = await api.get(`/dealer/products/${productId}/images`);
        onImagesChange(updatedImages.data);
      }
    } catch (error) {
      console.error('Set primary error:', error);
      alert('Failed to set primary image');
    }
  };

  const handleDelete = async (imageId) => {
    if (!window.confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      await api.delete(`/dealer/products/${productId}/images/${imageId}`);
      
      // Refresh images
      if (onImagesChange) {
        const updatedImages = await api.get(`/dealer/products/${productId}/images`);
        onImagesChange(updatedImages.data);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete image');
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />
        
        <div className="flex flex-col items-center space-y-4">
          {uploading ? (
            <>
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-600">Uploading images...</p>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-gray-400" />
              <div>
                <p className="text-lg font-medium text-gray-900">
                  Drop images here or click to upload
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  PNG, JPG, WebP up to 5MB each
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Image Gallery */}
      {images.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Uploaded Images ({images.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div
                key={image.id}
                className="relative group border rounded-lg overflow-hidden bg-gray-50"
              >
                {/* Primary Badge */}
                {image.is_primary && (
                  <div className="absolute top-2 left-2 z-10">
                    <span className="bg-yellow-400 text-yellow-900 text-xs font-semibold px-2 py-1 rounded flex items-center space-x-1">
                      <Star className="h-3 w-3 fill-current" />
                      <span>Primary</span>
                    </span>
                  </div>
                )}

                {/* Image */}
                <img
                  src={image.image_url}
                  alt={`Product ${index + 1}`}
                  className="w-full h-48 object-cover"
                />

                {/* Color Palette */}
                {image.color_palette && image.color_palette.length > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <div className="flex space-x-1">
                      {image.color_palette.slice(0, 5).map((color, idx) => (
                        <div
                          key={idx}
                          className="w-6 h-6 rounded-full border-2 border-white shadow"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                  {!image.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(image.id)}
                      className="bg-white hover:bg-yellow-50 text-gray-700 p-2 rounded-full shadow-lg"
                      title="Set as primary"
                    >
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(image.id)}
                    className="bg-white hover:bg-red-50 text-red-600 p-2 rounded-full shadow-lg"
                    title="Delete image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Storage Type Badge */}
                <div className="absolute bottom-2 right-2">
                  <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">
                    {image.storage_type === 's3' ? 'Legacy' : 'New'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {images.length === 0 && (
        <div className="text-center py-8 border rounded-lg bg-gray-50">
          <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No images uploaded yet</p>
          <p className="text-sm text-gray-500">Upload images to showcase your product</p>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
