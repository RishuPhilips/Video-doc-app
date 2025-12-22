
import React, { useContext, useEffect, useMemo, useState, useCallback } from 'react';
import {
  Text,
  View,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { useData } from '../context/VideoDocContext';

const DOCS_PAGE_SIZE = 10;
const YT_PAGE_SIZE = 10; 

export default function Home() {
  const navigation = useNavigation();

  const { user , logout} = useContext(AuthContext);
  const { getVideosFirstPage, getVideosNextPage, getDocsAll } = useData();

  // ==== Videos state ====
  const [videos, setVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [refreshingVideos, setRefreshingVideos] = useState(false);
  const [loadingMoreVideos, setLoadingMoreVideos] = useState(false);
  const [videosNextToken, setVideosNextToken] = useState(null);
  const [videosHasMore, setVideosHasMore] = useState(true);

  // ==== Docs state ====
  const [docs, setDocs] = useState([]);
  const [allDocs, setAllDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [refreshingDocs, setRefreshingDocs] = useState(false);
  const [loadingMoreDocs, setLoadingMoreDocs] = useState(false);
  const [docsPage, setDocsPage] = useState(1);
  const [docsHasMore, setDocsHasMore] = useState(true);

  const [refreshingScreen, setRefreshingScreen] = useState(false);

  const fetchVideosFirst = useCallback(async () => {
    setLoadingVideos(true);
    try {
      const res = await getVideosFirstPage({ query: 'react native tutorials', pageSize: YT_PAGE_SIZE });
      setVideos(res.items ?? []);
      setVideosNextToken(res.nextPageToken ?? null);
      setVideosHasMore(Boolean(res.nextPageToken));
    } catch (e) {
      setVideosHasMore(false);
      setVideosNextToken(null);
    } finally {
      setLoadingVideos(false);
      setRefreshingVideos(false);
    }
  }, [getVideosFirstPage]);

  const fetchVideosNext = useCallback(async () => {
    if (!videosHasMore || loadingMoreVideos) return;
    setLoadingMoreVideos(true);
    try {
      const res = await getVideosNextPage({
        query: 'react native tutorials',
        pageSize: YT_PAGE_SIZE,
        pageToken: videosNextToken,
      });
      setVideos((prev) => [...prev, ...(res.items ?? [])]);
      setVideosNextToken(res.nextPageToken ?? null);
      setVideosHasMore(Boolean(res.nextPageToken));
    } catch (e) {
      setVideosHasMore(false);
    } finally {
      setLoadingMoreVideos(false);
    }
  }, [videosHasMore, videosNextToken, loadingMoreVideos, getVideosNextPage]);

  const onRefreshVideos = useCallback(async () => {
    setRefreshingVideos(true);
    setVideosHasMore(true);
    setVideosNextToken(null);
    await fetchVideosFirst();
  }, [fetchVideosFirst]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await fetchVideosFirst();
      if (!mounted) return;
    })();
    return () => {
      mounted = false;
    };
  }, [fetchVideosFirst]);

  const fetchDocsAllFromContext = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const res = await getDocsAll();
      const mapped = res.items ?? [];
      setAllDocs(mapped);
      setDocs(mapped.slice(0, DOCS_PAGE_SIZE));
      setDocsPage(1);
      setDocsHasMore(mapped.length > DOCS_PAGE_SIZE);
    } catch (e) {
      setAllDocs([]);
      setDocs([]);
      setDocsHasMore(false);
    } finally {
      setLoadingDocs(false);
      setRefreshingDocs(false);
    }
  }, [getDocsAll]);

  const fetchDocsNextPage = useCallback(() => {
    if (!docsHasMore || loadingMoreDocs) return;
    setLoadingMoreDocs(true);
    try {
      const nextPage = docsPage + 1;
      const nextSlice = allDocs.slice(0, nextPage * DOCS_PAGE_SIZE);
      setDocs(nextSlice);
      setDocsPage(nextPage);
      setDocsHasMore(nextSlice.length < allDocs.length);
    } catch (e) {
      setDocsHasMore(false);
    } finally {
      setLoadingMoreDocs(false);
    }
  }, [docsHasMore, loadingMoreDocs, docsPage, allDocs]);

  const onRefreshDocs = useCallback(async () => {
    setRefreshingDocs(true);
    await fetchDocsAllFromContext();
  }, [fetchDocsAllFromContext]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await fetchDocsAllFromContext();
      if (!mounted) return;
    })();
    return () => {
      mounted = false;
    };
  }, [fetchDocsAllFromContext]);

  const onRefreshScreen = useCallback(async () => {
    setRefreshingScreen(true);
    await Promise.all([onRefreshVideos(), onRefreshDocs()]);
    setRefreshingScreen(false);
  }, [onRefreshVideos, onRefreshDocs]);

  const userGreeting = useMemo(() => {
    if (!user) return 'Hello!';
    return `Hello ${user.displayName ??  'User'}`;
  }, [user]);

  const isPdf = (item) =>
    ((item.type ?? '').toLowerCase() === 'pdf') || /\.pdf(\?.*)?$/i.test(item.url ?? '');

  const renderVideoItem = ({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
      <Text style={styles.title} numberOfLines={3}>
        {item.title}
      </Text>
    </View>
  );

  const renderDocumentItem = ({ item }) => (
    <View>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
      >
        <View style={styles.docIcon}>
          <Text style={styles.docIconText}>{(item.type ?? 'file').toUpperCase().slice(0, 4)}</Text>
        </View>
        <View style={styles.docMeta}>
          <Text style={styles.docName} numberOfLines={3}>
            {item.name}
          </Text>
          <Text style={styles.docSub}>{item.size}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await logout();
            if (res?.ok) {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }], // adjust to your auth route name
              });
            } else {
              Alert.alert('Failed to logout', res?.error?.message ?? 'Please try again.');
            }
          } catch (e) {
            Alert.alert('Failed to logout', e?.message ?? 'Please try again.');
          }
        },
      },
    ]);
  }, [logout, navigation]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshingScreen} onRefresh={onRefreshScreen} />}
      >
        <Text style={styles.Title}>{userGreeting}</Text>

        {/* Videos section */}
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Videos</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Video', { items: videos })}>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>

        {loadingVideos ? (
          <ActivityIndicator style={{ marginTop: 12 }} />
        ) : (
          <FlatList
            data={videos}
            keyExtractor={(item) => String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={renderVideoItem}
            contentContainerStyle={styles.listContent}
            refreshing={refreshingVideos}
            onRefresh={onRefreshVideos}
            onEndReached={fetchVideosNext}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMoreVideos ? (
                <View style={styles.footer}>
                  <ActivityIndicator />
                  <Text style={styles.footerText}>Loading more…</Text>
                </View>
              ) : !videosHasMore ? (
                <Text style={styles.footerText}>No more videos</Text>
              ) : null
            }
          />
        )}

        {/* Documents section */}
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Documents</Text>
          <TouchableOpacity
            onPress={() => {
              const pdfItems = docs.filter(isPdf);
              if (pdfItems.length === 0) {
                Alert.alert('No PDFs', 'No PDF documents found in the current list.');
                return;
              }
              navigation.navigate('Document', { items: pdfItems });
            }}
          >
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>

        {loadingDocs ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={docs}
            keyExtractor={(item) => String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={renderDocumentItem}
            contentContainerStyle={[styles.listContent, { marginBottom: 20 }]}
            refreshing={refreshingDocs}
            onRefresh={onRefreshDocs}
            onEndReached={fetchDocsNextPage}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMoreDocs ? (
                <View style={styles.footer}>
                  <ActivityIndicator />
                  <Text style={styles.footerText}>Loading more…</Text>
                </View>
              ) : !docsHasMore ? (
                <Text style={styles.footerText}>No more documents</Text>
              ) : null
            }
          />
        )}
      </ScrollView>
      <TouchableOpacity style={styles.fab} onPress={handleLogout} activeOpacity={0.85}>
        <Text style={styles.fabText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 100,
  },
  header: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  listContent: {
    paddingRight: 12,
  },
  card: {
    width: 150,
    alignItems: 'center',
    borderColor: '#eee',
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: 6,
    padding: 6,
    height: 200,
    backgroundColor: '#fafafa',
  },
  thumb: {
    width: '100%',
    height: 115,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  title: {
    fontSize: 12,
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  Title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222',
    marginLeft: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    padding: 8,
  },
  viewAll: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
    padding: 10,
  },
  docIcon: {
    width: '100%',
    height: 90,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docIconText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  docMeta: {
    width: '100%',
    marginTop: 6,
    alignItems: 'center',
  },
  docName: {
    fontSize: 12,
    color: '#333',
  },
  docSub: {
    fontSize: 11,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footerText: {
    marginLeft: 5,
    color: 'red',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 10,
    backgroundColor: '#1e90ff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    elevation: 6,
  },
  fabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
