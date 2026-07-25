import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, PermissionsAndroid, Alert } from 'react-native';
import Voice from '@react-native-voice/voice';
import { Mic, MicOff } from 'lucide-react-native';

const VoiceWidget = ({ onCommandProcessed }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    Voice.onSpeechStart = () => setIsListening(true);
    Voice.onSpeechEnd = () => setIsListening(false);
    Voice.onSpeechResults = (e) => {
      const text = e.value[0];
      setTranscript(text);
      if (onCommandProcessed) onCommandProcessed(text);
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [onCommandProcessed]);

  const startListening = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Audio Permission',
            message: 'App needs access to your microphone to accept voice commands.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert("Permission Denied", "Microphone permission is required.");
          return;
        }
      }
      await Voice.start('en-US');
    } catch (e) {
      console.error(e);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.micButton, isListening ? styles.listening : styles.idle]}
        onPress={isListening ? stopListening : startListening}
      >
        {isListening ? <MicOff color="white" /> : <Mic color="white" />}
      </TouchableOpacity>
      {transcript ? (
        <Text style={styles.transcript}>{transcript}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    alignItems: 'flex-end',
  },
  micButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    cursor: 'pointer',
  },
  idle: {
    backgroundColor: '#3b82f6',
  },
  listening: {
    backgroundColor: '#ef4444',
  },
  transcript: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: 'white',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    maxWidth: 250,
  }
});

export default VoiceWidget;
