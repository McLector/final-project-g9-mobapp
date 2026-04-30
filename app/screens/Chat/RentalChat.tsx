import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList, KeyboardAvoidingView, Platform,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../../../src/lib/supabase';
import useAuth from '../../../src/hooks/useAuth';
import useTheme from '../../../src/hooks/useTheme';
import LoadingSpinner from '../../../src/components/LoadingSpinner/LoadingSpinner';

// Shared param list used by both stacks
export type ChatParams = {
  RentalChat: { rentalId: string; rentalTitle: string };
};

interface Message {
  id: string;
  rental_id: string;
  sender_id: string;
  sender_role: 'admin' | 'customer';
  message: string;
  is_read: boolean;
  created_at: string;
  sender?: { full_name: string };
}

interface Props {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<ChatParams, 'RentalChat'>;
}

const RentalChat = ({ navigation, route }: Props) => {
  const { rentalId, rentalTitle } = route.params;
  const { user } = useAuth();
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('rental_messages')
      .select('*, sender:profiles(full_name)')
      .eq('rental_id', rentalId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as Message[]);
    setLoading(false);
    // Mark messages as read
    if (user?.id) {
      await supabase.from('rental_messages')
        .update({ is_read: true })
        .eq('rental_id', rentalId)
        .neq('sender_id', user.id);
    }
  }, [rentalId, user?.id]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`rental-chat-${rentalId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'rental_messages',
        filter: `rental_id=eq.${rentalId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [rentalId]);

  const sendMessage = async () => {
    if (!input.trim() || !user) return;
    setSending(true);
    const text = input.trim();
    setInput('');
    try {
      await supabase.from('rental_messages').insert({
        rental_id: rentalId,
        sender_id: user.id,
        sender_role: user.role,
        message: text,
        is_read: false,
      });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setInput(text); // restore on failure
    } finally {
      setSending(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading chat..." />;

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[{ flex: 1, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={1}>{rentalTitle}</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted }}>Rental Chat</Text>
        </View>
        <MaterialIcons name="chat" size={20} color={colors.primary} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <MaterialIcons name="chat-bubble-outline" size={40} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: 14 }}>No messages yet. Start the conversation.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.sender_id === user?.id;
            return (
              <View style={[{ maxWidth: '80%', gap: 3 }, isMe ? { alignSelf: 'flex-end', alignItems: 'flex-end' } : { alignSelf: 'flex-start' }]}>
                {!isMe && (
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginLeft: 4, fontWeight: '600' }}>
                    {item.sender?.full_name ?? (item.sender_role === 'admin' ? 'Admin' : 'Customer')}
                  </Text>
                )}
                <View style={[
                  { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, maxWidth: '100%' },
                  isMe
                    ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
                    : { backgroundColor: colors.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
                ]}>
                  <Text style={{ fontSize: 14, lineHeight: 19, color: isMe ? '#FFF' : colors.text }}>{item.message}</Text>
                </View>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginHorizontal: 4 }}>{formatTime(item.created_at)}</Text>
              </View>
            );
          }}
        />

        {/* Input */}
        <View style={[{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={[{ flex: 1, borderRadius: 22, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, justifyContent: 'center' }, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <TextInput
              style={{ fontSize: 15, color: colors.text, padding: 0, maxHeight: 100 }}
              placeholder="Type a message..."
              placeholderTextColor={colors.placeholder}
              value={input}
              onChangeText={setInput}
              multiline
              onSubmitEditing={sendMessage}
            />
          </View>
          <TouchableOpacity
            style={[{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
              { backgroundColor: input.trim() ? colors.primary : colors.border }]}
            onPress={sendMessage}
            disabled={!input.trim() || sending}
          >
            <MaterialIcons name="send" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default RentalChat;
