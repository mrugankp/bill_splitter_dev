import React, { useState } from 'react';
import { Button, View, Image, PermissionsAndroid, Platform, Alert} from 'react-native';
import storage from '@react-native-firebase/storage';
import { launchImageLibrary, MediaType } from 'react-native-image-picker';

async function openAiApiCall(extractedText: any) {
  try {
    const response = await fetch('https://api.openai.com/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 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' // Replace with your actual key
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo-16k-0613",
        prompt: `Extract the items, costs, tax, tips, and total from the following receipt: ${extractedText}`,
        temperature: 0.5,
        max_tokens: 10000,
      })
    });

    const data = await response.json();
    return data; // Adjust based on OpenAI's response format
  } catch (error) {
    console.error("Error during OpenAI API call:", error);
    throw error;
  }
}

async function ocrApiCall(imageUrl: any) {
  try {
    const response = await fetch('https://api.ocr.space/parse/imageurl?apikey=K87115680588957&url=' + encodeURIComponent(imageUrl), {
      method: 'GET'
    });

    const data = await response.json();

    if (data.IsErroredOnProcessing) {
      console.error("OCR Error: ", data.ErrorMessage);
      return '';
    }

    return data.ParsedResults[0].ParsedText;
  } catch (error) {
    console.error("Error during OCR API call:", error);
    throw error;
  }
}


const ImageUploader = () => {
  const [imageUri, setImageUri] = useState<string | null>(null);

    // Add a new function to handle OCR
  const processImageForOCR = async (downloadURL: string) => {
    try {
      // Replace with actual API call
      const ocrResponse = await ocrApiCall(downloadURL);
      const extractedText = ocrResponse;
      return extractedText;
    } catch (e) {
      console.error('Error during OCR processing: ', e);
      return null;
    }
  };

  // Add a new function to handle text processing with OpenAI
  const processTextWithOpenAI = async (extractedText: any) => {
    try {
      // Replace with actual OpenAI API call
      const openAIResponse = await openAiApiCall(extractedText);
      const structuredData = openAIResponse;
      return structuredData;
    } catch (e) {
      console.error('Error during text processing with OpenAI: ', e);
      return null;
    }
  };

  const selectImage = async () => {
    // Requesting storage permission for Android
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: "Storage Permission Required",
          message: "This app needs access to your storage to upload photos.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Storage permission denied');
        return;
      }
    }

    const options = {
      mediaType: 'photo' as MediaType,
    };

    launchImageLibrary(options, response => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
      } else if (response.assets && response.assets[0].uri) {
        const source = response.assets[0].uri;
        setImageUri(source);
        uploadImage(source);
      }
    });
  };

  const uploadImage = async (uri: string) => {
    // For Android, ensure the URI has the correct prefix.
    const uploadUri = Platform.OS === 'android' && !uri.startsWith('file://') ? `file://${uri}` : uri;
  
    // Extract filename and log it
    const filename = uploadUri.substring(uploadUri.lastIndexOf('/') + 1);
    console.log(`Uploading file named ${filename} from uri ${uploadUri}`);
  
    // Get the reference to the Firebase storage
    const storageRef = storage().ref(`uploads/${filename}`);
  
    try {
      // Put the file in the storage
      const task = await storageRef.putFile(uploadUri);
  
      // Get the download URL and log it
      const downloadURL = await storageRef.getDownloadURL();
      console.log(`Download URL: ${downloadURL}`);
    
      const extractedText = await processImageForOCR(downloadURL);
      if (extractedText) {
        console.log('Extracted Text:', extractedText);
        const structuredData = await processTextWithOpenAI(extractedText);
        console.log('Structured Data: ', structuredData);
      }
    } catch (e) {
      console.error('Error uploading image: ', e);
    }
  };

  return (
    <View>
      <Button title="Upload Image" onPress={selectImage} />
      {imageUri && <Image source={{ uri: imageUri }} style={{ width: 200, height: 200 }} />}
    </View>
  );
};

export default ImageUploader;
