import React, { useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { X, Send, Play, FileText } from 'lucide-react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export interface SendPreviewAsset {
  uri: string;
  name: string;
  type: 'image' | 'video' | 'document';
  size?: number;
}

interface ChatSendPreviewModalProps {
  visible: boolean;
  onCancel: () => void;
  onSend: () => void;
  asset: SendPreviewAsset | null;
  uploading: boolean;
}

/** Generates a self-contained HTML page that fetches a local PDF by URI and renders
 *  it with PDF.js. Used on Android where WebView cannot render PDFs natively.
 *  Requires allowFileAccess + allowFileAccessFromFileURLs on the WebView. */
const pdfJsHtml = (fileUri: string) => `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"><\/script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{background:#111827;overflow-y:auto;-webkit-overflow-scrolling:touch}
    canvas{display:block;width:100%!important;height:auto!important;margin-bottom:3px}
    #status{color:#9ca3af;font:14px/2 system-ui;text-align:center;padding:50px 20px}
  </style>
</head><body>
  <div id="status">Loading PDF\u2026</div>
  <div id="out"></div>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc=
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    fetch('${fileUri}')
      .then(function(r){ return r.arrayBuffer(); })
      .then(function(buf){
        return pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
      })
      .then(function(pdf){
        document.getElementById('status').remove();
        var out=document.getElementById('out'),w=window.innerWidth;
        for(var n=1;n<=pdf.numPages;n++)(function(pn){
          pdf.getPage(pn).then(function(page){
            var vp=page.getViewport({scale:w/page.getViewport({scale:1}).width});
            var c=document.createElement('canvas');
            c.width=vp.width;c.height=vp.height;
            out.appendChild(c);
            page.render({canvasContext:c.getContext('2d'),viewport:vp});
          });
        })(n);
      })
      .catch(function(e){
        document.getElementById('status').textContent='Preview unavailable: '+e.message;
      });
  <\/script>
</body></html>`;

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ChatSendPreviewModal({
  visible,
  onCancel,
  onSend,
  asset,
  uploading,
}: ChatSendPreviewModalProps) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  if (!asset) return null;

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsPlaying(status.isPlaying);
    if (status.didJustFinish) videoRef.current?.setPositionAsync(0);
  };

  const togglePlayback = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  };

  const renderPreview = () => {
    // ── Image ────────────────────────────────────────────────────────────
    if (asset.type === 'image') {
      return (
        <Image
          source={{ uri: asset.uri }}
          style={styles.previewImage}
          resizeMode="contain"
        />
      );
    }

    // ── Video — actual player with play/pause ────────────────────────────
    if (asset.type === 'video') {
      return (
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={{ uri: asset.uri }}
            style={styles.videoPlayer}
            resizeMode={ResizeMode.CONTAIN}
            onPlaybackStatusUpdate={onPlaybackStatusUpdate}
            shouldPlay={false}
          />
          {/* Play/pause overlay */}
          <Pressable style={styles.videoPlayOverlay} onPress={togglePlayback}>
            {!isPlaying && (
              <View style={styles.playCircle}>
                <Play size={36} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            )}
          </Pressable>
          <Text style={styles.videoLabel} numberOfLines={1}>{asset.name}</Text>
          {!!asset.size && <Text style={styles.videoMeta}>{formatFileSize(asset.size)}</Text>}
        </View>
      );
    }

    // ── Document — iOS renders PDF natively from file URI; Android uses PDF.js via fetch ──
    return Platform.OS === 'ios' ? (
      <WebView
        source={{ uri: asset.uri }}
        style={{ flex: 1 }}
        originWhitelist={['*', 'file://*']}
        allowFileAccess
        startInLoadingState
        renderLoading={() => (
          <View style={styles.pdfCard}>
            <ActivityIndicator size="large" color="#EF4444" />
            <Text style={[styles.pdfCardHint, { marginTop: 12 }]}>Loading PDF…</Text>
          </View>
        )}
      />
    ) : (
      <WebView
        source={{ html: pdfJsHtml(asset.uri), baseUrl: 'file:///' }}
        style={{ flex: 1 }}
        originWhitelist={['*']}
        javaScriptEnabled
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        scrollEnabled
        showsVerticalScrollIndicator={false}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.pdfCard}>
            <ActivityIndicator size="large" color="#EF4444" />
            <Text style={[styles.pdfCardHint, { marginTop: 12 }]}>Rendering PDF…</Text>
          </View>
        )}
      />
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <StatusBar barStyle="light-content" />

        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={onCancel} style={styles.closeBtn} hitSlop={12}>
            <X size={26} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.topTitle}>
            Send {asset.type === 'image' ? 'Photo' : asset.type === 'video' ? 'Video' : 'Document'}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Body */}
        <View style={styles.body}>{renderPreview()}</View>

        {/* Bottom bar */}
        <View style={styles.bottomBar}>
          <Pressable onPress={onCancel} style={styles.cancelBtn} disabled={uploading}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={onSend} style={[styles.sendBtn, uploading && styles.sendBtnDisabled]} disabled={uploading}>
            {uploading
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : (
                <>
                  <Send size={18} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.sendText}>Send</Text>
                </>
              )}
          </Pressable>
        </View>
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
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  topTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Image — fills all available body space ──
  previewImage: {
    flex: 1,
    width: SCREEN_W,
  },

  // ── Video ──
  videoContainer: {
    flex: 1,
    width: SCREEN_W,
  },
  videoPlayer: {
    flex: 1,
    width: SCREEN_W,
    backgroundColor: '#000',
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(217,119,6,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  videoMeta: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 4,
  },

  // ── PDF card (replaces WebView) ──
  pdfCard: {
    flex: 1,
    width: SCREEN_W,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  pdfIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(239,68,68,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  pdfCardName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  pdfCardMeta: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  pdfCardHint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },

  // ── Bottom bar ──
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 16,
    gap: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sendBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
