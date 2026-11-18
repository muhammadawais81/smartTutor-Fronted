import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  InteractionManager,
} from 'react-native';
import {endVideoCall} from '../../api/video';
import {createWhiteboardRoom} from '../../api/whiteboard';
import type {CreateWhiteboardRoomResponse} from '../../api/whiteboard/types';
import LoadingOverlay from '../common/LoadingOverlay';
import CallErrorState from '../common/CallErrorState';
import {requestAVPermissions} from '../../services/permissions';
import {
  AgoraConnectionData,
  resolveAgoraConnectionData,
} from '../../services/agoraSession';
import type {StylePropInterface} from 'agora-rn-uikit';

interface TeacherVideoCallRoomScreenProps {
  callId: number;
  token: string;
  channelName: string;
  uid: number;
  onBack: () => void;
  onMinimize?: () => void;
  isMinimized?: boolean;
  onRestore?: () => void;
  onOpenWhiteboard?: (session: CreateWhiteboardRoomResponse, callId: number) => void;
}

const TeacherVideoCallRoomScreen: React.FC<TeacherVideoCallRoomScreenProps> = ({
  callId,
  token,
  channelName,
  uid,
  onBack,
  onMinimize,
  isMinimized = false,
  onRestore,
  onOpenWhiteboard,
}) => {
  const [connectionData, setConnectionData] = useState<AgoraConnectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastJoiner, setLastJoiner] = useState<number | null>(null);
  const [studentJoined, setStudentJoined] = useState(false);
  const [moreActionsVisible, setMoreActionsVisible] = useState(false);
  const [whiteboardLoading, setWhiteboardLoading] = useState(false);
  const timeoutsRef = useRef<{banner: ReturnType<typeof setTimeout> | null}>(
    {banner: null},
  );

  const initialize = useCallback(async () => {
    setLoading(true);
    setError(null);

    const permissionsGranted = await requestAVPermissions();
    if (!permissionsGranted) {
      setError('Camera and microphone permissions are required to start the class.');
      setLoading(false);
      return;
    }

    try {
      const data = await resolveAgoraConnectionData({
        channelName,
        uid,
        token,
      });
      setConnectionData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize Agora session.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [channelName, token, uid]);

  useEffect(() => {
    initialize();
    return () => {
      setConnectionData(null);
      if (timeoutsRef.current.banner) {
        clearTimeout(timeoutsRef.current.banner);
      }
    };
  }, [initialize]);

  const handleEndCall = useCallback(async () => {
    try {
      await endVideoCall(callId);
    } catch (err) {
      Alert.alert('Error', 'Failed to end class. Please try again.');
    } finally {
      onBack();
    }
  }, [callId, onBack]);

  const handleShareScreen = useCallback(() => {
    Alert.alert('Coming soon', 'Screen sharing is not available in this build.');
    setMoreActionsVisible(false);
  }, []);

  const handleMinimizePress = useCallback(() => {
    if (onMinimize) {
      onMinimize();
    }
    setMoreActionsVisible(false);
  }, [onMinimize]);

  const handleOpenWhiteboard = useCallback(async () => {
    if (!onOpenWhiteboard) {
      Alert.alert('Whiteboard', 'Whiteboard is not available in this view.');
      return;
    }

    try {
      setWhiteboardLoading(true);
      const response = await createWhiteboardRoom({video_call_id: callId});
      if (!response?.url) {
        throw new Error('Whiteboard URL is missing.');
      }
      setMoreActionsVisible(false);
      onOpenWhiteboard(response, callId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open whiteboard.';
      Alert.alert('Whiteboard', message);
    } finally {
      setWhiteboardLoading(false);
    }
  }, [onOpenWhiteboard]);

  if (loading) {
    return <LoadingOverlay message="Connecting to class..." />;
  }

  if (error) {
    return (
      <CallErrorState
        message={error}
        onRetry={initialize}
        onBack={onBack}
      />
    );
  }

  if (!connectionData) {
    return (
      <CallErrorState
        message="Unable to prepare the call session."
        onRetry={initialize}
        onBack={onBack}
      />
    );
  }

  let AgoraUIKit: React.ComponentType<any> | null = null;
  try {
    const AgoraUIKitModule = require('agora-rn-uikit');
    AgoraUIKit = (AgoraUIKitModule.default || AgoraUIKitModule) as React.ComponentType<any>;
  } catch (err) {
    AgoraUIKit = null;
  }

  if (!AgoraUIKit) {
    return (
      <CallErrorState
        message="Agora UIKit failed to load. Restart Metro with reset cache and try again."
        onBack={onBack}
      />
    );
  }
  const containerStyle = isMinimized ? styles.minimizedContainer : styles.container;

  const uiKitStyleProps: Partial<StylePropInterface> = {
    theme: '#E6EDF7',
    iconSize: 22,
    BtnTemplateContainer: {
      alignItems: 'center',
    },
    BtnTemplateStyles: {
      width: 56,
      height: 56,
      borderRadius: 14,
      backgroundColor: 'rgba(6, 71, 252, 0.12)',
      borderWidth: 0,
    },
    localBtnContainer: {
     bottom: 24,
      left: 16,
      right: 16,
      height: 86,
      borderRadius: 18,
      paddingHorizontal: 32,
      paddingLeft: 82,
      paddingVertical: 10,
      // backgroundColor: 'rgba(13,20,33,0.7)',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 40,
      pointerEvents: 'box-none',
      position: 'absolute',
    },
    localBtnStyles: {
      muteLocalAudio: {
        backgroundColor: '#0061cc',
        borderColor: 'transparent',
        borderWidth: 0,
      },
      muteLocalVideo: {
        backgroundColor: '#0061cc',
        borderColor: 'transparent',
        borderWidth: 0,
      },
      switchCamera: {
        backgroundColor: '#0061cc',
        borderColor: 'transparent',
        borderWidth: 0,
      },
      endCall: {
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: '#ff2b60',
        borderColor: '#ff2b60',
        borderWidth: 0,
      },
    },
  };

  const minimizedStyleProps: Partial<StylePropInterface> = {
    ...uiKitStyleProps,
    BtnTemplateContainer: {display: 'none'},
    BtnTemplateStyles: {display: 'none'},
    localBtnContainer: {display: 'none'},
  };

  return (
    <View style={containerStyle}>
      <AgoraUIKit
        connectionData={connectionData}
        styleProps={isMinimized ? minimizedStyleProps : uiKitStyleProps}
        settings={{disableRtm: true}}
        rtcCallbacks={{
          EndCall: handleEndCall,
          UserJoined: (_connection: any, remoteUid: React.SetStateAction<number | null>) => {
            InteractionManager.runAfterInteractions(() => {
              setStudentJoined(true);
              setLastJoiner(remoteUid);
              if (timeoutsRef.current.banner) {
                clearTimeout(timeoutsRef.current.banner);
              }
              timeoutsRef.current.banner = setTimeout(() => setLastJoiner(null), 3000);
            });
          },
          UserOffline: () => {
            InteractionManager.runAfterInteractions(() => {
              setStudentJoined(false);
            });
          },
        }}
      />
      {isMinimized && onRestore && (
        <TouchableOpacity style={styles.restoreButton} onPress={onRestore}>
          {/* <Text style={styles.restoreText}>Return to call</Text> */}
        </TouchableOpacity>
      )}
      {!isMinimized && !studentJoined && (
        <View style={styles.waitingOverlay} pointerEvents="none">
          <Text style={styles.waitingText}>No student joined yet</Text>
        </View>
      )}
      {!isMinimized && lastJoiner !== null && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Student joined: {lastJoiner}</Text>
        </View>
      )}
      {!isMinimized && (
        <View style={styles.moreContainer} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => setMoreActionsVisible((prev) => !prev)}>
            <Text style={styles.moreButtonText}>•••</Text>
          </TouchableOpacity>
          {moreActionsVisible && (
            <View style={styles.moreMenu}>
              <TouchableOpacity style={styles.moreMenuItem} onPress={handleOpenWhiteboard}>
                <Text style={styles.moreMenuText}>Whiteboard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.moreMenuItem} onPress={handleShareScreen}>
                <Text style={styles.moreMenuText}>Share screen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.moreMenuItem, !onMinimize && styles.moreMenuItemDisabled]}
                onPress={handleMinimizePress}
                disabled={!onMinimize}>
                <Text style={styles.moreMenuText}>Minimize screen</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      {whiteboardLoading && (
        <View style={styles.whiteboardLoadingOverlay}>
          <ActivityIndicator size="large" color="#E6EDF7" />
          <Text style={styles.whiteboardLoadingText}>Opening whiteboard...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  minimizedContainer: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  banner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    padding: 10,
    backgroundColor: 'rgba(15,118,110,0.9)',
    borderRadius: 8,
  },
  bannerText: {
    color: '#E2F3F1',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  restoreButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 6,
  },
  restoreText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  waitingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 130,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  waitingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  moreContainer: {
    position: 'absolute',
    bottom: 48,
    left: 27,
    alignItems: 'center',
    zIndex: 30,
  },
  moreButton: {
   width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#0061cc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 6,
  },
  moreButtonText: {
    color: '#E6EDF7',
    fontSize: 20,
    fontWeight: '700',
  },
  moreMenu: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    width: 190,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 6},
    elevation: 8,
  },
  moreMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  moreMenuItemDisabled: {
    opacity: 0.5,
  },
  moreMenuText: {
    color: '#E6EDF7',
    fontSize: 15,
    fontWeight: '600',
 },
  whiteboardLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
  },
  whiteboardLoadingText: {
    marginTop: 10,
    color: '#E6EDF7',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default TeacherVideoCallRoomScreen;
