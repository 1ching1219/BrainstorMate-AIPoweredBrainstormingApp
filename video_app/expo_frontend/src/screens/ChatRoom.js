import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import {
  getMessages,
  getParticipants,
  sendMessage as sendMsgApi,
  joinRoom as joinRoomApi,
  getWebSocketUrl
} from '../services/api';

const voiceWaveIcon = require('../../assets/icons/Voice-Icon.png');

const ChatRoom = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { roomId, aiPartners: initialAi } = route.params;
  const [aiPartners] = useState(initialAi || []);
  const [userName, setUserName] = useState('You');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef();
  const reconnectAttempts = useRef(0);
  const maxReconnect = 5;
  const flatListRef = useRef();

  useEffect(() => {
    AsyncStorage.getItem('username').then(name => {
      if (name) setUserName(name);
    });
    connectWS();
    fetchMessages();
    return () => {
      socketRef.current?.close();
    };
  }, [roomId]);

  useEffect(() => {
    // scroll to bottom on new message
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // 1) Generate random AI feedback every 15s once connected
  useEffect(() => {
    if (aiPartners.length === 0 || !isConnected) return;
    const feedbackInterval = setInterval(() => {
      const randomAgent = aiPartners[
        Math.floor(Math.random() * aiPartners.length)
      ];
      const feedback = generateRandomFeedback(randomAgent.role);
      // only send—do not append here
      socketRef.current?.send(JSON.stringify({
        type: 'message',
        sender: randomAgent.name,
        message: feedback,
        is_ai: true
      }));
    }, 5000);
    
    return () => clearInterval(feedbackInterval);
  }, [aiPartners, isConnected]);

  // 2) Helper to pick a random feedback string per role
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

  const connectWS = () => {
    if (reconnectAttempts.current >= maxReconnect) return;
    // const wsUrl = getWebSocketUrl(roomId);
    // const ws = new WebSocket(wsUrl);
    const ws = new WebSocket("wss://0000-0000.ngrok-free.app/ws/chat/" + roomId + "/");
    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      joinRoomApi(roomId, userName, null, null).catch(console.warn);
    };
    ws.onmessage = e => {
      const data = JSON.parse(e.data);
      // normalize: front‐end always uses .content
      const content = data.content ?? data.message;
      setMessages(prev => [
        ...prev,
        { 
          sender: data.sender, 
          is_ai: data.is_ai, 
          content, 
          // if your backend emits an id or timestamp you can carry it too:
          id: data.id 
        }
      ]);
    };
    ws.onclose = () => {
      setIsConnected(false);
      reconnectAttempts.current++;
      setTimeout(connectWS, Math.min(1000 * 2 ** reconnectAttempts.current, 30000));
    };
    ws.onerror = () => ws.close();
    socketRef.current = ws;
  };

  const fetchMessages = async () => {
    try {
      const msgs = await getMessages(roomId);
      setMessages(msgs);
    } catch (e) { console.warn(e); }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !isConnected) return;
    setInput('');  
    const outbound = { type:'message', sender:userName, message:text, is_ai:false };
    socketRef.current.send(JSON.stringify(outbound));
    try {
      await sendMsgApi(roomId, userName, text, false);
    } catch (e) { console.warn(e); }
  };

  // Add a helper to get the avatar for a given sender name:
  const getAvatarForSender = (senderName) => {
    const agent = aiPartners.find(a => a.name === senderName);
    return agent ? agent.avatar : { uri: senderName.toLowerCase() + '.png' };
  };

  const renderItem = ({ item, index }) => {
    if (item.is_system) {
        return (
            <View style={styles.systemMsg}>
                <Text style={styles.systemText}>{item.content}</Text>
            </View>
        );
    }
    const fromUser = item.sender === userName;
    const fromAI = aiPartners.some(a => a.name === item.sender);
    const senderName = item.sender || "unknown";
    return (
        <View
            style={[
                styles.msgRow,
                fromUser ? styles.msgRowRight : styles.msgRowLeft
            ]}
        >
            {!fromUser && (
                <View style={styles.avatar}>
                    {fromAI ? (
                        <Image
                            source={getAvatarForSender(senderName)}
                            style={styles.avatarImg}
                        />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarLetter}>
                                {senderName.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                </View>
            )}
            <View
                style={[
                    styles.bubble,
                    fromUser
                        ? styles.bubbleUser
                        : fromAI
                        ? styles.bubbleAI
                        : styles.bubbleOther
                ]}
            >
                {!fromUser && (
                    <Text style={[styles.sender, fromAI && styles.senderAI]}>
                        {senderName}
                    </Text>
                )}
                <Text>{item.content}</Text>
            </View>
        </View>
    );
  };

  useEffect(() => {
    console.log("Received params:", { roomId, aiPartners: initialAi });
  }, []);

  const navigateToVoice = () => {
    navigation.navigate('VoiceMode', {
      roomId,
      aiPartners,
      username: userName    // ← make sure this key matches what VoiceMode reads
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isConnected ? 'green' : 'red' }
            ]}
          />
          <Text style={styles.title}>Room {roomId}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Ionicons name="exit-outline" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, i) => item.id || `m-${i}`}
        renderItem={renderItem}
        contentContainerStyle={styles.chat}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          editable={isConnected}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            !input.trim() ? styles.voiceBtn : styles.sendActive
          ]}
          onPress={!input.trim() ? navigateToVoice : handleSend}
          disabled={!isConnected}
        >
          { !input.trim()
            ? <Image source={voiceWaveIcon} style={styles.voiceIcon} />
            : <Text style={styles.sendText}>➤</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ChatRoom;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#e0e0e0'
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8
  },
  title: { fontSize: 18, fontWeight: '600' },
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
  sendText: { color: 'white', fontSize: 18 },
  voiceIcon: {
    width: 24,
    height: 24,
  },
});