import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {endWhiteboardRoom, getActiveWhiteboard} from '../../api/whiteboard';

type Props = {
  url: string;
  roomId: string;
  roomKey?: string;
  videoCallId?: number;
  canEnd?: boolean;
  followActive?: boolean;
  displayName?: string;
  roleLabel?: string;
  onBack: () => void;
};

const WhiteboardScreen: React.FC<Props> = ({
  url,
  roomId,
  roomKey,
  videoCallId,
  canEnd = true,
  followActive = false,
  displayName,
  roleLabel,
  onBack,
}) => {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [ending, setEnding] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const canLoad = useMemo(() => !!url && typeof url === 'string', [url]);

  const handleLoadStart = useCallback(() => {
    setLoading(true);
    setFailed(false);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
  }, []);

  const handleLoadError = useCallback(() => {
    setLoading(false);
    setFailed(true);
  }, []);

  const handleWebMessage = useCallback((event: any) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload?.type === 'drawStart') {
        setIsDrawing(true);
      } else if (payload?.type === 'drawEnd') {
        setIsDrawing(false);
      }
    } catch (error) {
      // Ignore malformed messages from WebView.
    }
  }, []);

  const collabName = useMemo(() => {
    return displayName?.trim() || roleLabel?.trim() || 'User';
  }, [displayName, roleLabel]);

  const injectedJavaScript = useMemo(() => {
    return `
      (function() {
        if (window.__wbListenerAttached) { return; }
        window.__wbListenerAttached = true;
        var send = function(type) {
          try {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: type }));
          } catch (e) {}
        };
        var onDown = function() { send('drawStart'); };
        var onUp = function() { send('drawEnd'); };
        document.addEventListener('pointerdown', onDown, true);
        document.addEventListener('pointerup', onUp, true);
        document.addEventListener('pointercancel', onUp, true);
        document.addEventListener('touchstart', onDown, true);
        document.addEventListener('touchend', onUp, true);
        document.addEventListener('touchcancel', onUp, true);
        document.addEventListener('mouseup', onUp, true);
        window.addEventListener('blur', onUp);
      })();
      true;
    `;
  }, []);

  const injectedBeforeContentLoaded = useMemo(() => {
    const safeName = JSON.stringify(collabName);
    return `
      (function() {
        try {
          window.localStorage.setItem('excalidraw.username', ${safeName});
        } catch (e) {}
      })();
      true;
    `;
  }, [collabName]);

  const handleEndWhiteboard = useCallback(async () => {
    if (!roomId) {
      onBack();
      return;
    }

    try {
      setEnding(true);
      await endWhiteboardRoom({roomId, roomKey, video_call_id: videoCallId});
      onBack();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to end whiteboard.';
      Alert.alert('Whiteboard', message);
      onBack();
    } finally {
      setEnding(false);
    }
  }, [onBack, roomId, roomKey, videoCallId]);

  useEffect(() => {
    if (!followActive) {
      return;
    }

    let mounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const pollActiveWhiteboard = async () => {
      try {
        const active = await getActiveWhiteboard(videoCallId);
        if (!mounted) {
          return;
        }
        if (!active?.roomId) {
          onBack();
        }
      } catch (err) {
        // Silent: keep the board open if the active check fails temporarily.
      }
    };

    pollActiveWhiteboard();
    intervalId = setInterval(pollActiveWhiteboard, 5000);

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [followActive, onBack, videoCallId]);

  return (
    <SafeAreaView edges={[]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back to call</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Whiteboard</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.endRow}>
        {!canEnd && (
          <TouchableOpacity onPress={onBack} style={styles.backToCallButton}>
            <Text style={styles.backToCallText}>Back to call</Text>
          </TouchableOpacity>
        )}
        {canEnd && (
          <TouchableOpacity
            onPress={handleEndWhiteboard}
            style={[styles.closeButton, ending && styles.closeButtonDisabled]}
            disabled={ending}>
            {ending ? (
              <ActivityIndicator size="small" color="#FCA5A5" />
            ) : (
              <Text style={styles.closeText}>End whiteboard</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {!canLoad ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Whiteboard link is not available.</Text>
          <TouchableOpacity onPress={onBack} style={styles.retryButton}>
            <Text style={styles.retryText}>Return to call</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.webviewContainer}>
          <WebView
            source={{uri: url}}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            onError={handleLoadError}
            onMessage={handleWebMessage}
            injectedJavaScript={injectedJavaScript}
            injectedJavaScriptBeforeContentLoaded={injectedBeforeContentLoaded}
            startInLoadingState={false}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            originWhitelist={['*']}
          />
          {isDrawing && (displayName || roleLabel) && (
            <View style={styles.drawLabel} pointerEvents="none">
              <Text style={styles.drawLabelText}>
                {(roleLabel || 'User') + (displayName ? `: ${displayName}` : '')}
              </Text>
            </View>
          )}
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#1E3A8A" />
              <Text style={styles.loadingText}>Opening whiteboard...</Text>
            </View>
          )}
          {failed && (
            <View style={styles.errorOverlay}>
              <Text style={styles.errorText}>Unable to load the whiteboard.</Text>
              <TouchableOpacity onPress={onBack} style={styles.retryButton}>
                <Text style={styles.retryText}>Return to call</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.2)',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 110,
  },
  backText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 90,
  },
  endRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    alignItems: 'flex-end',
    backgroundColor: '#0B1220',
  },
  backToCallButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.4)',
  },
  backToCallText: {
    color: '#BFDBFE',
    fontSize: 13,
    fontWeight: '700',
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(248,113,113,0.18)',
    minWidth: 60,
    alignItems: 'center',
    marginTop: 6,
  },
  closeButtonDisabled: {
    opacity: 0.7,
  },
  closeText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  webviewContainer: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '600',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1E3A8A',
  },
  retryText: {
    color: '#E2E8F0',
    fontWeight: '600',
  },
  drawLabel: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.3)',
  },
  drawLabelText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default WhiteboardScreen;
