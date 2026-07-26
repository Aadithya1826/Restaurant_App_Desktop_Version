import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, PermissionsAndroid, Alert, TextInput, ScrollView, Image, Animated, Easing } from 'react-native';
import Voice from '@react-native-voice/voice';
import { Audio } from 'expo-av';
import { Mic, MicOff, Send, Minimize2, Keyboard, Volume2, VolumeX } from 'lucide-react-native';
import api from '../services/api';

const ChefMascot = require('../assets/chef.png');

const VoiceWidget = ({ onNavigate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      text: "I'm your assistant! Tap the mic to talk, or just type a message.",
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [inputText, setInputText] = useState('');
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  
  const soundRef = useRef(null);
  const scrollViewRef = useRef(null);
  const recognitionRef = useRef(null);
  
  // MediaRecorder Refs for Web Fallback
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const shouldSendAudioRef = useRef(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Track voice mode for callbacks
  const isVoiceModeRef = useRef(isVoiceMode);
  useEffect(() => {
    isVoiceModeRef.current = isVoiceMode;
  }, [isVoiceMode]);

  useEffect(() => {
    // Setup Voice for Native
    if (Platform.OS !== 'web') {
      Voice.onSpeechStart = () => {
        setIsListening(true);
        setLiveText('Listening...');
      };
      
      Voice.onSpeechEnd = () => {
        setIsListening(false);
      };

      Voice.onSpeechPartialResults = (e) => {
        if (e.value && e.value.length > 0) {
          setLiveText(e.value[0]);
        }
      };
      
      Voice.onSpeechResults = (e) => {
        if (e.value && e.value.length > 0) {
          const text = e.value[0];
          setLiveText('');
          setIsListening(false);
          handleUserVoiceInput(text, true); // send as voice transcribed
        }
      };

      Voice.onSpeechError = (e) => {
        if (e.error?.message !== '7/No match') { // Ignore silent errors
          console.error('Speech error', e);
        }
        setIsListening(false);
        setLiveText('');
      };
    }

    // Setup Audio
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    return () => {
      if (Platform.OS !== 'web') {
        Voice.destroy().then(Voice.removeAllListeners);
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const handleUserVoiceInput = async (text, isVoice = false, base64Audio = null) => {
    const trimmedText = text.trim();
    if (!trimmedText && !base64Audio) return;

    const userMsgId = Date.now();
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', text: base64Audio ? "🎤 Audio Message" : trimmedText }]);
    
    setIsProcessing(true);
    if (!isExpanded) setIsExpanded(true);

    try {
      const historyToSend = messages.slice(-10).map(m => ({
        role: m.role,
        text: m.text
      }));

      const payload = {
        transcribed_text: base64Audio ? "Please transcribe and respond to the audio payload." : trimmedText,
        chat_history: historyToSend,
        is_voice: base64Audio ? true : isVoice
      };

      if (base64Audio) {
        payload.audio_base64 = base64Audio;
      }

      const response = await api.post('/api/v1/mcp/voice/ask', payload);
      const replyText = response.data.assistant_text;

      setMessages((prev) => {
        const newMessages = [...prev];
        if (base64Audio && response.data.transcribed_user_text) {
          const userMsgIndex = newMessages.findIndex(m => m.id === userMsgId);
          if (userMsgIndex !== -1) {
            newMessages[userMsgIndex] = { ...newMessages[userMsgIndex], text: response.data.transcribed_user_text };
          }
        }
        newMessages.push({ id: Date.now() + 1, role: 'assistant', text: replyText });
        return newMessages;
      });

      if (response.data.audio_payload && !isSpeakerMuted) {
        await playAudioBase64(response.data.audio_payload);
      } else if (isVoiceModeRef.current && !isSpeakerMuted) {
         // Auto-resume if in voice mode and no audio returned
         startListening();
      }

      if (response.data.tool_name === 'navigate_to_page' && response.data.tool_result && onNavigate) {
        onNavigate(response.data.tool_result.page, response.data.tool_result.subtab);
      }

    } catch (error) {
      console.error('Error fetching voice response:', error);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', text: "I'm sorry, I encountered an error connecting to the server." },
      ]);
    } finally {
      setIsProcessing(false);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  };

  const playAudioBase64 = async (base64Audio) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      
      const uri = `data:audio/mp3;base64,${base64Audio}`;
      const { sound } = await Audio.Sound.createAsync({ uri });
      soundRef.current = sound;
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          if (isVoiceModeRef.current) {
             startListening();
          }
        }
      });
      
      await sound.playAsync();
    } catch (error) {
      console.error("Audio playback failed:", error);
      if (isVoiceModeRef.current) startListening();
    }
  };

  const startListening = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
      }
      
      if (Platform.OS === 'web') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            if (shouldSendAudioRef.current) {
              const base64Audio = reader.result.split(',')[1];
              handleUserVoiceInput("Audio Input", true, base64Audio);
            }
            setLiveText('');
          };
          if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
          setIsListening(false);
        };

        mediaRecorder.start();
        shouldSendAudioRef.current = true;
        setIsListening(true);
        setLiveText("Listening...");

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          audioContextRef.current = new AudioContext();
          const source = audioContextRef.current.createMediaStreamSource(stream);
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 512;
          source.connect(analyserRef.current);

          const checkSilence = () => {
            if (mediaRecorder.state !== 'recording') return;
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const volume = sum / dataArray.length;

            if (volume > 15) {
              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
              }
            } else {
              if (!silenceTimerRef.current) {
                silenceTimerRef.current = setTimeout(() => {
                  if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    mediaRecorderRef.current.stop();
                  }
                }, 2500);
              }
            }
            requestAnimationFrame(checkSilence);
          };
          requestAnimationFrame(checkSilence);
        }
        return;
      }

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
      console.error("Start listening error", e);
    }
  };

  const stopListening = async (abort = false) => {
    try {
      if (Platform.OS === 'web') {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          shouldSendAudioRef.current = !abort;
          mediaRecorderRef.current.stop();
        }
        return;
      }
      if (abort) {
        await Voice.cancel();
      } else {
        await Voice.stop();
      }
    } catch (e) {
      console.error("Stop listening error", e);
    }
  };

  const toggleVoiceMode = () => {
    if (isVoiceMode) {
      setIsVoiceMode(false);
      if (isListening) stopListening(true);
    } else {
      setIsVoiceMode(true);
      startListening();
    }
  };

  const handleSendText = () => {
    if (!isListening && inputText.trim()) {
      handleUserVoiceInput(inputText, false);
      setInputText('');
    }
  };

  const toggleSpeaker = async () => {
    setIsSpeakerMuted(!isSpeakerMuted);
    if (!isSpeakerMuted && soundRef.current) { // Muting
      await soundRef.current.pauseAsync();
    }
  };

  if (!isExpanded) {
    return (
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => setIsExpanded(true)}
          activeOpacity={0.8}
        >
          {isListening ? (
             <Animated.View style={[styles.pingCircle, { transform: [{ scale: pulseAnim }] }]} />
          ) : (
             <Animated.View style={[styles.rippleCircle, { transform: [{ scale: pulseAnim }] }]} />
          )}
          <Image source={ChefMascot} style={styles.mascotImage} resizeMode="contain" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.chatWindow}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerMascotBg}>
            <Image source={ChefMascot} style={styles.headerMascot} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Voice Assistant</Text>
            <Text style={styles.headerStatus}>{isListening ? 'Listening...' : 'Ready'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setIsExpanded(false)} style={styles.minimizeBtn}>
          <Minimize2 size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Chat Area */}
      <ScrollView 
        style={styles.chatArea} 
        contentContainerStyle={styles.chatContent}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => (
          <View key={msg.id} style={[styles.messageRow, msg.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant]}>
            {msg.role === 'assistant' && (
              <View style={styles.avatarBubble}>
                <Image source={ChefMascot} style={styles.avatarImg} />
              </View>
            )}
            <View style={[styles.messageBubble, msg.role === 'user' ? styles.messageBubbleUser : styles.messageBubbleAssistant]}>
              <Text style={[styles.messageText, msg.role === 'user' ? styles.messageTextUser : styles.messageTextAssistant]}>
                {msg.text}
              </Text>
            </View>
          </View>
        ))}
        
        {liveText ? (
          <View style={[styles.messageRow, styles.messageRowUser]}>
            <View style={[styles.messageBubble, styles.messageBubbleUser, { opacity: 0.8 }]}>
              <Text style={[styles.messageText, styles.messageTextUser, { fontStyle: 'italic' }]}>{liveText}</Text>
            </View>
          </View>
        ) : null}

        {isProcessing && (
          <View style={[styles.messageRow, styles.messageRowAssistant]}>
             <View style={styles.avatarBubble}>
                <Image source={ChefMascot} style={styles.avatarImg} />
              </View>
              <View style={[styles.messageBubble, styles.messageBubbleAssistant]}>
                <Text style={styles.messageTextAssistant}>...</Text>
              </View>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputArea}>
        <TouchableOpacity onPress={toggleVoiceMode} style={[styles.iconBtn, isVoiceMode && styles.iconBtnActive]}>
          {isVoiceMode ? <Keyboard size={20} color="#ff5722" /> : <Mic size={20} color="#666" />}
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleSpeaker} style={[styles.iconBtn, !isSpeakerMuted && styles.iconBtnActive]}>
          {!isSpeakerMuted ? <Volume2 size={20} color="#ff5722" /> : <VolumeX size={20} color="#666" />}
        </TouchableOpacity>

        <View style={styles.inputContainer}>
          {!isListening ? (
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your message..."
              placeholderTextColor="#999"
              onSubmitEditing={handleSendText}
            />
          ) : (
            <Text style={styles.listeningText}>Listening...</Text>
          )}
        </View>

        <TouchableOpacity 
          onPress={isListening ? stopListening : handleSendText} 
          style={[styles.sendBtn, (inputText.trim() || isListening) ? styles.sendBtnActive : styles.sendBtnDisabled]}
          disabled={!isListening && !inputText.trim()}
        >
          {isListening ? <View style={styles.stopSquare} /> : <Send size={18} color="white" />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 999,
  },
  fabButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  mascotImage: {
    width: 60,
    height: 60,
    zIndex: 2,
  },
  rippleCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(255, 87, 34, 0.4)',
    zIndex: 1,
  },
  pingCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#ff5722',
    zIndex: 1,
  },
  chatWindow: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 380,
    height: 500,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ff5722',
    padding: 16,
    zIndex: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerMascotBg: {
    width: 32,
    height: 32,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 2,
  },
  headerMascot: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  headerTitle: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  headerStatus: {
    color: 'white',
    fontSize: 11,
    opacity: 0.9,
  },
  minimizeBtn: {
    padding: 4,
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  chatContent: {
    padding: 16,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    maxWidth: '85%',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  messageRowUser: {
    alignSelf: 'flex-end',
  },
  messageRowAssistant: {
    alignSelf: 'flex-start',
    gap: 8,
  },
  avatarBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarImg: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  messageBubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    minHeight: 40,
    justifyContent: 'center',
    flexShrink: 1,
  },
  messageBubbleUser: {
    backgroundColor: '#ff5722',
    borderTopRightRadius: 4,
  },
  messageBubbleAssistant: {
    backgroundColor: 'white',
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  messageTextUser: {
    color: 'white',
  },
  messageTextAssistant: {
    color: '#333',
  },
  inputArea: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f1f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnActive: {
    backgroundColor: 'rgba(255, 87, 34, 0.1)',
  },
  inputContainer: {
    flex: 1,
    height: 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    padding: 0,
  },
  listeningText: {
    color: '#666',
    fontSize: 13,
    fontStyle: 'italic',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnActive: {
    backgroundColor: '#0a8035',
  },
  sendBtnDisabled: {
    backgroundColor: '#e0e0e0',
  },
  stopSquare: {
    width: 14,
    height: 14,
    backgroundColor: 'white',
    borderRadius: 2,
  }
});

export default VoiceWidget;
