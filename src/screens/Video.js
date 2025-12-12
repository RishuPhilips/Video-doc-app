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
import YoutubePlayer from 'react-native-youtube-iframe';
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
  const [savedTime, setSavedTime] = useState(0);
  const [wasPlaying, setWasPlaying] = useState(true);

  const bootstrap = useCallback(async () => {
    if (routeItems && Array.isArray(routeItems)) return; 
    setLoading(true);
    try {
      const res = await getVideosFirstPage({ query: 'react native tutorials', pageSize: 10 });
      const list = (res.items && res.items.length > 0) ? res.items : SAMPLE_LIST;
      setItems(list);
    } catch (e) {
      console.log('[VideosScreen] fetch error:', e?.message);
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

  const enterPip = () => {
    try {
      AndroidPip.enterPipMode?.();
    } catch (error) {
      console.log('Error entering PiP:', error);
    }
  };
  const enterFullscreen = async (item) => {
    try {
      const t = await inlineRef.current?.getCurrentTime?.();
      if (typeof t === 'number') {
        setSavedTime(t);
      }
      setWasPlaying(true);
    } catch (e) {
      console.log('getCurrentTime error', e);
    }
    setFullscreenItem(item);
    Orientation.lockToLandscape();
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
              <YoutubePlayer
                ref={inlineRef}
                height={220}
                play={true}
                videoId={item.id} 
                onFullScreenChange={(isFull) => {
                  if (isFull) enterFullscreen(item);
                  else exitFullscreen();
                }}
                onChangeState={(s) => {
                  console.log('[YouTube inline state]', s);
                }}
                onReady={() => console.log('[YouTube inline ready]')}
                onError={(e) => console.log('[YouTube inline error]', e)}
              />
            </View>
          )}
          <View style={styles.meta}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
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
      <Text style={styles.screenTitle}>{headerTitle}</Text>

      {loading ? (
        <View style={{ padding: 16 }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: '#666' }}>Loading videos…</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={{ }}>
          <Text style={{ color: '#666',marginLeft:20 }}>No videos to display.</Text>
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
      <Modal visible={!!fullscreenItem} animationType="fade" onRequestClose={exitFullscreen}>
        <View style={styles.modal}>
          {fullscreenItem && (
            <>
              <YoutubePlayer
                ref={fullRef}
                height={'100%'}
                width={'100%'}
                play={true}
                videoId={fullscreenItem.id}
                onReady={async () => {
                  try {
                    if (savedTime > 0) {
                      await fullRef.current?.seekTo?.(savedTime, true); 
                    }
                    if (wasPlaying) {
                      await fullRef.current?.playVideo?.();
                    }
                  } catch (e) {
                    console.log('[YouTube fullscreen seek/play error]', e);
                  }
                }}
                onFullScreenChange={(isFull) => {
                  if (isFull) Orientation.lockToLandscape();
                  else exitFullscreen();
                }}
                onChangeState={(s) => console.log('[YouTube fullscreen state]', s)}
                onError={(e) => console.log('[YouTube fullscreen error]', e)}
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
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  screenTitle: { 
    fontSize: 22, 
    fontWeight: '600', 
    marginLeft:20
    
  },
  row: { 
    backgroundColor: '#f9f9f9',
     borderRadius: 8, 
     overflow: 'hidden'
     },
  thumbWrap: {
     height: 220, 
     backgroundColor: '#000' 
    },
  thumb: {
     width: '100%', 
     height: '100%' 
    },
  playBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#0008',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  playText: { 
    color: '#fff', 
    fontWeight: '700'
   },
  playerInline: { 
    height: 220 
  },
  meta: { 
    padding: 12
   },
  title: { 
    fontSize: 16, 
    color: '#111'
   },
  modal: {
     flex: 1, 
     backgroundColor: '#000' 
    },
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
