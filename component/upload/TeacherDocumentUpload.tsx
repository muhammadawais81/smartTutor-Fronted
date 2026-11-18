// component/upload/TeacherDocumentUpload.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { uploadCNIC, uploadDegree, uploadCertificate } from '../../services/uploadService';

interface DocumentItemProps {
  label: string;
  url?: string | null;
  onUpload: () => void;
  loading: boolean;
  required?: boolean;
}

const DocumentItem: React.FC<DocumentItemProps> = ({
  label,
  url,
  onUpload,
  loading,
  required,
}) => (
  <View style={styles.documentItem}>
    <View style={styles.documentInfo}>
      <Text style={styles.documentLabel}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      {url ? (
        <Text style={styles.uploaded}>✓ Uploaded</Text>
      ) : (
        <Text style={styles.notUploaded}>Not uploaded</Text>
      )}
    </View>
    <TouchableOpacity
      style={[styles.uploadButton, url && styles.uploadedButton]}
      onPress={onUpload}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={styles.uploadButtonText}>
          {url ? 'Replace' : 'Upload'}
        </Text>
      )}
    </TouchableOpacity>
  </View>
);

interface Props {
  onDocumentsChange: (docs: {
    cnicFront?: string;
    cnicBack?: string;
    degree?: string;
    certificate?: string;
  }) => void;
  initialDocs?: {
    cnicFront?: string;
    cnicBack?: string;
    degree?: string;
    certificate?: string;
  };
}

export const TeacherDocumentUpload: React.FC<Props> = ({
  onDocumentsChange,
  initialDocs = {},
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [documents, setDocuments] = useState(initialDocs);

  useEffect(() => {
    setDocuments(initialDocs);
  }, [
    initialDocs.cnicFront,
    initialDocs.cnicBack,
    initialDocs.degree,
    initialDocs.certificate,
  ]);

  const handleUploadWithChoice = (
    type: 'cnicFront' | 'cnicBack',
    side: 'front' | 'back'
  ) => {
    Alert.alert(
      `Upload CNIC ${side === 'front' ? 'Front' : 'Back'}`,
      'Choose an option',
      [
        { 
          text: 'Take Photo', 
          onPress: () => handleUpload(type, true, side) 
        },
        { 
          text: 'Choose from Gallery', 
          onPress: () => handleUpload(type, false, side) 
        },
        { 
          text: 'Cancel', 
          style: 'cancel' 
        },
      ]
    );
  };

  const handleUpload = async (
    type: 'cnicFront' | 'cnicBack' | 'degree' | 'certificate',
    useCamera?: boolean,
    side?: 'front' | 'back'
  ) => {
    setLoading(type);

    let result;
    switch (type) {
      case 'cnicFront':
        result = await uploadCNIC('front', useCamera ?? true);
        break;
      case 'cnicBack':
        result = await uploadCNIC('back', useCamera ?? true);
        break;
      case 'degree':
        result = await uploadDegree('Highest Qualification');
        break;
      case 'certificate':
        result = await uploadCertificate('Teaching Certificate');
        break;
    }

    setLoading(null);

    if (result.success && result.url) {
      const newDocs = { ...documents, [type]: result.url };
      setDocuments(newDocs);
      onDocumentsChange(newDocs);
      Alert.alert('Success', result.message || 'Document uploaded!');
    } else {
      Alert.alert('Error', result.error || 'Upload failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Verification Documents</Text>
      <Text style={styles.sectionSubtitle}>
        Upload your documents for profile verification
      </Text>

      <DocumentItem
        label="CNIC Front"
        url={documents.cnicFront}
        onUpload={() => handleUploadWithChoice('cnicFront', 'front')}
        loading={loading === 'cnicFront'}
        required
      />

      <DocumentItem
        label="CNIC Back"
        url={documents.cnicBack}
        onUpload={() => handleUploadWithChoice('cnicBack', 'back')}
        loading={loading === 'cnicBack'}
        required
      />

      <DocumentItem
        label="Degree Certificate"
        url={documents.degree}
        onUpload={() => handleUpload('degree')}
        loading={loading === 'degree'}
        required
      />

      <DocumentItem
        label="Other Certificate (Optional)"
        url={documents.certificate}
        onUpload={() => handleUpload('certificate')}
        loading={loading === 'certificate'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  documentInfo: {
    flex: 1,
  },
  documentLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  required: {
    color: 'red',
  },
  uploaded: {
    fontSize: 12,
    color: 'green',
    marginTop: 2,
  },
  notUploaded: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  uploadedButton: {
    backgroundColor: '#666',
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
