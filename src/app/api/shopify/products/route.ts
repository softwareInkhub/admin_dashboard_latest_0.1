import { NextRequest, NextResponse } from 'next/server';

// Set Shopify API details from environment variables
const SHOPIFY_STORE_NAME = process.env.SHOPIFY_STORE_NAME;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

// Shopify GraphQL API endpoint
const shopifyApiUrl = `https://${SHOPIFY_STORE_NAME}.myshopify.com/admin/api/2023-07/graphql.json`;

// GraphQL query to fetch products with pagination
const PRODUCTS_QUERY = `
  query($cursor: String, $pageSize: Int!) {
    products(first: $pageSize, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          description
          handle
          productType
          vendor
          totalInventory
          priceRangeV2 {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 1) {
            edges {
              node {
                url
                altText
              }
            }
          }
          status
          createdAt
          updatedAt
        }
      }
    }
  }
`;

// GraphQL query to fetch locations
const LOCATIONS_QUERY = `
  query {
    locations(first: 1) {
      edges {
        node {
          id
          name
        }
      }
    }
  }
`;

// GraphQL mutation to upload a file/image to Shopify
const STAGE_UPLOADS_MUTATION = `
  mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        url
        resourceUrl
        parameters {
          name
          value
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// GraphQL mutation to create a product
const CREATE_PRODUCT_MUTATION = `
  mutation productCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        description
        handle
        productType
        vendor
        status
        createdAt
        updatedAt
        totalInventory
        priceRangeV2 {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        images(first: 1) {
          edges {
            node {
              url
              altText
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Add a mutation to associate image with product after creation
const PRODUCT_APPEND_IMAGES_MUTATION = `
  mutation productAppendImages($input: ProductAppendImagesInput!) {
    productAppendImages(input: $input) {
      newImages {
        id
        url
      }
      product {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// GraphQL mutation to update a product
const UPDATE_PRODUCT_MUTATION = `
  mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        title
        description
        handle
        productType
        vendor
        status
        createdAt
        updatedAt
        totalInventory
        priceRangeV2 {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        images(first: 1) {
          edges {
            node {
              id
              url
              altText
            }
          }
        }
        variants(first: 1) {
          edges {
            node {
              id
              inventoryQuantity
              price
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Helper function to convert base64 to raw data
function base64ToFileData(base64String: string): { data: string, mimeType: string } {
  // Remove header (data:image/jpeg;base64,)
  const parts = base64String.split(',');
  const data = parts[1]; // base64 data
  // Get MIME type from the header
  const mimeType = parts[0].split(':')[1].split(';')[0];
  
  return { data, mimeType };
}

// Helper function to upload file to Shopify
async function uploadImageToShopify(base64Image: string): Promise<string | null> {
  console.log("Starting Shopify image upload process...");
  
  try {
    const { data, mimeType } = base64ToFileData(base64Image);
    const fileExt = mimeType.split('/')[1] || 'jpg';
    const filename = `product_image_${Date.now()}.${fileExt}`;
    const fileSize = Math.ceil((data.length * 3) / 4);
    
    // Step 1: Get a presigned URL from Shopify
    console.log("Requesting upload URL from Shopify...");
    const stageResponse = await fetch(shopifyApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
      },
      body: JSON.stringify({
        query: STAGE_UPLOADS_MUTATION,
        variables: {
          input: [
            {
              resource: "PRODUCT_IMAGE",
              filename,
              mimeType,
              fileSize: String(fileSize),
              httpMethod: "POST"
            }
          ]
        }
      })
    });
    
    if (!stageResponse.ok) {
      console.error("Failed to get upload URL:", stageResponse.statusText);
      return null;
    }
    
    const stageData = await stageResponse.json();
    console.log("Stage response:", JSON.stringify(stageData));
    
    if (stageData.data?.stagedUploadsCreate?.userErrors?.length > 0) {
      console.error("Staging errors:", stageData.data.stagedUploadsCreate.userErrors);
      return null;
    }
    
    if (!stageData.data?.stagedUploadsCreate?.stagedTargets?.[0]) {
      console.error("No staged upload target returned");
      return null;
    }
    
    const { url, parameters, resourceUrl } = stageData.data.stagedUploadsCreate.stagedTargets[0];
    
    // Step 2: Create a multi-part form data upload
    console.log("Preparing upload to:", url);
    
    // Using fetch with FormData directly
    const formData = new FormData();
    
    // Add all the parameters Shopify provided
    parameters.forEach(param => {
      formData.append(param.name, param.value);
    });
    
    // Convert base64 to blob
    // Use Buffer instead of atob for Node.js
    const buffer = Buffer.from(data, 'base64');
    const byteArray = new Uint8Array(buffer);
    const blob = new Blob([byteArray], { type: mimeType });
    
    // Add the file
    formData.append('file', blob, filename);
    
    // Step 3: Upload to the presigned URL
    console.log("Uploading file to Shopify CDN...");
    const uploadResponse = await fetch(url, {
      method: 'POST',
      body: formData
    });
    
    if (!uploadResponse.ok) {
      console.error("Upload failed:", uploadResponse.statusText);
      const errorText = await uploadResponse.text();
      console.error("Upload error details:", errorText);
      return null;
    }
    
    console.log("Upload successful, resource URL:", resourceUrl);
    return resourceUrl;
  } catch (error) {
    console.error("Error uploading image to Shopify:", error);
    return null;
  }
}

// Helper function to upload base64 image to Shopify product
async function createProductWithImage(productData: any, base64Image: string, locationId: string): Promise<any> {
  try {
    console.log("Creating product with direct image upload...");
    
    // Convert base64 to blob
    const { data, mimeType } = base64ToFileData(base64Image);
    
    // Create a product first using the REST API instead of GraphQL
    const productCreateUrl = `https://${SHOPIFY_STORE_NAME}.myshopify.com/admin/api/2023-07/products.json`;
    
    // Create the product payload
    const productPayload = {
      product: {
        title: productData.name,
        body_html: productData.description || '',
        vendor: productData.vendor || '',
        product_type: productData.category || '',
        status: (productData.status || 'ACTIVE').toLowerCase(),
        variants: [
          {
            price: productData.price.toString(),
            inventory_management: 'shopify',
            inventory_quantity: parseInt(productData.stock, 10)
          }
        ]
      }
    };
    
    console.log("Creating product with payload:", JSON.stringify(productPayload));
    
    // Create the product
    const productResponse = await fetch(productCreateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
      },
      body: JSON.stringify(productPayload)
    });
    
    // Get full response for debugging
    const responseText = await productResponse.text();
    
    if (!productResponse.ok) {
      console.error("Failed to create product via REST API:", productResponse.statusText);
      console.error("Error details:", responseText);
      return null;
    }
    
    // Parse the response
    let productResponseData;
    try {
      productResponseData = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse product response as JSON:", e);
      console.error("Raw response:", responseText);
      return null;
    }
    
    if (!productResponseData.product) {
      console.error("Unexpected response format - missing product:", responseText);
      return null;
    }
    
    const createdProduct = productResponseData.product;
    const productId = createdProduct.id;
    
    console.log("Product created successfully, ID:", productId);
    
    // Now upload the image directly to the product
    if (base64Image) {
      const imageUploadUrl = `https://${SHOPIFY_STORE_NAME}.myshopify.com/admin/api/2023-07/products/${productId}/images.json`;
      
      // Create image payload with base64 data - don't include the data:image/jpeg;base64, prefix
      const imagePayload = {
        image: {
          attachment: data,
          filename: `product_image_${Date.now()}.${mimeType.split('/')[1] || 'jpg'}`
        }
      };
      
      console.log(`Uploading image to product ${productId}, image type: ${mimeType}`);
      const imageResponse = await fetch(imageUploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
        },
        body: JSON.stringify(imagePayload)
      });
      
      const imageResponseText = await imageResponse.text();
      
      if (!imageResponse.ok) {
        console.error("Failed to attach image via REST API:", imageResponse.statusText);
        console.error("Error details:", imageResponseText);
      } else {
        try {
          const imageData = JSON.parse(imageResponseText);
          console.log("Image uploaded successfully:", imageData.image.id);
          createdProduct.image = imageData.image;
        } catch (e) {
          console.error("Failed to parse image response:", e);
          console.error("Raw image response:", imageResponseText);
        }
      }
    }
    
    // Make sure the inventory is set at the location
    try {
      const inventoryItemId = createdProduct.variants[0].inventory_item_id;
      const inventoryUrl = `https://${SHOPIFY_STORE_NAME}.myshopify.com/admin/api/2023-07/inventory_levels/set.json`;
      
      // Properly extract the numeric location ID
      let numericLocationId: string;
      
      if (typeof locationId === 'string' && locationId.startsWith('gid://shopify/Location/')) {
        // Extract the numeric ID from the GraphQL global ID format
        numericLocationId = locationId.split('/').pop() || '';
      } else {
        // If it's already numeric or in another format, keep it as is
        numericLocationId = String(locationId);
      }
      
      console.log(`Setting inventory for item ${inventoryItemId} at location ${numericLocationId}`);
      
      const inventoryResponse = await fetch(inventoryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
        },
        body: JSON.stringify({
          location_id: numericLocationId,
          inventory_item_id: inventoryItemId,
          available: parseInt(productData.stock, 10)
        })
      });
      
      if (!inventoryResponse.ok) {
        const errorText = await inventoryResponse.text();
        console.error("Error setting inventory level:", errorText);
      } else {
        const inventoryData = await inventoryResponse.json();
        console.log("Inventory level set successfully:", inventoryData);
      }
    } catch (err) {
      console.error("Error setting inventory level:", err);
    }
    
    return createdProduct;
  } catch (error) {
    console.error("Error in createProductWithImage:", error);
    return null;
  }
}

// Helper function to update a product with image
async function updateProductWithImage(productId: string, productData: any, base64Image: string, locationId: string): Promise<any> {
  try {
    console.log("Updating product with image upload, productId:", productId);
    
    // Get the current product first to have the variant information
    const productGetUrl = `https://${SHOPIFY_STORE_NAME}.myshopify.com/admin/api/2023-07/products/${productId}.json`;
    const productGetResponse = await fetch(productGetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
      }
    });
    
    if (!productGetResponse.ok) {
      console.error("Failed to fetch current product for update:", productGetResponse.statusText);
      const errorText = await productGetResponse.text();
      console.error("Error details:", errorText);
      throw new Error(`Failed to fetch product details for update: ${productGetResponse.status} ${productGetResponse.statusText}`);
    }
    
    let currentProductData;
    try {
      currentProductData = await productGetResponse.json();
      console.log("Current product data:", JSON.stringify(currentProductData.product));
    } catch (e) {
      console.error("Failed to parse product data:", e);
      throw new Error("Failed to parse product data from Shopify");
    }
    
    // Convert base64 to data
    const { data, mimeType } = base64ToFileData(base64Image);
    
    // Create the simplified product update payload without variants
    const productPayload: any = {
      product: {
        id: productId,
        title: productData.name,
        body_html: productData.description || '',
        vendor: productData.vendor || '',
        product_type: productData.category || '',
        status: (productData.status || 'ACTIVE').toLowerCase(),
      }
    };
    
    console.log("Updating product with basic payload:", JSON.stringify(productPayload));
    
    // First update the product without variants or images
    const productUpdateUrl = `https://${SHOPIFY_STORE_NAME}.myshopify.com/admin/api/2023-07/products/${productId}.json`;
    const productResponse = await fetch(productUpdateUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
      },
      body: JSON.stringify(productPayload)
    });
    
    const responseText = await productResponse.text();
    
    if (!productResponse.ok) {
      console.error("Failed to update product via REST API:", productResponse.statusText);
      console.error("Error details:", responseText);
      throw new Error(`Failed to update product: ${responseText}`);
    }
    
    let productResponseData;
    try {
      productResponseData = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse product response as JSON:", e);
      console.error("Raw response:", responseText);
      throw new Error(`Failed to parse update response: ${responseText}`);
    }
    
    if (!productResponseData.product) {
      console.error("Unexpected response format - missing product:", responseText);
      throw new Error("Unexpected response format from Shopify - missing product data");
    }
    
    let updatedProduct = productResponseData.product;
    
    // Now update the variant separately if price or stock changed
    if ((productData.price !== undefined || productData.stock !== undefined) && 
        currentProductData.product.variants && 
        currentProductData.product.variants.length > 0) {
      
      const variantId = currentProductData.product.variants[0].id;
      const variantUpdateUrl = `https://${SHOPIFY_STORE_NAME}.myshopify.com/admin/api/2023-07/variants/${variantId}.json`;
      
      const variantPayload: any = {
        variant: {
          id: variantId
        }
      };
      
      if (productData.price !== undefined) {
        variantPayload.variant.price = productData.price.toString();
      }
      
      if (productData.stock !== undefined) {
        variantPayload.variant.inventory_quantity = parseInt(productData.stock.toString(), 10);
      }
      
      console.log("Updating variant with payload:", JSON.stringify(variantPayload));
      
      try {
        const variantResponse = await fetch(variantUpdateUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
          },
          body: JSON.stringify(variantPayload)
        });
        
        if (!variantResponse.ok) {
          const errorText = await variantResponse.text();
          console.error("Failed to update variant:", variantResponse.statusText);
          console.error("Variant update error details:", errorText);
          // Don't throw, continue with the update
        } else {
          // If variant update was successful, get the updated variant data
          const variantData = await variantResponse.json();
          console.log("Variant updated successfully:", JSON.stringify(variantData));
          
          // Update the variant in our product data
          updatedProduct.variants = [{
            ...updatedProduct.variants[0],
            ...variantData.variant
          }];
        }
      } catch (variantError) {
        console.error("Error during variant update:", variantError);
        // Continue without variant update
      }
    }
    
    // Set inventory at the specific location if stock is provided
    if (productData.stock !== undefined && updatedProduct.variants && updatedProduct.variants.length > 0) {
      try {
        const inventoryItemId = updatedProduct.variants[0].inventory_item_id;
        const inventoryUrl = `https://${SHOPIFY_STORE_NAME}.myshopify.com/admin/api/2023-07/inventory_levels/set.json`;
        
        // Properly extract the numeric location ID
        let numericLocationId: string;
        
        if (typeof locationId === 'string' && locationId.startsWith('gid://shopify/Location/')) {
          // Extract the numeric ID from the GraphQL global ID format
          numericLocationId = locationId.split('/').pop() || '';
        } else {
          // If it's already numeric or in another format, keep it as is
          numericLocationId = String(locationId);
        }
        
        console.log(`Setting inventory for item ${inventoryItemId} at location ${numericLocationId}`);
        
        const inventoryResponse = await fetch(inventoryUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
          },
          body: JSON.stringify({
            location_id: numericLocationId,
            inventory_item_id: inventoryItemId,
            available: parseInt(productData.stock.toString(), 10)
          })
        });
        
        if (!inventoryResponse.ok) {
          const errorText = await inventoryResponse.text();
          console.error("Error setting inventory level:", errorText);
        } else {
          const inventoryData = await inventoryResponse.json();
          console.log("Inventory level set successfully:", inventoryData);
        }
      } catch (err) {
        console.error("Error setting inventory level:", err);
      }
    }
    
    // Now upload the image separately
    let uploadedImageUrl = null;
    
    if (base64Image) {
      try {
        // Delete any existing images first to avoid multiple images problem
        console.log("Checking for existing images to delete before uploading new one");
        const listImagesUrl = `https://${SHOPIFY_STORE_NAME}.myshopify.com/admin/api/2023-07/products/${productId}/images.json`;
        const imagesResponse = await fetch(listImagesUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
          }
        });
        
        if (imagesResponse.ok) {
          const imagesData = await imagesResponse.json();
          if (imagesData.images && imagesData.images.length > 0) {
            console.log(`Found ${imagesData.images.length} existing images, deleting them before uploading new image`);
            
            // Delete each existing image
            for (const image of imagesData.images) {
              const deleteImageUrl = `https://${SHOPIFY_STORE_NAME}.myshopify.com/admin/api/2023-07/products/${productId}/images/${image.id}.json`;
              await fetch(deleteImageUrl, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
                }
              });
              console.log(`Deleted image ID: ${image.id}`);
            }
          }
        }
        
        // Now upload the new image
        const imageUploadUrl = `https://${SHOPIFY_STORE_NAME}.myshopify.com/admin/api/2023-07/products/${productId}/images.json`;
        
        // Create image payload with base64 data
        const imagePayload = {
          image: {
            attachment: data,
            filename: `product_image_${Date.now()}.${mimeType.split('/')[1] || 'jpg'}`
          }
        };
        
        console.log(`Uploading new image to product ${productId}, image type: ${mimeType}`);
        const imageResponse = await fetch(imageUploadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
          },
          body: JSON.stringify(imagePayload)
        });
        
        if (!imageResponse.ok) {
          const errorText = await imageResponse.text();
          console.error("Failed to attach image via REST API:", imageResponse.statusText);
          console.error("Error details:", errorText);
          // Don't throw, continue with the update
        } else {
          const imageData = await imageResponse.json();
          console.log("Image uploaded successfully:", imageData.image.id);
          updatedProduct.image = imageData.image;
          
          // Save the image URL to return later
          uploadedImageUrl = imageData.image.src;
          console.log("New image URL:", uploadedImageUrl);
          
          // Wait a moment to ensure Shopify has processed the image
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      } catch (imageError) {
        console.error("Error during image upload:", imageError);
        // Continue without image upload
      }
    }
    
    // Get the updated product with all the latest changes
    const finalProductResponse = await fetch(productGetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
      }
    });
    
    if (finalProductResponse.ok) {
      const finalProductData = await finalProductResponse.json();
      
      // Keep our uploaded image if the final product doesn't have one
      if (uploadedImageUrl) {
        console.log(`Ensuring the latest image URL (${uploadedImageUrl}) is used in the response`);
        if (!finalProductData.product.image) {
          finalProductData.product.image = { src: uploadedImageUrl };
        } else {
          // Always use our uploaded image URL since it's the most recent
          finalProductData.product.image.src = uploadedImageUrl;
        }
      }
      
      updatedProduct = finalProductData.product;
    }
    
    // Format the response properly for the frontend
    const formattedResponse = {
      id: updatedProduct.id,
      name: updatedProduct.title || '',
      description: updatedProduct.body_html || '',
      category: updatedProduct.product_type || '',
      vendor: updatedProduct.vendor || '',
      status: updatedProduct.status || 'ACTIVE',
      price: updatedProduct.variants?.[0]?.price ? parseFloat(updatedProduct.variants[0].price) : 0,
      stock: updatedProduct.variants?.[0]?.inventory_quantity || 0,
      currencyCode: "INR",
      // ALWAYS use our uploaded image URL if we have one, it's more reliable than what comes back from the product GET
      imageUrl: uploadedImageUrl || updatedProduct.image?.src || null,
      handle: updatedProduct.handle || '',
      createdAt: updatedProduct.created_at || new Date().toISOString(),
      updatedAt: updatedProduct.updated_at || new Date().toISOString()
    };
    
    console.log("Returning formatted product with image URL:", formattedResponse.imageUrl);
    
    return formattedResponse;
  } catch (error) {
    console.error("Error in updateProductWithImage:", error);
    // Instead of just throwing the error, reformat it as a properly structured error object
    const errorMessage = error instanceof Error ? error.message : "Unknown error during product update";
    throw { error: errorMessage };
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!SHOPIFY_STORE_NAME || !SHOPIFY_ACCESS_TOKEN) {
      console.error("Missing Shopify credentials in environment variables");
      return NextResponse.json(
        { error: "Shopify API configuration missing" },
        { status: 500 }
      );
    }

    // Get pagination parameters from the request
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor') || null;
    const pageSize = parseInt(searchParams.get('pageSize') || '12', 10);
    
    // Make request to Shopify GraphQL API
    const response = await fetch(shopifyApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
      },
      body: JSON.stringify({ 
        query: PRODUCTS_QUERY,
        variables: { 
          cursor,
          pageSize
        } 
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Shopify API error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch products from Shopify" },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Transform the data into a simpler format
    const products = data.data.products.edges.map(({ node }) => {
      // Get the first image URL or null if no images
      const imageUrl = node.images.edges.length > 0 
        ? node.images.edges[0].node.url 
        : null;
        
      // Format the price
      const price = node.priceRangeV2.minVariantPrice.amount;
      
      // Ensure dates are valid and formatted properly
      let createdAt = node.createdAt;
      let updatedAt = node.updatedAt;
      
      try {
        // Validate dates by attempting to parse them
        if (createdAt) new Date(createdAt);
        if (updatedAt) new Date(updatedAt);
      } catch (e) {
        // If dates are invalid, use current time
        console.warn("Invalid dates received for product", node.id);
        createdAt = new Date().toISOString();
        updatedAt = new Date().toISOString();
      }
      
      return {
        id: node.id,
        name: node.title || '',
        description: node.description || '',
        category: node.productType || '',
        vendor: node.vendor || '',
        price: parseFloat(price) || 0,
        currencyCode: node.priceRangeV2.minVariantPrice.currencyCode || 'USD',
        stock: typeof node.totalInventory === 'number' ? node.totalInventory : 0,
        status: node.status || 'ACTIVE',
        imageUrl,
        handle: node.handle || '',
        createdAt,
        updatedAt
      };
    });

    // Extract pagination info
    const pagination = {
      hasNextPage: data.data.products.pageInfo.hasNextPage,
      endCursor: data.data.products.pageInfo.endCursor
    };

    return NextResponse.json({ products, pagination });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("POST request received to create a product");
    
    // Parse the product data from the request
    const productData = await request.json();
    console.log("Received product data:", JSON.stringify(productData));
    
    // Check for environment variables
    if (!SHOPIFY_STORE_NAME || !SHOPIFY_ACCESS_TOKEN) {
      console.warn("Shopify credentials missing - using mock implementation");
      
      // Generate a mock product response
      const mockProduct = {
        id: `gid://shopify/Product/${Date.now()}`,
        name: productData.name || 'Untitled Product',
        description: productData.description || '',
        category: productData.category || '',
        vendor: productData.vendor || 'Default Vendor',
        price: productData.price ? parseFloat(productData.price.toString()) : 0,
        currencyCode: "INR",
        stock: productData.stock ? parseInt(productData.stock.toString(), 10) : 0,
        status: 'ACTIVE',
        imageUrl: productData.imageUrl || null,
        handle: (productData.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log("Created mock product:", mockProduct);
      
      // Delay to simulate network request
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return NextResponse.json({ 
        product: mockProduct, 
        success: true,
        mock: true 
      });
    }

    // First, fetch locations to get a valid locationId
    console.log("Fetching Shopify locations...");
    const locationsResponse = await fetch(shopifyApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
      },
      body: JSON.stringify({
        query: LOCATIONS_QUERY
      })
    });

    if (!locationsResponse.ok) {
      console.error("Failed to fetch Shopify locations:", locationsResponse.statusText);
      return NextResponse.json(
        { error: "Failed to fetch Shopify locations" },
        { status: locationsResponse.status }
      );
    }

    const locationsData = await locationsResponse.json();
    
    if (!locationsData.data?.locations?.edges?.length) {
      console.error("No locations found in Shopify store");
      return NextResponse.json(
        { error: "No locations found in Shopify store" },
        { status: 400 }
      );
    }

    const locationId = locationsData.data.locations.edges[0].node.id;
    console.log("Using Shopify location:", locationId);

    // Check if we have a base64 image
    if (productData.imageUrl && productData.imageUrl.startsWith('data:')) {
      // Use the REST API approach for base64 images
      console.log("Base64 image detected - using REST API for product creation");
      try {
        const createdProduct = await createProductWithImage(productData, productData.imageUrl, locationId);
        
        if (!createdProduct) {
          console.error("Failed to create product with image - createProductWithImage returned null");
          return NextResponse.json(
            { error: "Failed to create product with image. Check server logs for details." },
            { status: 500 }
          );
        }
        
        // Format the response
        const product = {
          id: createdProduct.id,
          name: createdProduct.title,
          description: createdProduct.body_html,
          category: createdProduct.product_type,
          vendor: createdProduct.vendor,
          price: parseFloat(createdProduct.variants[0].price),
          currencyCode: "INR",
          stock: createdProduct.variants[0].inventory_quantity,
          status: createdProduct.status.toUpperCase(),
          imageUrl: createdProduct.image ? createdProduct.image.src : null,
          handle: createdProduct.handle,
          createdAt: createdProduct.created_at,
          updatedAt: createdProduct.updated_at
        };
        
        return NextResponse.json({ product, success: true });
      } catch (error) {
        console.error("Exception during product creation with image:", error);
        return NextResponse.json(
          { error: `Failed to create product with image: ${error.message || "Unknown error"}` },
          { status: 500 }
        );
      }
    }
    
    // If we don't have a base64 image, continue with the GraphQL approach
    // Prepare the GraphQL variables with proper locationId
    const variables = {
      input: {
        title: productData.name,
        descriptionHtml: productData.description || '',
        productType: productData.category || '',
        vendor: productData.vendor || '',
        status: productData.status || 'ACTIVE',
        variants: [
          {
            price: productData.price.toString(),
            inventoryQuantities: [
              {
                locationId: locationId,
                availableQuantity: parseInt(productData.stock, 10)
              }
            ]
          }
        ]
      }
    };
    
    // If we have a non-base64 image URL, add it directly
    if (productData.imageUrl && !productData.imageUrl.startsWith('data:')) {
      variables.input.images = [{ src: productData.imageUrl }];
    }
    
    console.log("Shopify API Endpoint:", shopifyApiUrl);
    console.log("Mutation variables:", JSON.stringify(variables));
    
    // Make request to Shopify GraphQL API
    try {
      console.log("Sending request to Shopify API...");
      const response = await fetch(shopifyApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
        },
        body: JSON.stringify({
          query: CREATE_PRODUCT_MUTATION,
          variables
        })
      });

      console.log("Shopify API response status:", response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Shopify API error response:", errorText);
        return NextResponse.json(
          { error: `Shopify API error: ${response.status} ${response.statusText}` },
          { status: response.status }
        );
      }

      // Try to parse the response as JSON
      let data;
      try {
        const text = await response.text();
        console.log("Response text:", text);
        data = JSON.parse(text);
      } catch (error) {
        console.error("Failed to parse JSON response:", error);
        return NextResponse.json(
          { error: "Failed to parse Shopify API response" },
          { status: 500 }
        );
      }
      
      // Check for GraphQL errors
      if (data.errors) {
        console.error("GraphQL errors:", data.errors);
        return NextResponse.json(
          { error: `GraphQL errors: ${data.errors.map((e: any) => e.message).join(', ')}` },
          { status: 400 }
        );
      }

      // Check for user errors in the mutation response
      if (data.data.productCreate.userErrors && data.data.productCreate.userErrors.length > 0) {
        const errors = data.data.productCreate.userErrors;
        console.error("Product creation errors:", errors);
        return NextResponse.json(
          { error: `Failed to create product: ${errors.map(e => e.message).join(', ')}` },
          { status: 400 }
        );
      }
      
      const createdProduct = data.data.productCreate.product;
      
      // Format the created product for the response
      const product = {
        id: createdProduct.id,
        name: createdProduct.title,
        description: createdProduct.description,
        category: createdProduct.productType,
        vendor: createdProduct.vendor,
        price: parseFloat(createdProduct.priceRangeV2.minVariantPrice.amount),
        currencyCode: createdProduct.priceRangeV2.minVariantPrice.currencyCode,
        stock: createdProduct.totalInventory,
        status: createdProduct.status,
        imageUrl: createdProduct.images.edges.length > 0 ? createdProduct.images.edges[0].node.url : null,
        handle: createdProduct.handle,
        createdAt: createdProduct.createdAt,
        updatedAt: createdProduct.updatedAt
      };

      return NextResponse.json({ product, success: true });
    } catch (error) {
      console.error("Error creating product:", error);
      return NextResponse.json(
        { error: "Failed to create product" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log("PUT request received to update a product");
    
    // Parse the product data from the request
    const productData = await request.json();
    console.log("Received product update data:", JSON.stringify(productData));
    
    if (!productData.id) {
      return NextResponse.json(
        { error: "Product ID is required for updates", success: false },
        { status: 400 }
      );
    }
    
    // Extract the product ID
    let productId = productData.id;
    // If the ID is a GID format, extract the numeric ID
    if (typeof productId === 'string' && productId.includes("gid://shopify/Product/")) {
      productId = productId.replace("gid://shopify/Product/", "");
    } else {
      // Ensure productId is a string
      productId = String(productId);
    }
    
    // Check for environment variables
    if (!SHOPIFY_STORE_NAME || !SHOPIFY_ACCESS_TOKEN) {
      console.warn("Shopify credentials missing - using mock implementation");
      
      // Generate a mock product response for update
      const mockProduct = {
        id: productData.id,
        name: productData.name || 'Updated Product',
        description: productData.description || '',
        category: productData.category || '',
        vendor: productData.vendor || 'Default Vendor',
        price: productData.price ? parseFloat(productData.price.toString()) : 0,
        currencyCode: "INR",
        stock: productData.stock ? parseInt(productData.stock.toString(), 10) : 0,
        status: productData.status || 'ACTIVE',
        imageUrl: productData.imageUrl || null,
        handle: (productData.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        updatedAt: new Date().toISOString()
      };
      
      console.log("Created mock updated product:", mockProduct);
      
      // Delay to simulate network request
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return NextResponse.json({ 
        product: mockProduct, 
        success: true,
        mock: true 
      });
    }

    // First, fetch locations to get a valid locationId
    console.log("Fetching Shopify locations...");
    const locationsResponse = await fetch(shopifyApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
      },
      body: JSON.stringify({
        query: LOCATIONS_QUERY
      })
    });

    if (!locationsResponse.ok) {
      console.error("Failed to fetch Shopify locations:", locationsResponse.statusText);
      return NextResponse.json(
        { error: "Failed to fetch Shopify locations" },
        { status: locationsResponse.status }
      );
    }

    const locationsData = await locationsResponse.json();
    
    if (!locationsData.data?.locations?.edges?.length) {
      console.error("No locations found in Shopify store");
      return NextResponse.json(
        { error: "No locations found in Shopify store" },
        { status: 400 }
      );
    }

    const locationId = locationsData.data.locations.edges[0].node.id;
    console.log("Using Shopify location:", locationId);

    try {
      console.log(`Updating product ID: ${productId}`);
      
      // If we have a base64 image, use the updateProductWithImage function
      if (productData.imageUrl && productData.imageUrl.startsWith('data:')) {
        console.log("Base64 image detected - using updateProductWithImage");
        const updatedProduct = await updateProductWithImage(productId, productData, productData.imageUrl, locationId);
        
        return NextResponse.json({ 
          product: updatedProduct, 
          success: true 
        });
      }
      
      // If we don't have a base64 image, continue with the GraphQL approach
      // Prepare the GraphQL variables with proper locationId
      const variables = {
        input: {
          title: productData.name,
          descriptionHtml: productData.description || '',
          productType: productData.category || '',
          vendor: productData.vendor || '',
          status: productData.status || 'ACTIVE',
          variants: [
            {
              price: productData.price.toString(),
              inventoryQuantities: [
                {
                  locationId: locationId,
                  availableQuantity: parseInt(productData.stock, 10)
                }
              ]
            }
          ]
        }
      };
      
      // If we have a non-base64 image URL, add it directly
      if (productData.imageUrl && !productData.imageUrl.startsWith('data:')) {
        variables.input.images = [{ src: productData.imageUrl }];
      }
      
      console.log("Shopify API Endpoint:", shopifyApiUrl);
      console.log("Mutation variables:", JSON.stringify(variables));
      
      // Make request to Shopify GraphQL API
      try {
        console.log("Sending request to Shopify API...");
        const response = await fetch(shopifyApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
          },
          body: JSON.stringify({
            query: UPDATE_PRODUCT_MUTATION,
            variables
          })
        });

        console.log("Shopify API response status:", response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Shopify API error response:", errorText);
          return NextResponse.json(
            { error: `Shopify API error: ${response.status} ${response.statusText}` },
            { status: response.status }
          );
        }

        // Try to parse the response as JSON
        let data;
        try {
          const text = await response.text();
          console.log("Response text:", text);
          data = JSON.parse(text);
        } catch (error) {
          console.error("Failed to parse JSON response:", error);
          return NextResponse.json(
            { error: "Failed to parse Shopify API response" },
            { status: 500 }
          );
        }
        
        // Check for GraphQL errors
        if (data.errors) {
          console.error("GraphQL errors:", data.errors);
          return NextResponse.json(
            { error: `GraphQL errors: ${data.errors.map((e: any) => e.message).join(', ')}` },
            { status: 400 }
          );
        }

        // Check for user errors in the mutation response
        if (data.data.productUpdate.userErrors && data.data.productUpdate.userErrors.length > 0) {
          const errors = data.data.productUpdate.userErrors;
          console.error("Product update errors:", errors);
          return NextResponse.json(
            { error: `Failed to update product: ${errors.map(e => e.message).join(', ')}` },
            { status: 400 }
          );
        }
        
        const updatedProduct = data.data.productUpdate.product;
        
        // Format the updated product for the response
        const formattedProduct = {
          id: updatedProduct.id,
          name: updatedProduct.title || '',
          description: updatedProduct.body_html || '',
          category: updatedProduct.product_type || '',
          vendor: updatedProduct.vendor || '',
          status: updatedProduct.status || 'ACTIVE',
          price: updatedProduct.variants?.[0]?.price ? parseFloat(updatedProduct.variants[0].price) : 0,
          stock: updatedProduct.variants?.[0]?.inventory_quantity || 0,
          currencyCode: "INR",
          imageUrl: updatedProduct.image?.src || null,
          handle: updatedProduct.handle || '',
          createdAt: updatedProduct.created_at || new Date().toISOString(),
          updatedAt: updatedProduct.updated_at || new Date().toISOString()
        };
        
        console.log("Product update successful");
        return NextResponse.json({ 
          product: formattedProduct, 
          success: true 
        });
        
      } catch (error) {
        console.error("Error updating product:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
          { error: `Failed to update product: ${errorMessage}`, success: false },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error("Error processing update request:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { error: `Failed to process update request: ${errorMessage}`, success: false },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing update request:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to process update request: ${errorMessage}`, success: false },
      { status: 500 }
    );
  }
} 