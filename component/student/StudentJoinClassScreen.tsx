import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  getActiveVideoCall,
  getVideoCallDetails,
  joinVideoCall,
  leaveVideoCall,
} from '../../api/video';

const PRIMARY = '#10284C';
const PRIMARY_TINT = '#EAF0F9';
const BG = '#F4F6FA';
const BORDER = '#E6EBF2';
const TEXT = '#0F172A';
const MUTED = '#64748B';

type Props = {
  onBack: () => void;
  onNavigateToRoom?: (callData: {
    callId: number;
    token: string;
    channelName: string;
    uid: number;
  }) => void;
};

const StudentJoinClassScreen: React.FC<Props> = ({onBack, onNavigateToRoom}) => {
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const [activeCall, setActiveCall] = useState<any>(null);
  const [joinedCall, setJoinedCall] = useState<any>(null);
  const [callDetails, setCallDetails] = useState<any>(null);

  const callId = useMemo(() => {
    return joinedCall?.video_call_id || activeCall?.id || null;
  }, [activeCall?.id, joinedCall?.video_call_id]);

  const fetchActiveCall = async () => {
    try {
      const call = await getActiveVideoCall();
      setActiveCall(call);
      if (call?.id) {
        const details = await getVideoCallDetails(call.id);
        setCallDetails(details);
      } else {
        setCallDetails(null);
      }
    } catch (error: any) {
      console.log('[VIDEO][Student] Active call check failed:', error?.message);
    }
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      await fetchActiveCall();
      if (mounted) {
        setLoading(false);
      }
    };

    init();

    const interval = setInterval(() => {
      if (!joinedCall) {
        fetchActiveCall();
      }
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [joinedCall]);

  const handleJoin = async () => {
    if (!activeCall?.id) {
      Alert.alert('No Active Class', 'Teacher has not started a class yet.');
      return;
    }

    try {
      setJoining(true);
      
      console.log('[VIDEO] Student joining call...');
      console.log('[VIDEO] Active call ID:', activeCall.id);
      console.log('[VIDEO] Teacher:', activeCall.teacher_name);
      console.log('[VIDEO] Sending join request with payload:', {video_call_id: activeCall.id});
      
      const response = await joinVideoCall({video_call_id: activeCall.id});
      
      console.log('[VIDEO] Student join response:', JSON.stringify(response, null, 2));
      console.log('[VIDEO] Received token:', response.token?.substring(0, 20) + '...');
      console.log('[VIDEO] Channel:', response.channel_name);
      console.log('[VIDEO] Student UID:', response.uid);
      
      setJoinedCall({
        ...response,
        video_call_id: activeCall.id,
      });

      const details = await getVideoCallDetails(activeCall.id);
      setCallDetails(details);

      // Navigate to video room if callback provided
      if (onNavigateToRoom) {
        onNavigateToRoom({
          callId: activeCall.id,
          token: response.token,
          channelName: response.channel_name,
          uid: response.uid,
        });
      } else {
        Alert.alert('Joined Class', `Connected to channel: ${response.channel_name}`);
      }
    } catch (error: any) {
      Alert.alert('Unable to Join', error?.message || 'Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!callId) {
      return;
    }

    Alert.alert('Leave Class', 'Do you want to leave this video class?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            setLeaving(true);
            await leaveVideoCall(callId);
            setJoinedCall(null);
            await fetchActiveCall();
            Alert.alert('Left Class', 'You left the class successfully.');
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Could not leave class.');
          } finally {
            setLeaving(false);
          }
        },
      },
    ]);
  };

  const handleOpenClassLink = async () => {
    const classLink = activeCall?.call_link || callDetails?.call_link;

    if (!classLink) {
      Alert.alert('Link Not Available', 'Class link is not available yet.');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(classLink);
      if (!supported) {
        Alert.alert('Invalid Link', 'Unable to open class link on this device.');
        return;
      }
      await Linking.openURL(classLink);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to open class link.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={PRIMARY} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Live Class</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Checking for active classes...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="videocam" size={20} color={PRIMARY} />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>Class Room</Text>
              <Text style={styles.heroSubtitle}>
                Join your teacher's active class instantly.
              </Text>
            </View>
          </View>

          {activeCall ? (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Active Class</Text>
                <View style={styles.livePill}>
                  <Text style={styles.livePillText}>LIVE</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Ionicons name="person-outline" size={16} color={MUTED} />
                <Text style={styles.metaLabel}>Teacher:</Text>
                <Text style={styles.metaValue}>{activeCall.teacher_name}</Text>
              </View>

              <View style={styles.metaRow}>
                <Ionicons name="people-outline" size={16} color={MUTED} />
                <Text style={styles.metaLabel}>Type:</Text>
                <Text style={styles.metaValue}>
                  {activeCall.call_type === 'group' ? 'Group Class' : 'One-to-One Class'}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Ionicons name="ellipse-outline" size={16} color={MUTED} />
                <Text style={styles.metaLabel}>Status:</Text>
                <Text style={styles.metaValue}>{activeCall.status}</Text>
              </View>

              <Text style={styles.cardLabel}>Class Link</Text>
              <View style={styles.linkBox}>
                <Text style={styles.linkText} numberOfLines={2}>
                  {activeCall.call_link || callDetails?.call_link || 'Link not available'}
                </Text>
              </View>

              {!!(activeCall.call_link || callDetails?.call_link) && (
                <TouchableOpacity style={styles.linkButton} onPress={handleOpenClassLink}>
                  <Ionicons name="open-outline" size={16} color={PRIMARY} />
                  <Text style={styles.linkButtonText}>Open Class Link</Text>
                </TouchableOpacity>
              )}

              {!joinedCall ? (
                <TouchableOpacity
                  style={[styles.primaryButton, joining && styles.buttonDisabled]}
                  disabled={joining}
                  onPress={handleJoin}>
                  <Ionicons name="videocam-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>{joining ? 'Joining...' : 'Join Class'}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.joinedBlock}>
                  <View style={styles.joinedHeader}>
                    <Text style={styles.joinedTitle}>You are in class</Text>
                    <Text style={styles.liveIndicator}>Live</Text>
                  </View>
                  <Text style={styles.joinedText}>Channel: {joinedCall.channel_name}</Text>
                  <Text style={styles.joinedText}>UID: {joinedCall.uid}</Text>
                  <Text style={styles.joinedNote}>Video call is active. Tap Return to Call to see the class.</Text>

                  <View style={styles.joinedButtons}>
                    <TouchableOpacity
                      style={styles.returnCallButton}
                      onPress={() => {
                        if (onNavigateToRoom) {
                          onNavigateToRoom({
                            callId: joinedCall.video_call_id,
                            token: joinedCall.token,
                            channelName: joinedCall.channel_name,
                            uid: joinedCall.uid,
                          });
                        }
                      }}>
                      <Ionicons name="videocam" size={17} color="#FFFFFF" />
                      <Text style={styles.returnCallButtonText}>Return to Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.leaveButton, leaving && styles.buttonDisabled]}
                      disabled={leaving}
                      onPress={handleLeave}>
                      <Ionicons name="exit-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.leaveButtonText}>{leaving ? 'Leaving...' : 'Leave'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="school-outline" size={34} color={PRIMARY} />
              </View>
              <Text style={styles.emptyTitle}>No Active Class Right Now</Text>
              <Text style={styles.emptyText}>This screen checks every 5 seconds. You will see Join button when your teacher starts class.</Text>
            </View>
          )}

        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: BG},
  header: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {color: '#FFFFFF', fontSize: 18, fontWeight: '700'},
  headerRight: {width: 40},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  loadingText: {marginTop: 10, color: MUTED, fontSize: 14},
  content: {flex: 1},
  contentContainer: {padding: 14, paddingBottom: 28},
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: PRIMARY_TINT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  heroTextWrap: {flex: 1},
  heroTitle: {fontSize: 15, fontWeight: '800', color: TEXT},
  heroSubtitle: {fontSize: 12.5, color: MUTED, marginTop: 2},
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 15,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {fontSize: 17, fontWeight: '800', color: TEXT},
  livePill: {
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  livePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
    letterSpacing: 0.3,
  },
  metaRow: {flexDirection: 'row', alignItems: 'center', marginTop: 8},
  metaLabel: {fontSize: 12.5, color: MUTED, marginLeft: 6},
  metaValue: {fontSize: 13, color: TEXT, fontWeight: '700', marginLeft: 6, flex: 1},
  cardLabel: {fontSize: 12, color: MUTED, marginTop: 12, marginBottom: 6},
  linkBox: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    backgroundColor: BG,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 12,
    color: PRIMARY,
  },
  linkButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: PRIMARY_TINT,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#C9D7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkButtonText: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: '800',
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
  },
  primaryButtonText: {fontSize: 15, color: '#FFFFFF', fontWeight: '700'},
  buttonDisabled: {opacity: 0.65},
  joinedBlock: {
    marginTop: 14,
    backgroundColor: PRIMARY_TINT,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C9D7EB',
  },
  joinedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  joinedTitle: {fontSize: 14, color: TEXT, fontWeight: '800'},
  liveIndicator: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '700',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  joinedText: {fontSize: 12, color: PRIMARY, marginBottom: 4, fontWeight: '600'},
  joinedNote: {fontSize: 11, color: MUTED, marginTop: 6, marginBottom: 12},
  joinedButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  returnCallButton: {
    flex: 1,
    backgroundColor: PRIMARY,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  returnCallButtonText: {fontSize: 14, color: '#FFFFFF', fontWeight: '700'},
  leaveButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  leaveButtonText: {fontSize: 14, color: '#FFFFFF', fontWeight: '700'},
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },
  emptyIconWrap: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_TINT,
    marginBottom: 12,
  },
  emptyTitle: {fontSize: 17, fontWeight: '800', color: TEXT, textAlign: 'center'},
  emptyText: {fontSize: 13, color: MUTED, textAlign: 'center', marginTop: 8, lineHeight: 18},
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  detailsTitle: {fontSize: 15, color: TEXT, fontWeight: '800', marginBottom: 8},
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailsKey: {
    fontSize: 12.5,
    color: MUTED,
    fontWeight: '600',
    marginRight: 8,
  },
  detailsText: {fontSize: 12.5, color: TEXT, fontWeight: '700', flex: 1, textAlign: 'right'},
});

export default StudentJoinClassScreen;
