import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  Alert,
  StatusBar,
  GestureResponderEvent,
  LayoutChangeEvent,
} from 'react-native';
import { X, Download, Play, Pause, RotateCcw, RotateCw } from 'lucide-react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { extractFileName } from '../utils/chatMediaUtils';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');



interface ChatMediaPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'document';
  fileName?: string;
}

export default function ChatMediaPreviewModal({
  visible,
  onClose,
  mediaUrl,
  mediaType,
  fileName,
}: ChatMediaPreviewModalProps) {
  const videoRef = useRef<Video>(null);
  const [downloading, setDownloading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [progressBarWidth, setProgressBarWidth] = useState(1);
  const [localPdfUri, setLocalPdfUri] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayName = fileName || extractFileName(mediaUrl);

  // Reset state on close
  useEffect(() => {
    if (!visible) {
      setIsPlaying(false);
      setPositionMs(0);
      setDurationMs(0);
      setControlsVisible(true);
      setLocalPdfUri(null);
      setPdfLoading(false);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    }
  }, [visible]);

  // Load PDF to cache when opened
  useEffect(() => {
    if (visible && mediaType === 'document' && mediaUrl) {
      setPdfLoading(true);
      setLocalPdfUri(null);
      const dest = (FileSystem.cacheDirectory ?? '') + (displayName || 'preview.pdf');
      FileSystem.downloadAsync(mediaUrl, dest)
        .then(({ uri }) => setLocalPdfUri(uri))
        .catch((e) => {
          console.warn('[PDF preview] download failed:', e);
          // Fallback: try Google Docs if download fails
          setLocalPdfUri(`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(mediaUrl)}`);
        })
        .finally(() => setPdfLoading(false));
    }
  }, [visible, mediaType, mediaUrl, displayName]);

  // Schedule auto-hide of controls after playing starts
  const scheduleControlsHide = useCallback(() => {
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 3500);
  }, []);

  const handleVideoTap = () => {
    if (!controlsVisible) {
      setControlsVisible(true);
      scheduleControlsHide();
    } else {
      setControlsVisible(false);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    }
  };

  // ─── Download ─────────────────────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    try {
      setDownloading(true);

      if (mediaType === 'image' || mediaType === 'video') {
        // Request only photo/video granular permissions — avoids AUDIO mismatch on Android 13+
        const { status } = await MediaLibrary.requestPermissionsAsync(
          false,
          ['photo', 'video']
        );
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please allow access to save files to your device.');
          return;
        }

        const cacheUri = FileSystem.cacheDirectory + displayName;
        const { uri } = await FileSystem.downloadAsync(mediaUrl, cacheUri);

        if (Platform.OS === 'android') {
          const asset = await MediaLibrary.createAssetAsync(uri);
          await MediaLibrary.createAlbumAsync('BazaarX', asset, false);
        } else {
          await MediaLibrary.saveToLibraryAsync(uri);
        }
        Alert.alert('Saved ✓', `${displayName} saved to your gallery.`);
      } else {
        const cacheUri = FileSystem.cacheDirectory + displayName;
        const { uri } = await FileSystem.downloadAsync(mediaUrl, cacheUri);
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Save ${displayName}`,
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (err) {
      console.error('[ChatMediaPreview] Download error:', err);
      Alert.alert('Error', 'Could not download the file. Please try again.');
    } finally {
      setDownloading(false);
    }
  }, [mediaUrl, mediaType, displayName]);

  // ─── Video controls ──────────────────────────────────────────────────────
  const togglePlayback = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    } else {
      await videoRef.current.playAsync();
      scheduleControlsHide();
    }
  };

  const skip = async (deltaMs: number) => {
    if (!videoRef.current || durationMs === 0) return;
    const target = Math.max(0, Math.min(positionMs + deltaMs, durationMs));
    await videoRef.current.setPositionAsync(target);
    setPositionMs(target);
  };

  // Scrub: compute seek position from touch X relative to progress bar
  const seekFromTouch = async (e: GestureResponderEvent) => {
    if (!videoRef.current || durationMs === 0 || progressBarWidth <= 0) return;
    const x = e.nativeEvent.locationX;
    const ratio = Math.max(0, Math.min(1, x / progressBarWidth));
    const seekMs = ratio * durationMs;
    setPositionMs(seekMs);
    await videoRef.current.setPositionAsync(seekMs);
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsPlaying(status.isPlaying);
    setPositionMs(status.positionMillis);
    setDurationMs(status.durationMillis || 0);
    if (status.didJustFinish) {
      setIsPlaying(false);
      setControlsVisible(true);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      videoRef.current?.setPositionAsync(0);
    }
  };

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const progress = durationMs > 0 ? positionMs / durationMs : 0;

  // ─── Render body ─────────────────────────────────────────────────────────
  const renderBody = () => {
    // ── Image ──────────────────────────────────────────────────────────────
    if (mediaType === 'image') {
      return (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: mediaUrl }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </View>
      );
    }

    // ── Video ──────────────────────────────────────────────────────────────
    if (mediaType === 'video') {
      return (
        <View style={styles.videoWrapper}>
          {/* The actual player */}
          <Video
            ref={videoRef}
            source={{ uri: mediaUrl }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            onPlaybackStatusUpdate={onPlaybackStatusUpdate}
            shouldPlay={false}
          />

          {/* Tap overlay to toggle controls */}
          <Pressable style={StyleSheet.absoluteFill} onPress={handleVideoTap} />

          {/* Controls overlay — shown when controlsVisible */}
          {controlsVisible && (
            <View style={styles.videoOverlay} pointerEvents="box-none">
              {/* Buttons */}
              <View style={styles.videoControls}>
                <Pressable onPress={() => skip(-10000)} style={styles.controlBtn} hitSlop={12}>
                  <RotateCcw size={30} color="#FFFFFF" />
                  <Text style={styles.skipLabel}>10</Text>
                </Pressable>
                <Pressable onPress={togglePlayback} style={styles.playBtn} hitSlop={8}>
                  {isPlaying
                    ? <Pause size={38} color="#FFFFFF" fill="#FFFFFF" />
                    : <Play size={38} color="#FFFFFF" fill="#FFFFFF" />}
                </Pressable>
                <Pressable onPress={() => skip(10000)} style={styles.controlBtn} hitSlop={12}>
                  <RotateCw size={30} color="#FFFFFF" />
                  <Text style={styles.skipLabel}>10</Text>
                </Pressable>
              </View>

              {/* Progress row */}
              <View style={styles.progressRow}>
                <Text style={styles.timeLabel}>{fmt(positionMs)}</Text>

                {/* Scrub track — large hit area */}
                <View
                  style={styles.progressTrackContainer}
                  onLayout={(e: LayoutChangeEvent) => setProgressBarWidth(e.nativeEvent.layout.width)}
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onResponderGrant={seekFromTouch}
                  onResponderMove={seekFromTouch}
                >
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                  </View>
                  {/* Thumb */}
                  <View
                    style={[
                      styles.progressThumb,
                      { left: `${progress * 100}%` as any },
                    ]}
                  />
                </View>

                <Text style={styles.timeLabel}>{fmt(durationMs)}</Text>
              </View>
            </View>
          )}
        </View>
      );
    }

    // ── Document — download to cache, render locally ─────────────────────
    if (pdfLoading) {
      return (
        <View style={styles.pdfContainer}>
          <View style={styles.pdfLoading}>
            <ActivityIndicator size="large" color="#D97706" />
            <Text style={styles.pdfLoadingText}>Loading PDF…</Text>
          </View>
        </View>
      );
    }

    if (!localPdfUri) {
      return (
        <View style={styles.pdfContainer}>
          <View style={styles.pdfLoading}>
            <Text style={styles.pdfLoadingText}>Could not load PDF.</Text>
          </View>
        </View>
      );
    }

    // Use local file:// URI — works on both iOS and Android
    const pdfSource = localPdfUri.startsWith('http')
      ? { uri: localPdfUri }          // fallback: Google Docs
      : { uri: localPdfUri }; // local file
    return (
      <View style={styles.pdfContainer}>
        <WebView
          source={pdfSource}
          style={styles.webView}
          allowFileAccess={true}
          allowFileAccessFromFileURLs={true}
          allowUniversalAccessFromFileURLs={true}
          originWhitelist={['*']}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.pdfLoading}>
              <ActivityIndicator size="large" color="#D97706" />
              <Text style={styles.pdfLoadingText}>Loading PDF…</Text>
            </View>
          )}
        />
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <StatusBar barStyle="light-content" />

        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={onClose} style={styles.topBtn} hitSlop={12}>
            <X size={26} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.topTitle} numberOfLines={1}>{displayName}</Text>
          <Pressable onPress={handleDownload} style={styles.topBtn} disabled={downloading} hitSlop={12}>
            {downloading
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Download size={24} color="#FFFFFF" />}
          </Pressable>
        </View>

        {/* Body */}
        <View style={styles.body}>{renderBody()}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  topBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  topTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  body: {
    flex: 1,
  },

  // ── Image — centered higher
  imageContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 24,
  },
  fullImage: {
    width: SCREEN_W,
    height: SCREEN_H * 0.68,
  },

  // ── Video ──
  videoWrapper: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    // Shift content upward so controls don't sit flush with the bottom of the screen
    paddingBottom: 80,
  },
  video: {
    width: SCREEN_W,
    height: SCREEN_H * 0.55,
    alignSelf: 'center',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  videoControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  controlBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  skipLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(217,119,6,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRow: {
    position: 'absolute',
    bottom: 96,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  timeLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    width: 38,
    textAlign: 'center',
  },
  // Container with large hit area for scrubbing
  progressTrackContainer: {
    flex: 1,
    height: 28,
    justifyContent: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D97706',
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: '50%',
    marginTop: -7,
    marginLeft: -7,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D97706',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 3,
  },

  // ── PDF ──
  pdfContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  webView: {
    flex: 1,
  },
  pdfLoading: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  pdfLoadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 14,
  },
});
