import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute } from '@react-navigation/native';
import { useData } from '../context/VideoDocContext';
import Orientation from 'react-native-orientation-locker';
import Icon from 'react-native-vector-icons/AntDesign';

export default function Document() {
  const route = useRoute();
  const routeItems = route?.params?.items || null;

  const { getDocsAll } = useData(); 

  const [items, setItems] = useState(routeItems ?? []);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(!routeItems); 
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isLandscape, setIsLandscape] = useState(false);
  const webViewRef = useRef(null);

  useEffect(() => {
    if (previewUrl) {
      Orientation.unlockAllOrientations();
    } else {
      Orientation.lockToPortrait();
    }
  }, [previewUrl]);

  useEffect(() => {
    if (webViewRef.current && !loading && previewUrl) {
      webViewRef.current.injectJavaScript(`document.body.style.zoom = '${zoomLevel}';`);
    }
  }, [zoomLevel, loading, previewUrl]);

  const normalizeUrl = (rawUrl) => {
    if (!rawUrl) return null;
    let url = String(rawUrl).trim();

    // Add https:// if missing
    if (!/^([a-z][a-z0-9+\-.]*):\/\//i.test(url)) {
      url = `https://${url}`;
    }
    try {
      url = encodeURI(url);
    } catch (_) {}
    return url;
  };

  const openUrlDirect = async (rawUrl) => {
    const url = normalizeUrl(rawUrl);
    if (!url) {
      Alert.alert('No URL', 'This item does not have a valid URL to open.');
      return false;
    }
    try {
      await Linking.openURL(url);
      return true;
    } catch (err) {
      console.log('openURL failed, falling back to viewer:', err);
      return false;
    }
  };

  const bootstrap = useCallback(async () => {
    if (routeItems && Array.isArray(routeItems)) return; 
    setLoading(true);
    try {
      const res = await getDocsAll(); 
      const list = Array.isArray(res.items) ? res.items : [];
      setItems(list);
    } catch (e) {
      console.log('[Document] fetch error:', e?.message);
      setItems([]); 
    } finally {
      setLoading(false);
    }
  }, [routeItems, getDocsAll]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await bootstrap();
      if (!mounted) return;
    })();
    return () => {
      mounted = false;
    };
  }, [bootstrap]);

  const openDocument = useCallback(
    async (item) => {
      const url = item.url || item.link;
      if (!url) {
        Alert.alert('Missing file', 'No URL found for this item.');
        return;
      }

      const isPdf = /\.pdf(\?.*)?$/i.test(url);
      const normalized = normalizeUrl(url);

      if (isPdf && normalized) {
        setPreviewUrl(normalized);
        setZoomLevel(1);
        setIsLandscape(false); 
        return;
      }

      const opened = await openUrlDirect(url);
      if (!opened) {
        Alert.alert(
          'Cannot open link',
          'The link appears unsupported on this device. If it is protected or requires a specific app, please open it in a browser or download first.'
        );
      }
    },
    []
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.row} onPress={() => openDocument(item)}>
      <View style={styles.docIcon}>
        <Text style={styles.docIconText}>{(item.type || 'file').toUpperCase().slice(0, 4)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.meta}>{item.size}</Text>
      </View>
    </TouchableOpacity>
  );

  const screenTitle = useMemo(() => 'Documents', []);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Text style={styles.header}>{screenTitle}</Text>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8, color: '#666' }}>Loading documents…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderItem}
          contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.listContainer}
          ListEmptyComponent={<Text style={styles.emptyText}>No documents to show</Text>}
        />
      )}

      <Modal visible={!!previewUrl} animationType="slide" onRequestClose={() => setPreviewUrl(null)}>
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.viewerHeader}>
            {/* <TouchableOpacity onPress={() => setPreviewUrl(null)} style={styles.closeBtn}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity> */}
            <TouchableOpacity
              onPress={() => {
                if (isLandscape) {
                  Orientation.lockToPortrait();
                  setIsLandscape(false);
                } else {
                  Orientation.lockToLandscape();
                  setIsLandscape(true);
                }
              }}
              style={styles.modeBtn}
            >
              <Text style={styles.modeText}>[]</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setZoomLevel(prev => Math.min(prev * 1.2, 5))} style={styles.modeBtn}>
              <Text style={styles.modeText}>+</Text>

            </TouchableOpacity>
            <TouchableOpacity onPress={() => setZoomLevel(prev => Math.max(prev / 1.2, 0.5))} style={styles.modeBtn}>
              <Text style={styles.modeText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPreviewUrl(null)} style={styles.closeBtn}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity> 
          </View>
          <WebView
            ref={webViewRef}
            source={{ uri: previewUrl }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => {
              setLoading(false);
              webViewRef.current?.injectJavaScript(`document.body.style.zoom = '${zoomLevel}';`);
            }}
            startInLoadingState
            zoomEnabled={true}
            builtInZoomControls={true}
            displayZoomControls={false}
            scalesPageToFit={true}
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 8 }}>Loading preview…</Text>
              </View>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#222', 
    paddingHorizontal: 20, 
   },
  loaderWrap: { 
    padding: 16 
  },
  row: { 
    flexDirection: 'row', 
    padding: 12, 
    alignItems: 'center' 
  },
  docIcon: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  docIconText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#1e3a8a' 
  },
  title: { 
    fontSize: 14, 
    color: '#111' 
  },
  meta: { 
    fontSize: 12, 
    color: '#666', 
    marginTop: 2
   },
  emptyContainer: {
     flexGrow: 1, 
     justifyContent: 'center', 
     padding: 24
     },
       listContainer: {
        marginLeft:10
     },
  emptyText: { 
    textAlign: 'center', 
    color: '#666' 
  },
  viewerHeader: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
    paddingHorizontal: 12,
    justifyContent:'flex-end'
  },
  closeBtn: {
 paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#dbeafe',
    marginLeft: 8,
  },
  closeText: { 
    color: '#1e3a8a', 
    fontWeight: '600' ,
  },
  modeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#dbeafe',
    marginLeft: 8,
  },
  modeText: { 
    color: '#1e3a8a', 
    fontWeight: '600' ,
  },
  viewerTitle: { 
    flex: 1, 
    textAlign: 'center', 
    fontWeight: '600',
     color: '#111' },
  loading: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
});