import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import type { PickedUploadFile } from '../types';
import { safeFileName } from './text';

const imageName = (name?: string | null) => safeFileName(name || `jawaban-${Date.now()}.jpg`).replace(/\.[^.]+$/, '.jpg');

const sizeOf = async (uri: string) => {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists ? (info as { size?: number }).size : undefined;
  } catch {
    return undefined;
  }
};

export const normalizeImageAsset = async (asset: ImagePicker.ImagePickerAsset): Promise<PickedUploadFile> => {
  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: Math.min(asset.width || 1600, 1600) } }],
    {
      compress: 0.62,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );
  return {
    uri: manipulated.uri,
    name: imageName(asset.fileName),
    mimeType: 'image/jpeg',
    size: await sizeOf(manipulated.uri),
  };
};

export const pickFromCamera = async () => {
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: false,
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return normalizeImageAsset(result.assets[0]);
};

export const pickFromGallery = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return normalizeImageAsset(result.assets[0]);
};

export const pickDocument = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/*',
    ],
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  if (String(asset.mimeType || '').startsWith('image/')) {
    return normalizeImageAsset({
      uri: asset.uri,
      width: 1600,
      height: 1600,
      fileName: asset.name,
      mimeType: asset.mimeType,
      type: 'image',
      assetId: null,
      fileSize: asset.size,
      exif: null,
      base64: null,
      duration: null,
    });
  }
  return {
    uri: asset.uri,
    name: safeFileName(asset.name || `jawaban-${Date.now()}`),
    mimeType: asset.mimeType || 'application/octet-stream',
    size: asset.size || (await sizeOf(asset.uri)),
  } satisfies PickedUploadFile;
};
