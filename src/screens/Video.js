
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  BackHandler,
  AppState,
} from 'react-native';
// ❌ remove YoutubePlayer
// import YoutubePlayer from 'react-native-youtube-iframe';
import Video from 'react-native-video'; // ✅ native video player
import Orientation from 'react-native-orientation-locker';
import AndroidPip from '@videosdk.live/react-native-pip-android';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useData } from '../context/VideoDocContext';

const SAMPLE_LIST = [
  {
    id: 'f8Z9JyB2EIE',
    title: 'React Native Course for Beginners in 2025 | Build a Full Stack React Native App',
    thumbnail: 'https://i.ytimg.com/vi/f8Z9JyB2EIE/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=f8Z9JyB2EIE',
  },
];

export default function VideosScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const routeItems = route?.params?.items;
  const { getVideosFirstPage } = useData();

  const [items, setItems] = useState(routeItems || []);
  const [loading, setLoading] = useState(!routeItems);
  const [currentId, setCurrentId] = useState(null);

  const [fullscreenItem, setFullscreenItem] = useState(null);
  const inlineRef = useRef(null);
  const fullRef = useRef(null);

  const [savedTime, setSavedTime] = useState(0);   // track playback time via onProgress
  const [wasPlaying, setWasPlaying] = useState(true);

  const bootstrap = useCallback(async () => {
    if (routeItems && Array.isArray(routeItems)) return;
    setLoading(true);
    try {
      const res = await getVideosFirstPage({ query: 'react native tutorials', pageSize: 10 });
      // If you still receive YouTube items sometimes, they won’t play in <Video />
      // Make sure your provider maps Pexels items with item.url pointing to MP4
      const list = (res.items && res.items.length > 0) ? res.items : SAMPLE_LIST;
      setItems(list);
    } catch (e) {
      setItems(SAMPLE_LIST);
    } finally {
      setLoading(false);
    }
  }, [routeItems, getVideosFirstPage]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await bootstrap();
      if (!mounted) return;
    })();
    return () => {
      mounted = false;
      Orientation.lockToPortrait();
    };
  }, [bootstrap]);

  // Android PiP (you can keep this or switch to react-native-video's PiP methods)
  const enterPip = () => {
    try {
      AndroidPip.enterPipMode?.();
    } catch (error) {}
  };

  const enterFullscreen = async (item) => {
    setFullscreenItem(item);
    Orientation.lockToLandscape();
    setWasPlaying(true);
  };

  const exitFullscreen = () => {
    setFullscreenItem(null);
    Orientation.lockToPortrait();
  };

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (fullscreenItem) {
          exitFullscreen();
          return true;
        }
        if (currentId) {
          enterPip();
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [fullscreenItem, currentId])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if ((state === 'background' || state === 'inactive') && currentId && !fullscreenItem) {
        enterPip();
      }
    });
    return () => sub.remove();
  }, [currentId, fullscreenItem]);

  const onPlayInline = (id) => setCurrentId(id);

  const renderItem = useCallback(
    ({ item }) => {
      const isPlaying = currentId === item.id;
      const isYouTube = typeof item.url === 'string' &&
                        (item.url.includes('youtube.com') || item.url.includes('youtu.be'));

      return (
        <View style={styles.row}>
          {!isPlaying ? (
            <TouchableOpacity style={styles.thumbWrap} onPress={() => onPlayInline(item.id)}>
              <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
              <View style={styles.playBadge}>
                <Text style={styles.playText}>▶</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.playerInline}>
              {/* If you still feed YouTube links, show a fallback message */}
              {isYouTube ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', padding: 12 }}>
                    This screen uses a native MP4 player. Please supply Pexels MP4 URLs.
                  </Text>
                </View>
              ) : (
                <Video
                  ref={inlineRef}
                  source={{ uri: item.url }}      // Pexels MP4 link
                  style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
                  controls
                  paused={false}
                  resizeMode="cover"
                  // Track time; we'll use it to restore in fullscreen
                  onProgress={({ currentTime }) => setSavedTime(currentTime)}
                  onError={(e) => console.log('inline video error', e)}
                  // Optional: enable PiP via RN Video (simpler than WebView based players)
                  // enterPictureInPictureOnLeave
                />
              )}
            </View>
          )}
          <View style={styles.meta}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            {isPlaying && (
              <TouchableOpacity
                style={[styles.fullBtn, { alignSelf: 'flex-start', marginTop: 8 }]}
                onPress={() => enterFullscreen(item)}
              >
                <Text style={styles.fullTxt}>Fullscreen</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    },
    [currentId]
  );

  const keyExtractor = useCallback((it) => String(it.id), []);
  const headerTitle = useMemo(() => 'Videos', []);

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={{ padding: 16 }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: '#666' }}>Loading videos…</Text>
        </View>
      ) : items.length === 0 ? (
        <View>
          <Text style={{ color: '#666', marginLeft: 20 }}>No videos to display.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={{ padding: 12 }}
          removeClippedSubviews={false}
        />
      )}

      {/* Fullscreen modal using react-native-video */}
      <Modal visible={!!fullscreenItem} animationType="fade" onRequestClose={exitFullscreen}>
        <View style={styles.modal}>
          {fullscreenItem && (
            <>
              <Video
                ref={fullRef}
                source={{ uri: fullscreenItem.url }}
                style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
                controls
                paused={false}
                resizeMode="cover"
                onLoad={() => {
                  if (savedTime > 0) {
                    // restore time in fullscreen
                    try { fullRef.current?.seek?.(savedTime); } catch {}
                  }
                }}
                onError={(e) => console.log('fullscreen video error', e)}
                // Optional: enable PiP on leave app automatically
                // enterPictureInPictureOnLeave
              />
              <View style={styles.fullActions}>
                <TouchableOpacity style={styles.fullBtn} onPress={exitFullscreen}>
                  <Text style={styles.fullTxt}>Exit</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  row: { backgroundColor: '#f9f9f9', borderRadius: 8, overflow: 'hidden' },
  thumbWrap: { height: 220, backgroundColor: '#000' },
  thumb: { width: '100%', height: '100%' },
  playBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#0008',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  playText: { color: '#fff', fontWeight: '700' },
  playerInline: { height: 220 },
  meta: { padding: 12 },
  title: { fontSize: 16, color: '#111' },
  modal: { flex: 1, backgroundColor: '#000' },
  fullActions: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    gap: 8,
  },
  fullBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#333',
    borderRadius: 6,
  },
  fullTxt: { color: '#fff' },
});

