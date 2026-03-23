// app/(tabs)/index.tsx
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function Index() {
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [jsonData, setJsonData] = useState<any>(null);
  const [isValidJson, setIsValidJson] = useState(false);
  const [scanLinePosition] = useState(new Animated.Value(0));

  // Animation for scanning line
  useEffect(() => {
    if (scanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLinePosition, {
            toValue: 280,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(scanLinePosition, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [scanning, scanLinePosition]);

  const handleScan = ({ data }: { data: string }) => {
    setScanning(false);
    setScannedData(data);
    
    // Try to parse JSON
    try {
      const parsed = JSON.parse(data);
      setJsonData(parsed);
      setIsValidJson(true);
    } catch {
      setJsonData(null);
      setIsValidJson(false);
    }
  };

  const clearData = () => {
    setScannedData(null);
    setJsonData(null);
    setIsValidJson(false);
  };

  const formatLabel = (key: string): string => {
    return key
      .replace(/_/g, ' ') // Replace underscores with spaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const renderValue = (value: any): string => {
    if (value === null) return '—';
    if (value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (typeof item === 'object' && item !== null) {
            return String(item);
          }
          return String(item);
        })
        .join(', ');
    }
    if (typeof value === 'object' && value !== null) {
      return String(value);
    }
    return String(value);
  };

  const getValueStyle = (value: any) => {

    return styles.dataValue;
  };

  const renderProfessionalData = (data: any, level: number = 0): React.ReactNode[] => {
    const items: React.ReactNode[] = [];
    const fieldsToSkip = ['id', 'spec_name', 'value', 'name'];
    const orderedFields = ['category', 'asset_code', 'serial_number', 'brand', 'quantity', 'status'];

    if (Array.isArray(data)) {
      data.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          // For each object in the array, render its key-value pairs as rows
          Object.entries(item).forEach(([k, v], itemIdx) => {
            if (!fieldsToSkip.includes(k)) {
              items.push(
                <View key={`array-item-${index}-${itemIdx}`} style={styles.dataRow}>
                  <Text style={styles.dataLabel}>{formatLabel(k)}</Text>
                  <Text style={getValueStyle(v)}>{renderValue(v)}</Text>
                </View>
              );
            }
          });
        } else {
          items.push(
            <View key={`array-${level}-${index}`} style={styles.dataRow}>
              <Text style={styles.dataValue}>{renderValue(item)}</Text>
            </View>
          );
        }
      });
    } else if (typeof data === 'object' && data !== null) {
      // First pass: render fields in the specified order
      orderedFields.forEach((fieldName) => {
        const entry = Object.entries(data).find(([key]) => key.toLowerCase() === fieldName);
        if (entry) {
          const [key, value] = entry;
          if (!fieldsToSkip.includes(key) && value !== undefined && typeof value !== 'object') {
            items.push(
              <View key={`${key}-ordered`} style={styles.dataRow}>
                <Text style={styles.dataLabel}>{formatLabel(key)}</Text>
                <Text style={getValueStyle(value)}>{renderValue(value)}</Text>
              </View>
            );
          }
        }
      });

      // Second pass: render remaining regular fields (non-object, non-array, non-ordered)
      Object.entries(data).forEach(([key, value], idx) => {
        if (fieldsToSkip.includes(key) || orderedFields.includes(key.toLowerCase())) {
          return; // Skip ordered fields and skip fields
        }
        if (typeof value === 'object' || Array.isArray(value)) {
          return; // Skip for now
        }
        items.push(
          <View key={`${key}-${idx}`} style={styles.dataRow}>
            <Text style={styles.dataLabel}>{formatLabel(key)}</Text>
            <Text style={getValueStyle(value)}>{renderValue(value)}</Text>
          </View>
        );
      });

      // Third pass: render nested objects and arrays
      Object.entries(data).forEach(([key, value], idx) => {
        if (fieldsToSkip.includes(key) || orderedFields.includes(key.toLowerCase())) {
          return; // Skip
        }
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          items.push(
            <View key={`${key}-${idx}`}>
              <Text style={styles.dataCategory}>{formatLabel(key)}</Text>
              <View style={styles.nestedContainer}>
                {renderProfessionalData(value, level + 1)}
              </View>
            </View>
          );
        } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          // Handle array of objects (like specifications) with left-right layout
          items.push(
            <View key={`${key}-${idx}`}>
              <Text style={styles.dataCategory}>{formatLabel(key)}</Text>
              {/* Specifications display */}
              <View style={styles.nestedContainer}>
                {value.map((item: any, itemIndex: number) => {
                  // Check if this is a spec_name/spec_value pair format
                  if (item.spec_name !== undefined && item.spec_value !== undefined) {
                    return (
                      <View key={`spec-row-${itemIndex}`} style={styles.dataRow}>
                        <Text style={styles.dataLabel}>{renderValue(item.spec_name)}</Text>
                        <Text style={getValueStyle(item.spec_value)}>{renderValue(item.spec_value)}</Text>
                      </View>
                    );
                  }
                  // Otherwise extract all key-value pairs from the specification object
                  return Object.entries(item).map(([k, v], pairIndex) => {
                    if (!fieldsToSkip.includes(k)) {
                      return (
                        <View key={`spec-row-${itemIndex}-${pairIndex}`} style={styles.dataRow}>
                          <Text style={styles.dataLabel}>{formatLabel(k)}</Text>
                          <Text style={getValueStyle(v)}>{renderValue(v)}</Text>
                        </View>
                      );
                    }
                    return null;
                  });
                }).flat()}
              </View>
            </View>
          );
        }
      });
    }

    return items;
  };

  const startScanning = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Camera permission is required to scan QR codes');
        return;
      }
    }
    setScanning(true);
  };

  return (
    <View style={styles.container}>
      {scanning ? (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={handleScan}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        >
          {/* Scanner overlay with black areas and scanning frame */}
          <View style={styles.cameraOverlay}>
            {/* Top black area */}
            <View style={styles.topBlackArea} />
            
            {/* Center scanning frame */}
            <View style={styles.scannerContainer}>
              {/* Scanning frame border */}
              <View style={styles.scanFrame}>
                {/* Animated scanning line */}
                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      transform: [{ translateY: scanLinePosition }],
                    },
                  ]}
                />
              </View>
            </View>

            {/* Bottom black area */}
            <View style={styles.bottomBlackArea} />

            {/* Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={() => setScanning(false)}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      ) : (
        <View style={styles.content}>
          {scannedData ? (
            <>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>📋 Scanned Data</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={clearData}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Data Display */}
              <ScrollView 
                style={styles.dataBox} 
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.dataBoxContent}
              >
                {isValidJson && jsonData ? (
                  <View>
                    {renderProfessionalData(jsonData)}
                  </View>
                ) : (
                  <Text style={styles.dataText}>{scannedData}</Text>
                )}
              </ScrollView>

              {/* Button Container - Centered */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.scanButton} onPress={startScanning}>
                  <Text style={styles.scanButtonText}>📱 Scan Another</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Empty State */}
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📱</Text>
                <Text style={styles.appName}>Assetory</Text>
                <Text style={styles.emptyTitle}>PPGS Asset Management</Text>
                <Text style={styles.emptySubtitle}>QR Code Scanner</Text>
              </View>

              {/* Button Container - Centered */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.scanButton} onPress={startScanning}>
                  <Text style={styles.scanButtonText}>Start Scanning</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c3e50',
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    backgroundColor: '#ecf0f1',
  },
  closeBtnText: {
    fontSize: 20,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  dataBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dataBoxContent: {
    padding: 20,
  },
  dataText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 22,
    fontFamily: 'Menlo',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0d47a1',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginTop: 4,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  scanButton: {
    backgroundColor: '#0d47a1',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#0d47a1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBlackArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '25%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  bottomBlackArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '25%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  scannerContainer: {
    width: '85%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  scanFrame: {
    width: '100%',
    height: '100%',
    borderWidth: 3,
    borderColor: '#0d47a1',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  scanLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#0d47a1',
    shadowColor: '#0d47a1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 15,
    elevation: 15,
  },
  closeButton: {
    position: 'absolute',
    top: 30,
    right: 30,
    backgroundColor: 'rgba(13, 71, 161, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    zIndex: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 0,
    alignItems: 'flex-start',
  },
  dataLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34495e',
    flex: 0.4,
  },
  dataValue: {
    fontSize: 13,
    color: '#2c3e50',
    flex: 0.6,
    textAlign: 'right',
  },
  dataCategory: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0d47a1',
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  nestedContainer: {
    marginLeft: 0,
    paddingLeft: 0,
  },
});