'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Define the Shopify product interface
interface ShopifyProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  vendor: string;
  price: number;
  currencyCode: string;
  stock: number;
  status: string;
  imageUrl: string | null;
  handle: string;
  createdAt: string;
  updatedAt: string;
}

// Product Detail Modal Component
function ProductDetailModal({ 
  product, 
  isOpen, 
  onClose,
  setProducts,
  setSnackbar
}: { 
  product: ShopifyProduct | null; 
  isOpen: boolean; 
  onClose: () => void;
  setProducts: React.Dispatch<React.SetStateAction<ShopifyProduct[]>>;
  setSnackbar: React.Dispatch<React.SetStateAction<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>>;
}) {
  if (!product || !isOpen) return null;

  // Format dates for better readability
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleString();
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return 'Invalid Date';
    }
  };
  
  // State to track whether description is expanded
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  // State to track if we're in edit mode
  const [isEditing, setIsEditing] = useState(false);
  
  // State for edited product
  const [editedProduct, setEditedProduct] = useState<ShopifyProduct | null>(null);
  
  // State for tracking save operation
  const [isSaving, setIsSaving] = useState(false);
  
  // State for image handling during edit
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Log product data for debugging
  useEffect(() => {
    if (product && isOpen) {
      console.log("Product modal opened with data:", product);
      if (!product.imageUrl) {
        console.warn("Product has no image URL:", product.id, product.name);
      }
    }
  }, [product, isOpen]);
  
  // Log when edited product changes
  useEffect(() => {
    if (isEditing && editedProduct) {
      console.log("Edited product updated:", editedProduct);
      console.log("Current image preview:", imagePreview);
    }
  }, [editedProduct, isEditing, imagePreview]);
  
  // Toggle description expansion
  const toggleDescription = () => {
    setIsDescriptionExpanded(!isDescriptionExpanded);
  };
  
  // Handle click on backdrop to close modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if the click was directly on the backdrop element
    if (e.target === e.currentTarget) {
      // Don't allow closing if in edit mode with unsaved changes
      if (!isEditing) {
        onClose();
      }
    }
  };
  
  // Enable edit mode
  const enableEditMode = () => {
    if (!product) return;
    
    console.log("Enabling edit mode with product:", product);
    setEditedProduct({...product});
    
    // Make sure we keep the existing image
    if (product.imageUrl) {
      console.log("Setting image preview to:", product.imageUrl);
      setImagePreview(product.imageUrl);
    }
    
    setIsEditing(true);
  };
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (!editedProduct) return;
    
    // For number fields like price and stock, convert to appropriate type
    if (name === 'price') {
      setEditedProduct({
        ...editedProduct,
        [name]: parseFloat(value)
      });
    } else if (name === 'stock') {
      setEditedProduct({
        ...editedProduct,
        [name]: parseInt(value, 10)
      });
    } else {
      setEditedProduct({
        ...editedProduct,
        [name]: value
      });
    }
  };
  
  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    if (file) {
      setImageFile(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result as string;
        console.log("Image processed to base64, length:", base64Image.length);
        setImagePreview(base64Image);
        
        // Update the edited product with the new image URL
        if (editedProduct) {
          setEditedProduct({
            ...editedProduct,
            imageUrl: base64Image
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Remove selected image
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    
    // Update the edited product to remove the image URL
    if (editedProduct) {
      setEditedProduct({
        ...editedProduct,
        imageUrl: null
      });
    }
  };
  
  // Cancel editing
  const cancelEdit = () => {
    setIsEditing(false);
    setEditedProduct(null);
    setImageFile(null);
    setImagePreview(null);
  };
  
  // Save changes
  const saveChanges = async () => {
    setIsSaving(true);
    try {
      console.log("Saving product changes:", editedProduct);
      console.log("Current image preview:", imagePreview);
      
      const method = editedProduct?.id ? 'PUT' : 'POST';
      
      // Prepare the data to send - ensure ID is a string and image is included
      const productToSend = {
        ...editedProduct,
        id: editedProduct?.id ? String(editedProduct.id) : undefined,
        // Ensure image URL is included from our state if it exists
        imageUrl: imagePreview || editedProduct?.imageUrl
      };
      
      // Log the data being sent for debugging purposes
      console.log(`Sending ${method} request with data:`, JSON.stringify({
        ...productToSend,
        imageUrl: productToSend.imageUrl ? 
          (productToSend.imageUrl.startsWith('data:') ? 
            `[Base64 image data - ${productToSend.imageUrl.length} chars]` : 
            productToSend.imageUrl) 
          : null
      }));
      
      const response = await fetch('/api/shopify/products', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productToSend),
      });
      
      // First check for HTTP errors
      if (!response.ok) {
        let errorMessage = `Server returned ${response.status}: ${response.statusText}`;
        try {
          const errorText = await response.text();
          console.error(`Error ${response.status}: ${response.statusText}`, errorText);
          
          // Try to parse the error as JSON
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error) {
              errorMessage = errorJson.error;
            }
          } catch {
            // If the error text isn't JSON, just use it directly
            if (errorText) {
              errorMessage = errorText;
            }
          }
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
        }
        
        throw new Error(errorMessage);
      }
      
      // Parse the JSON response
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error("Failed to parse response as JSON:", jsonError);
        throw new Error("Invalid response from server");
      }
      
      // Then check for API-level errors
      if (!result.success) {
        console.error("API error:", result.error);
        throw new Error(result.error || "Failed to save product");
      }
      
      // Ensure we have a product in the response
      if (!result.product) {
        console.error("Invalid response format - missing product data:", result);
        throw new Error("Invalid server response format");
      }
      
      // Extract product data for easier access
      const product = result.product;
      
      // Validate the response data
      if (!product.name || product.price === undefined || product.stock === undefined) {
        console.warn("Received incomplete product data:", product);
      }
      
      // Log the received product data
      console.log("Received updated product:", product);
      console.log("Image URL in response:", product.imageUrl);
      
      // Preserve the image state
      if (imagePreview && imagePreview.startsWith('data:') && !product.imageUrl) {
        console.warn("API response is missing imageUrl but we have an image preview - preserving local image");
      }
      
      // Update the products list
      if (editedProduct?.id) {
        // Update existing product
        setProducts(prev => 
          prev.map(p => p.id === product.id ? {
            ...product,
            // Make sure we preserve the image URL if the server didn't return one
            // but we have a valid one in our local state
            imageUrl: product.imageUrl || imagePreview || editedProduct.imageUrl || p.imageUrl
          } : p)
        );
      } else {
        // Add new product
        setProducts(prev => [...prev, {
          ...product,
          // Make sure the image URL is included for new products
          imageUrl: product.imageUrl || imagePreview
        }]);
      }
      
      // Show success message
      setSnackbar({
        open: true,
        message: `Product ${editedProduct?.id ? 'updated' : 'created'} successfully`,
        severity: 'success'
      });
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error("Error saving product:", error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : "Failed to save product",
        severity: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // The product to display (either the original or the edited version)
  const displayProduct = isEditing ? editedProduct : product;
  
  return (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white rounded-lg w-full max-w-4xl mx-auto p-6 shadow-xl h-[600px] md:h-[500px] overflow-hidden">
        {/* Close button - only show when not editing */}
        {!isEditing && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 z-10"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        
        {/* Edit button - only show when not editing */}
        {!isEditing && (
          <button 
            onClick={enableEditMode}
            className="absolute top-4 right-14 text-blue-500 hover:text-blue-600 z-10"
            aria-label="Edit"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
        
        <div className="flex flex-col md:flex-row gap-6 h-full overflow-y-auto pr-2">
          {/* Product Image */}
          <div className="w-full md:w-1/3 h-60 md:h-auto bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 relative">
            {displayProduct?.imageUrl ? (
              <>
                <img 
                  src={displayProduct.imageUrl} 
                  alt={displayProduct.name}
                  className="w-full h-full object-cover" 
                />
                {isEditing && (
                  <div className="absolute inset-0 bg-black bg-opacity-40">
                    <div className="absolute bottom-3 right-3 flex space-x-2">
                      <label className="p-2 bg-blue-600 rounded-full text-white cursor-pointer hover:bg-blue-700 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <input 
                          type="file" 
                          accept="image/*"
                          className="sr-only"
                          onChange={handleImageChange}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="p-2 bg-red-600 rounded-full text-white hover:bg-red-700 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full w-full bg-gray-100">
                {isEditing ? (
                  <label className="cursor-pointer">
                    <div className="flex flex-col items-center space-y-2">
                      <svg className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium text-blue-600">Upload Image</span>
                      <input 
                        type="file" 
                        accept="image/*"
                        className="sr-only"
                        onChange={handleImageChange}
                      />
                    </div>
                  </label>
                ) : (
                  <svg className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
            )}
          </div>
          
          {/* Product Details */}
          <div className="w-full md:w-2/3 overflow-y-auto">
            {isEditing ? (
              // Edit mode
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Product Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={editedProduct?.name || ''}
                    onChange={handleInputChange}
                    className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                      Category
                    </label>
                    <input
                      type="text"
                      name="category"
                      id="category"
                      value={editedProduct?.category || ''}
                      onChange={handleInputChange}
                      className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="vendor" className="block text-sm font-medium text-gray-700">
                      Vendor
                    </label>
                    <input
                      type="text"
                      name="vendor"
                      id="vendor"
                      value={editedProduct?.vendor || ''}
                      onChange={handleInputChange}
                      className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      name="status"
                      id="status"
                      value={editedProduct?.status || ''}
                      onChange={handleInputChange as any}
                      className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="DRAFT">Draft</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                      Price
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">₹</span>
                      </div>
                      <input
                        type="number"
                        name="price"
                        id="price"
                        min="0"
                        step="0.01"
                        value={editedProduct?.price || 0}
                        onChange={handleInputChange}
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">INR</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
                      Stock
                    </label>
                    <input
                      type="number"
                      name="stock"
                      id="stock"
                      min="0"
                      step="1"
                      value={editedProduct?.stock || 0}
                      onChange={handleInputChange}
                      className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    value={editedProduct?.description || ''}
                    onChange={handleInputChange}
                    className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveChanges}
                    disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              // View mode
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{displayProduct?.name}</h2>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {displayProduct?.category || 'Uncategorized'}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {displayProduct?.vendor}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    displayProduct?.status === 'ACTIVE' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {displayProduct?.status}
                  </span>
                </div>
                
                <div className="flex justify-between items-center mb-4">
                  <div className="text-2xl font-bold text-gray-900">
                    ₹{displayProduct?.price !== undefined ? displayProduct.price.toFixed(2) : '0.00'}
                  </div>
                  <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                    displayProduct?.stock && displayProduct.stock > 10 
                      ? 'bg-green-100 text-green-800' 
                      : displayProduct?.stock && displayProduct.stock > 0 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                  }`}>
                    {displayProduct?.stock && displayProduct.stock > 10 
                      ? 'In Stock' 
                      : displayProduct?.stock && displayProduct.stock > 0 
                        ? 'Low Stock' 
                        : 'Out of Stock'}
                    {displayProduct?.stock && displayProduct.stock > 0 && ` (${displayProduct.stock})`}
                  </span>
                </div>
                
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
                  <div 
                    className={`prose prose-sm text-xs text-gray-500 ${
                      !isDescriptionExpanded 
                        ? 'line-clamp-2 relative' 
                        : ''
                    }`}
                  >
                    <div dangerouslySetInnerHTML={{ __html: displayProduct?.description || '' }} />
                    
                    {!isDescriptionExpanded && (
                      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent"></div>
                    )}
                  </div>
                  
                  <button
                    onClick={toggleDescription}
                    className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    {isDescriptionExpanded ? 'Show less' : 'View more'}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h3 className="font-medium text-gray-900">Product ID</h3>
                    <p className="text-gray-500 truncate">{displayProduct?.id}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Handle</h3>
                    <p className="text-gray-500">{displayProduct?.handle}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Created</h3>
                    <p className="text-gray-500">{formatDate(displayProduct?.createdAt)}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Last Updated</h3>
                    <p className="text-gray-500">{formatDate(displayProduct?.updatedAt)}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading Dots Component
function LoadingDots() {
  return (
    <div className="flex justify-center items-center py-6">
      <div className="flex space-x-2">
        <div className="w-3 h-3 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-3 h-3 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-3 h-3 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
      </div>
    </div>
  );
}

// Product Creation Modal Component
function CreateProductModal({ 
  isOpen, 
  onClose,
  onProductCreated,
  setSnackbar
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onProductCreated: (product: ShopifyProduct) => void;
  setSnackbar: React.Dispatch<React.SetStateAction<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>>;
}) {
  if (!isOpen) return null;
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    vendor: '',
    price: '',
    stock: '',
  });
  
  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user modifies it
    if (formErrors[name]) {
      setFormErrors(prev => {
        const updated = {...prev};
        delete updated[name];
        return updated;
      });
    }
  };
  
  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    if (file) {
      setImageFile(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result as string;
        console.log("Image processed to base64, length:", base64Image.length);
        setImagePreview(base64Image);
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };
  
  // Remove selected image
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };
  
  // Validate form before submission
  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Product name is required';
    }
    
    if (!formData.price) {
      errors.price = 'Price is required';
    } else if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0) {
      errors.price = 'Price must be a valid positive number';
    }
    
    if (!formData.stock) {
      errors.stock = 'Stock quantity is required';
    } else if (isNaN(parseInt(formData.stock, 10)) || parseInt(formData.stock, 10) < 0) {
      errors.stock = 'Stock must be a valid positive number';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSnackbar({
      open: false,
      message: '',
      severity: 'info'
    });
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare the product data
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock, 10),
        imageUrl: imagePreview,
        currencyCode: "INR", // Default currency code
        status: "ACTIVE", // Default status
      };
      
      console.log("Sending product data:", productData);
      
      // Make API call to create product in Shopify
      const response = await fetch('/api/shopify/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });
      
      // Try to parse the response as JSON
      let data;
      try {
        data = await response.json();
      } catch (error) {
        console.error("Failed to parse response:", error);
        throw new Error("Invalid response from server");
      }
      
      if (!response.ok) {
        // Extract error message from response
        const errorMessage = data.error || `API error: ${response.status}`;
        console.error("API error:", errorMessage);
        throw new Error(errorMessage);
      }
      
      console.log("API response:", data);
      
      // Add the new product to the UI via callback
      if (data.product) {
        onProductCreated(data.product);
        
        // Show success message
        setSnackbar({
          open: true,
          message: 'Product created successfully',
          severity: 'success'
        });
        
        // Close the modal
        onClose();
      } else {
        throw new Error("No product data returned from API");
      }
    } catch (error) {
      console.error('Error creating product:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        severity: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle click on backdrop to close modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white rounded-lg w-full max-w-2xl mx-auto p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 z-10"
          aria-label="Close"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Product</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            {/* Product Image Upload - as a preview/upload button only */}
            <div className="sm:col-span-6">
              <div className="w-full h-40 bg-gray-200 rounded-lg overflow-hidden relative">
                {imagePreview ? (
                  <>
                    <img 
                      src={imagePreview} 
                      alt="Product preview" 
                      className="h-full w-full object-contain" 
                    />
                    <div className="absolute bottom-3 right-3 flex space-x-2">
                      <label className="p-2 bg-blue-600 rounded-full text-white cursor-pointer hover:bg-blue-700 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <input 
                          id="product-image" 
                          name="product-image" 
                          type="file" 
                          accept="image/*"
                          className="sr-only"
                          onChange={handleImageChange}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="p-2 bg-red-600 rounded-full text-white hover:bg-red-700 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center h-full cursor-pointer">
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="mt-1 text-sm font-medium text-blue-600">Upload Product Image</p>
                      <p className="mt-1 text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                      <input 
                        id="product-image" 
                        name="product-image" 
                        type="file" 
                        accept="image/*"
                        className="sr-only"
                        onChange={handleImageChange}
                      />
                    </div>
                  </label>
                )}
              </div>
            </div>
            
            <div className="sm:col-span-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Product Name <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                    formErrors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                )}
              </div>
            </div>
            
            <div className="sm:col-span-3">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="category"
                  id="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            <div className="sm:col-span-3">
              <label htmlFor="vendor" className="block text-sm font-medium text-gray-700">
                Vendor
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="vendor"
                  id="vendor"
                  value={formData.vendor}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            <div className="sm:col-span-3">
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                Price <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  name="price"
                  id="price"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  className={`focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md ${
                    formErrors.price ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                  placeholder="0.00"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">INR</span>
                </div>
              </div>
              {formErrors.price && (
                <p className="mt-1 text-sm text-red-600">{formErrors.price}</p>
              )}
            </div>
            
            <div className="sm:col-span-3">
              <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
                Stock <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  name="stock"
                  id="stock"
                  min="0"
                  step="1"
                  value={formData.stock}
                  onChange={handleChange}
                  className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                    formErrors.stock ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                />
                {formErrors.stock && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.stock}</p>
                )}
              </div>
            </div>
            
            <div className="sm:col-span-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <div className="mt-1">
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">Brief description of the product.</p>
            </div>
          </div>
          
          <div className="pt-5">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : 'Create Product'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(12);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [columnsCount, setColumnsCount] = useState(4);
  const [isMobile, setIsMobile] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Reference to the observer target element
  const observerTarget = useRef<HTMLDivElement>(null);

  // Load saved column preference from localStorage on component mount
  useEffect(() => {
    const savedColumns = localStorage.getItem('productColumnsCount');
    if (savedColumns) {
      const count = parseInt(savedColumns);
      // Make sure the value is within our new range (4-12)
      if (count >= 4 && count <= 12) {
        setColumnsCount(count);
      } else {
        // If outside range, default to the closest valid value
        setColumnsCount(count < 4 ? 4 : 12);
      }
    }
    
    // Check if we're on mobile initially
    setIsMobile(window.innerWidth < 768);
    
    // Add resize listener
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Update column count and save preference
  const updateColumnsCount = (count: number) => {
    // Ensure count is within valid range
    const validCount = Math.min(Math.max(count, 4), 12);
    setColumnsCount(validCount);
    localStorage.setItem('productColumnsCount', validCount.toString());
  };

  async function fetchProducts(cursor: string | null = null, replace: boolean = true) {
    if (replace) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);
    
    try {
      const url = `/api/shopify/products?pageSize=${pageSize}${cursor ? `&cursor=${cursor}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Ensure all products have valid price and stock values
      const validatedProducts = (data.products || []).map((product: ShopifyProduct) => ({
        ...product,
        price: typeof product.price === 'number' ? product.price : 0,
        stock: typeof product.stock === 'number' ? product.stock : 0
      }));
      
      if (replace) {
        setProducts(validatedProducts);
      } else {
        setProducts(prev => [...prev, ...validatedProducts]);
      }
      
      setHasNextPage(data.pagination.hasNextPage);
      setEndCursor(data.pagination.endCursor);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch products');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }
  
  // Initial data fetch on component mount
  useEffect(() => {
    fetchProducts();
  }, []);
  
  // Infinite scroll implementation using Intersection Observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isLoading && !isLoadingMore) {
        fetchProducts(endCursor, false);
      }
    },
    [hasNextPage, isLoading, isLoadingMore, endCursor]
  );

  useEffect(() => {
    const element = observerTarget.current;
    const option = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
    };
    
    const observer = new IntersectionObserver(handleObserver, option);
    
    if (element) observer.observe(element);
    
    return () => {
      if (element) observer.unobserve(element);
    };
  }, [handleObserver]);

  // Handler for refresh button
  const handleRefresh = () => {
    setEndCursor(null);
    setHasNextPage(true);
    fetchProducts();
  };

  // Open modal with selected product
  const openProductModal = (product: ShopifyProduct) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  // Close modal
  const closeProductModal = () => {
    setIsModalOpen(false);
  };

  // Open create product modal
  const openCreateModal = () => {
    setIsCreateModalOpen(true);
  };
  
  // Close create product modal
  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  // Handler for adding a new product to the UI
  const handleProductCreated = (product: ShopifyProduct) => {
    console.log("Adding new product to UI:", product);
    // Make sure all required properties exist
    const validatedProduct: ShopifyProduct = {
      id: product.id,
      name: product.name || 'Untitled Product',
      description: product.description || '',
      category: product.category || '',
      vendor: product.vendor || 'Default Vendor',
      price: typeof product.price === 'number' ? product.price : 0,
      currencyCode: product.currencyCode || 'INR',
      stock: typeof product.stock === 'number' ? product.stock : 0,
      status: product.status || 'ACTIVE',
      imageUrl: product.imageUrl || null,
      handle: product.handle || 'product',
      createdAt: product.createdAt || new Date().toISOString(),
      updatedAt: product.updatedAt || new Date().toISOString()
    };
    
    setProducts(prev => [validatedProduct, ...prev]);
  };

  return (
    <div>
      <div className="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Shopify Products</h1>
        <div className="mt-3 sm:mt-0 sm:ml-4 flex items-center gap-4">
          {/* Card Size Slider */}
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-gray-700 whitespace-nowrap">Cards per row: {columnsCount}</div>
            <div className="w-48">
              <input
                type="range"
                min="5"
                max="12"
                step="1"
                value={columnsCount}
                onChange={(e) => updateColumnsCount(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create Product
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading products</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading && !isLoadingMore && !error ? (
        <div className="flex justify-center items-center h-64">
          <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : (
        <>
          {products.length === 0 && !isLoading ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
              <p className="mt-1 text-sm text-gray-500">No products available from Shopify.</p>
            </div>
          ) : (
            <div 
              className={`grid gap-6 ${isMobile ? 
                "grid-cols-1 sm:grid-cols-2" : 
                ""}`}
              style={!isMobile ? {
                gridTemplateColumns: `repeat(${columnsCount}, minmax(0, 1fr))`
              } : undefined}
            >
              {products.map((product) => (
                <div 
                  key={product.id} 
                  className="bg-white overflow-hidden shadow rounded-lg cursor-pointer transform transition duration-200 hover:shadow-lg hover:-translate-y-1 flex flex-col"
                  onClick={() => openProductModal(product)}
                  style={{
                    // Scale font size based on column count
                    fontSize: `${Math.max(70, 100 - (columnsCount - 4) * 5)}%`,
                    // Ensure all spacing scales proportionally with font size
                    aspectRatio: "0.8",
                  }}
                >
                  {/* Image container with fixed aspect ratio */}
                  <div className="relative bg-gray-200 w-full" style={{ flex: "1 0 60%" }}>
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="absolute inset-0 h-full w-full object-cover" 
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center h-full w-full bg-gray-100">
                        <svg className="w-1/4 h-1/4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* Content area that takes the remaining height */}
                  <div className="px-3 py-2" style={{ flex: "1 0 40%" }}>
                    <h3 className="font-medium text-gray-900 truncate leading-tight">{product.name}</h3>
                    
                    <div className="mt-1 flex items-center">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-800 truncate max-w-full">
                        {product.category || 'Uncategorized'}
                      </span>
                    </div>
                    
                    <div className="mt-1.5 flex justify-between items-center">
                      <div className="font-semibold text-gray-900">
                        ₹{product.price !== undefined ? product.price.toFixed(2) : '0.00'}
                      </div>
                      <span className={`px-1.5 py-0.5 inline-flex leading-none font-semibold rounded-full ${
                        product.stock > 10 
                          ? 'bg-green-100 text-green-800' 
                          : product.stock > 0 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {product.stock > 10 
                          ? 'In Stock' 
                          : product.stock > 0 
                            ? 'Low Stock' 
                            : 'Out of Stock'}
                        {product.stock > 0 && columnsCount < 8 && ` (${product.stock})`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Loading dots at bottom - only visible when loading more items */}
          {isLoadingMore && <LoadingDots />}
          
          {/* Invisible element to trigger infinite scroll */}
          {hasNextPage && !isLoadingMore && products.length > 0 && (
            <div ref={observerTarget} className="h-10" />
          )}
        </>
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal 
        product={selectedProduct} 
        isOpen={isModalOpen} 
        onClose={closeProductModal} 
        setProducts={setProducts}
        setSnackbar={setSnackbar}
      />
      
      {/* Create Product Modal */}
      <CreateProductModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onProductCreated={handleProductCreated}
        setSnackbar={setSnackbar}
      />
      
      {/* Snackbar for notifications */}
      {snackbar.open && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded shadow-lg ${
          snackbar.severity === 'success' ? 'bg-green-500' : 
          snackbar.severity === 'error' ? 'bg-red-500' : 
          snackbar.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
        } text-white z-50`}>
          <div className="flex items-center">
            <p>{snackbar.message}</p>
            <button 
              onClick={() => setSnackbar({...snackbar, open: false})}
              className="ml-4 text-white"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 