// services/uploadService.ts

import {launchImageLibrary, launchCamera, Asset} from 'react-native-image-picker';
import * as DocumentPicker from '@react-native-documents/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';

const API_URL = 'http://10.193.107.205:8080';  // Update this to match your API URL

// Helper to get auth token
const getAuthToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    console.log('[UPLOAD] Auth token:', token ? 'Found' : 'Not found');
    return token;
  } catch (error) {
    console.error('[UPLOAD] Error getting auth token:', error);
    return null;
  }
};

// ===== PROFILE PICTURE UPLOAD =====

export interface UploadResponse {
  success: boolean;
  url?: string;
  message?: string;
  error?: string;
}

/**
 * Pick and upload profile picture
 * Works for all users: student, teacher, parent, admin
 */
export const uploadProfilePicture = async (): Promise<UploadResponse> => {
  try {
    // Pick image
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: false,
      maxWidth: 1024,
      maxHeight: 1024,
    });

    if (result.didCancel) {
      return { success: false, error: 'User cancelled' };
    }

    if (result.errorCode) {
      return { success: false, error: result.errorMessage || 'Failed to pick image' };
    }

    if (!result.assets || result.assets.length === 0) {
      return { success: false, error: 'No image selected' };
    }

    const image = result.assets[0];
    
    // Create form data
    const formData = new FormData();
    formData.append('file', {
      uri: Platform.OS === 'ios' ? image.uri?.replace('file://', '') : image.uri,
      type: image.type || 'image/jpeg',
      name: image.fileName || 'profile.jpg',
    } as any);

    // Get token
    const token = await getAuthToken();
    if (!token) {
      console.error('[UPLOAD] Authentication failed - no token found');
      return { success: false, error: 'Not authenticated. Please login again.' };
    }

    console.log('[UPLOAD] Uploading profile picture with token...');
    const response = await fetch(`${API_URL}/api/upload/profile-picture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    const data = await response.json();
    console.log('[UPLOAD] Response status:', response.status);
    console.log('[UPLOAD] Response data:', data);

    if (response.ok && data.success) {
      console.log('[UPLOAD] Upload successful');
      return { success: true, url: data.url, message: data.message };
    } else {
      const errorMsg = data.detail || data.message || 'Upload failed';
      console.error('[UPLOAD] Upload failed with error:', errorMsg);
      return { success: false, error: errorMsg };
    }
  } catch (error: any) {
    console.error('[UPLOAD] Upload error:', error);
    return { success: false, error: error.message || 'Upload failed' };
  }
};

/**
 * Take photo with camera for profile picture
 */
export const takeProfilePhoto = async (): Promise<UploadResponse> => {
  try {
    // Take photo
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: false,
      maxWidth: 1024,
      maxHeight: 1024,
      cameraType: 'back',
    });

    if (result.didCancel) {
      return { success: false, error: 'User cancelled' };
    }

    if (result.errorCode) {
      return { success: false, error: result.errorMessage || 'Failed to take photo' };
    }

    if (!result.assets || result.assets.length === 0) {
      return { success: false, error: 'No photo taken' };
    }

    const image = result.assets[0];

    // Create form data
    const formData = new FormData();
    formData.append('file', {
      uri: Platform.OS === 'ios' ? image.uri?.replace('file://', '') : image.uri,
      type: image.type || 'image/jpeg',
      name: image.fileName || 'profile.jpg',
    } as any);

    const token = await getAuthToken();
    if (!token) {
      console.error('[UPLOAD] Authentication failed - no token found');
      return { success: false, error: 'Not authenticated. Please login again.' };
    }

    console.log('[UPLOAD] Taking photo and uploading...');

    const response = await fetch(`${API_URL}/api/upload/profile-picture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return { success: true, url: data.url, message: data.message };
    } else {
      return { success: false, error: data.detail || 'Upload failed' };
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Upload failed' };
  }
};


// ===== TEACHER DOCUMENT UPLOADS =====

export interface DocumentUploadResponse extends UploadResponse {
  document_type?: string;
  degree_name?: string;
  certificate_name?: string;
}

/**
 * Upload CNIC image (front or back)
 * Only for teachers
 * @param side - 'front' or 'back' of CNIC
 * @param useCamera - Use camera (true) or gallery (false)
 */
export const uploadCNIC = async (
  side: 'front' | 'back' = 'front',
  useCamera: boolean = true
): Promise<DocumentUploadResponse> => {
  try {
    let result;

    if (useCamera) {
      // Use camera for CNIC (better quality, avoid blurry gallery photos)
      result = await launchCamera({
        mediaType: 'photo',
        quality: 0.9,  // Higher quality for documents
        includeBase64: false,
        cameraType: 'back',
      });
    } else {
      // Pick from gallery
      result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.9,
        includeBase64: false,
      });
    }

    if (result.didCancel) {
      return { success: false, error: 'User cancelled' };
    }

    if (result.errorCode) {
      return { success: false, error: result.errorMessage || 'Failed to get image' };
    }

    if (!result.assets || result.assets.length === 0) {
      return { success: false, error: 'No image selected' };
    }

    const image = result.assets[0];

    const formData = new FormData();
    formData.append('file', {
      uri: Platform.OS === 'ios' ? image.uri?.replace('file://', '') : image.uri,
      type: image.type || 'image/jpeg',
      name: image.fileName || `cnic_${side}.jpg`,
    } as any);
    formData.append('side', side);

    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(`${API_URL}/api/upload/teacher/cnic`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        url: data.url,
        document_type: data.document_type,
        message: data.message,
      };
    } else {
      return { success: false, error: data.detail || 'Upload failed' };
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Upload failed' };
  }
};

/**
 * Upload degree certificate (image or PDF)
 * Only for teachers
 * @param degreeName - Optional name/description of the degree
 */
export const uploadDegree = async (
  degreeName?: string
): Promise<DocumentUploadResponse> => {
  try {
    // Pick document (PDF or Image)
    try {
      const result = await DocumentPicker.pick({
        presentationStyle: 'fullScreen',
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
      });

      if (!result || result.length === 0) {
        return { success: false, error: 'No document selected' };
      }

      const file = result[0];

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.type || 'application/pdf',
        name: file.name || 'degree.pdf',
      } as any);

      if (degreeName) {
        formData.append('degree_name', degreeName);
      }

      const token = await getAuthToken();
      if (!token) {
        console.error('[UPLOAD] Authentication failed - no token found');
        return { success: false, error: 'Not authenticated. Please login again.' };
      }

      const response = await fetch(`${API_URL}/api/upload/teacher/degree`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          url: data.url,
          document_type: data.document_type,
          degree_name: data.degree_name,
          message: data.message,
        };
      } else {
        return { success: false, error: data.detail || 'Upload failed' };
      }
    } catch (pickerError: any) {
      // Check if error is a cancellation
      if (pickerError?.code === 'DOCUMENT_PICKER_CANCELLED' || pickerError?.message?.includes('User cancelled')) {
        return { success: false, error: 'User cancelled' };
      }
      throw pickerError;
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Upload failed' };
  }
};

/**
 * Upload additional certificate (teaching cert, skills, etc.)
 * Only for teachers
 * @param certificateName - Optional name/description of the certificate
 */
export const uploadCertificate = async (
  certificateName?: string
): Promise<DocumentUploadResponse> => {
  try {
    try {
      const result = await DocumentPicker.pick({
        presentationStyle: 'fullScreen',
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
      });

      if (!result || result.length === 0) {
        return { success: false, error: 'No document selected' };
      }

      const file = result[0];

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.type || 'application/pdf',
        name: file.name || 'certificate.pdf',
      } as any);

      if (certificateName) {
        formData.append('certificate_name', certificateName);
      }

      const token = await getAuthToken();
      if (!token) {
        console.error('[UPLOAD] Authentication failed - no token found');
        return { success: false, error: 'Not authenticated. Please login again.' };
      }

      const response = await fetch(`${API_URL}/api/upload/teacher/certificate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          url: data.url,
          document_type: data.document_type,
          certificate_name: data.certificate_name,
          message: data.message,
        };
      } else {
        return { success: false, error: data.detail || 'Upload failed' };
      }
    } catch (pickerError: any) {
      // Check if error is a cancellation
      if (pickerError?.code === 'DOCUMENT_PICKER_CANCELLED' || pickerError?.message?.includes('User cancelled')) {
        return { success: false, error: 'User cancelled' };
      }
      throw pickerError;
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Upload failed' };
  }
};

/**
 * Get upload info (allowed types, max sizes)
 */
export const getUploadInfo = async () => {
  try {
    const response = await fetch(`${API_URL}/api/upload/info`);
    return await response.json();
  } catch (error) {
    console.error('Failed to get upload info:', error);
    return null;
  }
};
