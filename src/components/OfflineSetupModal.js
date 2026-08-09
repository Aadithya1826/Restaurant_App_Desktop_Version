import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OfflineSetupModal() {
  const [visible, setVisible] = useState(false);
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    checkFirstRun();
  }, []);

  const checkFirstRun = async () => {
    try {
      const hasRun = await AsyncStorage.getItem('offline_setup_complete');
      if (!hasRun) {
        if (window.electronAPI) {
          const path = await window.electronAPI.getDataDirectory();
          setCurrentPath(path);
        } else {
          setCurrentPath('Web Browser Download Directory');
        }
        setVisible(true);
      }
    } catch (e) {
      console.error('Error checking first run', e);
    }
  };

  const handleSelectPath = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.selectDataDirectory();
      if (path) {
        await window.electronAPI.setDataDirectory(path);
        setCurrentPath(path);
      }
    } else {
      alert("Native directory selection is only available in the desktop app. Web mode will automatically download backup files to your default Downloads folder.");
    }
  };

  const handleComplete = async () => {
    await AsyncStorage.setItem('offline_setup_complete', 'true');
    setVisible(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Offline Data & Backup Setup</Text>
          <Text style={styles.description}>
            To support lossless data history, the application automatically backs up your reports and orders.
            {window.electronAPI ? " Please select a folder where backups should be stored." : " In web mode, backups will automatically trigger file downloads to your browser's default directory."}
          </Text>
          
          <View style={styles.pathBox}>
            <Text style={styles.pathLabel}>Backup Storage Location:</Text>
            <Text style={styles.pathText} numberOfLines={2}>{currentPath}</Text>
          </View>

          {window.electronAPI && (
            <TouchableOpacity style={styles.btnSecondary} onPress={handleSelectPath}>
              <Text style={styles.btnSecondaryText}>Change Folder Location</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.btnPrimary} onPress={handleComplete}>
            <Text style={styles.btnPrimaryText}>Continue Setup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  modalContainer: {
    width: 450,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 24,
  },
  pathBox: {
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  pathLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 4,
  },
  pathText: {
    fontSize: 13,
    color: '#334155',
    fontFamily: 'monospace',
  },
  btnSecondary: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    marginBottom: 12,
  },
  btnSecondaryText: {
    color: '#475569',
    fontWeight: 'bold',
    fontSize: 15,
  },
  btnPrimary: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#ff8c42',
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
