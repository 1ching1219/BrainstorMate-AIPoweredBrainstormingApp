import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  StatusBar,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getAIPartners,
  getMessages,
  sendMessage as sendMsgApi,
  joinRoom as joinRoomApi,
  getWebSocketUrl,
  triggerAIResponse,
  API_BASE_URL
} from '../services/api';

const voiceWaveIcon = require('../../assets/icons/Voice-Icon.png');

const getApiRoot = () => API_BASE_URL.replace(/\/api\/?$/, '');

const ChatRoomAI = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { roomId, aiPartners: initialAi } = route.params || {};
  const [aiPartners, setAiPartners] = useState(initialAi || []);
  const [userName, setUserName] = useState('You');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isAIResponding, setIsAIResponding] = useState(false);

  const socketRef = useRef();
  const reconnectAttempts = useRef(0);
  const maxReconnect = 5;
  const flatListRef = useRef();
  const shouldReconnectRef = useRef(true);
  const aiPartnersRef = useRef(aiPartners);
  const isAIRespondingRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem('username').then(name => {
      if (name) setUserName(name);
    });

    if ((!initialAi || initialAi.length === 0) && roomId) {
      getAIPartners(roomId)
        .then(result => {
          if (Array.isArray(result?.aiPartners)) {
            setAiPartners(result.aiPartners);
          }
        })
        .catch(() => {});
    }

    connectWS();
    fetchMessages();

    return () => {
      shouldReconnectRef.current = false;
      socketRef.current?.close();
    };
  }, [roomId]);

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Send transcript from voice mode as a chat message when screen regains focus
  useEffect(() => {
    const transcript = route.params?.voiceTranscript;
    if (!transcript) return;
    navigation.setParams({ voiceTranscript: undefined });

    // Optimistic insert — shows immediately without waiting for WebSocket echo
    const optimisticId = `voice-${Date.now()}`;
    setMessages(prev => {
      const exists = prev.some(m => m.sender === userName && m.content === transcript);
      if (exists) return prev;
      return [...prev, {
        id: optimisticId,
        sender: userName,
        is_ai: false,
        content: transcript,
        created_at: new Date().toISOString()
      }];
    });

    // Also broadcast via WebSocket so other clients and the backend receive it
    setTimeout(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'message',
          sender: userName,
          message: transcript,
          is_ai: false,
        }));
      }
    }, 400);
  }, [route.params?.voiceTranscript]);

  // Keep refs in sync so the interval callback never has stale state
  useEffect(() => { aiPartnersRef.current = aiPartners; }, [aiPartners]);
  useEffect(() => { isAIRespondingRef.current = isAIResponding; }, [isAIResponding]);

  const generateRandomFeedback = (role) => {
    const feedbackOptions = {
      Designer: [
        "I notice the UI elements could be more consistent. Consider a unified color scheme.",
        "The user flow seems to have some friction points. We should simplify the navigation.",
        "Visual hierarchy could be improved to guide users more effectively.",
        "Have you considered accessibility in this design? Some elements may need better contrast."
      ],
      Engineer: [
        "The current architecture might have scaling issues under load.",
        "We should consider optimizing database queries for better performance.",
        "This would be a good opportunity to implement caching to reduce server load.",
        "The current solution works, but we might want to refactor for maintainability."
      ],
      Finance: [
        "Based on our projections, allocate more resources to marketing.",
        "The ROI on this feature looks promising given current metrics.",
        "Consider cost implications of this infrastructure change.",
        "Prioritize features with higher revenue potential from a financial view."
      ],
      Professor: [
        "This aligns with recent research in the field.",
        "Consider the theoretical implications of this framework.",
        "We should examine case studies with similar implementations.",
        "The methodology needs more rigorous validation before proceeding."
      ]
    };
    const opts = feedbackOptions[role] || ["I have some insights to share."];
    return opts[Math.floor(Math.random() * opts.length)];
  };

  // Periodically have a random AI partner send a feedback message (~every 15s)
  useEffect(() => {
    if (aiPartners.length === 0 || !isConnected) return;
    const feedbackInterval = setInterval(() => {
      if (isAIRespondingRef.current) return;
      const partners = aiPartnersRef.current;
      if (partners.length === 0) return;
      const agent = partners[Math.floor(Math.random() * partners.length)];
      const feedback = generateRandomFeedback(agent.role);
      socketRef.current?.send(JSON.stringify({
        type: 'message',
        sender: agent.name,
        message: feedback,
        is_ai: true
      }));
    }, 15000);
    return () => clearInterval(feedbackInterval);
  }, [aiPartners, isConnected]);

  const connectWS = () => {
    if (reconnectAttempts.current >= maxReconnect) return;

    const wsUrl = getWebSocketUrl(roomId);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      joinRoomApi(roomId, userName, null, null).catch(() => {});
    };

    ws.onmessage = e => {
      try {
        const data = JSON.parse(e.data);
        const content = data.content ?? data.message;

        if (!content) {
          return;
        }

        setMessages(prev => {
          const nextMessage = {
            id: data.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            sender: data.sender || 'Unknown',
            is_ai: !!data.is_ai,
            content,
            created_at: data.created_at || new Date().toISOString()
          };

          const exists = prev.some(msg =>
            msg.id === nextMessage.id ||
            (msg.sender === nextMessage.sender && msg.content === nextMessage.content)
          );

          if (exists) {
            return prev;
          }

          return [...prev, nextMessage];
        });
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (!shouldReconnectRef.current) {
        return;
      }

      reconnectAttempts.current += 1;
      setTimeout(connectWS, Math.min(1000 * 2 ** reconnectAttempts.current, 30000));
    };

    ws.onerror = () => {
      ws.close();
    };

    socketRef.current = ws;
  };

  const fetchMessages = async () => {
    try {
      const msgs = await getMessages(roomId);
      setMessages(msgs);
    } catch (error) {
      console.warn('Error fetching messages:', error);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !isConnected || isAIResponding) return;

    setInput('');
    setIsAIResponding(true);

    const outbound = {
      type: 'message',
      sender: userName,
      message: text,
      is_ai: false
    };

    try {
      socketRef.current?.send(JSON.stringify(outbound));
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
    }

    try {
      await sendMsgApi(roomId, userName, text, false);
    } catch (error) {
      console.warn('Error saving message:', error);
    }

    setTimeout(async () => {
      try {
        const response = await triggerAIResponse(roomId, {
          content: text,
          sender: userName
        }, 'user_message');

        if (response && Array.isArray(response.responses)) {
          response.responses.forEach(aiResponse => {
            const messageToAdd = {
              id: aiResponse.id,
              sender: aiResponse.sender,
              content: aiResponse.content || aiResponse.message,
              is_ai: true,
              created_at: aiResponse.created_at
            };

            setMessages(prev => {
              const exists = prev.some(msg =>
                msg.id === messageToAdd.id ||
                (msg.sender === messageToAdd.sender && msg.content === messageToAdd.content)
              );
              if (exists) {
                return prev;
              }
              return [...prev, messageToAdd];
            });
          });
        }
      } catch (error) {
        console.error('Error triggering AI response:', error);
      } finally {
        setIsAIResponding(false);
      }
    }, 1000);
  };

  const getAvatarForSender = senderName => {
    const agent = aiPartners.find(a => a.name === senderName);

    if (agent && agent.avatar) {
      if (typeof agent.avatar === 'string') {
        if (agent.avatar.startsWith('http')) {
          return { uri: agent.avatar };
        }

        if (agent.avatar.startsWith('/media/')) {
          return { uri: `${getApiRoot()}${agent.avatar}` };
        }

        return { uri: `${getApiRoot()}/media/${agent.avatar}` };
      }

      return agent.avatar;
    }

    return {
      uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=4a72d4&color=fff&size=128`
    };
  };

  const renderItem = ({ item }) => {
    if (item.is_system) {
      return (
        <View style={styles.systemMsg}>
          <Text style={styles.systemText}>{item.content}</Text>
        </View>
      );
    }

    const fromUser = item.sender === userName;
    const fromAI = aiPartners.some(a => a.name === item.sender);
    const senderName = item.sender || 'unknown';

    return (
      <View style={[styles.msgRow, fromUser ? styles.msgRowRight : styles.msgRowLeft]}>
        {!fromUser && (
          <View style={styles.avatar}>
            {fromAI ? (
              <Image source={getAvatarForSender(senderName)} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>{senderName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
        )}
        <View
          style={[
            styles.bubble,
            fromUser ? styles.bubbleUser : fromAI ? styles.bubbleAI : styles.bubbleOther
          ]}
        >
          {!fromUser && (
            <Text style={[styles.sender, fromAI && styles.senderAI]}>{senderName}</Text>
          )}
          <Text style={styles.messageText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  const navigateToVoice = () => {
    navigation.navigate('VoiceModeAI', {
      roomId,
      aiPartners,
      username: userName
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? 'green' : 'red' }]} />
          <Text style={styles.title}>Room {roomId}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Ionicons name="exit-outline" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => item.id || `m-${index}`}
        renderItem={renderItem}
        contentContainerStyle={styles.chat}
      />

      {isAIResponding && (
        <View style={styles.aiThinkingContainer}>
          <View style={styles.aiThinking}>
            <Text style={styles.aiThinkingText}>AI thinking...</Text>
          </View>
        </View>
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={[styles.input, isAIResponding && styles.inputDisabled]}
          value={input}
          onChangeText={setInput}
          placeholder={isAIResponding ? 'AI is responding...' : 'Type a message...'}
          editable={isConnected && !isAIResponding}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() ? styles.voiceBtn : styles.sendActive, isAIResponding && styles.btnDisabled]}
          onPress={!input.trim() ? navigateToVoice : handleSend}
          disabled={!isConnected || isAIResponding}
        >
          {!input.trim() ? (
            <Image source={voiceWaveIcon} style={styles.voiceIcon} />
          ) : (
            <Text style={styles.sendText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ChatRoomAI;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: {
    flexDirection: 'row',
    padding: 12,
    paddingTop: Platform.OS === 'ios' ? 12 : StatusBar.currentHeight + 12,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#e0e0e0'
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  title: { fontSize: 18, fontWeight: '600' },
  aiThinkingContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
    alignItems: 'flex-start'
  },
  aiThinking: {
    backgroundColor: '#e8f4fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start'
  },
  aiThinkingText: {
    fontSize: 13,
    color: '#4a72d4',
    fontStyle: 'italic'
  },
  chat: { padding: 12, flexGrow: 1 },
  systemMsg: {
    alignSelf: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 6,
    marginVertical: 4
  },
  systemText: { fontSize: 12, color: '#666' },
  msgRow: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end'
  },
  msgRowLeft: { justifyContent: 'flex-start' },
  msgRowRight: { justifyContent: 'flex-end' },
  avatar: { marginRight: 8, width: 32, height: 32 },
  avatarImg: { width: 32, height: 32, borderRadius: 16 },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4a72d4',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarLetter: { color: 'white', fontWeight: 'bold' },
  bubble: {
    maxWidth: '70%',
    padding: 10,
    borderRadius: 12
  },
  bubbleUser: { backgroundColor: '#dcf8c6' },
  bubbleAI: { backgroundColor: '#f0f0f0' },
  bubbleOther: { backgroundColor: '#e3f2fd' },
  sender: { fontSize: 12, marginBottom: 4, color: '#666' },
  senderAI: { color: '#4a72d4' },
  messageText: { fontSize: 16 },
  inputBar: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white'
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 24,
    paddingHorizontal: 16,
    backgroundColor: 'white'
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#999'
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendActive: { backgroundColor: '#2a70e0' },
  voiceBtn: { backgroundColor: '#363434' },
  btnDisabled: { opacity: 0.5 },
  sendText: { color: 'white', fontSize: 18 },
  voiceIcon: { width: 24, height: 24 }
});