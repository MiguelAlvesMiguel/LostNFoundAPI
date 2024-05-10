// apiService.tsx
import axios from 'axios';

const BASE_URL = 'http://localhost:3999/v1';

export const fetchLostItems = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/items/lost`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch lost items:', error);
    return [];
  }
}

export const registerLostItem = async (itemData, token) => {
  try {
    const response = await axios.post(`${BASE_URL}/items/lost`, itemData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to register lost item:', error);
    return null;
  }
}

export const updateLostItemDetails = async (itemId, itemData, token) => {
  try {
    const response = await axios.put(`${BASE_URL}/items/lost/${itemId}`, itemData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to update lost item details:', error);
    return null;
  }
}

export const deleteLostItem = async (itemId, token) => {
  try {
    const response = await axios.delete(`${BASE_URL}/items/lost/${itemId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.status === 204; // Return true if the deletion was successful
  } catch (error) {
    console.error('Failed to delete lost item:', error);
    return false;
  }
}

export const searchLostItemsByDescription = async (description, token) => {
  try {
    const response = await axios.get(`${BASE_URL}/items/lost/search`, {
      params: { description },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to search lost items by description:', error);
    return [];
  }
}

export const searchLostItemsByCategory = async (category, token) => {
  try {
    const response = await axios.get(`${BASE_URL}/items/lost/category`, {
      params: { category },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to search lost items by category:', error);
    return [];
  }
}

export const fetchFoundItems = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/items/found`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch found items:', error);
    return [];
  }
}

export const deliverFoundItem = async (itemId, ownerId, deliveryDate, token) => {
  try {
    const response = await axios.post(`${BASE_URL}/items/found/${itemId}/deliver`, {
      ownerId,
      deliveryDate,
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to deliver found item:', error);
    return null;
  }
}

export const compareLostAndFoundItems = async (lostItemId, foundItemId, token) => {
  try {
    const response = await axios.get(`${BASE_URL}/items/compare/${lostItemId}/${foundItemId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to compare items:', error);
    return null;
  }
}
